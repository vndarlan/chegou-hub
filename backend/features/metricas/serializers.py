# backend/features/metricas/serializers.py
from rest_framework import serializers
from .models import AnaliseEfetividade, StatusMapping
import pandas as pd
import json
import re
import io

class AnaliseEfetividadeSerializer(serializers.ModelSerializer):
    criado_por_nome = serializers.CharField(source='criado_por.get_full_name', read_only=True)
    
    class Meta:
        model = AnaliseEfetividade
        fields = [
            'id', 'nome', 'tipo', 'descricao', 'dados_leads', 'dados_efetividade',
            'criado_por', 'criado_por_nome', 'criado_em', 'atualizado_em'
        ]
        read_only_fields = ['criado_por', 'criado_em', 'atualizado_em']

    def create(self, validated_data):
        validated_data['criado_por'] = self.context['request'].user
        return super().create(validated_data)


class CSVUploadSerializer(serializers.Serializer):
    arquivo = serializers.FileField()
    tipo_arquivo = serializers.ChoiceField(choices=['leads', 'orders', 'ecomhub'])
    
    def validate_arquivo(self, value):
        # Verificar se é CSV
        if not value.name.endswith('.csv'):
            raise serializers.ValidationError("Apenas arquivos CSV são permitidos.")
        
        # Verificar tamanho (máximo 10MB)
        if value.size > 10 * 1024 * 1024:
            raise serializers.ValidationError("Arquivo muito grande. Máximo 10MB.")
        
        return value
    
    def process_csv(self):
        """Processa o arquivo CSV e retorna DataFrame"""
        arquivo = self.validated_data['arquivo']
        tipo_arquivo = self.validated_data['tipo_arquivo']
        
        try:
            # Tentar diferentes encodings
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
            
            # Criar DataFrame
            df = pd.read_csv(io.StringIO(content))
            
            # Validações específicas por tipo
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
            
            elif tipo_arquivo == 'ecomhub':
                required_columns = ['store', 'status']
                missing = [col for col in required_columns if not any(col.lower() in c.lower() for c in df.columns)]
                if missing:
                    raise serializers.ValidationError(f"Colunas obrigatórias não encontradas para ecomhub: {missing}")
            
            return df
            
        except Exception as e:
            raise serializers.ValidationError(f"Erro ao processar CSV: {str(e)}")


class ProcessarAnaliseSerializer(serializers.Serializer):
    nome_analise = serializers.CharField(max_length=255)
    tipo = serializers.ChoiceField(choices=['PRIMECOD', 'ECOMHUB'])
    dados_leads = serializers.JSONField(required=False, allow_null=True)
    dados_orders = serializers.JSONField(required=False, allow_null=True)
    dados_ecomhub = serializers.JSONField(required=False, allow_null=True)
    
    def validate(self, data):
        tipo = data.get('tipo')
        
        if tipo == 'PRIMECOD':
            if not data.get('dados_leads'):
                raise serializers.ValidationError("Dados de leads são obrigatórios para análise PRIMECOD.")
        
        elif tipo == 'ECOMHUB':
            if not data.get('dados_ecomhub'):
                raise serializers.ValidationError("Dados ECOMHUB são obrigatórios para análise ECOMHUB.")
        
        return data


class StatusMappingSerializer(serializers.ModelSerializer):
    class Meta:
        model = StatusMapping
        fields = '__all__'