# backend/features/metricas_ecomhub/serializers.py - VERSÃO SIMPLIFICADA
from rest_framework import serializers
from .models import AnaliseEcomhub

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
    """Serializer para processamento via Selenium"""
    data_inicio = serializers.DateField(required=True)
    data_fim = serializers.DateField(required=True)
    pais_id = serializers.CharField(required=True)
    
    def validate(self, data):
        if data['data_inicio'] > data['data_fim']:
            raise serializers.ValidationError("Data de início deve ser anterior à data fim")
        return data