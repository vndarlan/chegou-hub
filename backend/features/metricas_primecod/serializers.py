from rest_framework import serializers
from .models import AnalisePrimeCOD, StatusMappingPrimeCOD, PrimeCODCatalogProduct, PrimeCODCatalogSnapshot, PrimeCODConfig
import pandas as pd
import json
import re
import io
from datetime import date, timedelta
from django.db.models import F

class AnalisePrimeCODSerializer(serializers.ModelSerializer):
    criado_por_nome = serializers.CharField(source='criado_por.get_full_name', read_only=True)
    
    class Meta:
        model = AnalisePrimeCOD
        fields = [
            'id', 'nome', 'descricao', 'tipo', 'dados_leads', 'dados_orders', 
            'dados_efetividade', 'dados_processados', 'criado_por', 'criado_por_nome', 
            'criado_em', 'atualizado_em'
        ]
        read_only_fields = ['criado_por', 'criado_em', 'atualizado_em']

    def create(self, validated_data):
        validated_data['criado_por'] = self.context['request'].user
        
        # Garantir compatibilidade frontend - dados_processados como fallback
        if not validated_data.get('dados_processados'):
            # Prioridade: efetividade > leads > orders
            if validated_data.get('dados_efetividade'):
                validated_data['dados_processados'] = validated_data['dados_efetividade']
            elif validated_data.get('dados_leads'):
                validated_data['dados_processados'] = validated_data['dados_leads']
            elif validated_data.get('dados_orders'):
                validated_data['dados_processados'] = validated_data['dados_orders']
                
        return super().create(validated_data)
    
    def to_representation(self, instance):
        """Garantir compatibilidade na leitura"""
        data = super().to_representation(instance)
        
        # Se dados_processados está vazio, usar fallback
        if not data.get('dados_processados'):
            if data.get('dados_efetividade'):
                data['dados_processados'] = data['dados_efetividade']
            elif data.get('dados_leads'):
                data['dados_processados'] = data['dados_leads']
            elif data.get('dados_orders'):
                data['dados_processados'] = data['dados_orders']
                
        return data

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
    dados_leads = serializers.JSONField(required=False, allow_null=True)
    dados_orders = serializers.JSONField(required=False, allow_null=True)
    dados_processados = serializers.JSONField(required=False, allow_null=True)
    tipo = serializers.CharField(default='PRIMECOD', required=False)
    
    def validate(self, data):
        # Compatibilidade: aceitar dados_processados OU dados_leads
        if not data.get('dados_leads') and not data.get('dados_processados'):
            raise serializers.ValidationError(
                "É obrigatório fornecer 'dados_leads' ou 'dados_processados' para análise Prime COD."
            )
        return data

class StatusMappingPrimeCODSerializer(serializers.ModelSerializer):
    class Meta:
        model = StatusMappingPrimeCOD
        fields = '__all__'


# ===========================================
# SERIALIZERS PARA CATÁLOGO PRIMECOD
# ===========================================

class PrimeCODCatalogProductSerializer(serializers.ModelSerializer):
    """
    Serializer completo para produtos do catálogo PrimeCOD
    Inclui variações calculadas (hoje vs ontem)
    """

    # Campos computados
    quantity_delta = serializers.SerializerMethodField()
    units_sold_delta = serializers.SerializerMethodField()
    profit_margin = serializers.ReadOnlyField()
    profit_per_unit = serializers.ReadOnlyField()

    class Meta:
        model = PrimeCODCatalogProduct
        fields = [
            'id', 'primecod_id', 'sku', 'name', 'description',
            'quantity', 'stock_label', 'total_units_sold', 'total_orders',
            'price', 'cost', 'countries', 'images',
            'is_new', 'first_seen_at',
            'quantity_delta', 'units_sold_delta',
            'profit_margin', 'profit_per_unit',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'first_seen_at']

    def get_quantity_delta(self, obj):
        """Calcula variação de estoque vs ontem"""
        yesterday = date.today() - timedelta(days=1)
        snapshot_ontem = obj.snapshots.filter(snapshot_date=yesterday).first()

        if snapshot_ontem:
            return obj.quantity - snapshot_ontem.quantity
        return 0

    def get_units_sold_delta(self, obj):
        """Calcula variação de vendas vs ontem"""
        yesterday = date.today() - timedelta(days=1)
        snapshot_ontem = obj.snapshots.filter(snapshot_date=yesterday).first()

        if snapshot_ontem:
            return obj.total_units_sold - snapshot_ontem.total_units_sold
        return 0


class PrimeCODCatalogProductResumoSerializer(serializers.ModelSerializer):
    """
    Serializer resumido para listagem de produtos do catálogo
    """

    quantity_delta = serializers.SerializerMethodField()
    units_sold_delta = serializers.SerializerMethodField()

    class Meta:
        model = PrimeCODCatalogProduct
        fields = [
            'id', 'primecod_id', 'sku', 'name',
            'quantity', 'stock_label', 'total_units_sold',
            'price', 'cost', 'countries',
            'is_new', 'quantity_delta', 'units_sold_delta',
            'updated_at'
        ]

    def get_quantity_delta(self, obj):
        """Calcula variação de estoque vs ontem"""
        yesterday = date.today() - timedelta(days=1)
        snapshot_ontem = obj.snapshots.filter(snapshot_date=yesterday).first()

        if snapshot_ontem:
            return obj.quantity - snapshot_ontem.quantity
        return 0

    def get_units_sold_delta(self, obj):
        """Calcula variação de vendas vs ontem"""
        yesterday = date.today() - timedelta(days=1)
        snapshot_ontem = obj.snapshots.filter(snapshot_date=yesterday).first()

        if snapshot_ontem:
            return obj.total_units_sold - snapshot_ontem.total_units_sold
        return 0


class PrimeCODCatalogSnapshotSerializer(serializers.ModelSerializer):
    """
    Serializer para snapshots de produtos do catálogo
    """

    product_sku = serializers.CharField(source='product.sku', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    quantity_delta = serializers.ReadOnlyField()
    units_sold_delta = serializers.ReadOnlyField()

    class Meta:
        model = PrimeCODCatalogSnapshot
        fields = [
            'id', 'product', 'product_sku', 'product_name',
            'quantity', 'total_units_sold', 'snapshot_date',
            'quantity_delta', 'units_sold_delta',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class PrimeCODConfigSerializer(serializers.ModelSerializer):
    """Serializer para configuração da API PrimeCOD"""
    updated_by_nome = serializers.CharField(source='updated_by.get_full_name', read_only=True)
    token_mascarado = serializers.SerializerMethodField()

    class Meta:
        model = PrimeCODConfig
        fields = [
            'id', 'api_token', 'is_active', 'updated_by', 'updated_by_nome',
            'token_mascarado', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'updated_by', 'created_at', 'updated_at']
        extra_kwargs = {
            'api_token': {'write_only': True}
        }

    def get_token_mascarado(self, obj):
        """Retorna token parcialmente mascarado para exibição"""
        if obj.api_token:
            token = obj.api_token
            if len(token) > 8:
                return f"{'*' * (len(token) - 4)}{token[-4:]}"
            return '*' * len(token)
        return None

    def create(self, validated_data):
        validated_data['updated_by'] = self.context['request'].user
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data['updated_by'] = self.context['request'].user
        return super().update(instance, validated_data)