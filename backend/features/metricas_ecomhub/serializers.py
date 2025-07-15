# backend/features/metricas_ecomhub/serializers.py - VERSÃO ATUALIZADA COM SHOPIFY
from rest_framework import serializers
from .models import AnaliseEcomhub, StatusMappingEcomhub, LojaShopify, CacheProdutoShopify
import pandas as pd
import json
import re
import io

class LojaShopifySerializer(serializers.ModelSerializer):
    criado_por_nome = serializers.CharField(source='criado_por.get_full_name', read_only=True)
    status_conexao = serializers.SerializerMethodField()
    
    class Meta:
        model = LojaShopify
        fields = [
            'id', 'nome', 'shopify_domain', 'access_token', 'api_version',
            'descricao', 'pais', 'moeda', 'ativo', 'testado_em', 'ultimo_erro',
            'criado_por', 'criado_por_nome', 'criado_em', 'atualizado_em', 'status_conexao'
        ]
        read_only_fields = ['criado_por', 'criado_em', 'atualizado_em', 'testado_em', 'ultimo_erro']
        extra_kwargs = {
            'access_token': {'write_only': True}
        }

    def get_status_conexao(self, obj):
        if obj.ultimo_erro:
            return 'erro'
        elif obj.testado_em:
            return 'conectado'
        else:
            return 'nao_testado'

    def create(self, validated_data):
        validated_data['criado_por'] = self.context['request'].user
        return super().create(validated_data)

class AnaliseEcomhubSerializer(serializers.ModelSerializer):
    criado_por_nome = serializers.CharField(source='criado_por.get_full_name', read_only=True)
    loja_shopify_nome = serializers.CharField(source='loja_shopify.nome', read_only=True)
    
    class Meta:
        model = AnaliseEcomhub
        fields = [
            'id', 'nome', 'descricao', 'dados_efetividade', 'tipo_metrica',
            'loja_shopify', 'loja_shopify_nome', 'criado_por', 'criado_por_nome', 
            'criado_em', 'atualizado_em'
        ]
        read_only_fields = ['criado_por', 'criado_em', 'atualizado_em']

    def create(self, validated_data):
        validated_data['criado_por'] = self.context['request'].user
        return super().create(validated_data)

class CSVUploadEcomhubSerializer(serializers.Serializer):
    arquivo = serializers.FileField()
    loja_shopify_id = serializers.IntegerField(required=False, allow_null=True)
    modo_processamento = serializers.ChoiceField(
        choices=[('loja', 'Por Loja'), ('produto', 'Por Produto')],
        default='produto'
    )
    
    def validate_arquivo(self, value):
        if not value.name.endswith('.csv'):
            raise serializers.ValidationError("Apenas arquivos CSV são permitidos.")
        
        if value.size > 10 * 1024 * 1024:
            raise serializers.ValidationError("Arquivo muito grande. Máximo 10MB.")
        
        return value
    
    def validate(self, data):
        modo = data.get('modo_processamento', 'produto')
        loja_id = data.get('loja_shopify_id')
        
        if modo == 'produto' and not loja_id:
            raise serializers.ValidationError(
                "Para processamento por produto, é necessário selecionar uma loja Shopify."
            )
        
        if loja_id:
            try:
                loja = LojaShopify.objects.get(id=loja_id, ativo=True)
                data['loja_shopify'] = loja
            except LojaShopify.DoesNotExist:
                raise serializers.ValidationError("Loja Shopify não encontrada ou inativa.")
        
        return data
    
    def process_csv(self):
        arquivo = self.validated_data['arquivo']
        
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
            
            # Validar colunas obrigatórias
            required_columns = ['status']
            missing = [col for col in required_columns if not any(col.lower() in c.lower() for c in df.columns)]
            if missing:
                raise serializers.ValidationError(f"Colunas obrigatórias não encontradas: {missing}")
            
            # Para modo produto, verificar se tem shopifyOrderNumber
            modo = self.validated_data.get('modo_processamento', 'produto')
            if modo == 'produto':
                shopify_cols = [col for col in df.columns if 'shopify' in col.lower() and 'order' in col.lower() and 'number' in col.lower()]
                if not shopify_cols:
                    raise serializers.ValidationError(
                        "Para processamento por produto, o arquivo deve conter a coluna 'shopifyOrderNumber'."
                    )
            
            return df
            
        except Exception as e:
            raise serializers.ValidationError(f"Erro ao processar CSV: {str(e)}")

class ProcessarAnaliseEcomhubSerializer(serializers.Serializer):
    nome_analise = serializers.CharField(max_length=255)
    dados_ecomhub = serializers.JSONField(required=True)
    tipo_metrica = serializers.ChoiceField(
        choices=[('loja', 'Por Loja'), ('produto', 'Por Produto')],
        default='produto'
    )
    loja_shopify_id = serializers.IntegerField(required=False, allow_null=True)
    
    def validate(self, data):
        if not data.get('dados_ecomhub'):
            raise serializers.ValidationError("Dados ECOMHUB são obrigatórios.")
        
        tipo = data.get('tipo_metrica', 'produto')
        loja_id = data.get('loja_shopify_id')
        
        if tipo == 'produto' and loja_id:
            try:
                loja = LojaShopify.objects.get(id=loja_id, ativo=True)
                data['loja_shopify'] = loja
            except LojaShopify.DoesNotExist:
                raise serializers.ValidationError("Loja Shopify não encontrada ou inativa.")
        
        return data

class StatusMappingEcomhubSerializer(serializers.ModelSerializer):
    class Meta:
        model = StatusMappingEcomhub
        fields = '__all__'

class CacheProdutoShopifySerializer(serializers.ModelSerializer):
    loja_nome = serializers.CharField(source='loja_shopify.nome', read_only=True)
    
    class Meta:
        model = CacheProdutoShopify
        fields = [
            'id', 'loja_shopify', 'loja_nome', 'order_number', 
            'produto_nome', 'produto_id', 'variant_id', 'sku',
            'criado_em', 'atualizado_em'
        ]

class TestarConexaoShopifySerializer(serializers.Serializer):
    loja_shopify_id = serializers.IntegerField()
    
    def validate_loja_shopify_id(self, value):
        try:
            loja = LojaShopify.objects.get(id=value, ativo=True)
            return loja
        except LojaShopify.DoesNotExist:
            raise serializers.ValidationError("Loja Shopify não encontrada ou inativa.")