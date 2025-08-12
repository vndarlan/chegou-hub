from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
from .models import AnalisePrimeCOD, StatusMappingPrimeCOD
from .serializers import (
    AnalisePrimeCODSerializer, 
    CSVUploadPrimeCODSerializer, 
    ProcessarAnalisePrimeCODSerializer,
    StatusMappingPrimeCODSerializer
)
from .utils import PrimeCODProcessor
import pandas as pd
import json
import re
from collections import defaultdict

class AnalisePrimeCODViewSet(viewsets.ModelViewSet):
    serializer_class = AnalisePrimeCODSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = AnalisePrimeCOD.objects.all().order_by('-atualizado_em')
        
        # Filtro por tipo para compatibilidade frontend
        tipo = self.request.query_params.get('tipo', None)
        if tipo:
            queryset = queryset.filter(tipo=tipo)
            
        return queryset
    
    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def upload_csv(self, request):
        """Upload e processamento inicial de CSV"""
        serializer = CSVUploadPrimeCODSerializer(data=request.data)
        if serializer.is_valid():
            try:
                df = serializer.process_csv()
                tipo_arquivo = serializer.validated_data['tipo_arquivo']
                
                if tipo_arquivo == 'leads':
                    resultado = PrimeCODProcessor.process_leads_file(df)
                elif tipo_arquivo == 'orders':
                    resultado = PrimeCODProcessor.process_orders_file(df)
                
                return Response({
                    'status': 'success',
                    'tipo': tipo_arquivo,
                    'dados_processados': resultado['dados'],
                    'estatisticas': resultado.get('stats', {}),
                    'status_nao_mapeados': resultado.get('unmapped_statuses', [])
                })
                
            except Exception as e:
                return Response({
                    'status': 'error',
                    'message': f"Erro no processamento: {str(e)}"
                }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def processar_analise(self, request):
        """Processa dados e salva análise completa"""
        serializer = ProcessarAnalisePrimeCODSerializer(data=request.data)
        if serializer.is_valid():
            try:
                data = serializer.validated_data
                
                # Criar análise combinada
                resultado = self._criar_analise_primecod(data)
                
                # Salvar análise
                analise_data = {
                    'nome': data['nome_analise'],
                    'tipo': data.get('tipo', 'PRIMECOD'),
                    'criado_por': request.user
                }
                
                # Compatibilidade: aceitar dados_processados ou campos separados
                if data.get('dados_processados'):
                    analise_data['dados_processados'] = data['dados_processados']
                    # Também popular campos específicos se possível
                    if data.get('dados_leads'):
                        analise_data['dados_leads'] = data['dados_leads']
                    if data.get('dados_orders'):
                        analise_data['dados_orders'] = data['dados_orders']
                else:
                    # Modo legacy
                    analise_data['dados_leads'] = data.get('dados_leads')
                    analise_data['dados_orders'] = data.get('dados_orders')
                
                # Adicionar dados de efetividade se calculados
                if resultado.get('dados_efetividade'):
                    analise_data['dados_efetividade'] = resultado['dados_efetividade']
                    # Se não tem dados_processados, usar efetividade
                    if not analise_data.get('dados_processados'):
                        analise_data['dados_processados'] = resultado['dados_efetividade']
                
                analise = AnalisePrimeCOD.objects.create(**analise_data)
                
                # Serializar resposta com compatibilidade
                serializer = AnalisePrimeCODSerializer(analise)
                return Response({
                    'status': 'success',
                    'analise_id': analise.id,
                    'analise': serializer.data,
                    'message': f"Análise '{analise.nome}' salva com sucesso!"
                })
                
            except Exception as e:
                return Response({
                    'status': 'error',
                    'message': f"Erro ao processar análise: {str(e)}"
                }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def _criar_analise_primecod(self, data):
        """Cria análise combinada Prime COD"""
        leads_data = data['dados_leads']
        orders_data = data.get('dados_orders', {})
        
        if not orders_data:
            return {'dados_efetividade': None}
        
        # Criar tabela de efetividade
        efetividade_data = []
        
        for lead_row in leads_data:
            if lead_row["Product"] == "Total":
                continue
                
            product = lead_row["Product"]
            confirmed = lead_row["Confirmed"]
            total_minus_dup = lead_row["Total - duplicados"]
            
            order_info = orders_data.get(product, {})
            delivered = order_info.get("Delivered", 0)
            
            efetividade = (delivered / total_minus_dup * 100) if total_minus_dup > 0 else 0
            
            row = {
                "Product": product,
                "Confirmed (Leads)": confirmed,
                "Delivered": delivered,
                **{k: v for k, v in order_info.items() if k != "Delivered"},
                "Efetividade": f"{efetividade:.0f}%"
            }
            efetividade_data.append(row)
        
        # Adicionar totais para efetividade
        if efetividade_data:
            totals = {"Product": "Total"}
            numeric_cols = [k for k in efetividade_data[0].keys() if k not in ["Product", "Efetividade"]]
            
            for col in numeric_cols:
                totals[col] = sum(row[col] for row in efetividade_data)
            
            total_delivered = totals["Delivered"]
            total_leads = sum(row["Total - duplicados"] for row in leads_data if row["Product"] != "Total")
            efetividade_media = (total_delivered / total_leads * 100) if total_leads > 0 else 0
            totals["Efetividade"] = f"{efetividade_media:.0f}% (Média)"
            
            efetividade_data.append(totals)
        
        return {'dados_efetividade': efetividade_data}

class StatusMappingPrimeCODViewSet(viewsets.ModelViewSet):
    queryset = StatusMappingPrimeCOD.objects.all()
    serializer_class = StatusMappingPrimeCODSerializer
    permission_classes = [permissions.IsAuthenticated]
