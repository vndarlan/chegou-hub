# backend/features/metricas_ecomhub/views.py - VERSÃO ATUALIZADA COM SHOPIFY
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
from django.utils import timezone
from .models import AnaliseEcomhub, StatusMappingEcomhub, LojaShopify, CacheProdutoShopify
from .serializers import (
    AnaliseEcomhubSerializer, 
    CSVUploadEcomhubSerializer, 
    ProcessarAnaliseEcomhubSerializer,
    StatusMappingEcomhubSerializer,
    LojaShopifySerializer,
    CacheProdutoShopifySerializer,
    TestarConexaoShopifySerializer
)
from .utils import EcomhubProcessor
from .shopify_client import ShopifyClient
import pandas as pd
import json
import logging

logger = logging.getLogger(__name__)

class LojaShopifyViewSet(viewsets.ModelViewSet):
    """ViewSet para gerenciar lojas Shopify"""
    serializer_class = LojaShopifySerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return LojaShopify.objects.filter(ativo=True).order_by('nome')
    
    @action(detail=True, methods=['post'])
    def testar_conexao(self, request, pk=None):
        """Testa conexão com loja Shopify"""
        loja = get_object_or_404(LojaShopify, pk=pk, ativo=True)
        
        try:
            success, result = loja.test_connection()
            
            if success:
                loja.testado_em = timezone.now()
                loja.ultimo_erro = None
                loja.save()
                
                return Response({
                    'status': 'success',
                    'message': 'Conexão estabelecida com sucesso!',
                    'shop_info': {
                        'name': result.get('name', ''),
                        'domain': result.get('domain', ''),
                        'currency': result.get('currency', ''),
                        'country': result.get('country_name', '')
                    }
                })
            else:
                return Response({
                    'status': 'error',
                    'message': f'Falha na conexão: {result}'
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Erro ao testar conexão: {e}")
            return Response({
                'status': 'error',
                'message': f'Erro inesperado: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'])
    def limpar_cache(self, request, pk=None):
        """Limpa cache de produtos da loja"""
        loja = get_object_or_404(LojaShopify, pk=pk, ativo=True)
        
        try:
            client = ShopifyClient(loja)
            deleted_count = client.clear_cache()
            
            return Response({
                'status': 'success',
                'message': f'Cache limpo: {deleted_count} produtos removidos'
            })
            
        except Exception as e:
            logger.error(f"Erro ao limpar cache: {e}")
            return Response({
                'status': 'error',
                'message': f'Erro ao limpar cache: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def lojas_ativas(self, request):
        """Lista apenas lojas ativas para seleção"""
        lojas = LojaShopify.objects.filter(ativo=True).order_by('nome')
        serializer = self.get_serializer(lojas, many=True)
        return Response(serializer.data)

class AnaliseEcomhubViewSet(viewsets.ModelViewSet):
    serializer_class = AnaliseEcomhubSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return AnaliseEcomhub.objects.all().order_by('-atualizado_em')
    
    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def upload_csv(self, request):
        """Upload e processamento de CSV com opção Shopify"""
        serializer = CSVUploadEcomhubSerializer(data=request.data)
        if serializer.is_valid():
            try:
                df = serializer.process_csv()
                modo = serializer.validated_data.get('modo_processamento', 'produto')
                loja_shopify = serializer.validated_data.get('loja_shopify')
                
                logger.info(f"Processando arquivo em modo: {modo}")
                
                resultado = EcomhubProcessor.process_ecomhub_file(df, modo, loja_shopify)
                
                response_data = {
                    'status': 'success',
                    'tipo': 'ecomhub',
                    'modo_processamento': modo,
                    'dados_processados': resultado['dados'],
                    'estatisticas': resultado['stats']
                }
                
                # Adicionar informações específicas do modo produto
                if modo == 'produto' and loja_shopify:
                    response_data['loja_shopify'] = {
                        'id': loja_shopify.id,
                        'nome': loja_shopify.nome
                    }
                    
                    if 'produtos_nao_encontrados' in resultado:
                        response_data['produtos_nao_encontrados'] = resultado['produtos_nao_encontrados']
                
                return Response(response_data)
                
            except Exception as e:
                logger.error(f"Erro no processamento: {e}")
                return Response({
                    'status': 'error',
                    'message': f"Erro no processamento: {str(e)}"
                }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def processar_analise(self, request):
        """Processa dados e salva análise completa"""
        serializer = ProcessarAnaliseEcomhubSerializer(data=request.data)
        if serializer.is_valid():
            try:
                data = serializer.validated_data
                
                # Salvar análise
                analise = AnaliseEcomhub.objects.create(
                    nome=data['nome_analise'],
                    dados_efetividade=data['dados_ecomhub'],
                    tipo_metrica=data.get('tipo_metrica', 'produto'),
                    loja_shopify=data.get('loja_shopify'),
                    criado_por=request.user
                )
                
                response_data = {
                    'status': 'success',
                    'analise_id': analise.id,
                    'message': f"Análise '{analise.nome}' salva com sucesso!"
                }
                
                # Adicionar informações da loja se aplicável
                if analise.loja_shopify:
                    response_data['loja_shopify'] = analise.loja_shopify.nome
                
                return Response(response_data)
                
            except Exception as e:
                logger.error(f"Erro ao processar análise: {e}")
                return Response({
                    'status': 'error',
                    'message': f"Erro ao processar análise: {str(e)}"
                }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def por_tipo(self, request):
        """Lista análises filtradas por tipo de métrica"""
        tipo = request.query_params.get('tipo', 'produto')
        analises = self.get_queryset().filter(tipo_metrica=tipo)
        serializer = self.get_serializer(analises, many=True)
        return Response(serializer.data)

class StatusMappingEcomhubViewSet(viewsets.ModelViewSet):
    queryset = StatusMappingEcomhub.objects.all()
    serializer_class = StatusMappingEcomhubSerializer
    permission_classes = [permissions.IsAuthenticated]

class CacheProdutoShopifyViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet somente leitura para cache de produtos"""
    serializer_class = CacheProdutoShopifySerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        loja_id = self.request.query_params.get('loja_id')
        queryset = CacheProdutoShopify.objects.all()
        
        if loja_id:
            queryset = queryset.filter(loja_shopify_id=loja_id)
        
        return queryset.order_by('-atualizado_em')
    
    @action(detail=False, methods=['get'])
    def estatisticas(self, request):
        """Estatísticas do cache"""
        loja_id = request.query_params.get('loja_id')
        queryset = self.get_queryset()
        
        if loja_id:
            queryset = queryset.filter(loja_shopify_id=loja_id)
        
        total_cache = queryset.count()
        lojas_com_cache = queryset.values('loja_shopify__nome').distinct().count()
        
        return Response({
            'total_produtos_cache': total_cache,
            'lojas_com_cache': lojas_com_cache,
            'ultima_atualizacao': queryset.first().atualizado_em if queryset.exists() else None
        })