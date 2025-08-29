# backend/features/estoque/serializers.py
from rest_framework import serializers
from .models import ProdutoEstoque, MovimentacaoEstoque, AlertaEstoque
from features.processamento.models import ShopifyConfig


class ProdutoEstoqueSerializer(serializers.ModelSerializer):
    """Serializer para produtos em estoque"""
    
    # Campos calculados
    estoque_disponivel = serializers.ReadOnlyField()
    estoque_baixo = serializers.ReadOnlyField()
    necessita_reposicao = serializers.ReadOnlyField()
    valor_total_estoque = serializers.ReadOnlyField()
    
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
        
        return data
    
    def validate_loja_config(self, value):
        """Validar se a loja pertence ao usuário"""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            if value.user != request.user:
                raise serializers.ValidationError(
                    'Você não tem permissão para usar esta configuração de loja.'
                )
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
            'estoque_atual_produto', 'usuario_responsavel', 'responsavel_nome',
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
            'estoque_atual_produto', 'responsavel_nome', 'resolvido_por_nome',
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
        request = self.context.get('request')
        if not request or not hasattr(request, 'user'):
            raise serializers.ValidationError('Usuário não autenticado.')
        
        try:
            produto = ProdutoEstoque.objects.get(id=value, user=request.user)
            return value
        except ProdutoEstoque.DoesNotExist:
            raise serializers.ValidationError('Produto não encontrado ou não pertence ao usuário.')
    
    def validate(self, data):
        """Validações específicas por tipo de movimento"""
        produto = ProdutoEstoque.objects.get(id=data['produto_id'])
        tipo = data['tipo_movimento']
        quantidade = data['quantidade']
        
        # Validar se há estoque suficiente para saídas
        if tipo in ['saida', 'venda', 'perda', 'transferencia']:
            if quantidade > produto.estoque_atual:
                raise serializers.ValidationError({
                    'quantidade': f'Quantidade insuficiente em estoque. Disponível: {produto.estoque_atual}'
                })
        
        return data
    
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
        if obj.estoque_atual == 0:
            return 'zerado'
        elif obj.estoque_baixo:
            return 'baixo'
        else:
            return 'ok'