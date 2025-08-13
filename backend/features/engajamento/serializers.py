# backend/features/engajamento/serializers.py
from rest_framework import serializers
from .models import Engajamento, PedidoEngajamento, ItemPedido

class EngajamentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Engajamento
        fields = ['id', 'nome', 'engajamento_id', 'tipo', 'funcionando', 'ativo', 'data_criacao']
        read_only_fields = ['data_criacao', 'criado_por']
    
    def create(self, validated_data):
        validated_data['criado_por'] = self.context['request'].user
        return super().create(validated_data)

class ItemPedidoSerializer(serializers.ModelSerializer):
    engajamento_nome = serializers.CharField(source='engajamento.nome', read_only=True)
    engajamento_tipo = serializers.CharField(source='engajamento.tipo', read_only=True)
    
    class Meta:
        model = ItemPedido
        fields = ['id', 'engajamento', 'engajamento_nome', 'engajamento_tipo', 'quantidade', 'ordem_api', 'status']

class PedidoEngajamentoSerializer(serializers.ModelSerializer):
    itens = ItemPedidoSerializer(source='itempedido_set', many=True, read_only=True)
    criado_por_nome = serializers.CharField(source='criado_por.get_full_name', read_only=True)
    criado_por_username = serializers.CharField(source='criado_por.username', read_only=True)
    
    class Meta:
        model = PedidoEngajamento
        fields = ['id', 'urls', 'status', 'total_links', 'resultado_api', 
                 'data_criacao', 'criado_por', 'criado_por_nome', 'criado_por_username', 'itens']
        read_only_fields = ['data_criacao', 'criado_por', 'resultado_api', 'total_links']

class CriarPedidoSerializer(serializers.Serializer):
    urls = serializers.CharField(help_text="URLs separadas por linha")
    engajamentos = serializers.ListField(
        child=serializers.DictField(child=serializers.CharField()),
        help_text="Lista de engajamentos com quantidades: [{'id': '1', 'quantidade': '100'}]"
    )