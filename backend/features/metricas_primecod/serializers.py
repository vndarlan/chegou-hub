from rest_framework import serializers
from .models import AnalisePrimeCOD, StatusMappingPrimeCOD
import pandas as pd
import json
import re
import io

class AnalisePrimeCODSerializer(serializers.ModelSerializer):
    criado_por_nome = serializers.CharField(source='criado_por.get_full_name', read_only=True)
    
    class Meta:
        model = AnalisePrimeCOD
        fields = [
            'id', 'nome', 'descricao', 'dados_leads', 'dados_orders', 'dados_efetividade',
            'criado_por', 'criado_por_nome', 'criado_em', 'atualizado_em'
        ]
        read_only_fields = ['criado_por', 'criado_em', 'atualizado_em']

    def create(self, validated_data):
        validated_data['criado_por'] = self.context['request'].user
        return super().create(validated_data)

class CSVUploadPrimeCODSerializer(serializers.Serializer):
    arquivo = serializers.FileField()
    tipo_arquivo = serializers.ChoiceField(choices=['leads', 'orders'])
    
    def validate_arquivo(self, value):
        if not value.name.endswith('.csv'):
            raise serializers.ValidationError("Apenas arquivos CSV são permitidos.")
        
        if value.size > 10 * 1024 * 1024:
            raise serializers.ValidationError("Arquivo muito grande. Máximo 10MB.")
        
        return value
    
    def process_csv(self):
        arquivo = self.validated_data['arquivo']
        tipo_arquivo = self.validated_data['tipo_arquivo']
        
        try:
            content = None
            for encoding in ['utf-8', 'latin1', 'iso-8859-1']:
                try:
                    arquivo.seek(0)
                    content = arquivo.read().decode(encoding)
                    break
                except UnicodeDecodeError:
                    continue
            
            if not content:
                raise serializers.ValidationError("Não foi possível decodificar o arquivo CSV.")
            
            df = pd.read_csv(io.StringIO(content))
            
            if tipo_arquivo == 'leads':
                required_columns = ['product', 'confirmation_status']
                missing = [col for col in required_columns if not any(col.lower() in c.lower() for c in df.columns)]
                if missing:
                    raise serializers.ValidationError(f"Colunas obrigatórias não encontradas para leads: {missing}")
            
            elif tipo_arquivo == 'orders':
                required_columns = ['product', 'shipping_status']
                missing = [col for col in required_columns if not any(col.lower() in c.lower() for c in df.columns)]
                if missing:
                    raise serializers.ValidationError(f"Colunas obrigatórias não encontradas para orders: {missing}")
            
            return df
            
        except Exception as e:
            raise serializers.ValidationError(f"Erro ao processar CSV: {str(e)}")

class ProcessarAnalisePrimeCODSerializer(serializers.Serializer):
    nome_analise = serializers.CharField(max_length=255)
    dados_leads = serializers.JSONField(required=True)
    dados_orders = serializers.JSONField(required=False, allow_null=True)
    
    def validate(self, data):
        if not data.get('dados_leads'):
            raise serializers.ValidationError("Dados de leads são obrigatórios para análise Prime COD.")
        return data

class StatusMappingPrimeCODSerializer(serializers.ModelSerializer):
    class Meta:
        model = StatusMappingPrimeCOD
        fields = '__all__'