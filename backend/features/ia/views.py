from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.utils import timezone
from django.db.models import Q, Count
from datetime import timedelta
from .models import LogEntry, TipoFerramenta, PaisNicochat
from .serializers import (
    LogEntrySerializer, CriarLogSerializer, MarcarResolvidoSerializer
)

class LogEntryViewSet(viewsets.ModelViewSet):
    queryset = LogEntry.objects.all()
    serializer_class = LogEntrySerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = LogEntry.objects.all()
        
        # Filtros via query params
        ferramenta = self.request.query_params.get('ferramenta')
        nivel = self.request.query_params.get('nivel')
        pais = self.request.query_params.get('pais')
        resolvido = self.request.query_params.get('resolvido')
        periodo = self.request.query_params.get('periodo')  # 1h, 6h, 24h, 7d, 30d
        busca = self.request.query_params.get('busca')
        
        if ferramenta:
            queryset = queryset.filter(ferramenta=ferramenta)
        
        if nivel:
            queryset = queryset.filter(nivel=nivel)
        
        if pais:
            queryset = queryset.filter(pais=pais)
        
        if resolvido is not None:
            resolvido_bool = resolvido.lower() == 'true'
            queryset = queryset.filter(resolvido=resolvido_bool)
        
        if periodo:
            now = timezone.now()
            periodo_map = {
                '1h': timedelta(hours=1),
                '6h': timedelta(hours=6),
                '24h': timedelta(days=1),
                '7d': timedelta(days=7),
                '30d': timedelta(days=30),
            }
            if periodo in periodo_map:
                since = now - periodo_map[periodo]
                queryset = queryset.filter(timestamp__gte=since)
        
        if busca:
            queryset = queryset.filter(
                Q(mensagem__icontains=busca) |
                Q(usuario_conversa__icontains=busca) |
                Q(id_conversa__icontains=busca)
            )
        
        return queryset.order_by('-timestamp')
    
    @action(detail=True, methods=['post'])
    def marcar_resolvido(self, request, pk=None):
        """Marcar/desmarcar log como resolvido"""
        log_entry = self.get_object()
        serializer = MarcarResolvidoSerializer(data=request.data)
        
        if serializer.is_valid():
            resolvido = serializer.validated_data['resolvido']
            observacoes = serializer.validated_data.get('observacoes', '')
            
            log_entry.resolvido = resolvido
            if resolvido:
                log_entry.resolvido_por = request.user
                log_entry.data_resolucao = timezone.now()
                if observacoes:
                    if not log_entry.detalhes:
                        log_entry.detalhes = {}
                    log_entry.detalhes['observacoes_resolucao'] = observacoes
            else:
                log_entry.resolvido_por = None
                log_entry.data_resolucao = None
            
            log_entry.save()
            
            return Response({
                'message': f'Log marcado como {"resolvido" if resolvido else "não resolvido"}',
                'status': 'resolvido' if resolvido else 'pendente'
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([AllowAny])  # Para permitir que Nicochat/N8N enviem logs
def criar_log_publico(request):
    """
    Endpoint público para Nicochat e N8N enviarem logs
    Usar uma API key no futuro para segurança
    """
    serializer = CriarLogSerializer(data=request.data)
    
    if serializer.is_valid():
        # Capturar IP e User-Agent automaticamente
        ip_origem = request.META.get('REMOTE_ADDR')
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        
        log_entry = serializer.save(
            ip_origem=ip_origem,
            user_agent=user_agent[:500]  # Limitar tamanho
        )
        
        response_data = LogEntrySerializer(log_entry).data
        return Response(response_data, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    """Estatísticas para dashboard"""
    now = timezone.now()
    last_24h = now - timedelta(days=1)
    last_7d = now - timedelta(days=7)
    
    # Stats gerais
    total_logs = LogEntry.objects.count()
    logs_24h = LogEntry.objects.filter(timestamp__gte=last_24h).count()
    logs_nao_resolvidos = LogEntry.objects.filter(resolvido=False).count()
    logs_criticos = LogEntry.objects.filter(
        nivel='critical', 
        timestamp__gte=last_7d
    ).count()
    
    # Stats por ferramenta
    stats_ferramentas = LogEntry.objects.filter(
        timestamp__gte=last_24h
    ).values('ferramenta').annotate(
        total=Count('id'),
        erros=Count('id', filter=Q(nivel__in=['error', 'critical'])),
        nao_resolvidos=Count('id', filter=Q(resolvido=False))
    )
    
    # Stats por país (Nicochat)
    stats_paises = LogEntry.objects.filter(
        ferramenta=TipoFerramenta.NICOCHAT,
        timestamp__gte=last_24h
    ).values('pais').annotate(
        total=Count('id'),
        erros=Count('id', filter=Q(nivel__in=['error', 'critical']))
    )
    
    return Response({
        'resumo': {
            'total_logs': total_logs,
            'logs_24h': logs_24h,
            'logs_nao_resolvidos': logs_nao_resolvidos,
            'logs_criticos_7d': logs_criticos
        },
        'por_ferramenta': list(stats_ferramentas),
        'por_pais_nicochat': list(stats_paises)
    })