# backend/features/metricas_ecomhub/serializers.py - CORREÇÃO FINAL
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
    data_inicio = serializers.DateField(required=True)
    data_fim = serializers.DateField(required=True)
    pais_id = serializers.CharField(required=True)
    
    def validate_pais_id(self, value):
        paises_validos = ['164', '41', '66', '82', '142', 'todos']
        if value not in paises_validos:
            raise serializers.ValidationError(f"País inválido. Aceitos: {paises_validos}")
        return value
    
    def validate(self, data):
        if data['data_inicio'] > data['data_fim']:
            raise serializers.ValidationError("Data início deve ser anterior à data fim")
        return data