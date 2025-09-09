# backend/features/estoque/serializers.py
from rest_framework import serializers
from .models import (
    ProdutoEstoque, MovimentacaoEstoque, AlertaEstoque,
    Produto, ProdutoSKU, ProdutoLoja, 
    MovimentacaoEstoqueCompartilhado, AlertaEstoqueCompartilhado
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
    
    # Contadores relacionados
    total_movimentacoes = serializers.SerializerMethodField()
    alertas_ativos = serializers.SerializerMethodField()
    
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
            'total_movimentacoes', 'alertas_ativos'
        ]
        read_only_fields = [
            'id', 'data_criacao', 'data_atualizacao', 'ultima_sincronizacao',
            'shopify_product_id', 'shopify_variant_id', 'erro_sincronizacao',
            'estoque_disponivel', 'estoque_baixo', 'necessita_reposicao',
            'estoque_negativo', 'pedidos_pendentes',
            'valor_total_estoque', 'loja_nome', 'loja_url',
            'total_movimentacoes', 'alertas_ativos'
        ]
    
    def get_total_movimentacoes(self, obj):
        """Retorna o total de movimentações do produto"""
        return obj.movimentacoes.count()
    
    def get_alertas_ativos(self, obj):
        """Retorna o número de alertas ativos para o produto"""
        return obj.alertas.filter(status='ativo').count()
    
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
        
        # Validar unicidade de SKU por loja (só para criação)
        if not self.instance:  # Apenas na criação
            sku = data.get('sku')
            loja_config = data.get('loja_config')
            
            if sku and loja_config:
                # Verificar se já existe produto com mesmo SKU na mesma loja
                produto_existente = ProdutoEstoque.objects.filter(
                    sku=sku, 
                    loja_config=loja_config
                ).exists()
                
                if produto_existente:
                    raise serializers.ValidationError({
                        'sku': f'Já existe um produto com o SKU "{sku}" nesta loja.'
                    })
        else:  # Edição - validar SKU se mudou
            sku = data.get('sku')
            loja_config = data.get('loja_config', self.instance.loja_config)
            
            if sku and sku != self.instance.sku:
                # Verificar se já existe produto com mesmo SKU na mesma loja (exceto o atual)
                produto_existente = ProdutoEstoque.objects.filter(
                    sku=sku, 
                    loja_config=loja_config
                ).exclude(id=self.instance.id).exists()
                
                if produto_existente:
                    raise serializers.ValidationError({
                        'sku': f'Já existe um produto com o SKU "{sku}" nesta loja.'
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


class AlertaEstoqueSerializer(serializers.ModelSerializer):
    """Serializer para alertas de estoque"""
    
    # Informações do produto
    produto_sku = serializers.CharField(source='produto.sku', read_only=True)
    produto_nome = serializers.CharField(source='produto.nome', read_only=True)
    loja_nome = serializers.CharField(source='produto.loja_config.nome_loja', read_only=True)
    estoque_atual_produto = serializers.IntegerField(source='produto.estoque_atual', read_only=True)
    estoque_minimo_produto = serializers.IntegerField(source='produto.estoque_minimo', read_only=True)
    
    # Informações dos usuários
    responsavel_nome = serializers.CharField(source='usuario_responsavel.username', read_only=True)
    resolvido_por_nome = serializers.CharField(source='usuario_resolucao.username', read_only=True)
    
    # Campos de tempo calculados
    tempo_ativo = serializers.SerializerMethodField()
    esta_vencido = serializers.SerializerMethodField()
    
    class Meta:
        model = AlertaEstoque
        fields = [
            'id', 'produto', 'produto_sku', 'produto_nome', 'loja_nome',
            'estoque_atual_produto', 'estoque_minimo_produto', 'usuario_responsavel', 'responsavel_nome',
            'tipo_alerta', 'status', 'prioridade', 'titulo', 'descricao',
            'dados_contexto', 'valor_atual', 'valor_limite',
            'acao_sugerida', 'pode_resolver_automaticamente',
            'data_criacao', 'data_leitura', 'data_resolucao',
            'usuario_resolucao', 'resolvido_por_nome',
            'primeira_ocorrencia', 'ultima_ocorrencia', 'contador_ocorrencias',
            'tempo_ativo', 'esta_vencido'
        ]
        read_only_fields = [
            'id', 'produto_sku', 'produto_nome', 'loja_nome',
            'estoque_atual_produto', 'estoque_minimo_produto', 'responsavel_nome', 'resolvido_por_nome',
            'data_criacao', 'data_leitura', 'data_resolucao',
            'primeira_ocorrencia', 'ultima_ocorrencia', 'contador_ocorrencias',
            'tempo_ativo', 'esta_vencido'
        ]
    
    def get_tempo_ativo(self, obj):
        """Calcula há quanto tempo o alerta está ativo"""
        from django.utils import timezone
        if obj.status == 'resolvido' and obj.data_resolucao:
            delta = obj.data_resolucao - obj.data_criacao
        else:
            delta = timezone.now() - obj.data_criacao
        
        days = delta.days
        hours = delta.seconds // 3600
        
        if days > 0:
            return f"{days}d {hours}h"
        elif hours > 0:
            return f"{hours}h"
        else:
            minutes = delta.seconds // 60
            return f"{minutes}m"
    
    def get_esta_vencido(self, obj):
        """Verifica se o alerta está há muito tempo ativo"""
        from django.utils import timezone
        from datetime import timedelta
        
        if obj.status in ['resolvido', 'ignorado']:
            return False
        
        # Definir limites por prioridade
        limites = {
            'critica': timedelta(hours=2),
            'alta': timedelta(hours=12),
            'media': timedelta(days=2),
            'baixa': timedelta(days=7)
        }
        
        limite = limites.get(obj.prioridade, timedelta(days=2))
        tempo_ativo = timezone.now() - obj.data_criacao
        
        return tempo_ativo > limite


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
        """Validar se SKU é único"""
        # Se está editando, excluir o próprio registro da validação
        if self.instance:
            existing = ProdutoSKU.objects.filter(sku=value).exclude(id=self.instance.id)
        else:
            existing = ProdutoSKU.objects.filter(sku=value)
        
        if existing.exists():
            raise serializers.ValidationError(f'SKU "{value}" já existe.')
        
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
    
    # SKUs aninhados
    skus = ProdutoSKUSerializer(many=True, read_only=True)
    skus_data = serializers.ListField(
        child=serializers.DictField(),
        write_only=True,
        required=False,
        help_text="Lista de SKUs para criar/atualizar"
    )
    
    # Lojas associadas
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
    alertas_ativos = serializers.SerializerMethodField()
    
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
            'total_lojas', 'todos_skus',
            'skus', 'skus_data',
            'lojas_associadas', 'lojas_ids',
            'total_movimentacoes', 'alertas_ativos'
        ]
        read_only_fields = [
            'id', 'data_criacao', 'data_atualizacao',
            'estoque_disponivel', 'estoque_baixo', 'necessita_reposicao',
            'estoque_negativo', 'pedidos_pendentes', 'valor_total_estoque',
            'total_lojas', 'todos_skus', 'skus', 'lojas_associadas',
            'total_movimentacoes', 'alertas_ativos'
        ]
    
    def get_total_movimentacoes(self, obj):
        """Retorna o total de movimentações do produto"""
        return obj.movimentacoes.count()
    
    def get_alertas_ativos(self, obj):
        """Retorna o número de alertas ativos para o produto"""
        return obj.alertas.filter(status='ativo').count()
    
    def validate_lojas_ids(self, value):
        """Validar se todas as lojas existem e pertencem ao usuário"""
        if not value:
            return value
        
        request = self.context.get('request')
        if not request:
            return value
        
        # Verificar se todas as lojas existem e pertencem ao usuário
        lojas_validas = ShopifyConfig.objects.filter(
            id__in=value,
            user=request.user
        ).count()
        
        if lojas_validas != len(value):
            raise serializers.ValidationError('Uma ou mais lojas são inválidas ou não pertencem ao usuário.')
        
        return value
    
    def create(self, validated_data):
        """Criar produto com SKUs e lojas associadas"""
        # Extrair dados aninhados
        skus_data = validated_data.pop('skus_data', [])
        lojas_ids = validated_data.pop('lojas_ids', [])
        
        # Definir usuário
        request = self.context.get('request')
        if request and request.user:
            validated_data['user'] = request.user
        
        # Criar produto
        produto = Produto.objects.create(**validated_data)
        
        # Criar SKUs
        for sku_data in skus_data:
            ProdutoSKU.objects.create(produto=produto, **sku_data)
        
        # Associar lojas
        for loja_id in lojas_ids:
            try:
                loja = ShopifyConfig.objects.get(id=loja_id, user=request.user)
                ProdutoLoja.objects.create(produto=produto, loja=loja)
            except ShopifyConfig.DoesNotExist:
                pass  # Loja já foi validada, não deveria acontecer
        
        return produto
    
    def update(self, instance, validated_data):
        """Atualizar produto com SKUs e lojas associadas"""
        # Extrair dados aninhados
        skus_data = validated_data.pop('skus_data', None)
        lojas_ids = validated_data.pop('lojas_ids', None)
        
        # Atualizar campos do produto
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Atualizar SKUs se fornecidos
        if skus_data is not None:
            # Remover SKUs existentes não incluídos na atualização
            skus_para_manter = []
            for sku_data in skus_data:
                if 'id' in sku_data:
                    # Atualizar SKU existente
                    try:
                        sku = instance.skus.get(id=sku_data['id'])
                        for attr, value in sku_data.items():
                            if attr != 'id':
                                setattr(sku, attr, value)
                        sku.save()
                        skus_para_manter.append(sku.id)
                    except ProdutoSKU.DoesNotExist:
                        pass
                else:
                    # Criar novo SKU
                    novo_sku = ProdutoSKU.objects.create(produto=instance, **sku_data)
                    skus_para_manter.append(novo_sku.id)
            
            # Remover SKUs não incluídos
            instance.skus.exclude(id__in=skus_para_manter).delete()
        
        # Atualizar lojas associadas se fornecidas
        if lojas_ids is not None:
            # Remover associações existentes
            instance.produtoloja_set.all().delete()
            
            # Criar novas associações
            request = self.context.get('request')
            for loja_id in lojas_ids:
                try:
                    loja = ShopifyConfig.objects.get(id=loja_id, user=request.user)
                    ProdutoLoja.objects.create(produto=instance, loja=loja)
                except ShopifyConfig.DoesNotExist:
                    pass
        
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


class AlertaEstoqueCompartilhadoSerializer(serializers.ModelSerializer):
    """Serializer para alertas do estoque compartilhado"""
    
    # Informações do produto
    produto_nome = serializers.CharField(source='produto.nome', read_only=True)
    estoque_atual_produto = serializers.IntegerField(source='produto.estoque_compartilhado', read_only=True)
    estoque_minimo_produto = serializers.IntegerField(source='produto.estoque_minimo', read_only=True)
    
    # Informações dos usuários
    responsavel_nome = serializers.CharField(source='usuario_responsavel.username', read_only=True)
    resolvido_por_nome = serializers.CharField(source='usuario_resolucao.username', read_only=True)
    
    # Campos de tempo calculados
    tempo_ativo = serializers.SerializerMethodField()
    esta_vencido = serializers.SerializerMethodField()
    
    class Meta:
        model = AlertaEstoqueCompartilhado
        fields = [
            'id', 'produto', 'produto_nome',
            'estoque_atual_produto', 'estoque_minimo_produto', 'usuario_responsavel', 'responsavel_nome',
            'tipo_alerta', 'status', 'prioridade', 'titulo', 'descricao',
            'dados_contexto', 'valor_atual', 'valor_limite',
            'acao_sugerida', 'pode_resolver_automaticamente',
            'data_criacao', 'data_leitura', 'data_resolucao',
            'usuario_resolucao', 'resolvido_por_nome',
            'primeira_ocorrencia', 'ultima_ocorrencia', 'contador_ocorrencias',
            'tempo_ativo', 'esta_vencido'
        ]
        read_only_fields = [
            'id', 'produto_nome', 'estoque_atual_produto', 'estoque_minimo_produto', 
            'responsavel_nome', 'resolvido_por_nome',
            'data_criacao', 'data_leitura', 'data_resolucao',
            'primeira_ocorrencia', 'ultima_ocorrencia', 'contador_ocorrencias',
            'tempo_ativo', 'esta_vencido'
        ]
    
    def get_tempo_ativo(self, obj):
        """Calcula há quanto tempo o alerta está ativo"""
        from django.utils import timezone
        if obj.status == 'resolvido' and obj.data_resolucao:
            delta = obj.data_resolucao - obj.data_criacao
        else:
            delta = timezone.now() - obj.data_criacao
        
        days = delta.days
        hours = delta.seconds // 3600
        
        if days > 0:
            return f"{days}d {hours}h"
        elif hours > 0:
            return f"{hours}h"
        else:
            minutes = delta.seconds // 60
            return f"{minutes}m"
    
    def get_esta_vencido(self, obj):
        """Verifica se o alerta está há muito tempo ativo"""
        from django.utils import timezone
        from datetime import timedelta
        
        if obj.status in ['resolvido', 'ignorado']:
            return False
        
        # Definir limites por prioridade
        limites = {
            'critica': timedelta(hours=2),
            'alta': timedelta(hours=12),
            'media': timedelta(days=2),
            'baixa': timedelta(days=7)
        }
        
        limite = limites.get(obj.prioridade, timedelta(days=2))
        tempo_ativo = timezone.now() - obj.data_criacao
        
        return tempo_ativo > limite


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