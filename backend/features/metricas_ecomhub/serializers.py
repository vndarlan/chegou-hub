# backend/features/metricas_ecomhub/serializers.py - COM SUPORTE A "TODOS"
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
    """Serializer para processamento via Selenium - COM SUPORTE A TODOS"""
    data_inicio = serializers.DateField(required=True)
    data_fim = serializers.DateField(required=True)
    pais_id = serializers.CharField(required=True)
    
    def validate(self, data):
        """Validação geral"""
        # Validar países aceitos
        paises_validos = ['164', '41', '66', '82', '142', 'todos']
        if data['pais_id'] not in paises_validos:
            raise serializers.ValidationError({
                'pais_id': f"País inválido. Valores aceitos: {', '.join(paises_validos)}"
            })
        
        # Validar datas
        if data['data_inicio'] > data['data_fim']:
            raise serializers.ValidationError("Data de início deve ser anterior à data fim")
        
        # Validação adicional para período muito longo quando usar "todos"
        if data['pais_id'] == 'todos':
            delta = data['data_fim'] - data['data_inicio']
            if delta.days > 30:  # Máximo 30 dias para "todos"
                raise serializers.ValidationError(
                    "Para consulta de todos os países, período máximo é 30 dias"
                )
        
        return data