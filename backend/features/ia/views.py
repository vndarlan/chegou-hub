# backend/features/ia/views.py - VERSÃO COMPLETA CORRIGIDA
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.pagination import PageNumberPagination
from django.utils import timezone
from django.db.models import Q, Count, Sum, Avg, F
from django.contrib.auth.models import User
from datetime import timedelta
from decimal import Decimal
import logging

from .models import (
    LogEntry, TipoFerramenta, PaisNicochat,
    ProjetoIA, VersaoProjeto, StatusProjeto,
    TipoProjeto, DepartamentoChoices, PrioridadeChoices,
    ComplexidadeChoices, FrequenciaUsoChoices
)
from .serializers import (
    LogEntrySerializer, CriarLogSerializer, MarcarResolvidoSerializer,
    ProjetoIAListSerializer, ProjetoIADetailSerializer, ProjetoIACreateSerializer,
    VersaoProjetoSerializer, NovaVersaoSerializer, DashboardStatsSerializer,
    FiltrosProjetosSerializer
)

# Configurar logger
logger = logging.getLogger(__name__)

# ===== PAGINAÇÃO =====
class LogsPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100

# ===== FUNÇÕES AUXILIARES =====
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

# ===== VIEWS DE LOGS =====
class LogEntryViewSet(viewsets.ModelViewSet):
    queryset = LogEntry.objects.all()
    serializer_class = LogEntrySerializer
    permission_classes = [IsAuthenticated]
    pagination_class = LogsPagination
    
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
        
        # CORREÇÃO: Processar múltiplos valores no filtro de nível
        if nivel:
            if ',' in nivel:
                # Se contém vírgula, dividir e filtrar por múltiplos valores
                niveis = [n.strip() for n in nivel.split(',')]
                queryset = queryset.filter(nivel__in=niveis)
            else:
                # Filtro simples
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
        try:
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
        except Exception as e:
            print(f"Erro no get_queryset: {e}")
            return ProjetoIA.objects.filter(ativo=True)
    
    def perform_create(self, serializer):
        serializer.save(criado_por=self.request.user)
    
    def list(self, request, *args, **kwargs):
        try:
            return super().list(request, *args, **kwargs)
        except Exception as e:
            print(f"Erro no list: {e}")
            import traceback
            traceback.print_exc()
            return Response(
                {'error': 'Erro ao carregar projetos'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def create(self, request, *args, **kwargs):
        try:
            print(f"📥 CREATE - dados recebidos: {list(request.data.keys())}")
            return super().create(request, *args, **kwargs)
        except Exception as e:
            print(f"❌ CREATE - erro: {e}")
            import traceback
            traceback.print_exc()
            return Response(
                {'error': 'Erro ao criar projeto'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def update(self, request, *args, **kwargs):
        try:
            print(f"📝 UPDATE - dados recebidos: {list(request.data.keys())}")
            projeto = self.get_object()
            if not verificar_permissao_edicao(request.user, projeto):
                return Response(
                    {'error': 'Sem permissão para editar este projeto'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Log do estado atual vs dados recebidos
            print(f"📋 Projeto atual ID: {projeto.id}")
            print(f"📋 Dados atuais - departamentos_atendidos: {projeto.departamentos_atendidos}")
            print(f"📋 Dados novos - departamentos_atendidos: {request.data.get('departamentos_atendidos')}")
            
            return super().update(request, *args, **kwargs)
        except Exception as e:
            print(f"❌ UPDATE - erro detalhado: {str(e)}")
            print(f"❌ UPDATE - tipo do erro: {type(e)}")
            import traceback
            traceback.print_exc()
            return Response(
                {'error': f'Erro ao atualizar projeto: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def partial_update(self, request, *args, **kwargs):
        try:
            print(f"📝 PARTIAL_UPDATE - dados recebidos: {list(request.data.keys())}")
            projeto = self.get_object()
            if not verificar_permissao_edicao(request.user, projeto):
                return Response(
                    {'error': 'Sem permissão para editar este projeto'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Log detalhado para debugging
            for key, value in request.data.items():
                if hasattr(projeto, key):
                    current_value = getattr(projeto, key)
                    print(f"📋 {key}: {current_value} → {value}")
                else:
                    print(f"⚠️ Campo {key} não existe no modelo")
            
            return super().partial_update(request, *args, **kwargs)
        except Exception as e:
            print(f"❌ PARTIAL_UPDATE - erro detalhado: {str(e)}")
            print(f"❌ PARTIAL_UPDATE - tipo do erro: {type(e)}")
            import traceback
            traceback.print_exc()
            return Response(
                {'error': f'Erro ao atualizar projeto: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
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
        try:
            projeto_original = self.get_object()
            print(f"Duplicando projeto: {projeto_original.nome}")
            
            # Criar cópia com dados seguros
            novo_projeto = ProjetoIA.objects.create(
                nome=f"{projeto_original.nome} - Cópia",
                descricao=projeto_original.descricao,
                tipo_projeto=projeto_original.tipo_projeto,
                departamentos_atendidos=projeto_original.departamentos_atendidos,
                prioridade=projeto_original.prioridade,
                complexidade=projeto_original.complexidade,
                horas_totais=projeto_original.horas_totais,
                custo_hora_empresa=projeto_original.custo_hora_empresa,
                ferramentas_tecnologias=projeto_original.ferramentas_tecnologias or [],
                usuarios_impactados=projeto_original.usuarios_impactados,
                frequencia_uso=projeto_original.frequencia_uso,
                criado_por=request.user,
                status=StatusProjeto.ATIVO,
                versao_atual="1.0.0"
            )
            
            print(f"Projeto duplicado criado: {novo_projeto.id}")
            
            # Copiar criadores de forma segura
            try:
                criadores = projeto_original.criadores.all()
                if criadores.exists():
                    novo_projeto.criadores.set(criadores)
                    print(f"Criadores copiados: {criadores.count()}")
            except Exception as e:
                print(f"Erro ao copiar criadores: {e}")
            
            # Retornar resposta simples
            return Response({
                'message': 'Projeto duplicado com sucesso',
                'projeto_id': novo_projeto.id,
                'projeto_nome': novo_projeto.nome
            })
            
        except Exception as e:
            print(f"Erro ao duplicar projeto: {e}")
            import traceback
            traceback.print_exc()
            return Response(
                {'error': 'Erro ao duplicar projeto'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
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
                'custos_recorrentes_mensais': float(projeto.custos_recorrentes_mensais_novo),
                'custos_unicos_totais': float(projeto.custos_unicos_totais_novo)
            },
            'breakdown_economias': {
                'horas_economizadas_mes': float(projeto.horas_economizadas_mes),
                'valor_monetario_economizado_mes': float(projeto.valor_monetario_economizado_mes),
                'economia_mensal_total': float(projeto.economia_mensal_total_novo)
            }
        })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    """Estatísticas gerais do dashboard de projetos"""
    
    try:
        print("=== CARREGANDO DASHBOARD STATS ===")
        
        # Stats básicas
        total_projetos = ProjetoIA.objects.filter(ativo=True).count()
        projetos_ativos = ProjetoIA.objects.filter(ativo=True, status=StatusProjeto.ATIVO).count()
        projetos_arquivados = ProjetoIA.objects.filter(ativo=True, status=StatusProjeto.ARQUIVADO).count()
        projetos_manutencao = ProjetoIA.objects.filter(ativo=True, status=StatusProjeto.MANUTENCAO).count()
        
        print(f"Stats básicas calculadas: {total_projetos}, {projetos_ativos}, {projetos_arquivados}, {projetos_manutencao}")
        
        # Horas totais investidas
        try:
            horas_totais = ProjetoIA.objects.filter(ativo=True).aggregate(
                total=Sum('horas_totais')
            )['total'] or Decimal('0')
            print(f"Horas totais: {horas_totais}")
        except Exception as e:
            print(f"Erro ao calcular horas: {e}")
            horas_totais = Decimal('0')
        
        # Distribuições por categoria
        try:
            projetos_por_tipo = dict(
                ProjetoIA.objects.filter(ativo=True)
                .values('tipo_projeto')
                .annotate(count=Count('id'))
                .values_list('tipo_projeto', 'count')
            )
            print(f"Projetos por tipo: {projetos_por_tipo}")
        except Exception as e:
            print(f"Erro projetos por tipo: {e}")
            projetos_por_tipo = {}
        
        try:
            projetos_por_departamento = dict(
                ProjetoIA.objects.filter(ativo=True)
                .values('departamento_atendido')
                .annotate(count=Count('id'))
                .values_list('departamento_atendido', 'count')
            )
            print(f"Projetos por dept: {projetos_por_departamento}")
        except Exception as e:
            print(f"Erro projetos por dept: {e}")
            projetos_por_departamento = {}
        
        try:
            projetos_por_complexidade = dict(
                ProjetoIA.objects.filter(ativo=True)
                .values('complexidade')
                .annotate(count=Count('id'))
                .values_list('complexidade', 'count')
            )
            print(f"Projetos por complexidade: {projetos_por_complexidade}")
        except Exception as e:
            print(f"Erro projetos por complexidade: {e}")
            projetos_por_complexidade = {}
        
        # Projetos recentes
        try:
            projetos_recentes = ProjetoIA.objects.filter(ativo=True).order_by('-criado_em')[:5]
            projetos_recentes_data = []
            for projeto in projetos_recentes:
                try:
                    criadores_nomes = [criador.get_full_name() or criador.username for criador in projeto.criadores.all()]
                    projetos_recentes_data.append({
                        'id': projeto.id,
                        'nome': projeto.nome,
                        'status': projeto.status,
                        'tipo_projeto': projeto.tipo_projeto,
                        'criadores_nomes': criadores_nomes,
                        'criado_em': projeto.criado_em,
                        'horas_totais': float(projeto.horas_totais),
                    })
                except Exception as e:
                    print(f"Erro ao processar projeto {projeto.id}: {e}")
            print(f"Projetos recentes: {len(projetos_recentes_data)}")
        except Exception as e:
            print(f"Erro projetos recentes: {e}")
            projetos_recentes_data = []
        
        # Preparar resposta base
        stats = {
            'total_projetos': total_projetos,
            'projetos_ativos': projetos_ativos,
            'projetos_arquivados': projetos_arquivados,
            'projetos_manutencao': projetos_manutencao,
            'horas_totais_investidas': float(horas_totais),
            'projetos_por_tipo': projetos_por_tipo,
            'projetos_por_departamento': projetos_por_departamento,
            'projetos_por_complexidade': projetos_por_complexidade,
            'projetos_recentes': projetos_recentes_data
        }
        
        # Adicionar dados financeiros se o usuário tiver permissão
        if verificar_permissao_financeira(request.user):
            print("Calculando dados financeiros...")
            try:
                projetos_com_economia = ProjetoIA.objects.filter(
                    ativo=True,
                    economia_horas_mensais__gt=0
                )
                
                economia_mensal_total = Decimal('0')
                economia_acumulada_total = Decimal('0')
                roi_values = []
                
                for projeto in projetos_com_economia:
                    try:
                        metricas = projeto.calcular_metricas_financeiras()
                        economia_mensal_total += Decimal(str(metricas['economia_mensal']))
                        economia_acumulada_total += Decimal(str(metricas['economia_acumulada']))
                        if metricas['roi'] > -100:
                            roi_values.append(metricas['roi'])
                    except Exception as e:
                        print(f"Erro ao calcular métricas do projeto {projeto.id}: {e}")
                
                roi_medio = sum(roi_values) / len(roi_values) if roi_values else 0
                
                # Top 5 projetos por ROI
                top_projetos_roi = []
                try:
                    for projeto in projetos_com_economia.order_by('-economia_horas_mensais')[:5]:
                        try:
                            metricas = projeto.calcular_metricas_financeiras()
                            top_projetos_roi.append({
                                'id': projeto.id,
                                'nome': projeto.nome,
                                'roi': metricas['roi'],
                                'economia_mensal': metricas['economia_mensal'],
                                'economia_acumulada': metricas['economia_acumulada']
                            })
                        except Exception as e:
                            print(f"Erro ao calcular top ROI projeto {projeto.id}: {e}")
                except Exception as e:
                    print(f"Erro ao calcular top projetos: {e}")
                
                # Adicionar dados financeiros
                stats.update({
                    'economia_mensal_total': float(economia_mensal_total),
                    'roi_medio': round(roi_medio, 2),
                    'economia_acumulada_total': float(economia_acumulada_total),
                    'top_projetos_roi': top_projetos_roi
                })
                print("Dados financeiros calculados com sucesso")
            except Exception as e:
                print(f"Erro geral nos dados financeiros: {e}")
        
        print("=== DASHBOARD STATS CALCULADO COM SUCESSO ===")
        return Response(stats)
        
    except Exception as e:
        print(f"ERRO CRÍTICO no dashboard_stats: {e}")
        import traceback
        traceback.print_exc()
        return Response(
            {'error': 'Erro ao carregar estatísticas'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def opcoes_formulario(request):
    """Retorna opções para formulários"""
    try:
        print("=== INICIANDO CARREGAMENTO DE OPÇÕES ===")
        
        # Testar importações das classes
        from .models import (
            StatusProjeto, TipoProjeto, DepartamentoChoices, 
            PrioridadeChoices, ComplexidadeChoices, FrequenciaUsoChoices
        )
        
        print("Importações das classes OK")
        
        # Construir opções passo a passo
        opcoes = {}
        
        # Status
        try:
            opcoes['status_choices'] = [{'value': k, 'label': v} for k, v in StatusProjeto.choices]
            print(f"Status choices: {len(opcoes['status_choices'])} itens")
        except Exception as e:
            print(f"Erro em status_choices: {e}")
            opcoes['status_choices'] = []
        
        # Tipo de projeto
        try:
            opcoes['tipo_projeto_choices'] = [{'value': k, 'label': v} for k, v in TipoProjeto.choices]
            print(f"Tipo projeto choices: {len(opcoes['tipo_projeto_choices'])} itens")
        except Exception as e:
            print(f"Erro em tipo_projeto_choices: {e}")
            opcoes['tipo_projeto_choices'] = []
        
        # Departamento
        try:
            opcoes['departamento_choices'] = [{'value': k, 'label': v} for k, v in DepartamentoChoices.choices]
            print(f"Departamento choices: {len(opcoes['departamento_choices'])} itens")
        except Exception as e:
            print(f"Erro em departamento_choices: {e}")
            opcoes['departamento_choices'] = []
        
        # Prioridade
        try:
            opcoes['prioridade_choices'] = [{'value': k, 'label': v} for k, v in PrioridadeChoices.choices]
            print(f"Prioridade choices: {len(opcoes['prioridade_choices'])} itens")
        except Exception as e:
            print(f"Erro em prioridade_choices: {e}")
            opcoes['prioridade_choices'] = []
        
        # Complexidade
        try:
            opcoes['complexidade_choices'] = [{'value': k, 'label': v} for k, v in ComplexidadeChoices.choices]
            print(f"Complexidade choices: {len(opcoes['complexidade_choices'])} itens")
        except Exception as e:
            print(f"Erro em complexidade_choices: {e}")
            opcoes['complexidade_choices'] = []
        
        # Frequência
        try:
            opcoes['frequencia_choices'] = [{'value': k, 'label': v} for k, v in FrequenciaUsoChoices.choices]
            print(f"Frequencia choices: {len(opcoes['frequencia_choices'])} itens")
        except Exception as e:
            print(f"Erro em frequencia_choices: {e}")
            opcoes['frequencia_choices'] = []
        
        # Usuários
        try:
            usuarios = User.objects.filter(is_active=True).order_by('first_name', 'last_name')
            opcoes['usuarios_disponiveis'] = [
                {
                    'id': user.id,
                    'username': user.username,
                    'nome_completo': user.get_full_name() or user.username
                }
                for user in usuarios
            ]
            print(f"Usuarios disponíveis: {len(opcoes['usuarios_disponiveis'])} itens")
        except Exception as e:
            print(f"Erro em usuarios_disponiveis: {e}")
            opcoes['usuarios_disponiveis'] = []
        
        print("=== OPÇÕES CARREGADAS COM SUCESSO ===")
        print(f"Total de categorias: {len(opcoes)}")
        
        return Response(opcoes)
        
    except Exception as e:
        print(f"ERRO GERAL ao carregar opções: {str(e)}")
        import traceback
        traceback.print_exc()
        
        # Retornar opções vazias em caso de erro
        return Response({
            'status_choices': [],
            'tipo_projeto_choices': [],
            'departamento_choices': [],
            'prioridade_choices': [],
            'complexidade_choices': [],
            'frequencia_choices': [],
            'usuarios_disponiveis': [],
            'error': str(e)
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
    
    # Stats gerais - CORREÇÃO: Total dos últimos 7 dias
    total_logs_7d = LogEntry.objects.filter(timestamp__gte=last_7d).count()
    logs_24h = LogEntry.objects.filter(timestamp__gte=last_24h).count()
    logs_nao_resolvidos = LogEntry.objects.filter(resolvido=False).count()
    logs_criticos_7d = LogEntry.objects.filter(
        nivel='critical', 
        timestamp__gte=last_7d
    ).count()
    
    # Stats por ferramenta - 24h para detalhes
    stats_ferramentas = LogEntry.objects.filter(
        timestamp__gte=last_24h
    ).values('ferramenta').annotate(
        total=Count('id'),
        erros=Count('id', filter=Q(nivel__in=['error', 'critical'])),
        nao_resolvidos=Count('id', filter=Q(resolvido=False))
    )
    
    # Stats por país (Nicochat) - 24h para detalhes
    stats_paises = LogEntry.objects.filter(
        ferramenta=TipoFerramenta.NICOCHAT,
        timestamp__gte=last_24h
    ).values('pais').annotate(
        total=Count('id'),
        erros=Count('id', filter=Q(nivel__in=['error', 'critical']))
    )
    
    return Response({
        'resumo': {
            'total_logs_7d': total_logs_7d,  # NOVO: Total dos últimos 7 dias
            'logs_24h': logs_24h,
            'logs_nao_resolvidos': logs_nao_resolvidos,
            'logs_criticos_7d': logs_criticos_7d
        },
        'por_ferramenta': list(stats_ferramentas),
        'por_pais_nicochat': list(stats_paises)
    })