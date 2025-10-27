# backend/features/metricas_ecomhub/serializers.py - COM SISTEMA DE TRACKING DE STATUS
from rest_framework import serializers
from .models import AnaliseEcomhub, PedidoStatusAtual, HistoricoStatus, ConfiguracaoStatusTracking

class AnaliseEcomhubSerializer(serializers.ModelSerializer):
    criado_por_nome = serializers.CharField(source='criado_por.get_full_name', read_only=True)
    
    class Meta:
        model = AnaliseEcomhub
        fields = [
            'id', 'nome', 'descricao', 'dados_efetividade', 'tipo_metrica',
            'criado_por', 'criado_por_nome', 'criado_em', 'atualizado_em'
        ]
        read_only_fields = ['criado_por', 'criado_em', 'atualizado_em']

    def create(self, validated_data):
        validated_data['criado_por'] = self.context['request'].user
        return super().create(validated_data)


class ProcessamentoSeleniumSerializer(serializers.Serializer):
    data_inicio = serializers.DateField(required=True)
    data_fim = serializers.DateField(required=True)
    pais_id = serializers.CharField(required=True)
    
    def validate_pais_id(self, value):
        # PAÍSES VÁLIDOS ATUALIZADOS + República Checa (44) + Polônia (139)
        paises_validos = ['164', '41', '66', '82', '142', '44', '139', 'todos']
        if value not in paises_validos:
            raise serializers.ValidationError(f"País inválido. Aceitos: {paises_validos}")
        return value
    
    def validate(self, data):
        if data['data_inicio'] > data['data_fim']:
            raise serializers.ValidationError("Data início deve ser anterior à data fim")
        return data


class HistoricoStatusSerializer(serializers.ModelSerializer):
    """Serializer para histórico de mudanças de status"""
    
    class Meta:
        model = HistoricoStatus
        fields = [
            'id', 'status_anterior', 'status_novo', 'data_mudanca', 
            'tempo_no_status_anterior', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class PedidoStatusAtualSerializer(serializers.ModelSerializer):
    """Serializer para status atual dos pedidos"""
    
    historico = HistoricoStatusSerializer(many=True, read_only=True)
    nivel_alerta_display = serializers.CharField(source='get_nivel_alerta_display', read_only=True)
    tempo_no_status_dias = serializers.SerializerMethodField()
    is_ativo = serializers.ReadOnlyField()
    is_finalizado = serializers.ReadOnlyField()
    
    class Meta:
        model = PedidoStatusAtual
        fields = [
            'id', 'pedido_id', 'status_atual', 'customer_name', 'customer_email',
            'customer_phone', 'produto_nome', 'pais', 'preco', 'data_criacao',
            'data_ultima_atualizacao', 'shopify_order_number', 'tracking_url',
            'tempo_no_status_atual', 'nivel_alerta', 'nivel_alerta_display',
            'tempo_no_status_dias', 'is_ativo', 'is_finalizado', 
            'created_at', 'updated_at', 'historico'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'nivel_alerta']
    
    def get_tempo_no_status_dias(self, obj):
        """Converte tempo de horas para dias com decimais"""
        return round(obj.tempo_no_status_atual / 24, 1) if obj.tempo_no_status_atual else 0


class PedidoStatusResumoSerializer(serializers.ModelSerializer):
    """Serializer resumido para listagem de pedidos"""
    
    nivel_alerta_display = serializers.CharField(source='get_nivel_alerta_display', read_only=True)
    tempo_no_status_dias = serializers.SerializerMethodField()
    is_ativo = serializers.ReadOnlyField()
    is_finalizado = serializers.ReadOnlyField()
    
    class Meta:
        model = PedidoStatusAtual
        fields = [
            'id', 'pedido_id', 'status_atual', 'customer_name', 'produto_nome',
            'pais', 'preco', 'data_criacao', 'shopify_order_number',
            'tempo_no_status_atual', 'nivel_alerta', 'nivel_alerta_display',
            'tempo_no_status_dias', 'is_ativo', 'is_finalizado', 'updated_at'
        ]
    
    def get_tempo_no_status_dias(self, obj):
        """Converte tempo de horas para dias com decimais"""
        return round(obj.tempo_no_status_atual / 24, 1) if obj.tempo_no_status_atual else 0


class ConfiguracaoStatusTrackingSerializer(serializers.ModelSerializer):
    """Serializer para configurações do sistema"""
    
    class Meta:
        model = ConfiguracaoStatusTracking
        fields = [
            'id', 'limite_amarelo_padrao', 'limite_vermelho_padrao', 'limite_critico_padrao',
            'limite_amarelo_entrega', 'limite_vermelho_entrega', 'limite_critico_entrega',
            'intervalo_sincronizacao', 'ultima_sincronizacao', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class DashboardMetricasSerializer(serializers.Serializer):
    """Serializer para dados do dashboard de métricas - FOCADO EM PEDIDOS ATIVOS"""
    
    # Contadores por nível de alerta - APENAS ATIVOS
    total_pedidos_ativos = serializers.IntegerField()
    alertas_criticos = serializers.IntegerField()
    alertas_vermelhos = serializers.IntegerField()
    alertas_amarelos = serializers.IntegerField()
    pedidos_normais_ativos = serializers.IntegerField()
    
    # Distribuições
    distribuicao_status = serializers.DictField()
    distribuicao_categorias = serializers.DictField()
    
    # Métricas de tempo
    tempo_medio_por_status = serializers.DictField()
    
    # Pedidos com mais tempo parado
    pedidos_mais_tempo = PedidoStatusResumoSerializer(many=True)
    
    # Estatísticas por país
    estatisticas_pais = serializers.DictField()
    
    # Métricas de eficiência
    total_todos_pedidos = serializers.IntegerField()
    pedidos_finalizados = serializers.IntegerField()
    pedidos_entregues = serializers.IntegerField()
    eficiencia_entrega_pct = serializers.FloatField()
    taxa_problemas_pct = serializers.FloatField()
    
    # Última sincronização
    ultima_sincronizacao = serializers.DateTimeField(allow_null=True)


class SincronizacaoStatusSerializer(serializers.Serializer):
    """Serializer para parâmetros de sincronização"""
    
    data_inicio = serializers.DateField(required=False, help_text="Data início (opcional, padrão: 30 dias atrás)")
    data_fim = serializers.DateField(required=False, help_text="Data fim (opcional, padrão: hoje)")
    pais_id = serializers.CharField(required=False, default='todos', help_text="ID do país ou 'todos'")
    forcar_sincronizacao = serializers.BooleanField(default=False, help_text="Forçar sincronização mesmo se recente")
    
    def validate_pais_id(self, value):
        """Valida país ID"""
        paises_validos = ['164', '41', '66', '82', '142', '44', '139', 'todos']
        if value not in paises_validos:
            raise serializers.ValidationError(f"País inválido. Aceitos: {paises_validos}")
        return value
    
    def validate(self, data):
        """Validações gerais"""
        if data.get('data_inicio') and data.get('data_fim'):
            if data['data_inicio'] > data['data_fim']:
                raise serializers.ValidationError("Data início deve ser anterior à data fim")
        return data


class FiltrosPedidosSerializer(serializers.Serializer):
    """Serializer para filtros de listagem de pedidos"""
    
    pais = serializers.CharField(required=False, help_text="Filtro por país")
    status_atual = serializers.CharField(required=False, help_text="Filtro por status")
    nivel_alerta = serializers.ChoiceField(
        choices=PedidoStatusAtual.NIVEL_ALERTA_CHOICES,
        required=False,
        help_text="Filtro por nível de alerta"
    )
    tempo_minimo = serializers.IntegerField(required=False, help_text="Tempo mínimo no status (horas)")
    customer_name = serializers.CharField(required=False, help_text="Busca por nome do cliente")
    pedido_id = serializers.CharField(required=False, help_text="Busca por ID do pedido")
    data_criacao_inicio = serializers.DateField(required=False, help_text="Data criação início")
    data_criacao_fim = serializers.DateField(required=False, help_text="Data criação fim")
    incluir_finalizados = serializers.BooleanField(default=False, help_text="Incluir pedidos finalizados (padrão: false)")
    
    def validate(self, data):
        """Validações dos filtros"""
        if data.get('data_criacao_inicio') and data.get('data_criacao_fim'):
            if data['data_criacao_inicio'] > data['data_criacao_fim']:
                raise serializers.ValidationError("Data criação início deve ser anterior ao fim")
        return data

# Serializers para gerenciamento de lojas ECOMHUB
from .models import EcomhubStore
from .services import test_ecomhub_connection, get_store_country


class EcomhubStoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = EcomhubStore
        fields = [
            'id', 'name', 'token', 'secret', 'country_id', 'country_name',
            'store_id', 'myshopify_domain', 'is_active', 'last_sync',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'country_id', 'country_name', 'store_id',
                           'myshopify_domain', 'last_sync', 'created_at', 'updated_at']

    def validate(self, data):
        """Valida token e detecta país antes de salvar"""
        token = data.get('token')
        secret = data.get('secret')

        # Testar conexão
        connection_result = test_ecomhub_connection(token, secret)
        if not connection_result['success']:
            raise serializers.ValidationError({
                'token': f"Token inválido: {connection_result['error_message']}"
            })

        # Detectar país
        country_result = get_store_country(token, secret)
        if country_result['country_id']:
            data['country_id'] = country_result['country_id']
            data['country_name'] = country_result['country_name']
            data['store_id'] = connection_result['store_id']
            data['myshopify_domain'] = connection_result['myshopify_domain']

        return data


class TestConnectionSerializer(serializers.Serializer):
    """Serializer para testar conexão sem salvar"""
    token = serializers.CharField(required=True)
    secret = serializers.CharField(required=True)

    def validate(self, data):
        token = data.get('token')
        secret = data.get('secret')

        # Testar conexão
        connection_result = test_ecomhub_connection(token, secret)
        if not connection_result['success']:
            raise serializers.ValidationError({
                'error': connection_result['error_message']
            })

        # Detectar país
        country_result = get_store_country(token, secret)

        data['connection_result'] = connection_result
        data['country_result'] = country_result

        return data
