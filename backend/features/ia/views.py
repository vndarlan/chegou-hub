# backend/features/ia/views.py - VERSÃO COMPLETAMENTE CORRIGIDA
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.pagination import PageNumberPagination
from django.utils import timezone
from django.db.models import Q, Count, Sum, Avg, F, Prefetch
from django.contrib.auth.models import User
from datetime import timedelta
from decimal import Decimal
import logging
from django.core.cache import cache

from .models import (
    LogEntry, TipoFerramenta, PaisNicochat,
    ProjetoIA, VersaoProjeto, StatusProjeto,
    TipoProjeto, DepartamentoChoices, PrioridadeChoices,
    ComplexidadeChoices, FrequenciaUsoChoices,
    # WhatsApp Business models
    BusinessManager, WhatsAppPhoneNumber, QualityHistory, QualityAlert,
    QualityRatingChoices, MessagingLimitTierChoices, PhoneNumberStatusChoices,
    AlertTypeChoices, AlertPriorityChoices,
    # NicoChat models
    NicochatConfig
)
from .serializers import (
    LogEntrySerializer, CriarLogSerializer, MarcarResolvidoSerializer,
    ProjetoIAListSerializer, ProjetoIADetailSerializer, ProjetoIACreateSerializer,
    VersaoProjetoSerializer, NovaVersaoSerializer, DashboardStatsSerializer,
    FiltrosProjetosSerializer,
    # WhatsApp Business serializers
    WhatsAppBusinessAccountSerializer, WhatsAppPhoneNumberSerializer,
    WhatsAppPhoneNumberCreateSerializer, QualityHistorySerializer, QualityAlertSerializer,
    MarcarAlertaResolvidoSerializer, SincronizarMetaAPISerializer,
    # NicoChat serializers
    NicochatConfigSerializer
)

# Importar serviço e auditoria
from .services import WhatsAppMetaAPIService
from .security_audit import security_audit

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
                '7d': timedelta(days=7),
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
    """ViewSet para CRUD completo de projetos de IA - CORRIGIDO"""
    
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
        """CORREÇÃO: QuerySet otimizado com todos os relacionamentos"""
        try:
            # CORREÇÃO: Usar select_related e prefetch_related para otimizar
            queryset = ProjetoIA.objects.filter(ativo=True).select_related(
                'criado_por'
            ).prefetch_related(
                'criadores',
                'dependencias',
                'projetos_dependentes',
                'versoes'
            )
            
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
                    # CORREÇÃO: Filtrar tanto por departamento legado quanto por novo array
                    queryset = queryset.filter(
                        Q(departamento_atendido__in=filtros['departamento']) |
                        Q(departamentos_atendidos__overlap=filtros['departamento'])
                    )
                
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
                
                # Filtros de horas - removidos porque horas_totais não existe mais na DB
                # Filtros baseados no breakdown específico podem ser adicionados se necessário
                
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
            
            return queryset
        except Exception as e:
            print(f"Erro no get_queryset: {e}")
            import traceback
            traceback.print_exc()
            return ProjetoIA.objects.filter(ativo=True)
    
    def perform_create(self, serializer):
        """CORREÇÃO: Garantir que criado_por seja definido"""
        serializer.save(criado_por=self.request.user)
    
    def list(self, request, *args, **kwargs):
        """CORREÇÃO: List otimizado com tratamento de erros"""
        try:
            print(f"LIST - carregando projetos para usuario {request.user.username}")
            return super().list(request, *args, **kwargs)
        except Exception as e:
            print(f"LIST - erro: {e}")
            import traceback
            traceback.print_exc()
            return Response(
                {'error': 'Erro ao carregar projetos'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def retrieve(self, request, *args, **kwargs):
        """CORREÇÃO: Retrieve otimizado com todos os dados"""
        try:
            print(f"RETRIEVE - carregando projeto {kwargs.get('pk')}")
            
            # CORREÇÃO: Usar get_object() que já aplica os filtros corretos
            instance = self.get_object()
            print(f"RETRIEVE - projeto encontrado: {instance.id}")
            print(f"RETRIEVE - dados verificacao:")
            print(f"   - licoes_aprendidas: {instance.licoes_aprendidas}")
            print(f"   - proximos_passos: {instance.proximos_passos}")
            print(f"   - custo_apis_mensal: {instance.custo_apis_mensal}")
            print(f"   - horas_desenvolvimento: {instance.horas_desenvolvimento}")
            print(f"   - documentacao_tecnica: {instance.documentacao_tecnica}")
            
            serializer = self.get_serializer(instance)
            response_data = serializer.data
            
            print(f"RETRIEVE - dados serializados:")
            print(f"   - licoes_aprendidas: {response_data.get('licoes_aprendidas')}")
            print(f"   - proximos_passos: {response_data.get('proximos_passos')}")
            print(f"   - custo_apis_mensal: {response_data.get('custo_apis_mensal')}")
            print(f"   - horas_desenvolvimento: {response_data.get('horas_desenvolvimento')}")
            print(f"   - documentacao_tecnica: {response_data.get('documentacao_tecnica')}")
            
            return Response(response_data)
        except Exception as e:
            print(f"RETRIEVE - erro: {e}")
            import traceback
            traceback.print_exc()
            return Response(
                {'error': 'Erro ao carregar detalhes do projeto'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def create(self, request, *args, **kwargs):
        """CORREÇÃO: Create com logs detalhados"""
        try:
            print(f"CREATE - usuario: {request.user.username}")
            print(f"CREATE - dados recebidos: {list(request.data.keys())}")
            print(f"CREATE - departamentos_atendidos: {request.data.get('departamentos_atendidos')}")
            print(f"CREATE - criadores_ids: {request.data.get('criadores_ids')}")
            
            return super().create(request, *args, **kwargs)
        except Exception as e:
            print(f"CREATE - erro: {e}")
            import traceback
            traceback.print_exc()
            return Response(
                {'error': 'Erro ao criar projeto'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def update(self, request, *args, **kwargs):
        """CORREÇÃO: Update com verificação de permissões e logs"""
        try:
            print(f"UPDATE - usuario: {request.user.username}")
            print(f"UPDATE - projeto: {kwargs.get('pk')}")
            print(f"UPDATE - dados recebidos: {list(request.data.keys())}")
            
            projeto = self.get_object()
            if not verificar_permissao_edicao(request.user, projeto):
                return Response(
                    {'error': 'Sem permissão para editar este projeto'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Log do estado atual vs dados recebidos
            print(f"UPDATE - estado atual vs novos dados:")
            for key in request.data.keys():
                if hasattr(projeto, key):
                    current_value = getattr(projeto, key)
                    new_value = request.data.get(key)
                    print(f"   - {key}: {current_value} -> {new_value}")
            
            return super().update(request, *args, **kwargs)
        except Exception as e:
            print(f"UPDATE - erro detalhado: {str(e)}")
            print(f"UPDATE - tipo do erro: {type(e)}")
            import traceback
            traceback.print_exc()
            return Response(
                {'error': f'Erro ao atualizar projeto: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def partial_update(self, request, *args, **kwargs):
        """CORREÇÃO: Partial update com logs detalhados"""
        try:
            print(f"PARTIAL_UPDATE - usuario: {request.user.username}")
            print(f"PARTIAL_UPDATE - projeto: {kwargs.get('pk')}")
            print(f"PARTIAL_UPDATE - dados recebidos: {list(request.data.keys())}")
            
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
                    print(f"{key}: {current_value} -> {value}")
                else:
                    print(f"AVISO - Campo {key} nao existe no modelo")
            
            return super().partial_update(request, *args, **kwargs)
        except Exception as e:
            print(f"PARTIAL_UPDATE - erro detalhado: {str(e)}")
            print(f"PARTIAL_UPDATE - tipo do erro: {type(e)}")
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
            print(f"DUPLICANDO projeto: {projeto_original.nome}")
            
            # CORREÇÃO: Criar cópia com TODOS os campos importantes
            novo_projeto = ProjetoIA.objects.create(
                # === CAMPOS BÁSICOS ===
                nome=f"{projeto_original.nome} - Cópia",
                descricao=projeto_original.descricao,
                tipo_projeto=projeto_original.tipo_projeto,
                departamentos_atendidos=projeto_original.departamentos_atendidos or [],
                departamento_atendido=projeto_original.departamento_atendido,  # Manter compatibilidade
                prioridade=projeto_original.prioridade,
                complexidade=projeto_original.complexidade,
                ferramentas_tecnologias=projeto_original.ferramentas_tecnologias or [],
                link_projeto=projeto_original.link_projeto,
                usuarios_impactados=projeto_original.usuarios_impactados,
                frequencia_uso=projeto_original.frequencia_uso,
                
                # === BREAKDOWN DE HORAS ===
                horas_desenvolvimento=projeto_original.horas_desenvolvimento,
                horas_testes=projeto_original.horas_testes,
                horas_documentacao=projeto_original.horas_documentacao,
                horas_deploy=projeto_original.horas_deploy,
                
                # === NOVOS CAMPOS FINANCEIROS ===
                custo_hora_empresa=projeto_original.custo_hora_empresa,
                custo_apis_mensal=projeto_original.custo_apis_mensal,
                lista_ferramentas=projeto_original.lista_ferramentas or [],
                custo_treinamentos=projeto_original.custo_treinamentos,
                custo_setup_inicial=projeto_original.custo_setup_inicial,
                custo_consultoria=projeto_original.custo_consultoria,
                horas_economizadas_mes=projeto_original.horas_economizadas_mes,
                valor_monetario_economizado_mes=projeto_original.valor_monetario_economizado_mes,
                nivel_autonomia=projeto_original.nivel_autonomia,
                
                # === CAMPOS LEGADOS ===
                valor_hora=projeto_original.valor_hora,
                custo_ferramentas_mensais=projeto_original.custo_ferramentas_mensais,
                custo_apis_mensais=projeto_original.custo_apis_mensais,
                custo_infraestrutura_mensais=projeto_original.custo_infraestrutura_mensais,
                custo_manutencao_mensais=projeto_original.custo_manutencao_mensais,
                economia_horas_mensais=projeto_original.economia_horas_mensais,
                valor_hora_economizada=projeto_original.valor_hora_economizada,
                reducao_erros_mensais=projeto_original.reducao_erros_mensais,
                economia_outros_mensais=projeto_original.economia_outros_mensais,
                
                # === DOCUMENTAÇÃO ===
                documentacao_tecnica=projeto_original.documentacao_tecnica,
                licoes_aprendidas=projeto_original.licoes_aprendidas,
                proximos_passos=projeto_original.proximos_passos,
                data_revisao=projeto_original.data_revisao,
                
                # === CONTROLE ===
                criado_por=request.user,
                status=StatusProjeto.ATIVO,
                versao_atual="1.0.0"
            )
            
            print(f"DUPLICACAO - projeto duplicado criado: {novo_projeto.id}")
            
            # Copiar criadores de forma segura
            try:
                criadores = projeto_original.criadores.all()
                if criadores.exists():
                    novo_projeto.criadores.set(criadores)
                    print(f"DUPLICACAO - criadores copiados: {criadores.count()}")
            except Exception as e:
                print(f"DUPLICACAO - erro ao copiar criadores: {e}")
            
            # Copiar dependências de forma segura
            try:
                dependencias = projeto_original.dependencias.all()
                if dependencias.exists():
                    novo_projeto.dependencias.set(dependencias)
                    print(f"DUPLICACAO - dependencias copiadas: {dependencias.count()}")
            except Exception as e:
                print(f"DUPLICACAO - erro ao copiar dependencias: {e}")
            
            # Retornar resposta simples
            return Response({
                'message': 'Projeto duplicado com sucesso',
                'projeto_id': novo_projeto.id,
                'projeto_nome': novo_projeto.nome
            })
            
        except Exception as e:
            print(f"DUPLICACAO - erro: {e}")
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
    """Estatísticas gerais do dashboard de projetos - CORRIGIDO"""
    
    cache_key = f'dashboard_stats_{request.user.id}'
    stats = cache.get(cache_key)
    
    if stats:
        return Response(stats)
    
    try:
        print("=== CARREGANDO DASHBOARD STATS ===")
        
        # CORREÇÃO: Usar prefetch otimizado
        projetos_queryset = ProjetoIA.objects.filter(ativo=True).select_related('criado_por').prefetch_related('criadores')
        
        # Stats básicas
        total_projetos = projetos_queryset.count()
        projetos_ativos = projetos_queryset.filter(status=StatusProjeto.ATIVO).count()
        projetos_arquivados = projetos_queryset.filter(status=StatusProjeto.ARQUIVADO).count()
        projetos_manutencao = projetos_queryset.filter(status=StatusProjeto.MANUTENCAO).count()
        
        print(f"Stats básicas calculadas: {total_projetos}, {projetos_ativos}, {projetos_arquivados}, {projetos_manutencao}")
        
        # Horas totais investidas - calcular a partir do breakdown
        try:
            horas_totais = projetos_queryset.aggregate(
                desenvolvimento=Sum('horas_desenvolvimento'),
                testes=Sum('horas_testes'),
                documentacao=Sum('horas_documentacao'),
                deploy=Sum('horas_deploy')
            )
            total_horas = Decimal('0')
            for key, valor in horas_totais.items():
                if valor:
                    total_horas += Decimal(str(valor))
            horas_totais = total_horas
            print(f"Horas totais: {horas_totais}")
        except Exception as e:
            print(f"Erro ao calcular horas: {e}")
            horas_totais = Decimal('0')
        
        # Distribuições por categoria
        try:
            projetos_por_tipo = dict(
                projetos_queryset
                .values('tipo_projeto')
                .annotate(count=Count('id'))
                .values_list('tipo_projeto', 'count')
            )
            print(f"Projetos por tipo: {projetos_por_tipo}")
        except Exception as e:
            print(f"Erro projetos por tipo: {e}")
            projetos_por_tipo = {}
        
        try:
            # CORREÇÃO: Incluir tanto departamento legado quanto novo array
            projetos_por_departamento_legado = dict(
                projetos_queryset.exclude(departamento_atendido__isnull=True)
                .values('departamento_atendido')
                .annotate(count=Count('id'))
                .values_list('departamento_atendido', 'count')
            )
            
            # Combinar com departamentos novos (seria mais complexo, usar legado por agora)
            projetos_por_departamento = projetos_por_departamento_legado
            print(f"Projetos por dept: {projetos_por_departamento}")
        except Exception as e:
            print(f"Erro projetos por dept: {e}")
            projetos_por_departamento = {}
        
        try:
            projetos_por_complexidade = dict(
                projetos_queryset
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
            projetos_recentes = projetos_queryset.order_by('-criado_em')[:5]
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
                # CORREÇÃO: Usar os novos campos quando disponíveis
                projetos_com_economia = projetos_queryset.filter(
                    Q(horas_economizadas_mes__gt=0) | Q(economia_horas_mensais__gt=0)
                )
                
                economia_mensal_total = Decimal('0')
                economia_acumulada_total = Decimal('0')
                roi_values = []
                
                for projeto in projetos_com_economia:
                    try:
                        # CORREÇÃO: Usar novos campos se disponíveis, senão campos legados
                        usar_novos = bool(projeto.custo_hora_empresa and projeto.custo_hora_empresa > 0)
                        metricas = projeto.calcular_metricas_financeiras(usar_novos_campos=usar_novos)
                        
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
                    projetos_ordenados = sorted(
                        projetos_com_economia, 
                        key=lambda p: p.horas_economizadas_mes or p.economia_horas_mensais, 
                        reverse=True
                    )[:5]
                    
                    for projeto in projetos_ordenados:
                        try:
                            usar_novos = bool(projeto.custo_hora_empresa and projeto.custo_hora_empresa > 0)
                            metricas = projeto.calcular_metricas_financeiras(usar_novos_campos=usar_novos)
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
        cache.set(cache_key, stats, 180)  # Cache por 3 minutos
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
    """Retorna opções para formulários - CORRIGIDO"""
    try:
        print("=== INICIANDO CARREGAMENTO DE OPÇÕES ===")
        
        # Testar importações das classes
        from .models import (
            StatusProjeto, TipoProjeto, DepartamentoChoices, 
            PrioridadeChoices, ComplexidadeChoices, FrequenciaUsoChoices,
            NivelAutonomiaChoices
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
        
        # CORREÇÃO: Adicionar nível de autonomia
        try:
            opcoes['nivel_autonomia_choices'] = [{'value': k, 'label': v} for k, v in NivelAutonomiaChoices.choices]
            print(f"Nivel autonomia choices: {len(opcoes['nivel_autonomia_choices'])} itens")
        except Exception as e:
            print(f"Erro em nivel_autonomia_choices: {e}")
            opcoes['nivel_autonomia_choices'] = []
        
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
            'nivel_autonomia_choices': [],
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
@permission_classes([IsAuthenticated])  # CORREÇÃO CRÍTICA: Requires authentication
def criar_log_publico(request):
    """
    Endpoint para Nicochat e N8N enviarem logs - REQUER AUTENTICAÇÃO
    CORREÇÃO: Removido acesso público por questões de segurança
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


# ===== VIEWS PARA WHATSAPP BUSINESS =====

class BusinessManagerViewSet(viewsets.ModelViewSet):
    """ViewSet para CRUD de Business Managers"""
    
    queryset = BusinessManager.objects.all()
    serializer_class = WhatsAppBusinessAccountSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filtrar por permissões do usuário"""
        queryset = BusinessManager.objects.all()
        
        # Superuser e grupos especiais veem tudo
        if not (self.request.user.is_superuser or 
                self.request.user.groups.filter(name__in=['Diretoria', 'Gestão']).exists()):
            # Usuários normais veem apenas as que são responsáveis
            queryset = queryset.filter(responsavel=self.request.user)
        
        return queryset.order_by('nome')
    
    def perform_create(self, serializer):
        """Definir responsável ao criar - COM AUDITORIA DE SEGURANÇA"""
        
        # Obter IP do usuário
        ip_address = self.get_client_ip()
        
        try:
            instance = serializer.save(responsavel=self.request.user)
            
            # Log de auditoria - criação bem-sucedida
            security_audit.log_token_operation(
                user=self.request.user,
                operation='create',
                business_manager_id=instance.whatsapp_business_account_id,
                success=True,
                ip_address=ip_address
            )
            
        except Exception as e:
            # Log de auditoria - criação falhada
            business_manager_id = serializer.validated_data.get('whatsapp_business_account_id', 'unknown')
            security_audit.log_token_operation(
                user=self.request.user,
                operation='create',
                business_manager_id=business_manager_id,
                success=False,
                ip_address=ip_address
            )
            raise
    
    def get_client_ip(self):
        """Obtém o IP real do cliente"""
        x_forwarded_for = self.request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return self.request.META.get('REMOTE_ADDR', '')
    
    @action(detail=True, methods=['post'])
    def sincronizar(self, request, pk=None):
        """Sincronizar números desta Business Manager específica"""
        business_manager = self.get_object()
        
        # Verificar permissão
        if not (request.user.is_superuser or 
                request.user.groups.filter(name__in=['Diretoria', 'Gestão']).exists() or
                business_manager.responsavel == request.user):
            return Response(
                {'error': 'Sem permissão para sincronizar esta Business Manager'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            serializer = SincronizarMetaAPISerializer(data=request.data)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
            force_update = serializer.validated_data.get('force_update', False)
            
            # Executar sincronização
            whatsapp_service = WhatsAppMetaAPIService()
            resultado = whatsapp_service.sincronizar_numeros_business_manager(
                business_manager, force_update
            )
            
            if resultado['sucesso']:
                return Response({
                    'message': 'Sincronização concluída com sucesso',
                    'resultado': resultado
                })
            else:
                return Response({
                    'message': 'Sincronização concluída com erros',
                    'resultado': resultado
                }, status=status.HTTP_206_PARTIAL_CONTENT)
        
        except Exception as e:
            logger.error(f"Erro na sincronização da BM {business_manager.id}: {e}")
            return Response(
                {'error': f'Erro na sincronização: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class WhatsAppPhoneNumberViewSet(viewsets.ModelViewSet):
    """ViewSet para CRUD completo de números WhatsApp"""
    
    queryset = WhatsAppPhoneNumber.objects.all()
    serializer_class = WhatsAppPhoneNumberSerializer
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        """Usar serializer específico para criação"""
        if self.action == 'create':
            return WhatsAppPhoneNumberCreateSerializer
        return WhatsAppPhoneNumberSerializer
    
    def get_queryset(self):
        """Filtrar por permissões do usuário"""
        queryset = WhatsAppPhoneNumber.objects.select_related('whatsapp_business_account')
        
        # Filtrar por Business Manager se usuário não for admin
        if not (self.request.user.is_superuser or 
                self.request.user.groups.filter(name__in=['Diretoria', 'Gestão']).exists()):
            queryset = queryset.filter(whatsapp_business_account__responsavel=self.request.user)
        
        # Filtros por query params
        business_manager_id = self.request.query_params.get('business_manager')
        if business_manager_id:
            queryset = queryset.filter(whatsapp_business_account_id=business_manager_id)
        
        quality_rating = self.request.query_params.get('quality_rating')
        if quality_rating:
            queryset = queryset.filter(quality_rating=quality_rating)
        
        monitoramento_ativo = self.request.query_params.get('monitoramento_ativo')
        if monitoramento_ativo is not None:
            queryset = queryset.filter(monitoramento_ativo=monitoramento_ativo.lower() == 'true')
        
        return queryset.order_by('display_phone_number')
    
    def create(self, request, *args, **kwargs):
        """Criar novo número WhatsApp"""
        try:
            print(f"CREATE WHATSAPP NUMBER - usuario: {request.user.username}")
            print(f"CREATE WHATSAPP NUMBER - dados recebidos: {request.data}")
            
            # Verificar se o usuário tem permissão para criar números
            if not (request.user.is_superuser or 
                    request.user.groups.filter(name__in=['Diretoria', 'Gestão']).exists()):
                return Response(
                    {'error': 'Sem permissão para criar números WhatsApp'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Verificar acesso à Business Manager antes de criar
            whatsapp_business_account_id = request.data.get('whatsapp_business_account_id')
            if whatsapp_business_account_id:
                try:
                    business_manager = BusinessManager.objects.get(id=whatsapp_business_account_id)
                    # Verificar se o usuário tem acesso a essa Business Manager
                    if not (request.user.is_superuser or 
                            request.user.groups.filter(name__in=['Diretoria', 'Gestão']).exists() or
                            business_manager.responsavel == request.user):
                        return Response(
                            {'error': 'Sem permissão para criar números nesta Business Manager'},
                            status=status.HTTP_403_FORBIDDEN
                        )
                except BusinessManager.DoesNotExist:
                    return Response(
                        {'error': 'Business Manager não encontrada'},
                        status=status.HTTP_404_NOT_FOUND
                    )
            
            # Usar serializer padrão para criação
            return super().create(request, *args, **kwargs)
                
        except Exception as e:
            print(f"CREATE WHATSAPP NUMBER - erro: {e}")
            import traceback
            traceback.print_exc()
            return Response(
                {'error': f'Erro interno ao criar número: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['patch'])
    def toggle_monitoramento(self, request, pk=None):
        """Ativar/desativar monitoramento do número"""
        numero = self.get_object()
        
        # Verificar permissão
        if not (request.user.is_superuser or 
                request.user.groups.filter(name__in=['Diretoria', 'Gestão']).exists() or
                numero.whatsapp_business_account.responsavel == request.user):
            return Response(
                {'error': 'Sem permissão para modificar este número'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        numero.monitoramento_ativo = not numero.monitoramento_ativo
        numero.save()
        
        return Response({
            'message': f'Monitoramento {"ativado" if numero.monitoramento_ativo else "desativado"}',
            'monitoramento_ativo': numero.monitoramento_ativo
        })


class QualityHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet para visualização do histórico de qualidade"""
    
    queryset = QualityHistory.objects.all()
    serializer_class = QualityHistorySerializer
    permission_classes = [IsAuthenticated]
    pagination_class = LogsPagination
    
    def get_queryset(self):
        """Filtrar por permissões e parâmetros"""
        queryset = QualityHistory.objects.select_related(
            'phone_number', 'phone_number__whatsapp_business_account'
        )
        
        # Filtrar por permissões
        if not (self.request.user.is_superuser or 
                self.request.user.groups.filter(name__in=['Diretoria', 'Gestão']).exists()):
            queryset = queryset.filter(phone_number__whatsapp_business_account__responsavel=self.request.user)
        
        # Filtros por query params
        phone_number_id = self.request.query_params.get('phone_number')
        if phone_number_id:
            queryset = queryset.filter(phone_number_id=phone_number_id)
        
        business_manager_id = self.request.query_params.get('business_manager')
        if business_manager_id:
            queryset = queryset.filter(phone_number__whatsapp_business_account_id=business_manager_id)
        
        # Filtrar apenas mudanças
        apenas_mudancas = self.request.query_params.get('apenas_mudancas')
        if apenas_mudancas == 'true':
            queryset = queryset.filter(
                Q(houve_mudanca_qualidade=True) |
                Q(houve_mudanca_limite=True) |
                Q(houve_mudanca_status=True)
            )
        
        # Filtro de período
        periodo = self.request.query_params.get('periodo', '7d')
        periodo_map = {
            '1d': timedelta(days=1),
            '7d': timedelta(days=7),
            '30d': timedelta(days=30),
            '90d': timedelta(days=90)
        }
        if periodo in periodo_map:
            desde = timezone.now() - periodo_map[periodo]
            queryset = queryset.filter(capturado_em__gte=desde)
        
        return queryset.order_by('-capturado_em')


class QualityAlertViewSet(viewsets.ModelViewSet):
    """ViewSet para gerenciamento de alertas de qualidade"""
    
    queryset = QualityAlert.objects.all()
    serializer_class = QualityAlertSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = LogsPagination
    
    def get_queryset(self):
        """Filtrar por permissões e parâmetros"""
        queryset = QualityAlert.objects.select_related(
            'phone_number', 'phone_number__whatsapp_business_account', 
            'usuario_que_visualizou', 'usuario_que_resolveu'
        )
        
        # Filtrar por permissões
        if not (self.request.user.is_superuser or 
                self.request.user.groups.filter(name__in=['Diretoria', 'Gestão']).exists()):
            queryset = queryset.filter(phone_number__whatsapp_business_account__responsavel=self.request.user)
        
        # Filtros por query params
        resolvido = self.request.query_params.get('resolvido')
        if resolvido is not None:
            queryset = queryset.filter(resolvido=resolvido.lower() == 'true')
        
        visualizado = self.request.query_params.get('visualizado')
        if visualizado is not None:
            queryset = queryset.filter(visualizado=visualizado.lower() == 'true')
        
        priority = self.request.query_params.get('priority')
        if priority:
            queryset = queryset.filter(priority=priority)
        
        alert_type = self.request.query_params.get('alert_type')
        if alert_type:
            queryset = queryset.filter(alert_type=alert_type)
        
        phone_number_id = self.request.query_params.get('phone_number')
        if phone_number_id:
            queryset = queryset.filter(phone_number_id=phone_number_id)
        
        return queryset.order_by('-criado_em')
    
    @action(detail=True, methods=['post'])
    def marcar_visualizado(self, request, pk=None):
        """Marcar alerta como visualizado"""
        alerta = self.get_object()
        
        if not alerta.visualizado:
            alerta.visualizado = True
            alerta.usuario_que_visualizou = request.user
            alerta.data_visualizacao = timezone.now()
            alerta.save()
        
        return Response({
            'message': 'Alerta marcado como visualizado',
            'visualizado': True
        })
    
    @action(detail=True, methods=['post'])
    def marcar_resolvido(self, request, pk=None):
        """Marcar alerta como resolvido"""
        alerta = self.get_object()
        
        serializer = MarcarAlertaResolvidoSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        comentario = serializer.validated_data.get('comentario_resolucao', '')
        
        alerta.resolvido = True
        alerta.usuario_que_resolveu = request.user
        alerta.data_resolucao = timezone.now()
        alerta.comentario_resolucao = comentario
        
        # Se não estava visualizado, marcar como visualizado também
        if not alerta.visualizado:
            alerta.visualizado = True
            alerta.usuario_que_visualizou = request.user
            alerta.data_visualizacao = timezone.now()
        
        alerta.save()
        
        return Response({
            'message': 'Alerta marcado como resolvido',
            'resolvido': True
        })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def sincronizar_meta_api(request):
    """Endpoint para sincronizar com Meta WhatsApp API"""
    
    # Verificar permissões
    if not (request.user.is_superuser or 
            request.user.groups.filter(name__in=['Diretoria', 'Gestão']).exists()):
        return Response(
            {'error': 'Sem permissão para executar sincronização'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        serializer = SincronizarMetaAPISerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        business_manager_id = serializer.validated_data.get('whatsapp_business_account_id') or serializer.validated_data.get('business_manager_id')
        force_update = serializer.validated_data.get('force_update', False)
        
        # Executar sincronização
        whatsapp_service = WhatsAppMetaAPIService()
        resultado = whatsapp_service.sincronizar_qualidade_numeros(
            business_manager_id, force_update
        )
        
        if resultado['sucesso']:
            return Response({
                'message': 'Sincronização concluída com sucesso',
                'resultado': resultado
            })
        else:
            return Response({
                'message': 'Sincronização concluída com erros',
                'resultado': resultado
            }, status=status.HTTP_206_PARTIAL_CONTENT)
    
    except Exception as e:
        logger.error(f"Erro na sincronização geral: {e}")
        return Response(
            {'error': f'Erro na sincronização: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_whatsapp_stats(request):
    """Estatísticas para dashboard do WhatsApp Business"""
    
    try:
        # Verificar se usuário tem acesso
        user_has_access = (request.user.is_superuser or 
                          request.user.groups.filter(name__in=['Diretoria', 'Gestão']).exists() or
                          BusinessManager.objects.filter(responsavel=request.user).exists())
        
        if not user_has_access:
            return Response(
                {'error': 'Sem permissão para ver dados do WhatsApp Business'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Filtrar dados por permissão
        if (request.user.is_superuser or 
            request.user.groups.filter(name__in=['Diretoria', 'Gestão']).exists()):
            # Admin vê tudo
            business_managers = BusinessManager.objects.filter(ativo=True)
            numeros = WhatsAppPhoneNumber.objects.all()
            alertas = QualityAlert.objects.all()
        else:
            # Usuário comum vê apenas suas Business Managers
            business_managers = BusinessManager.objects.filter(responsavel=request.user, ativo=True)
            numeros = WhatsAppPhoneNumber.objects.filter(whatsapp_business_account__responsavel=request.user)
            alertas = QualityAlert.objects.filter(phone_number__whatsapp_business_account__responsavel=request.user)
        
        # Estatísticas básicas
        total_business_managers = business_managers.count()
        total_numeros = numeros.count()
        numeros_monitorados = numeros.filter(monitoramento_ativo=True).count()
        
        # Distribuição por qualidade
        distribuicao_qualidade = dict(
            numeros.values('quality_rating')
            .annotate(count=Count('id'))
            .values_list('quality_rating', 'count')
        )
        
        # Distribuição por status
        distribuicao_status = dict(
            numeros.values('status')
            .annotate(count=Count('id'))
            .values_list('status', 'count')
        )
        
        # Alertas
        alertas_pendentes = alertas.filter(resolvido=False).count()
        alertas_criticos = alertas.filter(resolvido=False, priority=AlertPriorityChoices.CRITICAL).count()
        alertas_24h = alertas.filter(criado_em__gte=timezone.now() - timedelta(days=1)).count()
        
        # Números com problemas
        numeros_problematicos = {
            'qualidade_vermelha': numeros.filter(
                quality_rating=QualityRatingChoices.RED,
                monitoramento_ativo=True
            ).count(),
            'desconectados': numeros.filter(
                status=PhoneNumberStatusChoices.DISCONNECTED,
                monitoramento_ativo=True
            ).count(),
            'restritos': numeros.filter(
                status=PhoneNumberStatusChoices.RESTRICTED,
                monitoramento_ativo=True
            ).count()
        }
        
        # Status de sincronização das Business Managers
        status_sincronizacao = {
            'nunca_sincronizadas': business_managers.filter(ultima_sincronizacao__isnull=True).count(),
            'com_erro': business_managers.exclude(erro_ultima_sincronizacao='').count(),
            'desatualizadas': business_managers.filter(
                ultima_sincronizacao__lt=timezone.now() - timedelta(hours=2)
            ).count()
        }
        
        # Preparar resposta
        stats = {
            'resumo': {
                'total_business_managers': total_business_managers,
                'total_numeros': total_numeros,
                'numeros_monitorados': numeros_monitorados,
                'alertas_pendentes': alertas_pendentes,
                'alertas_criticos': alertas_criticos,
                'alertas_24h': alertas_24h
            },
            'distribuicao_qualidade': distribuicao_qualidade,
            'distribuicao_status': distribuicao_status,
            'numeros_problematicos': numeros_problematicos,
            'status_sincronizacao': status_sincronizacao
        }
        
        # Cache por 5 minutos
        cache_key = f'whatsapp_stats_{request.user.id}'
        cache.set(cache_key, stats, 300)
        
        return Response(stats)
        
    except Exception as e:
        logger.error(f"Erro ao carregar stats WhatsApp: {e}")
        return Response(
            {'error': 'Erro ao carregar estatísticas'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def verificar_mudancas_qualidade(request):
    """Verifica mudanças recentes na qualidade dos números"""
    
    try:
        whatsapp_service = WhatsAppMetaAPIService()
        resultado = whatsapp_service.verificar_mudancas_qualidade()
        
        return Response(resultado)
        
    except Exception as e:
        logger.error(f"Erro ao verificar mudanças: {e}")
        return Response(
            {'error': f'Erro ao verificar mudanças: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# VIEW TEMPORÁRIA - REMOVER APÓS LIMPEZA DOS TOKENS
@api_view(['POST'])
@permission_classes([AllowAny])  # Temporariamente sem autenticação para facilitar acesso
def fix_whatsapp_tokens_temp(request):
    """View temporária para limpar tokens WhatsApp corrompidos"""
    
    try:
        from django.db import transaction
        from .models import BusinessManager
        
        with transaction.atomic():
            # Buscar BMs com tokens corrompidos
            business_managers = BusinessManager.objects.filter(
                access_token_encrypted__isnull=False
            ).exclude(access_token_encrypted='')

            count = business_managers.count()
            
            if count == 0:
                return Response({
                    'success': True,
                    'message': 'Nenhum token corrompido encontrado.',
                    'count': 0
                })

            # Limpar tokens
            cleaned_bms = []
            for bm in business_managers:
                cleaned_bms.append({
                    'id': bm.id,
                    'nome': bm.nome,
                    'business_manager_id': bm.whatsapp_business_account_id
                })
                bm.access_token_encrypted = ''
                bm.erro_ultima_sincronizacao = 'Token limpo - re-cadastre o access token'
                bm.save()

            return Response({
                'success': True,
                'message': f'SUCESSO: {count} tokens limpos com sucesso!',
                'count': count,
                'business_managers_limpas': cleaned_bms,
                'proximos_passos': 'ACAO NECESSARIA: Re-cadastre o access token de todas as Business Managers no painel administrativo'
            })

    except Exception as e:
        return Response({
            'success': False,
            'error': f'ERRO ao limpar tokens: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# VIEW TEMPORÁRIA - APLICAR MIGRATIONS
@api_view(['POST'])
@permission_classes([AllowAny])
def apply_migrations_temp(request):
    """View temporária para aplicar migrations WhatsApp Business"""
    
    try:
        from django.core.management import call_command
        from io import StringIO
        
        # Capturar saída
        output = StringIO()
        
        # Aplicar migrations da app ia
        call_command('migrate', 'ia', stdout=output, stderr=output)
        
        output_text = output.getvalue()
        
        return Response({
            'success': True,
            'message': 'Migrations aplicadas com sucesso!',
            'output': output_text
        })

    except Exception as e:
        return Response({
            'success': False,
            'error': f'ERRO ao aplicar migrations: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ===== VIEWS PARA NICOCHAT =====

class NicochatConfigViewSet(viewsets.ModelViewSet):
    """ViewSet para CRUD de Configurações NicoChat"""

    queryset = NicochatConfig.objects.all()
    serializer_class = NicochatConfigSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filtrar por permissões do usuário"""
        queryset = NicochatConfig.objects.all()

        # Superuser e grupos especiais veem tudo
        if not (self.request.user.is_superuser or
                self.request.user.groups.filter(name__in=['Diretoria', 'Gestão', 'IA & Automações']).exists()):
            # Usuários normais veem apenas suas configs
            queryset = queryset.filter(usuario=self.request.user)

        return queryset.order_by('-criado_em')

    def perform_create(self, serializer):
        """Definir usuário ao criar"""
        serializer.save(usuario=self.request.user)

    def update(self, request, *args, **kwargs):
        """Update com logging detalhado"""
        logger.info("=" * 80)
        logger.info("🔄 NICOCHAT_CONFIG UPDATE - INICIANDO")
        logger.info(f"   Usuario: {request.user.username}")
        logger.info(f"   Config ID: {kwargs.get('pk')}")
        logger.info(f"   Metodo: {request.method}")
        logger.info(f"   Partial: {kwargs.get('partial', False)}")

        logger.info("📥 DADOS RECEBIDOS:")
        logger.info(f"   - request.data completo: {dict(request.data)}")
        logger.info(f"   - Keys presentes: {list(request.data.keys())}")

        try:
            # Validar que o objeto existe antes de tentar atualizar
            instance = self.get_object()
            logger.info(f"✅ Config encontrada:")
            logger.info(f"   - ID: {instance.id}")
            logger.info(f"   - Nome atual: {instance.nome}")
            logger.info(f"   - Usuario dono: {instance.usuario.username}")
            logger.info(f"   - Ativo: {instance.ativo}")

            # Verificar permissão
            if instance.usuario != request.user and not request.user.is_superuser:
                logger.error(f"❌ ERRO: Usuario {request.user.username} tentando editar config de {instance.usuario.username}")
                return Response(
                    {'error': 'Sem permissão para editar esta configuração'},
                    status=status.HTTP_403_FORBIDDEN
                )

            logger.info("✅ Permissões OK, prosseguindo com update...")

            # Verificar se está tentando mudar campo 'ativo'
            if 'ativo' in request.data:
                logger.info(f"🔄 Campo 'ativo' presente: {request.data.get('ativo')} (atual: {instance.ativo})")

            # Chamar update padrão COM partial=True para permitir updates parciais
            kwargs['partial'] = True
            response = super().update(request, *args, **kwargs)

            logger.info("✅ UPDATE CONCLUÍDO COM SUCESSO")
            logger.info(f"   - Status code: {response.status_code}")
            logger.info(f"   - Response keys: {list(response.data.keys()) if hasattr(response, 'data') else 'N/A'}")

            return response

        except Exception as e:
            logger.error(f"❌ ERRO INESPERADO em NicochatConfig.update:")
            logger.error(f"   - Tipo: {type(e).__name__}")
            logger.error(f"   - Mensagem: {str(e)}")
            import traceback
            logger.error(f"   - Stack trace completo:")
            logger.error(traceback.format_exc())
            return Response(
                {'error': f'Erro ao atualizar configuração: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        finally:
            logger.info("=" * 80)

    def partial_update(self, request, *args, **kwargs):
        """Partial update com logging detalhado"""
        logger.info("🔄 NICOCHAT_CONFIG PARTIAL_UPDATE - redirecionando para update()")
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def nicochat_subflows(request):
    """
    Busca subfluxos de um fluxo específico do NicoChat

    Query params:
        - flow_id: ID do fluxo (obrigatório)
        - config_id: ID da configuração NicoChat a usar (obrigatório)
    """
    # LOG 1: Entrada da função
    logger.info("=" * 80)
    logger.info("🔍 NICOCHAT_SUBFLOWS - INICIANDO")
    logger.info(f"   Usuario: {request.user.username}")
    logger.info(f"   Metodo: {request.method}")
    logger.info(f"   Path: {request.path}")

    # LOG 2: Query params recebidos
    logger.info("📥 QUERY PARAMS RECEBIDOS:")
    logger.info(f"   - request.GET completo: {dict(request.GET)}")

    flow_id = request.GET.get('flow_id')
    config_id = request.GET.get('config_id')

    logger.info(f"   - flow_id extraido: '{flow_id}' (tipo: {type(flow_id)})")
    logger.info(f"   - config_id extraido: '{config_id}' (tipo: {type(config_id)})")

    # VALIDAÇÃO 1: flow_id
    if not flow_id:
        logger.error("❌ ERRO: flow_id não fornecido ou vazio")
        return Response(
            {'error': 'flow_id é obrigatório'},
            status=status.HTTP_400_BAD_REQUEST
        )

    logger.info(f"✅ flow_id validado: '{flow_id}'")

    # VALIDAÇÃO 2: config_id
    if not config_id:
        logger.error("❌ ERRO: config_id não fornecido ou vazio")
        return Response(
            {'error': 'config_id é obrigatório'},
            status=status.HTTP_400_BAD_REQUEST
        )

    logger.info(f"✅ config_id validado: '{config_id}'")

    try:
        # LOG 3: Buscar configuração
        logger.info(f"🔎 Buscando NicochatConfig com id={config_id}, ativo=True")
        config = NicochatConfig.objects.get(id=config_id, ativo=True)
        logger.info(f"✅ Config encontrada:")
        logger.info(f"   - ID: {config.id}")
        logger.info(f"   - Nome: {config.nome}")
        logger.info(f"   - Usuario: {config.usuario.username}")
        logger.info(f"   - Ativo: {config.ativo}")
        logger.info(f"   - Tem API key criptografada: {bool(config.api_key_encrypted)}")

        # LOG 4: Verificar permissão
        logger.info("🔐 Verificando permissões do usuário:")
        logger.info(f"   - É superuser: {request.user.is_superuser}")
        grupos = list(request.user.groups.values_list('name', flat=True))
        logger.info(f"   - Grupos: {grupos}")
        logger.info(f"   - É dono da config: {config.usuario == request.user}")

        tem_permissao = (
            request.user.is_superuser or
            request.user.groups.filter(name__in=['Diretoria', 'Gestão', 'IA & Automações']).exists() or
            config.usuario == request.user
        )

        logger.info(f"   - Tem permissão: {tem_permissao}")

        if not tem_permissao:
            logger.error("❌ ERRO: Usuario sem permissão para usar esta configuração")
            return Response(
                {'error': 'Sem permissão para usar esta configuração'},
                status=status.HTTP_403_FORBIDDEN
            )

        logger.info("✅ Permissões validadas")

        # LOG 5: Descriptografar API key
        logger.info("🔓 Descriptografando API key...")
        from .nicochat_service import NicochatAPIService, decrypt_api_key

        try:
            api_key = decrypt_api_key(config.api_key_encrypted)
            logger.info(f"✅ API key descriptografada com sucesso (tamanho: {len(api_key)} chars)")
        except Exception as decrypt_error:
            logger.error(f"❌ ERRO ao descriptografar API key: {decrypt_error}")
            import traceback
            logger.error(traceback.format_exc())
            return Response(
                {'error': f'Erro ao descriptografar API key: {str(decrypt_error)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # LOG 6: Criar service e fazer request
        logger.info("🌐 Criando NicochatAPIService e fazendo request à API externa...")
        service = NicochatAPIService(api_key)

        logger.info(f"📡 Chamando service.get_flow_subflows(flow_id='{flow_id}', api_key=<presente>)")
        sucesso, subfluxos = service.get_flow_subflows(flow_id, api_key)

        logger.info(f"📊 Resposta do service:")
        logger.info(f"   - Sucesso: {sucesso}")
        logger.info(f"   - Tipo de subfluxos: {type(subfluxos)}")
        logger.info(f"   - Quantidade: {len(subfluxos) if isinstance(subfluxos, list) else 'N/A'}")

        if not sucesso:
            logger.error(f"❌ Service retornou erro:")
            logger.error(f"   - Detalhes: {subfluxos}")

        if sucesso:
            logger.info("✅ Subfluxos obtidos com sucesso! Retornando resposta 200")
            return Response({
                'success': True,
                'flow_id': flow_id,
                'data': subfluxos,  # Frontend espera 'data', não 'subfluxos'
                'total': len(subfluxos)
            })
        else:
            logger.warning("⚠️ Retornando erro 400 - Falha ao buscar subfluxos")
            return Response({
                'success': False,
                'error': 'Erro ao buscar subfluxos',
                'detalhes': subfluxos
            }, status=status.HTTP_400_BAD_REQUEST)

    except NicochatConfig.DoesNotExist:
        logger.error(f"❌ ERRO: NicochatConfig não encontrada (id={config_id}, ativo=True)")
        logger.error(f"   - Todas as configs ativas: {list(NicochatConfig.objects.filter(ativo=True).values_list('id', 'nome'))}")
        return Response(
            {'error': 'Configuração NicoChat não encontrada ou inativa'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"❌ ERRO INESPERADO em nicochat_subflows:")
        logger.error(f"   - Tipo: {type(e).__name__}")
        logger.error(f"   - Mensagem: {str(e)}")
        import traceback
        logger.error(f"   - Stack trace completo:")
        logger.error(traceback.format_exc())
        return Response(
            {'error': f'Erro interno: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    finally:
        logger.info("=" * 80)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def nicochat_user_fields(request):
    """
    Busca campos customizados de um fluxo do NicoChat

    Query params:
        - flow_id: ID do fluxo (obrigatório)
        - config_id: ID da configuração NicoChat a usar (obrigatório)
    """
    # LOG 1: Entrada da função
    logger.info("=" * 80)
    logger.info("🔍 NICOCHAT_USER_FIELDS - INICIANDO")
    logger.info(f"   Usuario: {request.user.username}")
    logger.info(f"   Metodo: {request.method}")
    logger.info(f"   Path: {request.path}")

    # LOG 2: Query params recebidos
    logger.info("📥 QUERY PARAMS RECEBIDOS:")
    logger.info(f"   - request.GET completo: {dict(request.GET)}")

    flow_id = request.GET.get('flow_id')
    config_id = request.GET.get('config_id')

    logger.info(f"   - flow_id extraido: '{flow_id}' (tipo: {type(flow_id)})")
    logger.info(f"   - config_id extraido: '{config_id}' (tipo: {type(config_id)})")

    # VALIDAÇÃO 1: flow_id
    if not flow_id:
        logger.error("❌ ERRO: flow_id não fornecido ou vazio")
        return Response(
            {'error': 'flow_id é obrigatório'},
            status=status.HTTP_400_BAD_REQUEST
        )

    logger.info(f"✅ flow_id validado: '{flow_id}'")

    # VALIDAÇÃO 2: config_id
    if not config_id:
        logger.error("❌ ERRO: config_id não fornecido ou vazio")
        return Response(
            {'error': 'config_id é obrigatório'},
            status=status.HTTP_400_BAD_REQUEST
        )

    logger.info(f"✅ config_id validado: '{config_id}'")

    try:
        # LOG 3: Buscar configuração
        logger.info(f"🔎 Buscando NicochatConfig com id={config_id}, ativo=True")
        config = NicochatConfig.objects.get(id=config_id, ativo=True)
        logger.info(f"✅ Config encontrada:")
        logger.info(f"   - ID: {config.id}")
        logger.info(f"   - Nome: {config.nome}")
        logger.info(f"   - Usuario: {config.usuario.username}")
        logger.info(f"   - Ativo: {config.ativo}")
        logger.info(f"   - Tem API key criptografada: {bool(config.api_key_encrypted)}")

        # LOG 4: Verificar permissão
        logger.info("🔐 Verificando permissões do usuário:")
        logger.info(f"   - É superuser: {request.user.is_superuser}")
        grupos = list(request.user.groups.values_list('name', flat=True))
        logger.info(f"   - Grupos: {grupos}")
        logger.info(f"   - É dono da config: {config.usuario == request.user}")

        tem_permissao = (
            request.user.is_superuser or
            request.user.groups.filter(name__in=['Diretoria', 'Gestão', 'IA & Automações']).exists() or
            config.usuario == request.user
        )

        logger.info(f"   - Tem permissão: {tem_permissao}")

        if not tem_permissao:
            logger.error("❌ ERRO: Usuario sem permissão para usar esta configuração")
            return Response(
                {'error': 'Sem permissão para usar esta configuração'},
                status=status.HTTP_403_FORBIDDEN
            )

        logger.info("✅ Permissões validadas")

        # LOG 5: Descriptografar API key
        logger.info("🔓 Descriptografando API key...")
        from .nicochat_service import NicochatAPIService, decrypt_api_key

        try:
            api_key = decrypt_api_key(config.api_key_encrypted)
            logger.info(f"✅ API key descriptografada com sucesso (tamanho: {len(api_key)} chars)")
        except Exception as decrypt_error:
            logger.error(f"❌ ERRO ao descriptografar API key: {decrypt_error}")
            import traceback
            logger.error(traceback.format_exc())
            return Response(
                {'error': f'Erro ao descriptografar API key: {str(decrypt_error)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # LOG 6: Criar service e fazer request
        logger.info("🌐 Criando NicochatAPIService e fazendo request à API externa...")
        service = NicochatAPIService(api_key)

        logger.info(f"📡 Chamando service.get_flow_user_fields(flow_id='{flow_id}', api_key=<presente>)")
        sucesso, campos = service.get_flow_user_fields(flow_id, api_key)

        logger.info(f"📊 Resposta do service:")
        logger.info(f"   - Sucesso: {sucesso}")
        logger.info(f"   - Tipo de campos: {type(campos)}")
        logger.info(f"   - Quantidade: {len(campos) if isinstance(campos, list) else 'N/A'}")

        if not sucesso:
            logger.error(f"❌ Service retornou erro:")
            logger.error(f"   - Detalhes: {campos}")

        if sucesso:
            logger.info("✅ Campos customizados obtidos com sucesso! Retornando resposta 200")

            # LOG TEMPORÁRIO: Mostrar estrutura COMPLETA dos dados
            if campos and len(campos) > 0:
                import json
                logger.info("📋 ESTRUTURA COMPLETA DO PRIMEIRO CAMPO:")
                logger.info(json.dumps(campos[0], indent=2, ensure_ascii=False))

                # Coletar todas as chaves únicas
                todas_chaves = set()
                for campo in campos:
                    todas_chaves.update(campo.keys())
                logger.info(f"📋 TODAS AS CHAVES PRESENTES: {sorted(todas_chaves)}")

                # Procurar campos com 'form' no nome
                campos_com_form = []
                for campo in campos:
                    chaves_form = [k for k in campo.keys() if 'form' in k.lower()]
                    if chaves_form:
                        campos_com_form.append({
                            'id': campo.get('id'),
                            'chaves_form': chaves_form,
                            'valores': {k: campo.get(k) for k in chaves_form}
                        })

                if campos_com_form:
                    logger.info(f"📋 CAMPOS COM 'FORM': {len(campos_com_form)}")
                    logger.info(json.dumps(campos_com_form, indent=2, ensure_ascii=False))
                else:
                    logger.info("⚠️ NENHUM CAMPO COM 'FORM' ENCONTRADO!")

            return Response({
                'success': True,
                'flow_id': flow_id,
                'data': campos,  # Frontend espera 'data', não 'campos'
                'total': len(campos)
            })
        else:
            logger.warning("⚠️ Retornando erro 400 - Falha ao buscar campos")
            return Response({
                'success': False,
                'error': 'Erro ao buscar campos customizados',
                'detalhes': campos
            }, status=status.HTTP_400_BAD_REQUEST)

    except NicochatConfig.DoesNotExist:
        logger.error(f"❌ ERRO: NicochatConfig não encontrada (id={config_id}, ativo=True)")
        logger.error(f"   - Todas as configs ativas: {list(NicochatConfig.objects.filter(ativo=True).values_list('id', 'nome'))}")
        return Response(
            {'error': 'Configuração NicoChat não encontrada ou inativa'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"❌ ERRO INESPERADO em nicochat_user_fields:")
        logger.error(f"   - Tipo: {type(e).__name__}")
        logger.error(f"   - Mensagem: {str(e)}")
        import traceback
        logger.error(f"   - Stack trace completo:")
        logger.error(traceback.format_exc())
        return Response(
            {'error': f'Erro interno: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    finally:
        logger.info("=" * 80)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def nicochat_testar_conexao(request):
    """
    Testa conexão com a API do NicoChat

    Body:
        - api_key: API key a testar (obrigatória)
    """
    api_key = request.data.get('api_key')

    if not api_key:
        return Response(
            {'error': 'api_key é obrigatória'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        from .nicochat_service import NicochatAPIService

        service = NicochatAPIService(api_key)
        sucesso, mensagem = service.testar_conexao(api_key)

        if sucesso:
            return Response({
                'success': True,
                'message': mensagem
            })
        else:
            return Response({
                'success': False,
                'message': mensagem
            }, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        logger.error(f"Erro ao testar conexão NicoChat: {e}")
        return Response(
            {'error': f'Erro interno: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def nicochat_bot_users_count(request):
    """
    Retorna contagem de usuários do bot (conversas abertas + concluídas)

    Query params:
        - config_id: ID da configuração NicoChat (obrigatório)
    """
    logger.info("=" * 80)
    logger.info("🔍 NICOCHAT_BOT_USERS_COUNT - INICIANDO")
    logger.info(f"   Usuario: {request.user.username}")

    config_id = request.GET.get('config_id')

    logger.info(f"   config_id: '{config_id}'")

    if not config_id:
        logger.error("❌ ERRO: config_id não fornecido")
        return Response(
            {'error': 'config_id é obrigatório'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        # Buscar configuração
        logger.info(f"🔎 Buscando NicochatConfig id={config_id}")
        config = NicochatConfig.objects.get(id=config_id, ativo=True)
        logger.info(f"✅ Config encontrada: {config.nome}")

        # Verificar permissão
        tem_permissao = (
            request.user.is_superuser or
            request.user.groups.filter(name__in=['Diretoria', 'Gestão', 'IA & Automações']).exists() or
            config.usuario == request.user
        )

        if not tem_permissao:
            logger.error("❌ ERRO: Usuario sem permissão")
            return Response(
                {'error': 'Sem permissão para usar esta configuração'},
                status=status.HTTP_403_FORBIDDEN
            )

        logger.info("✅ Permissões validadas")

        # Descriptografar API key
        from .nicochat_service import NicochatAPIService, decrypt_api_key

        try:
            api_key = decrypt_api_key(config.api_key_encrypted)
            logger.info("✅ API key descriptografada")
        except Exception as decrypt_error:
            logger.error(f"❌ ERRO ao descriptografar: {decrypt_error}")
            return Response(
                {'error': 'Erro ao descriptografar API key'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # Chamar service
        logger.info("🌐 Chamando service.get_bot_users_count()")
        service = NicochatAPIService(api_key)
        sucesso, resposta = service.get_bot_users_count(api_key)

        logger.info(f"📊 Resposta - Sucesso: {sucesso}")

        if sucesso:
            logger.info("✅ Contagem obtida com sucesso")
            return Response({
                'success': True,
                'data': resposta.get('data', [])
            })
        else:
            logger.warning("⚠️ Falha ao buscar contagem")
            return Response({
                'success': False,
                'error': 'Erro ao buscar contagem de usuários',
                'detalhes': resposta
            }, status=status.HTTP_400_BAD_REQUEST)

    except NicochatConfig.DoesNotExist:
        logger.error(f"❌ Config não encontrada: id={config_id}")
        return Response(
            {'error': 'Configuração NicoChat não encontrada ou inativa'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"❌ ERRO INESPERADO: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return Response(
            {'error': f'Erro interno: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    finally:
        logger.info("=" * 80)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def nicochat_whatsapp_templates_list(request):
    """
    Lista templates WhatsApp

    Body:
        - config_id: ID da configuração NicoChat (obrigatório)
    """
    logger.info("=" * 80)
    logger.info("🔍 NICOCHAT_WHATSAPP_TEMPLATES_LIST - INICIANDO")
    logger.info(f"   Usuario: {request.user.username}")

    config_id = request.data.get('config_id')

    logger.info(f"   config_id: '{config_id}'")

    if not config_id:
        logger.error("❌ ERRO: config_id não fornecido")
        return Response(
            {'error': 'config_id é obrigatório'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        # Buscar configuração
        logger.info(f"🔎 Buscando NicochatConfig id={config_id}")
        config = NicochatConfig.objects.get(id=config_id, ativo=True)
        logger.info(f"✅ Config encontrada: {config.nome}")

        # Verificar permissão
        tem_permissao = (
            request.user.is_superuser or
            request.user.groups.filter(name__in=['Diretoria', 'Gestão', 'IA & Automações']).exists() or
            config.usuario == request.user
        )

        if not tem_permissao:
            logger.error("❌ ERRO: Usuario sem permissão")
            return Response(
                {'error': 'Sem permissão para usar esta configuração'},
                status=status.HTTP_403_FORBIDDEN
            )

        logger.info("✅ Permissões validadas")

        # Descriptografar API key
        from .nicochat_service import NicochatAPIService, decrypt_api_key

        try:
            api_key = decrypt_api_key(config.api_key_encrypted)
            logger.info("✅ API key descriptografada")
        except Exception as decrypt_error:
            logger.error(f"❌ ERRO ao descriptografar: {decrypt_error}")
            return Response(
                {'error': 'Erro ao descriptografar API key'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # Chamar service
        logger.info("🌐 Chamando service.get_whatsapp_templates()")
        service = NicochatAPIService(api_key)
        sucesso, resposta = service.get_whatsapp_templates(api_key)

        logger.info(f"📊 Resposta - Sucesso: {sucesso}")

        if sucesso:
            logger.info("✅ Templates obtidos com sucesso")
            return Response({
                'success': True,
                'data': resposta.get('data', [])
            })
        else:
            logger.warning("⚠️ Falha ao buscar templates")
            return Response({
                'success': False,
                'error': 'Erro ao buscar templates WhatsApp',
                'detalhes': resposta
            }, status=status.HTTP_400_BAD_REQUEST)

    except NicochatConfig.DoesNotExist:
        logger.error(f"❌ Config não encontrada: id={config_id}")
        return Response(
            {'error': 'Configuração NicoChat não encontrada ou inativa'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"❌ ERRO INESPERADO: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return Response(
            {'error': f'Erro interno: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    finally:
        logger.info("=" * 80)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def nicochat_whatsapp_templates_sync(request):
    """
    Sincroniza templates WhatsApp com a API Meta

    Body:
        - config_id: ID da configuração NicoChat (obrigatório)
    """
    logger.info("=" * 80)
    logger.info("🔍 NICOCHAT_WHATSAPP_TEMPLATES_SYNC - INICIANDO")
    logger.info(f"   Usuario: {request.user.username}")

    config_id = request.data.get('config_id')

    logger.info(f"   config_id: '{config_id}'")

    if not config_id:
        logger.error("❌ ERRO: config_id não fornecido")
        return Response(
            {'error': 'config_id é obrigatório'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        # Buscar configuração
        logger.info(f"🔎 Buscando NicochatConfig id={config_id}")
        config = NicochatConfig.objects.get(id=config_id, ativo=True)
        logger.info(f"✅ Config encontrada: {config.nome}")

        # Verificar permissão
        tem_permissao = (
            request.user.is_superuser or
            request.user.groups.filter(name__in=['Diretoria', 'Gestão', 'IA & Automações']).exists() or
            config.usuario == request.user
        )

        if not tem_permissao:
            logger.error("❌ ERRO: Usuario sem permissão")
            return Response(
                {'error': 'Sem permissão para usar esta configuração'},
                status=status.HTTP_403_FORBIDDEN
            )

        logger.info("✅ Permissões validadas")

        # Descriptografar API key
        from .nicochat_service import NicochatAPIService, decrypt_api_key

        try:
            api_key = decrypt_api_key(config.api_key_encrypted)
            logger.info("✅ API key descriptografada")
        except Exception as decrypt_error:
            logger.error(f"❌ ERRO ao descriptografar: {decrypt_error}")
            return Response(
                {'error': 'Erro ao descriptografar API key'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # Chamar service
        logger.info("🌐 Chamando service.sync_whatsapp_templates()")
        service = NicochatAPIService(api_key)
        sucesso, resposta = service.sync_whatsapp_templates(api_key)

        logger.info(f"📊 Resposta - Sucesso: {sucesso}")

        if sucesso:
            logger.info("✅ Sincronização concluída com sucesso")
            return Response({
                'success': True,
                'message': 'Templates WhatsApp sincronizados com sucesso',
                'data': resposta
            })
        else:
            logger.warning("⚠️ Falha ao sincronizar templates")
            return Response({
                'success': False,
                'error': 'Erro ao sincronizar templates WhatsApp',
                'detalhes': resposta
            }, status=status.HTTP_400_BAD_REQUEST)

    except NicochatConfig.DoesNotExist:
        logger.error(f"❌ Config não encontrada: id={config_id}")
        return Response(
            {'error': 'Configuração NicoChat não encontrada ou inativa'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"❌ ERRO INESPERADO: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return Response(
            {'error': f'Erro interno: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    finally:
        logger.info("=" * 80)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def nicochat_subscribers_tags_stats(request):
    """
    Retorna estatísticas de tags de TODOS os subscribers do NicoChat

    Query params:
        - config_id: ID da configuração NicoChat (obrigatório)

    Retorna:
        - tags: Lista de tags com contagem e percentual
        - total_subscribers: Total de contatos
        - total_tags_found: Número de tags diferentes
        - cached_at: Timestamp do cache
        - cache_expires_in: Tempo restante do cache em segundos
    """
    from django.core.cache import cache
    from django.utils import timezone

    logger.info("=" * 80)
    logger.info("🏷️ NICOCHAT_SUBSCRIBERS_TAGS_STATS - INICIANDO")
    logger.info(f"   Usuario: {request.user.username}")

    config_id = request.GET.get('config_id')
    force_refresh = request.GET.get('force_refresh', 'false').lower() == 'true'
    logger.info(f"   config_id: '{config_id}', force_refresh: {force_refresh}")

    if not config_id:
        logger.error("❌ ERRO: config_id não fornecido")
        return Response(
            {'error': 'config_id é obrigatório'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        # Buscar configuração
        logger.info(f"🔎 Buscando NicochatConfig id={config_id}")
        config = NicochatConfig.objects.get(id=config_id, ativo=True)
        logger.info(f"✅ Config encontrada: {config.nome}")

        # Verificar permissão
        tem_permissao = (
            request.user.is_superuser or
            request.user.groups.filter(name__in=['Diretoria', 'Gestão', 'IA & Automações']).exists() or
            config.usuario == request.user
        )

        if not tem_permissao:
            logger.error("❌ ERRO: Usuario sem permissão")
            return Response(
                {'error': 'Sem permissão para usar esta configuração'},
                status=status.HTTP_403_FORBIDDEN
            )

        logger.info("✅ Permissões validadas")

        # Verificar cache primeiro
        cache_key = f"nicochat_tags_stats_{config_id}"

        # Invalidar cache se force_refresh
        if force_refresh:
            logger.info("🔄 FORCE REFRESH - Invalidando cache")
            cache.delete(cache_key)
            cached_data = None
        else:
            cached_data = cache.get(cache_key)

        if cached_data:
            logger.info("📦 CACHE HIT - Retornando dados em cache")
            cache_age = (timezone.now() - timezone.datetime.fromisoformat(cached_data['cached_at'])).total_seconds()
            cached_data['cache_hit'] = True
            cached_data['cache_age_seconds'] = round(cache_age, 2)
            logger.info(f"   Cache age: {cache_age:.2f}s")
            logger.info("=" * 80)
            return Response(cached_data)

        logger.info("📭 CACHE MISS - Buscando dados da API")

        # Descriptografar API key
        from .nicochat_service import NicochatAPIService, decrypt_api_key

        try:
            api_key = decrypt_api_key(config.api_key_encrypted)
            logger.info("✅ API key descriptografada")
        except Exception as decrypt_error:
            logger.error(f"❌ ERRO ao descriptografar: {decrypt_error}")
            return Response(
                {'error': 'Erro ao descriptografar API key'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # Chamar service
        logger.info("🌐 Chamando service.get_all_subscribers_tags()")
        logger.info("   ⚠️ ATENÇÃO: Isso pode demorar 10-20 segundos (531 contatos, 54 páginas)")

        service = NicochatAPIService(api_key)
        sucesso, resposta = service.get_all_subscribers_tags(api_key)

        if sucesso:
            logger.info("✅ Estatísticas de tags obtidas com sucesso")

            # Preparar resposta com cache info
            cached_at = timezone.now().isoformat()
            cache_ttl = 600  # 10 minutos

            result = {
                'success': True,
                'tags': resposta.get('tags', []),
                'total_subscribers': resposta.get('total_subscribers', 0),
                'total_tags_found': resposta.get('total_tags_found', 0),
                'pages_processed': resposta.get('pages_processed', 0),
                'processing_time_seconds': resposta.get('processing_time_seconds', 0),
                'cached_at': cached_at,
                'cache_expires_in': cache_ttl,
                'cache_hit': False
            }

            # Adicionar erros se houver
            if 'errors' in resposta:
                result['errors'] = resposta['errors']

            # Armazenar em cache
            cache.set(cache_key, result, cache_ttl)
            logger.info(f"💾 Dados armazenados em cache por {cache_ttl}s")

            return Response(result)

        else:
            logger.warning("⚠️ Falha ao buscar estatísticas de tags")

            # Tentar retornar cache antigo se existir (fallback)
            old_cache = cache.get(cache_key + "_backup")
            if old_cache:
                logger.info("🔄 Retornando cache antigo como fallback")
                old_cache['cache_fallback'] = True
                old_cache['error_message'] = resposta.get('error', 'Erro ao buscar dados')
                return Response(old_cache, status=status.HTTP_200_OK)

            return Response({
                'success': False,
                'error': 'Erro ao buscar estatísticas de tags',
                'detalhes': resposta
            }, status=status.HTTP_400_BAD_REQUEST)

    except NicochatConfig.DoesNotExist:
        logger.error(f"❌ Config não encontrada: id={config_id}")
        return Response(
            {'error': 'Configuração NicoChat não encontrada ou inativa'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"❌ ERRO INESPERADO: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return Response(
            {'error': f'Erro interno: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    finally:
        logger.info("=" * 80)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def verificar_saude_criptografia(request):
    """Verifica saúde do sistema de criptografia WhatsApp"""
    
    # Verificar permissões
    if not (request.user.is_superuser or 
            request.user.groups.filter(name__in=['Diretoria', 'Gestão']).exists()):
        return Response(
            {'error': 'Sem permissão para verificar configurações de criptografia'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        from config.whatsapp_config import check_encryption_health
        
        # Verificar saúde da criptografia
        health_status = check_encryption_health()
        
        # Verificar Business Managers com problemas
        problematic_bms = []
        for bm in BusinessManager.objects.filter(ativo=True):
            if bm.access_token_encrypted:
                whatsapp_service = WhatsAppMetaAPIService()
                sucesso, erro, _ = whatsapp_service._get_access_token_safe(bm)
                if not sucesso:
                    problematic_bms.append({
                        'id': bm.id,
                        'nome': bm.nome,
                        'business_manager_id': bm.whatsapp_business_account_id,
                        'erro': erro,
                        'ultimo_erro': bm.erro_ultima_sincronizacao
                    })
        
        # Preparar resposta
        response_data = {
            'encryption_health': health_status,
            'problematic_business_managers': problematic_bms,
            'total_bms': BusinessManager.objects.filter(ativo=True).count(),
            'bms_com_problema': len(problematic_bms),
            'status_geral': 'OK' if health_status.get('can_decrypt', False) and len(problematic_bms) == 0 else 'PROBLEMAS',
            'timestamp': timezone.now().isoformat()
        }
        
        return Response(response_data)
        
    except Exception as e:
        logger.error(f"Erro ao verificar saúde da criptografia: {e}")
        return Response(
            {'error': f'Erro ao verificar criptografia: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )