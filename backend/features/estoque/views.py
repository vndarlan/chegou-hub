# backend/features/estoque/views.py
import json
import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.throttling import UserRateThrottle
from django.db.models import Q, Count, Sum, F
from django.db import models
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.http import JsonResponse
from datetime import datetime, timedelta
from django.core.exceptions import PermissionDenied

from .models import ProdutoEstoque, MovimentacaoEstoque, AlertaEstoque
from .serializers import (
    ProdutoEstoqueSerializer, MovimentacaoEstoqueSerializer,
    AlertaEstoqueSerializer, MovimentacaoEstoqueCreateSerializer,
    ProdutoEstoqueResumoSerializer
)
from .services.shopify_webhook_service import ShopifyWebhookService
from .services.estoque_service import EstoqueService
from .throttles import (
    EstoqueUserRateThrottle, EstoqueWebhookRateThrottle, 
    EstoqueAPIRateThrottle, EstoqueBulkOperationThrottle
)
from .utils.security_utils import (
    LogSanitizer, PermissionValidator, safe_log_data
)

logger = logging.getLogger(__name__)


class ProdutoEstoqueViewSet(viewsets.ModelViewSet):
    """ViewSet para gerenciar produtos em estoque com segurança aprimorada"""
    
    serializer_class = ProdutoEstoqueSerializer
    permission_classes = [IsAuthenticated]
    throttle_classes = [EstoqueUserRateThrottle]
    
    def get_serializer_class(self):
        """Usar serializer resumido para listagem"""
        if self.action == 'list':
            return ProdutoEstoqueResumoSerializer
        return ProdutoEstoqueSerializer
    
    def perform_create(self, serializer):
        """Definir usuário automaticamente na criação"""
        serializer.save(user=self.request.user)
    
    def get_queryset(self):
        """Filtros avançados via query parameters"""
        queryset = ProdutoEstoque.objects.filter(user=self.request.user)
        
        # Filtros básicos
        loja_id = self.request.query_params.get('loja_id')
        if loja_id:
            queryset = queryset.filter(loja_config_id=loja_id)
        
        ativo = self.request.query_params.get('ativo')
        if ativo is not None:
            queryset = queryset.filter(ativo=ativo.lower() == 'true')
        
        # Filtros de estoque
        status_estoque = self.request.query_params.get('status_estoque')
        if status_estoque == 'zerado':
            queryset = queryset.filter(estoque_atual=0)
        elif status_estoque == 'baixo':
            queryset = queryset.filter(estoque_atual__lte=F('estoque_minimo'))
        elif status_estoque == 'ok':
            queryset = queryset.filter(estoque_atual__gt=F('estoque_minimo'))
        
        # Busca textual
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(sku__icontains=search) | Q(nome__icontains=search)
            )
        
        # Filtros de sincronização
        sync_enabled = self.request.query_params.get('sync_enabled')
        if sync_enabled is not None:
            queryset = queryset.filter(sync_shopify_enabled=sync_enabled.lower() == 'true')
        
        com_erro_sync = self.request.query_params.get('com_erro_sync')
        if com_erro_sync == 'true':
            queryset = queryset.exclude(erro_sincronizacao='')
        
        return queryset.select_related('loja_config').prefetch_related('movimentacoes', 'alertas')
    
    @action(detail=True, methods=['post'])
    def adicionar_estoque(self, request, pk=None):
        """Adicionar estoque a um produto"""
        produto = self.get_object()
        quantidade = request.data.get('quantidade')
        observacao = request.data.get('observacao', '')
        
        if not quantidade or quantidade <= 0:
            return Response(
                {'erro': 'Quantidade deve ser maior que zero'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            produto.adicionar_estoque(
                quantidade=int(quantidade),
                observacao=observacao
            )
            return Response({
                'sucesso': True,
                'mensagem': f'Estoque adicionado com sucesso. Novo total: {produto.estoque_atual}',
                'estoque_atual': produto.estoque_atual
            })
        except ValueError as e:
            return Response(
                {'erro': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def remover_estoque(self, request, pk=None):
        """Remover estoque de um produto"""
        produto = self.get_object()
        quantidade = request.data.get('quantidade')
        observacao = request.data.get('observacao', '')
        
        if not quantidade or quantidade <= 0:
            return Response(
                {'erro': 'Quantidade deve ser maior que zero'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            produto.remover_estoque(
                quantidade=int(quantidade),
                observacao=observacao
            )
            return Response({
                'sucesso': True,
                'mensagem': f'Estoque removido com sucesso. Novo total: {produto.estoque_atual}',
                'estoque_atual': produto.estoque_atual
            })
        except ValueError as e:
            return Response(
                {'erro': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['get'])
    def movimentacoes(self, request, pk=None):
        """Listar movimentações de um produto específico"""
        produto = self.get_object()
        movimentacoes = produto.movimentacoes.all()
        
        # Filtros opcionais
        tipo = request.query_params.get('tipo')
        if tipo:
            movimentacoes = movimentacoes.filter(tipo_movimento=tipo)
        
        # Período
        data_inicio = request.query_params.get('data_inicio')
        data_fim = request.query_params.get('data_fim')
        if data_inicio:
            movimentacoes = movimentacoes.filter(data_movimentacao__gte=data_inicio)
        if data_fim:
            movimentacoes = movimentacoes.filter(data_movimentacao__lte=data_fim)
        
        serializer = MovimentacaoEstoqueSerializer(movimentacoes, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def alertas(self, request, pk=None):
        """Listar alertas de um produto específico"""
        produto = self.get_object()
        alertas = produto.alertas.all()
        
        # Filtro por status
        status_filtro = request.query_params.get('status')
        if status_filtro:
            alertas = alertas.filter(status=status_filtro)
        
        serializer = AlertaEstoqueSerializer(alertas, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def resumo_geral(self, request):
        """Resumo geral do estoque do usuário"""
        produtos = self.get_queryset()
        
        total_produtos = produtos.count()
        produtos_ativos = produtos.filter(ativo=True).count()
        produtos_zerados = produtos.filter(estoque_atual=0).count()
        produtos_baixo_estoque = produtos.filter(
            estoque_atual__lte=F('estoque_minimo')
        ).count()
        
        # Valor total do estoque
        valor_total = sum([
            produto.valor_total_estoque for produto in produtos 
            if produto.custo_unitario
        ])
        
        # Alertas ativos
        alertas_ativos = AlertaEstoque.objects.filter(
            produto__user=request.user,
            status='ativo'
        ).count()
        
        # Produtos que precisam de reposição
        produtos_reposicao = produtos.filter(
            estoque_atual__lt=F('estoque_minimo'),
            ativo=True
        ).count()
        
        return Response({
            'total_produtos': total_produtos,
            'produtos_ativos': produtos_ativos,
            'produtos_zerados': produtos_zerados,
            'produtos_baixo_estoque': produtos_baixo_estoque,
            'produtos_reposicao': produtos_reposicao,
            'valor_total_estoque': valor_total,
            'alertas_ativos': alertas_ativos,
            'ultima_atualizacao': timezone.now()
        })
    
    @action(detail=False, methods=['get'])
    def produtos_reposicao(self, request):
        """Lista produtos que precisam de reposição"""
        produtos = self.get_queryset().filter(
            estoque_atual__lt=F('estoque_minimo'),
            ativo=True
        ).order_by('estoque_atual')
        
        serializer = ProdutoEstoqueResumoSerializer(produtos, many=True)
        return Response(serializer.data)


class MovimentacaoEstoqueViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet para visualizar movimentações de estoque com segurança"""
    
    serializer_class = MovimentacaoEstoqueSerializer
    permission_classes = [IsAuthenticated]
    throttle_classes = [EstoqueUserRateThrottle]
    
    def get_queryset(self):
        """Filtros avançados via query parameters"""
        queryset = MovimentacaoEstoque.objects.filter(produto__user=self.request.user)
        
        # Filtro por produto
        produto_id = self.request.query_params.get('produto_id')
        if produto_id:
            queryset = queryset.filter(produto_id=produto_id)
        
        # Filtro por tipo
        tipo = self.request.query_params.get('tipo')
        if tipo:
            queryset = queryset.filter(tipo_movimento=tipo)
        
        # Filtro por período
        data_inicio = self.request.query_params.get('data_inicio')
        data_fim = self.request.query_params.get('data_fim')
        if data_inicio:
            queryset = queryset.filter(data_movimentacao__gte=data_inicio)
        if data_fim:
            queryset = queryset.filter(data_movimentacao__lte=data_fim)
        
        # Filtro por loja
        loja_id = self.request.query_params.get('loja_id')
        if loja_id:
            queryset = queryset.filter(produto__loja_config_id=loja_id)
        
        # Filtro por pedido Shopify
        pedido_id = self.request.query_params.get('pedido_shopify_id')
        if pedido_id:
            queryset = queryset.filter(pedido_shopify_id=pedido_id)
        
        return queryset.select_related('produto', 'usuario').order_by('-data_movimentacao')
    
    @action(detail=False, methods=['post'])
    def criar_movimentacao(self, request):
        """Criar nova movimentação de estoque"""
        serializer = MovimentacaoEstoqueCreateSerializer(
            data=request.data, 
            context={'request': request}
        )
        
        if serializer.is_valid():
            movimentacao = serializer.save()
            response_serializer = MovimentacaoEstoqueSerializer(movimentacao)
            return Response(
                response_serializer.data, 
                status=status.HTTP_201_CREATED
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def relatorio_periodo(self, request):
        """Relatório de movimentações por período"""
        # Parâmetros obrigatórios
        data_inicio = request.query_params.get('data_inicio')
        data_fim = request.query_params.get('data_fim')
        
        if not data_inicio or not data_fim:
            return Response(
                {'erro': 'data_inicio e data_fim são obrigatórios'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        queryset = self.get_queryset().filter(
            data_movimentacao__gte=data_inicio,
            data_movimentacao__lte=data_fim
        )
        
        # Agregações por tipo de movimento
        por_tipo = queryset.values('tipo_movimento').annotate(
            total_movimentacoes=Count('id'),
            total_quantidade=Sum('quantidade')
        ).order_by('-total_movimentacoes')
        
        # Resumo geral
        total_movimentacoes = queryset.count()
        entradas = queryset.filter(tipo_movimento__in=['entrada', 'devolucao']).aggregate(
            total=Sum('quantidade')
        )['total'] or 0
        saidas = queryset.filter(tipo_movimento__in=['saida', 'venda', 'perda']).aggregate(
            total=Sum('quantidade')
        )['total'] or 0
        
        return Response({
            'periodo': {
                'data_inicio': data_inicio,
                'data_fim': data_fim
            },
            'resumo': {
                'total_movimentacoes': total_movimentacoes,
                'total_entradas': entradas,
                'total_saidas': saidas,
                'saldo_liquido': entradas - saidas
            },
            'por_tipo': list(por_tipo)
        })


class AlertaEstoqueViewSet(viewsets.ModelViewSet):
    """ViewSet para gerenciar alertas de estoque com segurança"""
    
    serializer_class = AlertaEstoqueSerializer
    permission_classes = [IsAuthenticated]
    throttle_classes = [EstoqueUserRateThrottle]
    
    def get_queryset(self):
        """Filtros avançados via query parameters"""
        queryset = AlertaEstoque.objects.filter(produto__user=self.request.user)
        
        # Filtros básicos
        status_filtro = self.request.query_params.get('status')
        if status_filtro:
            queryset = queryset.filter(status=status_filtro)
        
        tipo = self.request.query_params.get('tipo')
        if tipo:
            queryset = queryset.filter(tipo_alerta=tipo)
        
        prioridade = self.request.query_params.get('prioridade')
        if prioridade:
            queryset = queryset.filter(prioridade=prioridade)
        
        # Filtro por produto
        produto_id = self.request.query_params.get('produto_id')
        if produto_id:
            queryset = queryset.filter(produto_id=produto_id)
        
        # Filtro por loja
        loja_id = self.request.query_params.get('loja_id')
        if loja_id:
            queryset = queryset.filter(produto__loja_config_id=loja_id)
        
        # Apenas alertas ativos por padrão
        apenas_ativos = self.request.query_params.get('apenas_ativos', 'true')
        if apenas_ativos.lower() == 'true':
            queryset = queryset.filter(status='ativo')
        
        return queryset.select_related('produto', 'usuario_responsavel', 'usuario_resolucao')
    
    @action(detail=True, methods=['post'])
    def marcar_lido(self, request, pk=None):
        """Marcar alerta como lido"""
        alerta = self.get_object()
        
        if alerta.status != 'ativo':
            return Response(
                {'erro': 'Apenas alertas ativos podem ser marcados como lidos'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        alerta.marcar_como_lido(request.user)
        
        return Response({
            'sucesso': True,
            'mensagem': 'Alerta marcado como lido',
            'status': alerta.status
        })
    
    @action(detail=True, methods=['post'])
    def resolver(self, request, pk=None):
        """Resolver alerta"""
        alerta = self.get_object()
        observacao = request.data.get('observacao', '')
        
        if alerta.status == 'resolvido':
            return Response(
                {'erro': 'Alerta já está resolvido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        alerta.resolver(request.user, observacao)
        
        return Response({
            'sucesso': True,
            'mensagem': 'Alerta resolvido com sucesso',
            'status': alerta.status
        })
    
    @action(detail=False, methods=['post'])
    def resolver_multiplos(self, request):
        """Resolver múltiplos alertas de uma vez com throttling específico"""
        # Aplicar throttling específico para operações em lote
        throttle = EstoqueBulkOperationThrottle()
        if not throttle.allow_request(request, self):
            return Response({
                'erro': 'Muitas operações em lote. Tente novamente em alguns minutos.'
            }, status=status.HTTP_429_TOO_MANY_REQUESTS)
        
        ids = request.data.get('alertas_ids', [])
        observacao = request.data.get('observacao', '')
        
        # Sanitizar observação
        observacao_sanitizada = LogSanitizer.sanitize_string(observacao)
        
        if not ids or len(ids) == 0:
            return Response(
                {'erro': 'Lista de IDs de alertas é obrigatória'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Limitar quantidade para prevenir abuse
        if len(ids) > 50:
            return Response(
                {'erro': 'Máximo 50 alertas por operação em lote'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validar que os alertas pertencem ao usuário
        alertas = self.get_queryset().filter(
            id__in=ids,
            status__in=['ativo', 'lido']
        )
        
        resolvidos = 0
        for alerta in alertas:
            # Validar ownership antes de resolver
            if not PermissionValidator.validate_product_ownership(request.user, alerta.produto):
                continue
            alerta.resolver(request.user, observacao_sanitizada)
            resolvidos += 1
        
        # Log seguro da operação em lote
        safe_log_data({
            'event': 'alertas_resolvidos_lote',
            'total_solicitado': len(ids),
            'total_resolvido': resolvidos,
            'user_id': request.user.id
        }, 'info')
        
        return Response({
            'sucesso': True,
            'mensagem': f'{resolvidos} alertas resolvidos com sucesso',
            'total_resolvidos': resolvidos
        })
    
    @action(detail=False, methods=['get'])
    def resumo(self, request):
        """Resumo dos alertas por status e prioridade"""
        queryset = self.get_queryset()
        
        # Por status
        por_status = queryset.values('status').annotate(
            total=Count('id')
        ).order_by('status')
        
        # Por prioridade (apenas ativos)
        por_prioridade = queryset.filter(status='ativo').values('prioridade').annotate(
            total=Count('id')
        ).order_by('prioridade')
        
        # Por tipo (apenas ativos)
        por_tipo = queryset.filter(status='ativo').values('tipo_alerta').annotate(
            total=Count('id')
        ).order_by('-total')
        
        # Alertas críticos não resolvidos
        criticos = queryset.filter(
            prioridade='critica',
            status='ativo'
        ).count()
        
        return Response({
            'total_alertas': queryset.count(),
            'alertas_ativos': queryset.filter(status='ativo').count(),
            'alertas_criticos': criticos,
            'por_status': list(por_status),
            'por_prioridade': list(por_prioridade),
            'por_tipo': list(por_tipo)
        })


# ===== WEBHOOK ENDPOINTS =====

@csrf_exempt
@api_view(['POST'])
@require_http_methods(["POST"])
def shopify_order_webhook(request):
    """
    Endpoint webhook SEGURO para receber pedidos do Shopify
    
    SEGURANÇA IMPLEMENTADA:
    1. Rate limiting por IP e domínio da loja
    2. Validação HMAC OBRIGATÓRIA (nunca é pulada)
    3. Validação rigorosa de headers Shopify
    4. Logs sanitizados (sem dados sensíveis)
    5. Detecção de requisições suspeitas
    """
    ip_address = request.META.get('REMOTE_ADDR', 'unknown')
    
    try:
        # SEGURANÇA: Rate limiting manual para webhooks
        from django.core.cache import cache
        throttle_key = f"webhook_throttle:{ip_address}"
        requests_count = cache.get(throttle_key, 0)
        
        if requests_count >= 60:  # Máximo 60 requests por minuto por IP
            logger.warning(f"SECURITY: Rate limit exceeded for IP {ip_address}")
            return JsonResponse({
                'success': False, 
                'message': 'Rate limit exceeded'
            }, status=429)
        
        cache.set(throttle_key, requests_count + 1, timeout=60)
        
        # SEGURANÇA: Validação completa da requisição
        is_valid, error_message = ShopifyWebhookService.validate_webhook_request(request)
        if not is_valid:
            logger.error(f"SECURITY: Webhook validation failed - {error_message} - IP: {ip_address}")
            return JsonResponse({
                'success': False,
                'message': f'Validação falhou: {error_message}'
            }, status=400)
        
        # Obter headers após validação
        shopify_topic = request.META.get('HTTP_X_SHOPIFY_TOPIC', '')
        shopify_shop_domain = request.META.get('HTTP_X_SHOPIFY_SHOP_DOMAIN', '')
        shopify_signature = request.META.get('HTTP_X_SHOPIFY_HMAC_SHA256', '')
        
        # Log seguro (sem dados sensíveis)
        safe_log_data({
            'event': 'webhook_received',
            'topic': shopify_topic,
            'shop_domain': shopify_shop_domain,
            'ip': ip_address,
            'has_signature': bool(shopify_signature)
        }, 'info')
        
        # Obter dados do payload
        try:
            webhook_payload = json.loads(request.body.decode('utf-8'))
        except json.JSONDecodeError as e:
            logger.error(f"Erro ao decodificar JSON do webhook: {str(e)}")
            return JsonResponse({
                'success': False, 
                'message': 'Payload JSON inválido'
            }, status=400)
        
        # Buscar configuração da loja
        loja_config = ShopifyWebhookService.get_shop_config_by_domain(shopify_shop_domain)
        if not loja_config:
            logger.error(f"SECURITY: Loja não encontrada para domínio: {shopify_shop_domain}")
            return JsonResponse({
                'success': False, 
                'message': f'Loja não encontrada: {shopify_shop_domain}'
            }, status=404)
        
        # VALIDAÇÃO HMAC OBRIGATÓRIA - NUNCA É PULADA
        webhook_secret = getattr(loja_config, 'webhook_secret', None)
        
        if not webhook_secret:
            logger.error(f"SECURITY: Webhook secret não configurado para loja {shopify_shop_domain} - REJEITADO")
            return JsonResponse({
                'success': False, 
                'message': 'Webhook secret não configurado - contate o suporte'
            }, status=401)
        
        # Validação HMAC é SEMPRE obrigatória
        if not ShopifyWebhookService.verify_webhook_signature(
            request.body, shopify_signature, webhook_secret
        ):
            logger.error(f"SECURITY: Assinatura HMAC inválida para loja {shopify_shop_domain} - POSSÍVEL ATAQUE")
            return JsonResponse({
                'success': False, 
                'message': 'Assinatura inválida'
            }, status=401)
        
        # Extrair dados do pedido
        order_data = ShopifyWebhookService.extract_order_data(webhook_payload)
        
        # Verificar se deve processar o pedido
        should_process, reason = ShopifyWebhookService.should_process_order(order_data)
        if not should_process:
            logger.info(f"Pedido {order_data.get('order_number')} não processado: {reason}")
            return JsonResponse({
                'success': True,
                'message': f'Pedido não processado: {reason}',
                'order_number': order_data.get('order_number')
            })
        
        # Processar o pedido para decremento de estoque
        result = EstoqueService.processar_venda_webhook(loja_config, order_data)
        
        # Log do resultado
        ShopifyWebhookService.log_webhook_received(
            shop_domain=shopify_shop_domain,
            order_id=str(order_data.get('shopify_order_id')),
            event_type=shopify_topic,
            success=result['success'],
            details={
                'items_processados': result['items_processados'],
                'items_com_erro': result['items_com_erro'],
                'alertas_gerados': len(result['alertas_gerados']),
                'message': result['message']
            }
        )
        
        # Retornar resposta
        return JsonResponse({
            'success': result['success'],
            'message': result['message'],
            'order_number': result['order_number'],
            'items_processados': result['items_processados'],
            'items_com_erro': result['items_com_erro'],
            'alertas_gerados': len(result['alertas_gerados'])
        }, status=200 if result['success'] else 206)  # 206 = Partial Content para sucesso parcial
        
    except Exception as e:
        logger.error(f"Erro no webhook do Shopify: {str(e)}")
        
        # Log de erro
        ShopifyWebhookService.log_webhook_received(
            shop_domain=shopify_shop_domain or 'unknown',
            order_id='unknown',
            event_type=shopify_topic or 'unknown',
            success=False,
            details={'error': str(e)}
        )
        
        return JsonResponse({
            'success': False,
            'message': 'Erro interno do servidor',
            'error': str(e) if logger.level <= logging.DEBUG else None
        }, status=500)


@csrf_exempt  
@api_view(['GET'])
def webhook_status(request):
    """
    Endpoint de status para verificar se o webhook está funcionando
    """
    try:
        from features.processamento.models import ShopifyConfig
        
        # Contar lojas configuradas
        total_lojas = ShopifyConfig.objects.filter(ativo=True).count()
        
        # Obter estatísticas recentes de processamento  
        from django.db.models import Count
        from datetime import timedelta
        
        data_limite = timezone.now() - timedelta(days=7)
        movimentacoes_recentes = MovimentacaoEstoque.objects.filter(
            tipo_movimento='venda',
            origem_sync='shopify_webhook',
            data_movimentacao__gte=data_limite
        ).count()
        
        alertas_ativos = AlertaEstoque.objects.filter(
            status='ativo'
        ).count()
        
        return JsonResponse({
            'status': 'operational',
            'timestamp': timezone.now().isoformat(),
            'estatisticas': {
                'lojas_configuradas': total_lojas,
                'vendas_processadas_7d': movimentacoes_recentes,
                'alertas_ativos': alertas_ativos
            },
            'endpoints': {
                'webhook_order': '/api/estoque/webhook/order-created/',
                'webhook_status': '/api/estoque/webhook/status/'
            }
        })
        
    except Exception as e:
        logger.error(f"Erro no status do webhook: {str(e)}")
        return JsonResponse({
            'status': 'error',
            'message': str(e),
            'timestamp': timezone.now().isoformat()
        }, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def webhook_stats(request):
    """
    Endpoint SEGURO para obter estatísticas detalhadas do processamento de webhooks
    """
    try:
        from datetime import timedelta
        
        # Aplicar throttling para API sensível
        throttle = EstoqueAPIRateThrottle()
        if not throttle.allow_request(request, None):
            return Response({
                'erro': 'Muitas consultas às estatísticas. Tente novamente mais tarde.'
            }, status=status.HTTP_429_TOO_MANY_REQUESTS)
        
        # Parâmetros de filtro com validação
        try:
            days = int(request.query_params.get('days', 30))
            if days < 1 or days > 365:  # Limitar para prevenir queries pesadas
                days = 30
        except (ValueError, TypeError):
            days = 30
            
        loja_id = request.query_params.get('loja_id')
        
        data_inicio = timezone.now() - timedelta(days=days)
        
        # Filtros base
        filtros = {
            'tipo_movimento': 'venda',
            'origem_sync': 'shopify_webhook',
            'data_movimentacao__gte': data_inicio
        }
        
        # SEGURANÇA: Validar acesso à loja se especificada
        if loja_id:
            try:
                loja_id = int(loja_id)
                from features.processamento.models import ShopifyConfig
                loja_config = ShopifyConfig.objects.filter(id=loja_id).first()
                if loja_config and not PermissionValidator.validate_store_ownership(request.user, loja_config):
                    return Response({
                        'erro': 'Você não tem permissão para visualizar estatísticas desta loja'
                    }, status=status.HTTP_403_FORBIDDEN)
                filtros['produto__loja_config_id'] = loja_id
            except (ValueError, TypeError):
                return Response({
                    'erro': 'ID da loja inválido'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        # SEGURANÇA: Sempre filtrar por usuário (exceto superuser)
        if not request.user.is_superuser:
            filtros['produto__user'] = request.user
        
        # Estatísticas com queries otimizadas
        movimentacoes = MovimentacaoEstoque.objects.filter(**filtros).select_related(
            'produto__loja_config'
        )
        
        # Usar aggregate para operações mais eficientes
        stats_aggregated = movimentacoes.aggregate(
            total_vendas=Count('id'),
            total_itens=Sum('quantidade'),
            produtos_unicos=Count('produto', distinct=True)
        )
        
        stats = {
            'periodo_dias': days,
            'data_inicio': data_inicio.isoformat(),
            'total_vendas_processadas': stats_aggregated['total_vendas'] or 0,
            'total_itens_vendidos': stats_aggregated['total_itens'] or 0,
            'produtos_diferentes': stats_aggregated['produtos_unicos'] or 0
        }
        
        # Por loja com otimização
        por_loja = movimentacoes.values(
            'produto__loja_config__nome_loja',
            'produto__loja_config_id'
        ).annotate(
            vendas=Count('id'),
            itens_vendidos=Sum('quantidade')
        ).order_by('-vendas')
        
        stats['por_loja'] = list(por_loja)
        
        # Por produto (top 10) com otimização
        por_produto = movimentacoes.values(
            'produto__sku',
            'produto__nome'
        ).annotate(
            vendas=Count('id'),
            itens_vendidos=Sum('quantidade')
        ).order_by('-itens_vendidos')[:10]
        
        stats['top_produtos'] = list(por_produto)
        
        # Log seguro da consulta
        safe_log_data({
            'event': 'webhook_stats_consulted',
            'user_id': request.user.id,
            'days': days,
            'loja_id': loja_id,
            'total_vendas': stats['total_vendas_processadas']
        }, 'info')
        
        return Response(stats)
        
    except Exception as e:
        logger.error(f"Erro ao obter estatísticas do webhook: {str(e)}")
        return Response({
            'error': str(e)
        }, status=500)