# backend/features/metricas_dropi/serializers.py
from rest_framework import serializers
from .models import AnaliseDropi, DropiToken

class DropiTokenSerializer(serializers.ModelSerializer):
    is_valid = serializers.ReadOnlyField()
    
    class Meta:
        model = DropiToken
        fields = ['id', 'pais', 'expires_at', 'is_valid', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']

class AnaliseDropiSerializer(serializers.ModelSerializer):
    criado_por_nome = serializers.CharField(source='criado_por.get_full_name', read_only=True)
    pais_display = serializers.CharField(source='get_pais_display', read_only=True)
    
    class Meta:
        model = AnaliseDropi
        fields = [
            'id', 'nome', 'descricao', 'dados_pedidos', 'tipo_metrica', 'pais', 'pais_display',
            'data_inicio', 'data_fim', 'user_id_dropi', 'total_pedidos',
            'criado_por', 'criado_por_nome', 'criado_em', 'atualizado_em'
        ]
        read_only_fields = ['criado_por', 'criado_em', 'atualizado_em']

    def create(self, validated_data):
        validated_data['criado_por'] = self.context['request'].user
        return super().create(validated_data)

class ProcessamentoDropiSerializer(serializers.Serializer):
    """Serializer para processamento via API direta"""
    data_inicio = serializers.DateField(required=True)
    data_fim = serializers.DateField(required=True)
    user_id = serializers.CharField(required=True)
    pais = serializers.ChoiceField(
        choices=[('mexico', 'México'), ('colombia', 'Colômbia'), ('chile', 'Chile')],
        default='mexico'
    )
    
    def validate(self, data):
        if data['data_inicio'] > data['data_fim']:
            raise serializers.ValidationError("Data de início deve ser anterior à data fim")
        return data