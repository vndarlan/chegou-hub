from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
from .models import AnaliseEcomhub, StatusMappingEcomhub
from .serializers import (
    AnaliseEcomhubSerializer, 
    CSVUploadEcomhubSerializer, 
    ProcessarAnaliseEcomhubSerializer,
    StatusMappingEcomhubSerializer
)
from .utils import EcomhubProcessor
import pandas as pd
import json
import re
from collections import defaultdict

class AnaliseEcomhubViewSet(viewsets.ModelViewSet):
    serializer_class = AnaliseEcomhubSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return AnaliseEcomhub.objects.all().order_by('-atualizado_em')
    
    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def upload_csv(self, request):
        """Upload e processamento inicial de CSV"""
        serializer = CSVUploadEcomhubSerializer(data=request.data)
        if serializer.is_valid():
            try:
                df = serializer.process_csv()
                resultado = EcomhubProcessor.process_ecomhub_file(df)
                
                return Response({
                    'status': 'success',
                    'tipo': 'ecomhub',
                    'dados_processados': resultado['dados'],
                    'estatisticas': resultado['stats'],
                    'status_nao_mapeados': []
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
        serializer = ProcessarAnaliseEcomhubSerializer(data=request.data)
        if serializer.is_valid():
            try:
                data = serializer.validated_data
                
                # Salvar análise
                analise = AnaliseEcomhub.objects.create(
                    nome=data['nome_analise'],
                    dados_efetividade=data['dados_ecomhub'],
                    criado_por=request.user
                )
                
                return Response({
                    'status': 'success',
                    'analise_id': analise.id,
                    'message': f"Análise '{analise.nome}' salva com sucesso!"
                })
                
            except Exception as e:
                return Response({
                    'status': 'error',
                    'message': f"Erro ao processar análise: {str(e)}"
                }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class StatusMappingEcomhubViewSet(viewsets.ModelViewSet):
    queryset = StatusMappingEcomhub.objects.all()
    serializer_class = StatusMappingEcomhubSerializer
    permission_classes = [permissions.IsAuthenticated]