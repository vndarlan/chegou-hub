# backend/features/estoque/produto_unificado_view.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import F, Q
from itertools import chain

from .models import ProdutoEstoque, Produto
from features.processamento.models import ShopifyConfig
from .serializers import ProdutoUnificadoSerializer


class ProdutoUnificadoViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet unificado para listar produtos individuais e compartilhados juntos"""

    permission_classes = [IsAuthenticated]
    # Usa throttling padrão do DRF (1000 requests/hour para users autenticados)
    serializer_class = ProdutoUnificadoSerializer
    
    def get_queryset(self):
        """
        Combinar produtos individuais (ProdutoEstoque) e compartilhados (Produto)
        em uma única consulta unificada.

        MULTI-USUÁRIO: Produtos compartilhados são visíveis para todos os usuários
        que têm acesso às lojas associadas ao produto.
        """
        import logging
        logger = logging.getLogger(__name__)

        try:
            # Buscar produtos individuais (ProdutoEstoque) do usuário
            produtos_individuais = ProdutoEstoque.objects.filter(
                user=self.request.user
            ).select_related('loja_config').prefetch_related('movimentacoes')

            # Buscar lojas do usuário para validar acesso a produtos compartilhados
            lojas_usuario = ShopifyConfig.objects.filter(user=self.request.user)

            # Buscar produtos compartilhados (Produto) onde:
            # 1. Usuário é o criador (user=request.user) OU
            # 2. Produto está associado a lojas do usuário (via ProdutoLoja)
            produtos_compartilhados = Produto.objects.filter(
                Q(user=self.request.user) | Q(lojas__in=lojas_usuario)
            ).select_related().prefetch_related(
                'skus', 'lojas', 'produtoloja_set__loja', 'movimentacoes'
            ).distinct()  # distinct() para evitar duplicatas quando produto está em múltiplas lojas

            # Aplicar filtros comuns
            nome = self.request.query_params.get('nome')
            if nome:
                produtos_individuais = produtos_individuais.filter(nome__icontains=nome)
                produtos_compartilhados = produtos_compartilhados.filter(nome__icontains=nome)

            fornecedor = self.request.query_params.get('fornecedor')
            if fornecedor:
                produtos_individuais = produtos_individuais.filter(fornecedor__icontains=fornecedor)
                produtos_compartilhados = produtos_compartilhados.filter(fornecedor__icontains=fornecedor)

            # Filtro por loja
            loja_id = self.request.query_params.get('loja_id')
            if loja_id:
                produtos_individuais = produtos_individuais.filter(loja_config_id=loja_id)
                produtos_compartilhados = produtos_compartilhados.filter(
                    produtoloja_set__loja_id=loja_id
                ).distinct()

            # Filtro por status do estoque
            status_estoque = self.request.query_params.get('status_estoque')
            if status_estoque == 'zerado':
                produtos_individuais = produtos_individuais.filter(estoque_atual=0)
                produtos_compartilhados = produtos_compartilhados.filter(estoque_compartilhado=0)
            elif status_estoque == 'baixo':
                produtos_individuais = produtos_individuais.filter(estoque_atual__lte=F('estoque_minimo'))
                produtos_compartilhados = produtos_compartilhados.filter(estoque_compartilhado__lte=F('estoque_minimo'))
            elif status_estoque == 'negativo':
                produtos_individuais = produtos_individuais.filter(estoque_atual__lt=0)
                produtos_compartilhados = produtos_compartilhados.filter(estoque_compartilhado__lt=0)

            # Filtro por SKU
            sku = self.request.query_params.get('sku')
            if sku:
                produtos_individuais = produtos_individuais.filter(sku__icontains=sku)
                produtos_compartilhados = produtos_compartilhados.filter(
                    skus__sku__icontains=sku
                ).distinct()

            # Apenas produtos ativos por padrão
            apenas_ativos = self.request.query_params.get('apenas_ativos', 'true')
            if apenas_ativos.lower() == 'true':
                produtos_individuais = produtos_individuais.filter(ativo=True)
                produtos_compartilhados = produtos_compartilhados.filter(ativo=True)

            # Combinar os dois querysets
            # Como são modelos diferentes, vamos retornar como lista
            resultado = list(chain(produtos_individuais, produtos_compartilhados))

            # Ordenar por data de criação (mais recentes primeiro)
            resultado.sort(key=lambda x: x.data_criacao, reverse=True)

            logger.info(f"get_queryset executado com sucesso: {len(resultado)} produtos encontrados")
            return resultado

        except Exception as e:
            logger.error(f"ERRO em get_queryset: {str(e)}", exc_info=True)
            # Retornar lista vazia em caso de erro para não quebrar o endpoint
            return []
    
    def list(self, request, *args, **kwargs):
        """Override do list para trabalhar com lista mista de objetos"""
        import logging
        logger = logging.getLogger(__name__)

        try:
            queryset = self.get_queryset()

            # Paginação manual se necessário
            try:
                page_size = int(request.query_params.get('page_size', 20))
                page = int(request.query_params.get('page', 1))
            except (ValueError, TypeError) as e:
                logger.warning(f"Parâmetros de paginação inválidos: {e}")
                page_size = 20
                page = 1

            start = (page - 1) * page_size
            end = start + page_size

            paginated_queryset = queryset[start:end]

            serializer = self.get_serializer(paginated_queryset, many=True)

            logger.info(f"list() executado com sucesso: {len(queryset)} produtos, página {page}")

            return Response({
                'count': len(queryset),
                'total_paginas': (len(queryset) + page_size - 1) // page_size if page_size > 0 else 0,
                'pagina_atual': page,
                'results': serializer.data
            })

        except Exception as e:
            logger.error(f"ERRO em list(): {str(e)}", exc_info=True)
            return Response(
                {
                    'erro': f'Erro ao listar produtos unificados: {str(e)}',
                    'count': 0,
                    'total_paginas': 0,
                    'pagina_atual': 1,
                    'results': []
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def estatisticas_unificadas(self, request):
        """Estatísticas unificadas de todos os produtos"""
        import logging
        logger = logging.getLogger(__name__)

        try:
            queryset = self.get_queryset()

            total_produtos = len(queryset)
            produtos_individuais = len([p for p in queryset if hasattr(p, 'estoque_atual')])
            produtos_compartilhados = total_produtos - produtos_individuais

            # Contadores de estoque
            com_estoque = 0
            estoque_baixo = 0
            estoque_zerado = 0
            estoque_negativo = 0

            for produto in queryset:
                try:
                    if hasattr(produto, 'estoque_atual'):  # Individual
                        estoque_atual = produto.estoque_atual
                    else:  # Compartilhado
                        estoque_atual = produto.estoque_compartilhado

                    if estoque_atual > 0:
                        com_estoque += 1
                        if estoque_atual <= produto.estoque_minimo:
                            estoque_baixo += 1
                    elif estoque_atual == 0:
                        estoque_zerado += 1
                    else:
                        estoque_negativo += 1
                except Exception as e:
                    logger.warning(f"Erro ao processar produto {produto.id}: {e}")
                    continue

            # Total de lojas conectadas
            lojas_conectadas = set()
            for produto in queryset:
                try:
                    if hasattr(produto, 'loja_config') and produto.loja_config:  # Individual
                        lojas_conectadas.add(produto.loja_config.id)
                    else:  # Compartilhado
                        for loja in produto.lojas.all():
                            lojas_conectadas.add(loja.id)
                except Exception as e:
                    logger.warning(f"Erro ao processar lojas do produto {produto.id}: {e}")
                    continue

            logger.info(f"estatisticas_unificadas executado com sucesso: {total_produtos} produtos")

            return Response({
                'total_produtos': total_produtos,
                'produtos_individuais': produtos_individuais,
                'produtos_compartilhados': produtos_compartilhados,
                'estoque': {
                    'com_estoque': com_estoque,
                    'estoque_baixo': estoque_baixo,
                    'estoque_zerado': estoque_zerado,
                    'estoque_negativo': estoque_negativo
                },
                'total_lojas_conectadas': len(lojas_conectadas),
                'porcentagem_com_estoque': (com_estoque / total_produtos * 100) if total_produtos > 0 else 0
            })

        except Exception as e:
            logger.error(f"ERRO em estatisticas_unificadas: {str(e)}", exc_info=True)
            return Response(
                {
                    'erro': f'Erro ao calcular estatísticas: {str(e)}',
                    'total_produtos': 0,
                    'produtos_individuais': 0,
                    'produtos_compartilhados': 0,
                    'estoque': {
                        'com_estoque': 0,
                        'estoque_baixo': 0,
                        'estoque_zerado': 0,
                        'estoque_negativo': 0
                    },
                    'total_lojas_conectadas': 0,
                    'porcentagem_com_estoque': 0
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )