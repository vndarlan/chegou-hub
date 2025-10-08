# backend/features/estoque/serializers.py
from rest_framework import serializers
from .models import (
    ProdutoEstoque, MovimentacaoEstoque,
    Produto, ProdutoSKU, ProdutoLoja, 
    MovimentacaoEstoqueCompartilhado
)
from features.processamento.models import ShopifyConfig


class ProdutoEstoqueSerializer(serializers.ModelSerializer):
    """Serializer para produtos em estoque"""
    
    # Campos calculados
    estoque_disponivel = serializers.ReadOnlyField()
    estoque_baixo = serializers.ReadOnlyField()
    necessita_reposicao = serializers.ReadOnlyField()
    valor_total_estoque = serializers.ReadOnlyField()
    
    # Novos campos para estoque negativo
    estoque_negativo = serializers.ReadOnlyField()
    pedidos_pendentes = serializers.ReadOnlyField()
    
    # Informações da loja
    loja_nome = serializers.CharField(source='loja_config.nome_loja', read_only=True)
    loja_url = serializers.CharField(source='loja_config.shop_url', read_only=True)
    
    # Campos para compatibilidade com interface unificada
    tipo_produto = serializers.SerializerMethodField(
        help_text="Tipo do produto: 'compartilhado' ou 'individual'"
    )
    lojas_conectadas = serializers.SerializerMethodField(
        help_text="Lista das lojas onde o produto está conectado"
    )
    
    # Contadores relacionados
    total_movimentacoes = serializers.SerializerMethodField()
    class Meta:
        model = ProdutoEstoque
        fields = [
            'id', 'sku', 'nome', 'fornecedor', 'loja_config', 'loja_nome', 'loja_url',
            'shopify_product_id', 'shopify_variant_id',
            'estoque_inicial', 'estoque_atual', 'estoque_minimo', 'estoque_maximo',
            'estoque_disponivel', 'estoque_baixo', 'necessita_reposicao',
            'estoque_negativo', 'pedidos_pendentes',
            'alerta_estoque_baixo', 'alerta_estoque_zero',
            'sync_shopify_enabled', 'ultima_sincronizacao', 'erro_sincronizacao',
            'ativo', 'custo_unitario', 'preco_venda', 'valor_total_estoque',
            'data_criacao', 'data_atualizacao', 'observacoes',
            'tipo_produto', 'lojas_conectadas',
            'total_movimentacoes',         ]
        read_only_fields = [
            'id', 'data_criacao', 'data_atualizacao', 'ultima_sincronizacao',
            'shopify_product_id', 'shopify_variant_id', 'erro_sincronizacao',
            'estoque_disponivel', 'estoque_baixo', 'necessita_reposicao',
            'estoque_negativo', 'pedidos_pendentes',
            'valor_total_estoque', 'loja_nome', 'loja_url',
            'tipo_produto', 'lojas_conectadas',
            'total_movimentacoes',         ]
    
    def get_total_movimentacoes(self, obj):
        """Retorna o total de movimentações do produto"""
        return obj.movimentacoes.count()
    def get_tipo_produto(self, obj):
        """Retorna o tipo do produto para interface unificada"""
        return 'individual'
    
    def get_lojas_conectadas(self, obj):
        """Retorna lista das lojas onde o produto está conectado"""
        return [
            {
                'id': obj.loja_config.id,
                'nome_loja': obj.loja_config.nome_loja,
                'shop_url': obj.loja_config.shop_url
            }
        ]
    
    def validate(self, data):
        """Validações customizadas"""
        # Validar estoque mínimo
        if data.get('estoque_minimo', 0) < 0:
            raise serializers.ValidationError({
                'estoque_minimo': 'Estoque mínimo não pode ser negativo.'
            })
        
        # Validar estoque máximo se fornecido
        estoque_maximo = data.get('estoque_maximo')
        estoque_minimo = data.get('estoque_minimo', 0)
        if estoque_maximo is not None and estoque_maximo <= estoque_minimo:
            raise serializers.ValidationError({
                'estoque_maximo': 'Estoque máximo deve ser maior que o mínimo.'
            })
        
        # Validar preços
        custo_unitario = data.get('custo_unitario')
        preco_venda = data.get('preco_venda')
        if custo_unitario is not None and custo_unitario < 0:
            raise serializers.ValidationError({
                'custo_unitario': 'Custo unitário não pode ser negativo.'
            })
        if preco_venda is not None and preco_venda < 0:
            raise serializers.ValidationError({
                'preco_venda': 'Preço de venda não pode ser negativo.'
            })
        
        # Validar unicidade de SKU em todo o sistema
        sku = data.get('sku')
        if sku:
            from .models import ProdutoSKU

            # Verificar se SKU já existe em produtos compartilhados
            existing_sku = ProdutoSKU.objects.filter(sku=sku).first()
            if existing_sku:
                raise serializers.ValidationError({
                    'sku': f'SKU "{sku}" já pertence ao produto compartilhado "{existing_sku.produto.nome}". SKUs devem ser únicos em todo o sistema.'
                })

            # Verificar se SKU já existe em outros produtos individuais
            existing_individual = ProdutoEstoque.objects.filter(sku=sku)

            # Se está editando, excluir o próprio produto da validação
            if self.instance:
                existing_individual = existing_individual.exclude(id=self.instance.id)

            existing_individual = existing_individual.first()
            if existing_individual:
                raise serializers.ValidationError({
                    'sku': f'SKU "{sku}" já pertence ao produto individual "{existing_individual.nome}" na loja "{existing_individual.loja_config.nome_loja}". SKUs devem ser únicos em todo o sistema.'
                })
        
        return data
    
    def validate_loja_config(self, value):
        """Validar se a loja existe"""
        if value is None:
            return value
            
        # Permitir qualquer usuário cadastrar produtos em qualquer loja
        # A validação de permissão foi removida para permitir maior flexibilidade
        return value


class MovimentacaoEstoqueSerializer(serializers.ModelSerializer):
    """Serializer para movimentações de estoque"""
    
    # Informações do produto
    produto_sku = serializers.CharField(source='produto.sku', read_only=True)
    produto_nome = serializers.CharField(source='produto.nome', read_only=True)
    loja_nome = serializers.CharField(source='produto.loja_config.nome_loja', read_only=True)
    
    # Informações do usuário
    usuario_nome = serializers.CharField(source='usuario.username', read_only=True)
    
    # Campo para exibir o sinal da quantidade
    quantidade_formatada = serializers.SerializerMethodField()
    
    class Meta:
        model = MovimentacaoEstoque
        fields = [
            'id', 'produto', 'produto_sku', 'produto_nome', 'loja_nome',
            'usuario', 'usuario_nome', 'tipo_movimento',
            'quantidade', 'quantidade_formatada', 'estoque_anterior', 'estoque_posterior',
            'observacoes', 'pedido_shopify_id', 'custo_unitario', 'valor_total',
            'origem_sync', 'dados_sync', 'data_movimentacao', 'ip_origem'
        ]
        read_only_fields = [
            'id', 'produto_sku', 'produto_nome', 'loja_nome',
            'usuario_nome', 'estoque_anterior', 'estoque_posterior',
            'valor_total', 'data_movimentacao', 'quantidade_formatada'
        ]
    
    def get_quantidade_formatada(self, obj):
        """Retorna quantidade com sinal para melhor visualização"""
        if obj.tipo_movimento in ['entrada', 'devolucao', 'ajuste']:
            return f"+{obj.quantidade}"
        else:
            return f"-{obj.quantidade}"


# AlertaEstoqueSerializer removido - Sistema de alertas desativado


class MovimentacaoEstoqueCreateSerializer(serializers.Serializer):
    """Serializer especializado para criar movimentações de estoque"""
    
    produto_id = serializers.IntegerField()
    tipo_movimento = serializers.ChoiceField(choices=MovimentacaoEstoque.TIPO_MOVIMENTO_CHOICES)
    quantidade = serializers.IntegerField(min_value=1)
    observacoes = serializers.CharField(max_length=1000, required=False, allow_blank=True)
    custo_unitario = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)
    pedido_shopify_id = serializers.IntegerField(required=False, allow_null=True)
    
    def validate_produto_id(self, value):
        """Validar se o produto existe e pertence ao usuário"""
        import logging
        logger = logging.getLogger(__name__)
        
        request = self.context.get('request')
        if not request or not hasattr(request, 'user'):
            logger.error(f"Validação produto_id {value}: usuário não autenticado")
            raise serializers.ValidationError('Usuário não autenticado.')
        
        try:
            produto = ProdutoEstoque.objects.get(id=value, user=request.user)
            logger.info(f"Validação produto_id {value}: produto válido - {produto.sku}")
            return value
        except ProdutoEstoque.DoesNotExist:
            logger.error(f"Validação produto_id {value}: produto não encontrado para usuário {request.user.id}")
            raise serializers.ValidationError('Produto não encontrado ou não pertence ao usuário.')
    
    def validate(self, data):
        """Validações específicas por tipo de movimento"""
        import logging
        logger = logging.getLogger(__name__)
        
        try:
            produto = ProdutoEstoque.objects.get(id=data['produto_id'])
            tipo = data['tipo_movimento']
            quantidade = data['quantidade']
            
            logger.info(f"Validação movimentação: produto {produto.sku}, tipo {tipo}, quantidade {quantidade}, estoque_atual {produto.estoque_atual}")
            
            # REMOVIDO: Validação que impedia estoque negativo
            # Agora permite vendas mesmo sem estoque para visualizar pedidos pendentes
            if tipo in ['saida', 'venda', 'perda', 'transferencia']:
                logger.info(f"Movimentação de saída permitida - pode gerar estoque negativo para rastreamento de pedidos pendentes")
            
            return data
        except Exception as e:
            logger.error(f"Erro na validação da movimentação: {str(e)}")
            raise
    
    def create(self, validated_data):
        """Criar movimentação e atualizar estoque"""
        request = self.context.get('request')
        produto = ProdutoEstoque.objects.get(id=validated_data['produto_id'])
        
        tipo_movimento = validated_data['tipo_movimento']
        quantidade = validated_data['quantidade']
        observacoes = validated_data.get('observacoes', '')
        custo_unitario = validated_data.get('custo_unitario')
        pedido_shopify_id = validated_data.get('pedido_shopify_id')
        
        # Executar movimentação baseada no tipo
        if tipo_movimento in ['entrada', 'devolucao']:
            produto.adicionar_estoque(
                quantidade=quantidade,
                observacao=observacoes,
                pedido_shopify_id=pedido_shopify_id
            )
        elif tipo_movimento in ['saida', 'venda', 'perda', 'transferencia']:
            produto.remover_estoque(
                quantidade=quantidade,
                observacao=observacoes,
                pedido_shopify_id=pedido_shopify_id
            )
        elif tipo_movimento == 'ajuste':
            # Para ajustes, calcular diferença
            diferenca = quantidade - produto.estoque_atual
            if diferenca > 0:
                produto.adicionar_estoque(
                    quantidade=diferenca,
                    observacao=f"Ajuste: {observacoes}",
                    pedido_shopify_id=pedido_shopify_id
                )
            elif diferenca < 0:
                produto.remover_estoque(
                    quantidade=abs(diferenca),
                    observacao=f"Ajuste: {observacoes}",
                    pedido_shopify_id=pedido_shopify_id
                )
        
        # Buscar a movimentação criada (última do produto)
        movimentacao = produto.movimentacoes.latest('data_movimentacao')
        
        # Atualizar dados adicionais
        if custo_unitario:
            movimentacao.custo_unitario = custo_unitario
            movimentacao.save()
        
        if request:
            movimentacao.usuario = request.user
            # Capturar IP se disponível
            ip = request.META.get('HTTP_X_FORWARDED_FOR') or request.META.get('REMOTE_ADDR')
            if ip:
                movimentacao.ip_origem = ip.split(',')[0].strip()
            movimentacao.origem_sync = 'manual'
            movimentacao.save()
        
        return movimentacao


class ProdutoEstoqueResumoSerializer(serializers.ModelSerializer):
    """Serializer resumido para listagens rápidas"""
    
    loja_nome = serializers.CharField(source='loja_config.nome_loja', read_only=True)
    status_estoque = serializers.SerializerMethodField()
    
    class Meta:
        model = ProdutoEstoque
        fields = [
            'id', 'sku', 'nome', 'fornecedor', 'loja_nome', 'estoque_atual',
            'estoque_minimo', 'status_estoque', 'ativo'
        ]
    
    def get_status_estoque(self, obj):
        """Status simplificado do estoque"""
        if obj.estoque_atual < 0:
            return 'negativo'
        elif obj.estoque_atual == 0:
            return 'zerado'
        elif obj.estoque_baixo:
            return 'baixo'
        else:
            return 'ok'


# ======= NOVOS SERIALIZERS PARA ESTOQUE COMPARTILHADO =======

class ProdutoSKUSerializer(serializers.ModelSerializer):
    """Serializer para SKUs de produtos"""
    
    class Meta:
        model = ProdutoSKU
        fields = [
            'id', 'sku', 'descricao_variacao', 'ativo',
            'data_criacao', 'data_atualizacao'
        ]
        read_only_fields = ['id', 'data_criacao', 'data_atualizacao']
    
    def validate_sku(self, value):
        """Validar se SKU é único em todo o sistema"""
        if not value:
            return value

        # Se está editando, excluir o próprio registro da validação
        if self.instance:
            existing = ProdutoSKU.objects.filter(sku=value).exclude(id=self.instance.id)
        else:
            existing = ProdutoSKU.objects.filter(sku=value)

        existing = existing.first()
        if existing:
            raise serializers.ValidationError(
                f'SKU "{value}" já pertence ao produto "{existing.produto.nome}". SKUs devem ser únicos em todo o sistema.'
            )

        return value


class ProdutoLojaSerializer(serializers.ModelSerializer):
    """Serializer para relacionamento produto-loja"""
    
    # Informações da loja
    loja_nome = serializers.CharField(source='loja.nome_loja', read_only=True)
    loja_url = serializers.CharField(source='loja.shop_url', read_only=True)
    
    class Meta:
        model = ProdutoLoja
        fields = [
            'id', 'loja', 'loja_nome', 'loja_url',
            'shopify_product_id', 'shopify_variant_id',
            'sync_shopify_enabled', 'ultima_sincronizacao', 'erro_sincronizacao',
            'preco_venda', 'ativo',
            'data_criacao', 'data_atualizacao'
        ]
        read_only_fields = [
            'id', 'loja_nome', 'loja_url', 
            'shopify_product_id', 'shopify_variant_id',
            'ultima_sincronizacao', 'erro_sincronizacao',
            'data_criacao', 'data_atualizacao'
        ]


class ProdutoSerializer(serializers.ModelSerializer):
    """Serializer principal para produtos com estoque compartilhado"""
    
    # Campos calculados
    estoque_disponivel = serializers.ReadOnlyField()
    estoque_baixo = serializers.ReadOnlyField()
    necessita_reposicao = serializers.ReadOnlyField()
    valor_total_estoque = serializers.ReadOnlyField()
    
    # Novos campos para estoque negativo
    estoque_negativo = serializers.ReadOnlyField()
    pedidos_pendentes = serializers.ReadOnlyField()
    
    # Campos relacionados
    total_lojas = serializers.ReadOnlyField()
    todos_skus = serializers.ReadOnlyField()
    
    # Indicador de tipo para interface unificada
    tipo_produto = serializers.SerializerMethodField(
        help_text="Tipo do produto: 'compartilhado' ou 'individual'"
    )
    
    # Lojas conectadas de forma simples
    lojas_conectadas = serializers.SerializerMethodField(
        help_text="Lista simplificada das lojas onde o produto está conectado"
    )
    
    # SKUs aninhados
    skus = ProdutoSKUSerializer(many=True, read_only=True)
    skus_data = serializers.ListField(
        child=serializers.DictField(),
        write_only=True,
        required=False,
        help_text="Lista de SKUs para criar/atualizar"
    )
    
    # Lojas associadas (formato completo)
    lojas_associadas = ProdutoLojaSerializer(
        source='produtoloja_set',
        many=True,
        read_only=True
    )
    lojas_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        help_text="IDs das lojas para associar ao produto"
    )
    
    # Contadores relacionados
    total_movimentacoes = serializers.SerializerMethodField()
    class Meta:
        model = Produto
        fields = [
            'id', 'nome', 'descricao', 'fornecedor',
            'estoque_compartilhado', 'estoque_minimo', 'estoque_maximo',
            'estoque_disponivel', 'estoque_baixo', 'necessita_reposicao',
            'estoque_negativo', 'pedidos_pendentes',
            'alerta_estoque_baixo', 'alerta_estoque_zero',
            'ativo', 'custo_unitario', 'valor_total_estoque',
            'data_criacao', 'data_atualizacao', 'observacoes',
            'total_lojas', 'todos_skus', 'tipo_produto', 'lojas_conectadas',
            'skus', 'skus_data',
            'lojas_associadas', 'lojas_ids',
            'total_movimentacoes',         ]
        read_only_fields = [
            'id', 'data_criacao', 'data_atualizacao',
            'estoque_disponivel', 'estoque_baixo', 'necessita_reposicao',
            'estoque_negativo', 'pedidos_pendentes', 'valor_total_estoque',
            'total_lojas', 'todos_skus', 'tipo_produto', 'lojas_conectadas',
            'skus', 'lojas_associadas',
            'total_movimentacoes',         ]
    
    def get_total_movimentacoes(self, obj):
        """Retorna o total de movimentações do produto"""
        return obj.movimentacoes.count()
    def get_tipo_produto(self, obj):
        """Retorna o tipo do produto para interface unificada"""
        return 'compartilhado'
    
    def get_lojas_conectadas(self, obj):
        """Retorna lista simplificada das lojas conectadas"""
        lojas = obj.lojas.filter(produtoloja__ativo=True).select_related()
        return [
            {
                'id': loja.id,
                'nome_loja': loja.nome_loja,
                'shop_url': loja.shop_url
            }
            for loja in lojas
        ]
    
    def validate_lojas_ids(self, value):
        """Validar se todas as lojas existem no sistema (sem verificar proprietário)"""
        import logging
        logger = logging.getLogger(__name__)

        if not value:
            logger.info("Nenhuma loja fornecida - validação OK")
            return value

        request = self.context.get('request')
        if not request:
            logger.error("Request não encontrado no contexto")
            return value

        if not hasattr(request, 'user') or not request.user:
            logger.error("Usuário não encontrado na request")
            raise serializers.ValidationError('Usuário não autenticado.')

        logger.info(f"=== VALIDAÇÃO DE LOJAS (SEM VERIFICAÇÃO DE PROPRIETÁRIO) ===")
        logger.info(f"Usuário: {request.user.username} (ID: {request.user.id})")
        logger.info(f"Lojas solicitadas: {value}")

        # Verificar se todas as lojas existem no sistema (independente do usuário)
        lojas_validas_objs = ShopifyConfig.objects.filter(id__in=value)
        lojas_validas_ids = list(lojas_validas_objs.values_list('id', flat=True))
        lojas_validas_count = lojas_validas_objs.count()

        logger.info(f"Lojas encontradas no sistema: {lojas_validas_ids}")
        logger.info(f"Quantidade encontrada: {lojas_validas_count}")
        logger.info(f"Quantidade solicitada: {len(value)}")

        # Identificar lojas inexistentes
        lojas_inexistentes = [loja_id for loja_id in value if loja_id not in lojas_validas_ids]

        if lojas_inexistentes:
            logger.error(f"Lojas inexistentes encontradas: {lojas_inexistentes}")
            raise serializers.ValidationError(f'Lojas com IDs {lojas_inexistentes} não foram encontradas no sistema.')

        logger.info("✅ Validação de lojas aprovada - todas as lojas existem no sistema")
        return value

    def validate_skus_data(self, value):
        """Validar SKUs únicos no sistema"""
        if not value:
            return value

        # Verificar se há SKUs duplicados na mesma requisição
        skus_list = [sku_data.get('sku') for sku_data in value if sku_data.get('sku')]
        if len(skus_list) != len(set(skus_list)):
            raise serializers.ValidationError('SKUs duplicados não são permitidos no mesmo produto.')

        # Verificar se algum SKU já existe em outro produto do sistema
        from .models import ProdutoSKU

        for sku_data in value:
            sku_code = sku_data.get('sku')
            if sku_code:
                # Verificar se SKU já existe (excluindo o produto atual em caso de update)
                existing_sku = ProdutoSKU.objects.filter(sku=sku_code)

                # Se estamos fazendo update, excluir SKUs do produto atual
                if self.instance:
                    existing_sku = existing_sku.exclude(produto=self.instance)

                existing_sku = existing_sku.first()

                if existing_sku:
                    raise serializers.ValidationError({
                        'skus_data': f'SKU "{sku_code}" já pertence ao produto "{existing_sku.produto.nome}". SKUs devem ser únicos em todo o sistema.'
                    })

        return value
    
    def create(self, validated_data):
        """Criar produto com SKUs e lojas associadas"""
        import logging
        from django.db import transaction

        logger = logging.getLogger(__name__)

        try:
            logger.info(f"=== INICIANDO SERIALIZER CREATE ===")
            logger.info(f"Dados validados recebidos: {validated_data}")

            # Extrair dados aninhados
            skus_data = validated_data.pop('skus_data', [])
            lojas_ids = validated_data.pop('lojas_ids', [])

            logger.info(f"SKUs extraídos: {skus_data}")
            logger.info(f"Lojas IDs extraídos: {lojas_ids}")

            # Definir usuário
            request = self.context.get('request')
            if request and request.user:
                validated_data['user'] = request.user
                logger.info(f"Usuário definido: {request.user.username}")
            else:
                logger.error("Usuário não encontrado no contexto!")
                raise serializers.ValidationError("Usuário não encontrado")

            # VALIDAÇÃO PRÉVIA - ANTES da transação atômica
            # Verificar se TODAS as lojas existem no sistema (sem verificar proprietário)
            if lojas_ids:
                logger.info(f"=== VALIDAÇÃO PRÉVIA DE LOJAS (CREATE - SEM VERIFICAÇÃO DE PROPRIETÁRIO) ===")
                logger.info(f"Usuário: {request.user.username} (ID: {request.user.id})")
                logger.info(f"Lojas para validar: {lojas_ids}")

                # Buscar todas as lojas no sistema para debug
                todas_lojas_sistema = ShopifyConfig.objects.all().values_list('id', 'nome_loja', 'user__username')
                logger.info(f"Total de lojas no sistema: {len(list(todas_lojas_sistema))}")

                lojas_inexistentes = []
                lojas_validas = []

                for loja_id in lojas_ids:
                    logger.info(f"Validando existência da loja ID: {loja_id}")

                    loja = ShopifyConfig.objects.filter(id=loja_id).first()
                    if loja:
                        lojas_validas.append(loja)
                        logger.info(f"✅ Loja {loja.nome_loja} (ID: {loja_id}) - EXISTE (proprietário: {loja.user.username})")
                    else:
                        lojas_inexistentes.append(loja_id)
                        logger.error(f"❌ Loja ID {loja_id} - NÃO EXISTE no sistema")

                # Se há lojas inexistentes, abortar ANTES da criação
                if lojas_inexistentes:
                    logger.error(f"ABORTANDO CREATE: Lojas inexistentes: {lojas_inexistentes}")
                    raise serializers.ValidationError({
                        'lojas_ids': f'Lojas com IDs {lojas_inexistentes} não foram encontradas no sistema.'
                    })

                logger.info(f"✅ VALIDAÇÃO APROVADA: Todas as {len(lojas_validas)} lojas existem no sistema")
            else:
                logger.info("Nenhuma loja para associar - produto será criado sem lojas")

            # Usar transação para garantir atomicidade
            with transaction.atomic():
                # Criar produto
                logger.info(f"Criando produto com dados: {validated_data}")
                produto = Produto.objects.create(**validated_data)
                logger.info(f"Produto criado - ID: {produto.id}, Nome: {produto.nome}")

                # Criar SKUs
                skus_criados = 0
                for i, sku_data in enumerate(skus_data):
                    logger.info(f"Processando SKU {i+1}: {sku_data}")

                    sku_obj, created = ProdutoSKU.objects.get_or_create(
                        produto=produto,
                        sku=sku_data.get('sku'),
                        defaults={
                            'descricao_variacao': sku_data.get('descricao_variacao', ''),
                            'ativo': sku_data.get('ativo', True)
                        }
                    )

                    if created:
                        skus_criados += 1
                        logger.info(f"SKU criado: {sku_obj.sku}")
                    else:
                        logger.warning(f"SKU já existia: {sku_obj.sku}")

                logger.info(f"Total de SKUs criados: {skus_criados}")

                # Associar lojas (agora sabemos que TODAS existem no sistema)
                lojas_associadas = 0
                for loja_id in lojas_ids:
                    try:
                        logger.info(f"Tentando associar loja ID: {loja_id}")
                        # Buscar loja sem filtrar por usuário
                        loja = ShopifyConfig.objects.get(id=loja_id)

                        produto_loja, created = ProdutoLoja.objects.get_or_create(
                            produto=produto,
                            loja=loja,
                            defaults={'ativo': True}
                        )

                        if created:
                            lojas_associadas += 1
                            logger.info(f"✅ Loja {loja.nome_loja} associada com sucesso (proprietário: {loja.user.username})")
                        else:
                            logger.warning(f"⚠️ Produto já estava associado à loja: {loja.nome_loja}")

                    except ShopifyConfig.DoesNotExist:
                        # Isso não deveria acontecer mais devido à validação prévia
                        logger.error(f"❌ ERRO CRÍTICO: Loja ID {loja_id} não encontrada (falha na validação prévia)")
                        raise serializers.ValidationError(f"Erro interno: Loja {loja_id} não encontrada após validação")

                logger.info(f"Total de lojas associadas: {lojas_associadas}")

                # Verificar resultado final
                produto.refresh_from_db()
                skus_final = produto.skus.count()
                lojas_final = produto.produtoloja_set.count()

                # Validação final crítica
                if lojas_ids and lojas_final != len(lojas_ids):
                    logger.error(f"❌ FALHA CRÍTICA: Esperado {len(lojas_ids)} lojas, mas temos {lojas_final}")
                    raise serializers.ValidationError("Falha na associação de lojas - nem todas foram associadas")

                logger.info(f"=== PRODUTO CRIADO COM SUCESSO ===")
                logger.info(f"ID: {produto.id}")
                logger.info(f"Nome: {produto.nome}")
                logger.info(f"SKUs no banco: {skus_final}")
                logger.info(f"Lojas no banco: {lojas_final}")
                logger.info(f"✅ VALIDAÇÃO FINAL: {lojas_final} lojas associadas conforme esperado")

                return produto

        except Exception as e:
            logger.error(f"=== ERRO NO SERIALIZER CREATE ===")
            logger.error(f"Erro: {str(e)}")
            logger.error(f"Tipo: {type(e).__name__}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            raise
    
    def update(self, instance, validated_data):
        """Atualizar produto com SKUs e lojas associadas"""
        import logging
        logger = logging.getLogger(__name__)

        logger.info(f"Atualizando produto {instance.id} - {instance.nome}")
        logger.info(f"Dados recebidos: {validated_data}")

        # Extrair dados aninhados
        skus_data = validated_data.pop('skus_data', None)
        lojas_ids = validated_data.pop('lojas_ids', None)

        logger.info(f"SKUs data: {skus_data}")
        logger.info(f"Lojas IDs: {lojas_ids}")

        # Atualizar campos do produto
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
            logger.info(f"Atualizando campo {attr} = {value}")
        instance.save()

        # Atualizar SKUs se fornecidos
        if skus_data is not None:
            logger.info(f"Processando atualização de SKUs: {len(skus_data)} SKUs fornecidos")
            skus_para_manter = []

            for sku_data in skus_data:
                logger.info(f"Processando SKU: {sku_data}")

                if 'id' in sku_data and sku_data['id']:
                    # Atualizar SKU existente
                    try:
                        sku = instance.skus.get(id=sku_data['id'])
                        logger.info(f"Atualizando SKU existente ID {sku.id}: {sku.sku}")

                        for attr, value in sku_data.items():
                            if attr != 'id':
                                setattr(sku, attr, value)
                                logger.info(f"SKU {sku.id}: {attr} = {value}")
                        sku.save()
                        skus_para_manter.append(sku.id)
                        logger.info(f"SKU {sku.id} atualizado com sucesso")

                    except ProdutoSKU.DoesNotExist:
                        logger.warning(f"SKU com ID {sku_data['id']} não encontrado, será ignorado")
                        pass
                else:
                    # Criar novo SKU
                    logger.info(f"Criando novo SKU: {sku_data}")
                    try:
                        novo_sku = ProdutoSKU.objects.create(produto=instance, **sku_data)
                        skus_para_manter.append(novo_sku.id)
                        logger.info(f"Novo SKU criado: ID {novo_sku.id} - {novo_sku.sku}")
                    except Exception as e:
                        logger.error(f"Erro ao criar novo SKU: {str(e)}")
                        # Continua processando outros SKUs mesmo se um falhar

            logger.info(f"SKUs para manter: {skus_para_manter}")

            # Remover apenas SKUs que não estão na lista de manter
            skus_para_remover = instance.skus.exclude(id__in=skus_para_manter)
            if skus_para_remover.exists():
                logger.info(f"Removendo {skus_para_remover.count()} SKUs não incluídos na atualização")
                for sku in skus_para_remover:
                    logger.info(f"Removendo SKU: {sku.id} - {sku.sku}")
                skus_para_remover.delete()
            else:
                logger.info("Nenhum SKU para remover")
        else:
            logger.info("Nenhum dado de SKU fornecido - mantendo SKUs existentes")

        # Atualizar lojas associadas se fornecidas
        if lojas_ids is not None:
            logger.info(f"Processando atualização de lojas associadas: {lojas_ids}")

            # VALIDAÇÃO PRÉVIA - Verificar se TODAS as lojas existem no sistema (sem verificar proprietário)
            request = self.context.get('request')
            if lojas_ids:
                logger.info(f"=== VALIDAÇÃO PRÉVIA DE LOJAS (UPDATE - SEM VERIFICAÇÃO DE PROPRIETÁRIO) ===")
                lojas_inexistentes = []
                lojas_validas = []

                for loja_id in lojas_ids:
                    logger.info(f"Validando existência da loja ID: {loja_id}")

                    loja = ShopifyConfig.objects.filter(id=loja_id).first()
                    if loja:
                        lojas_validas.append(loja)
                        logger.info(f"✅ Loja {loja.nome_loja} (ID: {loja_id}) - EXISTE (proprietário: {loja.user.username})")
                    else:
                        lojas_inexistentes.append(loja_id)
                        logger.error(f"❌ Loja ID {loja_id} - NÃO EXISTE no sistema")

                # Se há lojas inexistentes, abortar ANTES de alterar associações
                if lojas_inexistentes:
                    logger.error(f"ABORTANDO ATUALIZAÇÃO: Lojas inexistentes: {lojas_inexistentes}")
                    raise serializers.ValidationError({
                        'lojas_ids': f'Lojas com IDs {lojas_inexistentes} não foram encontradas no sistema.'
                    })

                logger.info(f"✅ VALIDAÇÃO APROVADA: Todas as {len(lojas_validas)} lojas existem no sistema")

            # Remover associações existentes
            associacoes_removidas = instance.produtoloja_set.count()
            instance.produtoloja_set.all().delete()
            logger.info(f"Removidas {associacoes_removidas} associações existentes")

            # Criar novas associações (agora sabemos que TODAS existem no sistema)
            lojas_associadas = 0
            for loja_id in lojas_ids:
                try:
                    logger.info(f"Tentando associar loja ID: {loja_id}")
                    # Buscar loja sem filtrar por usuário
                    loja = ShopifyConfig.objects.get(id=loja_id)
                    ProdutoLoja.objects.create(produto=instance, loja=loja)
                    lojas_associadas += 1
                    logger.info(f"✅ Loja {loja.nome_loja} associada com sucesso (proprietário: {loja.user.username})")
                except ShopifyConfig.DoesNotExist:
                    # Isso não deveria acontecer mais devido à validação prévia
                    logger.error(f"❌ ERRO CRÍTICO: Loja ID {loja_id} não encontrada (falha na validação prévia)")
                    raise serializers.ValidationError(f"Erro interno: Loja {loja_id} não encontrada após validação")

            # Validação final crítica
            lojas_final = instance.produtoloja_set.count()
            if lojas_ids and lojas_final != len(lojas_ids):
                logger.error(f"❌ FALHA CRÍTICA: Esperado {len(lojas_ids)} lojas, mas temos {lojas_final}")
                raise serializers.ValidationError("Falha na atualização de lojas - nem todas foram associadas")

            logger.info(f"✅ UPDATE CONCLUÍDO: {lojas_associadas} lojas associadas conforme esperado")
        else:
            logger.info("Nenhuma alteração de lojas fornecida - mantendo associações existentes")

        # Log final do estado do produto
        logger.info(f"Produto atualizado - SKUs atuais: {instance.skus.count()}, Lojas: {instance.produtoloja_set.count()}")

        return instance


class MovimentacaoEstoqueCompartilhadoSerializer(serializers.ModelSerializer):
    """Serializer para movimentações do estoque compartilhado"""
    
    # Informações do produto
    produto_nome = serializers.CharField(source='produto.nome', read_only=True)
    
    # Informações da loja de origem
    loja_origem_nome = serializers.CharField(source='loja_origem.nome_loja', read_only=True)
    
    # Informações do usuário
    usuario_nome = serializers.CharField(source='usuario.username', read_only=True)
    
    # Campo para exibir o sinal da quantidade
    quantidade_formatada = serializers.SerializerMethodField()
    
    class Meta:
        model = MovimentacaoEstoqueCompartilhado
        fields = [
            'id', 'produto', 'produto_nome', 'loja_origem', 'loja_origem_nome',
            'usuario', 'usuario_nome', 'tipo_movimento',
            'quantidade', 'quantidade_formatada', 'estoque_anterior', 'estoque_posterior',
            'observacoes', 'pedido_shopify_id', 'custo_unitario', 'valor_total',
            'origem_sync', 'dados_sync', 'data_movimentacao', 'ip_origem'
        ]
        read_only_fields = [
            'id', 'produto_nome', 'loja_origem_nome',
            'usuario_nome', 'estoque_anterior', 'estoque_posterior',
            'valor_total', 'data_movimentacao', 'quantidade_formatada'
        ]
    
    def get_quantidade_formatada(self, obj):
        """Retorna quantidade com sinal para melhor visualização"""
        if obj.tipo_movimento in ['entrada', 'devolucao', 'ajuste']:
            return f"+{obj.quantidade}"
        else:
            return f"-{obj.quantidade}"


# AlertaEstoqueCompartilhadoSerializer removido - Sistema de alertas desativado


class MovimentacaoEstoqueCompartilhadoCreateSerializer(serializers.Serializer):
    """Serializer especializado para criar movimentações do estoque compartilhado"""
    
    produto_id = serializers.IntegerField()
    tipo_movimento = serializers.ChoiceField(choices=MovimentacaoEstoqueCompartilhado.TIPO_MOVIMENTO_CHOICES)
    quantidade = serializers.IntegerField(min_value=1)
    observacoes = serializers.CharField(max_length=1000, required=False, allow_blank=True)
    custo_unitario = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)
    loja_origem_id = serializers.IntegerField(required=False, allow_null=True)
    
    def validate_produto_id(self, value):
        """Validar se o produto existe e pertence ao usuário"""
        import logging
        logger = logging.getLogger(__name__)
        
        request = self.context.get('request')
        if not request or not hasattr(request, 'user'):
            logger.error(f"Validação produto_id {value}: usuário não autenticado")
            raise serializers.ValidationError('Usuário não autenticado.')
        
        try:
            produto = Produto.objects.get(id=value, user=request.user)
            logger.info(f"Validação produto_id {value}: produto válido - {produto.nome}")
            return value
        except Produto.DoesNotExist:
            logger.error(f"Validação produto_id {value}: produto não encontrado para usuário {request.user.id}")
            raise serializers.ValidationError('Produto não encontrado ou não pertence ao usuário.')
    
    def validate_loja_origem_id(self, value):
        """Validar se a loja existe e pertence ao usuário"""
        if value is None:
            return value
        
        request = self.context.get('request')
        if not request or not hasattr(request, 'user'):
            raise serializers.ValidationError('Usuário não autenticado.')
        
        try:
            ShopifyConfig.objects.get(id=value, user=request.user)
            return value
        except ShopifyConfig.DoesNotExist:
            raise serializers.ValidationError('Loja não encontrada ou não pertence ao usuário.')
    
    def create(self, validated_data):
        """Criar movimentação e atualizar estoque compartilhado"""
        request = self.context.get('request')
        produto = Produto.objects.get(id=validated_data['produto_id'])
        
        tipo_movimento = validated_data['tipo_movimento']
        quantidade = validated_data['quantidade']
        observacoes = validated_data.get('observacoes', '')
        custo_unitario = validated_data.get('custo_unitario')
        loja_origem_id = validated_data.get('loja_origem_id')
        
        # Obter loja de origem se fornecida
        loja_origem = None
        if loja_origem_id:
            try:
                loja_origem = ShopifyConfig.objects.get(id=loja_origem_id, user=request.user)
            except ShopifyConfig.DoesNotExist:
                pass  # Loja já foi validada
        
        # Executar movimentação baseada no tipo
        if tipo_movimento in ['entrada', 'devolucao']:
            produto.adicionar_estoque(
                quantidade=quantidade,
                observacao=observacoes,
                loja_origem=loja_origem
            )
        elif tipo_movimento in ['saida', 'venda', 'perda', 'transferencia']:
            produto.remover_estoque(
                quantidade=quantidade,
                observacao=observacoes,
                loja_origem=loja_origem
            )
        elif tipo_movimento == 'ajuste':
            # Para ajustes, calcular diferença
            diferenca = quantidade - produto.estoque_compartilhado
            if diferenca > 0:
                produto.adicionar_estoque(
                    quantidade=diferenca,
                    observacao=f"Ajuste: {observacoes}",
                    loja_origem=loja_origem
                )
            elif diferenca < 0:
                produto.remover_estoque(
                    quantidade=abs(diferenca),
                    observacao=f"Ajuste: {observacoes}",
                    loja_origem=loja_origem
                )
        
        # Buscar a movimentação criada (última do produto)
        movimentacao = produto.movimentacoes.latest('data_movimentacao')
        
        # Atualizar dados adicionais
        if custo_unitario:
            movimentacao.custo_unitario = custo_unitario
            movimentacao.save()
        
        if request:
            movimentacao.usuario = request.user
            # Capturar IP se disponível
            ip = request.META.get('HTTP_X_FORWARDED_FOR') or request.META.get('REMOTE_ADDR')
            if ip:
                movimentacao.ip_origem = ip.split(',')[0].strip()
            movimentacao.origem_sync = 'manual'
            movimentacao.save()
        
        return movimentacao


class ProdutoResumoSerializer(serializers.ModelSerializer):
    """Serializer resumido para listagens rápidas de produtos compartilhados"""
    
    total_skus = serializers.SerializerMethodField()
    status_estoque = serializers.SerializerMethodField()
    
    class Meta:
        model = Produto
        fields = [
            'id', 'nome', 'fornecedor', 'estoque_compartilhado',
            'estoque_minimo', 'total_lojas', 'total_skus',
            'status_estoque', 'ativo'
        ]
    
    def get_total_skus(self, obj):
        """Retorna número total de SKUs ativos"""
        return obj.skus.filter(ativo=True).count()
    
    def get_status_estoque(self, obj):
        """Status simplificado do estoque"""
        if obj.estoque_compartilhado < 0:
            return 'negativo'
        elif obj.estoque_compartilhado == 0:
            return 'zerado'
        elif obj.estoque_baixo:
            return 'baixo'
        else:
            return 'ok'


class ProdutoUnificadoSerializer(serializers.Serializer):
    """Serializer unificado para listar produtos individuais e compartilhados juntos"""
    
    id = serializers.IntegerField(read_only=True)
    nome = serializers.CharField(max_length=255)
    fornecedor = serializers.CharField(max_length=50)
    sku = serializers.SerializerMethodField()
    todos_skus = serializers.SerializerMethodField()
    
    # Campos de estoque unificados
    estoque_atual = serializers.SerializerMethodField()
    estoque_minimo = serializers.IntegerField()
    estoque_disponivel = serializers.SerializerMethodField()
    estoque_baixo = serializers.SerializerMethodField()
    estoque_negativo = serializers.SerializerMethodField()
    pedidos_pendentes = serializers.SerializerMethodField()
    
    # Campos para interface unificada
    tipo_produto = serializers.SerializerMethodField()
    lojas_conectadas = serializers.SerializerMethodField()
    
    # Status e controle
    ativo = serializers.BooleanField()
    custo_unitario = serializers.DecimalField(max_digits=10, decimal_places=2, allow_null=True)
    valor_total_estoque = serializers.SerializerMethodField()
    
    # Contadores
    total_movimentacoes = serializers.SerializerMethodField()
    # Metadados
    data_criacao = serializers.DateTimeField()
    data_atualizacao = serializers.DateTimeField()
    
    def get_sku(self, obj):
        """Retorna SKU principal do produto"""
        if hasattr(obj, 'sku'):  # ProdutoEstoque
            return obj.sku
        else:  # Produto compartilhado
            primeiro_sku = obj.skus.filter(ativo=True).first()
            return primeiro_sku.sku if primeiro_sku else 'N/A'

    def get_todos_skus(self, obj):
        """Retorna todos os SKUs do produto formatados"""
        if hasattr(obj, 'sku'):  # ProdutoEstoque
            return obj.sku
        else:  # Produto compartilhado
            skus = obj.skus.filter(ativo=True).values_list('sku', flat=True)
            return ', '.join(skus) if skus else 'N/A'
    
    def get_estoque_atual(self, obj):
        """Retorna estoque atual unificado"""
        if hasattr(obj, 'estoque_atual'):  # ProdutoEstoque
            return obj.estoque_atual
        else:  # Produto compartilhado
            return obj.estoque_compartilhado
    
    def get_estoque_disponivel(self, obj):
        """Retorna se há estoque disponível"""
        estoque_atual = self.get_estoque_atual(obj)
        return estoque_atual > 0
    
    def get_estoque_baixo(self, obj):
        """Verifica se o estoque está baixo"""
        estoque_atual = self.get_estoque_atual(obj)
        return estoque_atual <= obj.estoque_minimo
    
    def get_estoque_negativo(self, obj):
        """Verifica se o estoque está negativo"""
        estoque_atual = self.get_estoque_atual(obj)
        return estoque_atual < 0
    
    def get_pedidos_pendentes(self, obj):
        """Retorna quantidade de pedidos pendentes"""
        estoque_atual = self.get_estoque_atual(obj)
        return abs(estoque_atual) if estoque_atual < 0 else 0
    
    def get_tipo_produto(self, obj):
        """Retorna o tipo do produto"""
        if hasattr(obj, 'estoque_atual'):  # ProdutoEstoque
            return 'individual'
        else:  # Produto compartilhado
            return 'compartilhado'
    
    def get_lojas_conectadas(self, obj):
        """Retorna lojas conectadas"""
        if hasattr(obj, 'loja_config'):  # ProdutoEstoque
            return [
                {
                    'id': obj.loja_config.id,
                    'nome_loja': obj.loja_config.nome_loja,
                    'shop_url': obj.loja_config.shop_url
                }
            ]
        else:  # Produto compartilhado
            lojas = obj.lojas.filter(produtoloja__ativo=True).select_related()
            return [
                {
                    'id': loja.id,
                    'nome_loja': loja.nome_loja,
                    'shop_url': loja.shop_url
                }
                for loja in lojas
            ]
    
    def get_valor_total_estoque(self, obj):
        """Calcula valor total do estoque"""
        estoque_atual = self.get_estoque_atual(obj)
        custo = obj.custo_unitario
        return estoque_atual * custo if custo else 0
    
    def get_total_movimentacoes(self, obj):
        """Retorna total de movimentações"""
        return obj.movimentacoes.count()
    
    def get_alertas_ativos(self, obj):
        """Retorna número de alertas ativos"""
        return obj.alertas.filter(status='ativo').count()