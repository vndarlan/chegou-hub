# backend/features/ia/views.py - VERSÃO ATUALIZADA COM PROJETOS
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.utils import timezone
from django.db.models import Q, Count, Sum, Avg, F
from django.contrib.auth.models import User
from datetime import timedelta
from decimal import Decimal

from .models import (
    LogEntry, TipoFerramenta, PaisNicochat,
    ProjetoIA, VersaoProjeto, StatusProjeto,
    TipoProjeto, DepartamentoChoices
)
from .serializers import (
    LogEntrySerializer, CriarLogSerializer, MarcarResolvidoSerializer,
    ProjetoIAListSerializer, ProjetoIADetailSerializer, ProjetoIACreateSerializer,
    VersaoProjetoSerializer, NovaVersaoSerializer, DashboardStatsSerializer,
    FiltrosProjetosSerializer
)

# ===== VIEWS DE LOGS (EXISTENTES) =====
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

# ===== VIEWS DE PROJETOS DE IA =====

def verificar_permissao_financeira(user):
    """Verifica se o usuário tem permissão para ver dados financeiros"""
    return user.is_superuser or user.groups.filter(name__in=['Diretoria', 'Gestão']).exists()

def verificar_permissao_edicao(user, projeto):
    """Verifica se o usuário pode editar o projeto"""
    return (
        user.is_superuser or
        user == projeto.criado_por or
        user in projeto.criadores.all() or
        user.groups.filter(name__in=['Diretoria', 'Gestão']).exists()
    )

class ProjetoIAViewSet(viewsets.ModelViewSet):
    """ViewSet para CRUD completo de projetos de IA"""
    
    queryset = ProjetoIA.objects.filter(ativo=True)
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'list':
            return ProjetoIAListSerializer
        elif self.action == 'create':
            return ProjetoIACreateSerializer
        else:
            return ProjetoIADetailSerializer
    
    def get_queryset(self):
        queryset = ProjetoIA.objects.filter(ativo=True)
        
        # Aplicar filtros baseados nos query params
        filtros_serializer = FiltrosProjetosSerializer(data=self.request.query_params)
        if filtros_serializer.is_valid():
            filtros = filtros_serializer.validated_data
            
            # Filtros básicos
            if filtros.get('status'):
                queryset = queryset.filter(status__in=filtros['status'])
            
            if filtros.get('tipo_projeto'):
                queryset = queryset.filter(tipo_projeto__in=filtros['tipo_projeto'])
            
            if filtros.get('departamento'):
                queryset = queryset.filter(departamento_atendido__in=filtros['departamento'])
            
            if filtros.get('prioridade'):
                queryset = queryset.filter(prioridade__in=filtros['prioridade'])
            
            if filtros.get('complexidade'):
                queryset = queryset.filter(complexidade__in=filtros['complexidade'])
            
            if filtros.get('criadores'):
                queryset = queryset.filter(criadores__in=filtros['criadores']).distinct()
            
            # Filtros de data
            if filtros.get('data_criacao_inicio'):
                queryset = queryset.filter(data_criacao__gte=filtros['data_criacao_inicio'])
            
            if filtros.get('data_criacao_fim'):
                queryset = queryset.filter(data_criacao__lte=filtros['data_criacao_fim'])
            
            # Filtros de horas
            if filtros.get('horas_min'):
                queryset = queryset.filter(horas_totais__gte=filtros['horas_min'])
            
            if filtros.get('horas_max'):
                queryset = queryset.filter(horas_totais__lte=filtros['horas_max'])
            
            # Filtro de usuários impactados
            if filtros.get('usuarios_impactados_min'):
                queryset = queryset.filter(usuarios_impactados__gte=filtros['usuarios_impactados_min'])
            
            # Busca textual
            if filtros.get('busca'):
                busca = filtros['busca']
                queryset = queryset.filter(
                    Q(nome__icontains=busca) |
                    Q(descricao__icontains=busca) |
                    Q(ferramentas_tecnologias__icontains=busca) |
                    Q(criadores__first_name__icontains=busca) |
                    Q(criadores__last_name__icontains=busca)
                ).distinct()
        
        return queryset.select_related('criado_por').prefetch_related('criadores', 'dependencias')
    
    def perform_create(self, serializer):
        serializer.save(criado_por=self.request.user)
    
    def update(self, request, *args, **kwargs):
        projeto = self.get_object()
        if not verificar_permissao_edicao(request.user, projeto):
            return Response(
                {'error': 'Sem permissão para editar este projeto'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().update(request, *args, **kwargs)
    
    def partial_update(self, request, *args, **kwargs):
        projeto = self.get_object()
        if not verificar_permissao_edicao(request.user, projeto):
            return Response(
                {'error': 'Sem permissão para editar este projeto'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().partial_update(request, *args, **kwargs)
    
    @action(detail=True, methods=['post'])
    def nova_versao(self, request, pk=None):
        """Registrar nova versão do projeto"""
        projeto = self.get_object()
        if not verificar_permissao_edicao(request.user, projeto):
            return Response(
                {'error': 'Sem permissão para modificar este projeto'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = NovaVersaoSerializer(
            data=request.data,
            context={'request': request, 'projeto': projeto}
        )
        
        if serializer.is_valid():
            versao = serializer.save()
            return Response({
                'message': f'Nova versão {versao.versao} criada com sucesso',
                'versao': VersaoProjetoSerializer(versao).data
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def arquivar(self, request, pk=None):
        """Arquivar/desarquivar projeto"""
        projeto = self.get_object()
        if not verificar_permissao_edicao(request.user, projeto):
            return Response(
                {'error': 'Sem permissão para arquivar este projeto'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if projeto.status == StatusProjeto.ARQUIVADO:
            projeto.status = StatusProjeto.ATIVO
            message = 'Projeto reativado'
        else:
            projeto.status = StatusProjeto.ARQUIVADO
            message = 'Projeto arquivado'
        
        projeto.save()
        return Response({'message': message, 'novo_status': projeto.status})
    
    @action(detail=True, methods=['post'])
    def duplicar(self, request, pk=None):
        """Duplicar projeto como template"""
        projeto_original = self.get_object()
        
        # Criar cópia
        novo_projeto = ProjetoIA(
            nome=f"{projeto_original.nome} - Cópia",
            descricao=projeto_original.descricao,
            tipo_projeto=projeto_original.tipo_projeto,
            departamento_atendido=projeto_original.departamento_atendido,
            prioridade=projeto_original.prioridade,
            complexidade=projeto_original.complexidade,
            horas_totais=projeto_original.horas_totais,
            valor_hora=projeto_original.valor_hora,
            ferramentas_tecnologias=projeto_original.ferramentas_tecnologias.copy(),
            usuarios_impactados=projeto_original.usuarios_impactados,
            frequencia_uso=projeto_original.frequencia_uso,
            criado_por=request.user,
            status=StatusProjeto.ATIVO,
            versao_atual="1.0.0"
        )
        novo_projeto.save()
        
        # Copiar criadores
        novo_projeto.criadores.set(projeto_original.criadores.all())
        
        serializer = ProjetoIADetailSerializer(novo_projeto, context={'request': request})
        return Response({
            'message': 'Projeto duplicado com sucesso',
            'projeto': serializer.data
        })
    
    @action(detail=True, methods=['get'])
    def metricas_detalhadas(self, request, pk=None):
        """Métricas financeiras detalhadas do projeto"""
        projeto = self.get_object()
        
        if not verificar_permissao_financeira(request.user):
            return Response(
                {'error': 'Sem permissão para ver dados financeiros'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Calcular métricas para diferentes períodos
        metricas_1_mes = projeto.calcular_metricas_financeiras(1)
        metricas_6_meses = projeto.calcular_metricas_financeiras(6)
        metricas_12_meses = projeto.calcular_metricas_financeiras(12)
        metricas_atual = projeto.calcular_metricas_financeiras()
        
        return Response({
            'projeto_id': projeto.id,
            'projeto_nome': projeto.nome,
            'metricas_atuais': metricas_atual,
            'projecoes': {
                '1_mes': metricas_1_mes,
                '6_meses': metricas_6_meses,
                '12_meses': metricas_12_meses
            },
            'breakdown_custos': {
                'desenvolvimento': float(projeto.custo_desenvolvimento),
                'ferramentas_mensais': float(projeto.custo_ferramentas_mensais),
                'apis_mensais': float(projeto.custo_apis_mensais),
                'infraestrutura_mensais': float(projeto.custo_infraestrutura_mensais),
                'manutencao_mensais': float(projeto.custo_manutencao_mensais),
                'treinamentos': float(projeto.custo_treinamentos),
                'consultoria': float(projeto.custo_consultoria),
                'setup_inicial': float(projeto.custo_setup_inicial)
            },
            'breakdown_economias': {
                'economia_horas_mensais': float(projeto.economia_horas_mensais),
                'valor_hora_economizada': float(projeto.valor_hora_economizada),
                'reducao_erros_mensais': float(projeto.reducao_erros_mensais),
                'economia_outros_mensais': float(projeto.economia_outros_mensais),
                'economia_mensal_total': float(projeto.economia_mensal_total)
            }
        })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    """Estatísticas gerais do dashboard de projetos"""
    
    # Stats básicas
    total_projetos = ProjetoIA.objects.filter(ativo=True).count()
    projetos_ativos = ProjetoIA.objects.filter(ativo=True, status=StatusProjeto.ATIVO).count()
    projetos_arquivados = ProjetoIA.objects.filter(ativo=True, status=StatusProjeto.ARQUIVADO).count()
    projetos_manutencao = ProjetoIA.objects.filter(ativo=True, status=StatusProjeto.MANUTENCAO).count()
    
    # Horas totais investidas
    horas_totais = ProjetoIA.objects.filter(ativo=True).aggregate(
        total=Sum('horas_totais')
    )['total'] or Decimal('0')
    
    # Distribuições por categoria
    projetos_por_tipo = dict(
        ProjetoIA.objects.filter(ativo=True)
        .values('tipo_projeto')
        .annotate(count=Count('id'))
        .values_list('tipo_projeto', 'count')
    )
    
    projetos_por_departamento = dict(
        ProjetoIA.objects.filter(ativo=True)
        .values('departamento_atendido')
        .annotate(count=Count('id'))
        .values_list('departamento_atendido', 'count')
    )
    
    projetos_por_complexidade = dict(
        ProjetoIA.objects.filter(ativo=True)
        .values('complexidade')
        .annotate(count=Count('id'))
        .values_list('complexidade', 'count')
    )
    
    # Projetos recentes
    projetos_recentes = ProjetoIA.objects.filter(ativo=True).order_by('-criado_em')[:5]
    projetos_recentes_data = ProjetoIAListSerializer(
        projetos_recentes, 
        many=True,
        context={'request': request}
    ).data
    
    # Preparar resposta base
    stats = {
        'total_projetos': total_projetos,
        'projetos_ativos': projetos_ativos,
        'projetos_arquivados': projetos_arquivados,
        'projetos_manutencao': projetos_manutencao,
        'horas_totais_investidas': horas_totais,
        'projetos_por_tipo': projetos_por_tipo,
        'projetos_por_departamento': projetos_por_departamento,
        'projetos_por_complexidade': projetos_por_complexidade,
        'projetos_recentes': projetos_recentes_data
    }
    
    # Adicionar dados financeiros se o usuário tiver permissão
    if verificar_permissao_financeira(request.user):
        projetos_com_economia = ProjetoIA.objects.filter(
            ativo=True,
            economia_horas_mensais__gt=0
        )
        
        # Calcular métricas financeiras agregadas
        economia_mensal_total = Decimal('0')
        economia_acumulada_total = Decimal('0')
        roi_values = []
        
        for projeto in projetos_com_economia:
            metricas = projeto.calcular_metricas_financeiras()
            economia_mensal_total += Decimal(str(metricas['economia_mensal']))
            economia_acumulada_total += Decimal(str(metricas['economia_acumulada']))
            if metricas['roi'] > -100:  # Filtrar ROIs muito negativos
                roi_values.append(metricas['roi'])
        
        roi_medio = sum(roi_values) / len(roi_values) if roi_values else 0
        
        # Top 5 projetos por ROI
        top_projetos_roi = []
        for projeto in projetos_com_economia.order_by('-economia_horas_mensais')[:5]:
            metricas = projeto.calcular_metricas_financeiras()
            top_projetos_roi.append({
                'id': projeto.id,
                'nome': projeto.nome,
                'roi': metricas['roi'],
                'economia_mensal': metricas['economia_mensal'],
                'economia_acumulada': metricas['economia_acumulada']
            })
        
        # Adicionar dados financeiros
        stats.update({
            'economia_mensal_total': economia_mensal_total,
            'roi_medio': round(roi_medio, 2),
            'economia_acumulada_total': economia_acumulada_total,
            'top_projetos_roi': top_projetos_roi
        })
    
    return Response(stats)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def opcoes_formulario(request):
    """Retorna opções para formulários"""
    return Response({
        'status_choices': [{'value': k, 'label': v} for k, v in StatusProjeto.choices],
        'tipo_projeto_choices': [{'value': k, 'label': v} for k, v in TipoProjeto.choices],
        'departamento_choices': [{'value': k, 'label': v} for k, v in DepartamentoChoices.choices],
        'prioridade_choices': [{'value': k, 'label': v} for k, v in ProjetoIA._meta.get_field('prioridade').choices],
        'complexidade_choices': [{'value': k, 'label': v} for k, v in ProjetoIA._meta.get_field('complexidade').choices],
        'frequencia_choices': [{'value': k, 'label': v} for k, v in ProjetoIA._meta.get_field('frequencia_uso').choices],
        'usuarios_disponiveis': [
            {
                'id': user.id,
                'username': user.username,
                'nome_completo': user.get_full_name() or user.username
            }
            for user in User.objects.filter(is_active=True).order_by('first_name', 'last_name')
        ]
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def verificar_permissoes(request):
    """Verifica permissões do usuário atual"""
    return Response({
        'pode_ver_financeiro': verificar_permissao_financeira(request.user),
        'pode_criar_projetos': True,  # Todos usuários autenticados podem criar
        'is_admin': request.user.is_superuser,
        'grupos': list(request.user.groups.values_list('name', flat=True))
    })

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
def dashboard_logs_stats(request):
    """Estatísticas para dashboard de logs"""
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