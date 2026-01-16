# backend/features/planejamento_semanal/views.py
import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction

from datetime import timedelta
from django.utils import timezone
from .models import SemanaReferencia, PlanejamentoSemanal, ItemPlanejamento, AvisoImportante
from .serializers import (
    SemanaReferenciaSerializer,
    PlanejamentoSemanalSerializer,
    PlanejamentoSemanalCreateSerializer,
    DashboardSemanalSerializer,
    IssueJiraSerializer,
    AvisoImportanteSerializer
)
from features.jira.clients.jira_client import JiraClient, JiraAPIError

logger = logging.getLogger(__name__)


class PlanejamentoSemanalViewSet(viewsets.ViewSet):
    """
    ViewSet para gerenciamento de planejamento semanal.
    """
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'], url_path='semana-atual')
    def semana_atual(self, request):
        """
        GET /api/planejamento-semanal/semana-atual/?jira_account_id=xxx&semana_id=1
        Retorna o planejamento de uma semana para um usuario Jira especifico.
        Se semana_id nao for informado, usa a semana atual.
        """
        jira_account_id = request.query_params.get('jira_account_id')
        semana_id = request.query_params.get('semana_id')

        if not jira_account_id:
            return Response(
                {'error': 'jira_account_id e obrigatorio'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Obter semana especifica ou atual
            if semana_id:
                try:
                    semana = SemanaReferencia.objects.get(id=semana_id)
                except SemanaReferencia.DoesNotExist:
                    return Response(
                        {'error': 'Semana nao encontrada'},
                        status=status.HTTP_404_NOT_FOUND
                    )
            else:
                semana = SemanaReferencia.get_or_create_current_week()

            # Buscar planejamento existente
            planejamento = PlanejamentoSemanal.objects.filter(
                semana=semana,
                jira_account_id=jira_account_id
            ).first()

            if planejamento:
                serializer = PlanejamentoSemanalSerializer(planejamento)
                return Response({
                    'planejamento': serializer.data,
                    'semana': SemanaReferenciaSerializer(semana).data
                })
            else:
                # Retorna semana sem planejamento
                return Response({
                    'planejamento': None,
                    'semana': SemanaReferenciaSerializer(semana).data
                })

        except Exception as e:
            logger.error(f"Erro ao buscar semana atual: {str(e)}")
            return Response(
                {'error': f'Erro ao buscar planejamento: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'], url_path='salvar')
    def salvar_planejamento(self, request):
        """
        POST /api/planejamento-semanal/salvar_planejamento/
        Salva ou atualiza um planejamento semanal com seus itens.

        Body:
        {
            "jira_account_id": "xxx",
            "jira_display_name": "Nome Usuario",
            "semana_id": 1,  // opcional, usa semana atual se nao informado
            "itens": [
                {
                    "issue_key": "CHEGOU-123",
                    "issue_summary": "Titulo da task",
                    "issue_status": "Em Andamento",
                    "prioridade": "alta",
                    "concluido": false,
                    "ordem": 0
                }
            ]
        }
        """
        serializer = PlanejamentoSemanalCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data

        try:
            with transaction.atomic():
                # Obter semana
                semana_id = data.get('semana_id')
                if semana_id:
                    try:
                        semana = SemanaReferencia.objects.get(id=semana_id)
                    except SemanaReferencia.DoesNotExist:
                        return Response(
                            {'error': 'Semana nao encontrada'},
                            status=status.HTTP_404_NOT_FOUND
                        )
                else:
                    semana = SemanaReferencia.get_or_create_current_week()

                # Obter ou criar planejamento
                planejamento, created = PlanejamentoSemanal.objects.get_or_create(
                    usuario=request.user,
                    semana=semana,
                    jira_account_id=data['jira_account_id'],
                    defaults={
                        'jira_display_name': data['jira_display_name']
                    }
                )

                # Atualizar nome se mudou
                if not created and planejamento.jira_display_name != data['jira_display_name']:
                    planejamento.jira_display_name = data['jira_display_name']
                    planejamento.save()

                # Remover itens antigos e criar novos
                planejamento.itens.all().delete()

                # Criar novos itens
                for idx, item_data in enumerate(data['itens']):
                    ItemPlanejamento.objects.create(
                        planejamento=planejamento,
                        issue_key=item_data['issue_key'],
                        issue_summary=item_data['issue_summary'],
                        issue_status=item_data['issue_status'],
                        prioridade=item_data.get('prioridade', ItemPlanejamento.Prioridade.MEDIA),
                        concluido=item_data.get('concluido', False),
                        ordem=item_data.get('ordem', idx),
                        tempo_estimado=item_data.get('tempo_estimado', 'M'),
                        mais_de_uma_semana=item_data.get('mais_de_uma_semana', False),
                        is_rotina=item_data.get('is_rotina', False)
                    )

                # Retornar planejamento atualizado
                result_serializer = PlanejamentoSemanalSerializer(planejamento)
                return Response({
                    'message': 'Planejamento salvo com sucesso',
                    'planejamento': result_serializer.data,
                    'created': created
                }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Erro ao salvar planejamento: {str(e)}")
            return Response(
                {'error': f'Erro ao salvar planejamento: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """
        GET /api/planejamento-semanal/dashboard/?semana_id=1
        Retorna todos os planejamentos da semana (dashboard geral).
        """
        semana_id = request.query_params.get('semana_id')

        try:
            # Obter semana
            if semana_id:
                try:
                    semana = SemanaReferencia.objects.get(id=semana_id)
                except SemanaReferencia.DoesNotExist:
                    return Response(
                        {'error': 'Semana nao encontrada'},
                        status=status.HTTP_404_NOT_FOUND
                    )
            else:
                semana = SemanaReferencia.get_or_create_current_week()

            # Buscar todos os planejamentos da semana
            planejamentos = PlanejamentoSemanal.objects.filter(
                semana=semana
            ).prefetch_related('itens')

            # Calcular totais
            total_usuarios = planejamentos.count()
            total_itens = sum(p.total_itens for p in planejamentos)
            total_concluidos = sum(p.itens_concluidos for p in planejamentos)
            percentual_geral = round((total_concluidos / total_itens * 100), 1) if total_itens > 0 else 0

            # Serializar
            data = {
                'semana': SemanaReferenciaSerializer(semana).data,
                'planejamentos': PlanejamentoSemanalSerializer(planejamentos, many=True).data,
                'total_usuarios': total_usuarios,
                'total_itens': total_itens,
                'total_concluidos': total_concluidos,
                'percentual_geral': percentual_geral
            }

            return Response(data)

        except Exception as e:
            logger.error(f"Erro ao buscar dashboard: {str(e)}")
            return Response(
                {'error': f'Erro ao buscar dashboard: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], url_path='issues-disponiveis')
    def issues_disponiveis(self, request):
        """
        GET /api/planejamento-semanal/issues_disponiveis/?jira_account_id=xxx
        Busca issues disponiveis no Jira para planejamento.
        Filtra por status: Backlog, Priorizado, Em Andamento
        """
        jira_account_id = request.query_params.get('jira_account_id')

        if not jira_account_id:
            return Response(
                {'error': 'jira_account_id e obrigatorio'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Inicializar cliente Jira
            client = JiraClient()

            # Construir JQL para buscar issues do usuario nos status desejados
            # Inclui todos os status de planejamento (exclui apenas Concluido/Done)
            status_list = [
                "Backlog",
                "BACKLOG",
                "Refinamento",
                "REFINAMENTO",
                "Em Refinamento",
                "Priorizado",
                "PRIORIZADO",
                "Em Andamento",
                "EM ANDAMENTO",
                "Em Desenvolvimento",
                "EM DESENVOLVIMENTO",
                "Período de Teste",
                "PERÍODO DE TESTE",
                "Periodo de Teste",
                "PERIODO DE TESTE",
                "Validação",
                "VALIDAÇÃO",
                "Validacao",
                "Em Validação",
                "EM VALIDAÇÃO",
                "To Do",
                "TO DO",
                "In Progress",
                "IN PROGRESS",
                "A Fazer",
                "Em Revisão",
                "EM REVISÃO",
                "Review",
                "REVIEW",
                "Testing",
                "TESTING",
                "Em Teste",
                "EM TESTE",
                "QA"
            ]
            status_jql = '", "'.join(status_list)

            # Filtro de pesquisa (opcional)
            search_query = request.query_params.get('search', '').strip()
            search_filter = ''
            if search_query:
                # Busca por key ou texto no summary
                search_filter = f' AND (summary ~ "{search_query}" OR key = "{search_query.upper()}")'

            jql = (
                f'project = {client.project_key} '
                f'AND assignee = "{jira_account_id}" '
                f'AND status IN ("{status_jql}") '
                f'AND issuetype NOT IN (Sub-task, Subtarefa, "Sub-tarefa")'  # Excluir subtarefas
                f'{search_filter}'
                f' ORDER BY status ASC, priority DESC, created DESC'
            )

            # Buscar issues
            issues = client.search_issues(
                jql=jql,
                fields=['summary', 'status', 'assignee', 'priority', 'issuetype'],
                max_results=50
            )

            # Formatar resposta agrupada por status
            issues_by_status = {}
            for issue in issues:
                fields = issue.get('fields', {})
                assignee = fields.get('assignee') or {}
                status_field = fields.get('status') or {}
                priority = fields.get('priority') or {}
                issue_type = fields.get('issuetype') or {}

                status_name = status_field.get('name', 'Sem Status')

                issue_data = {
                    'key': issue.get('key'),
                    'summary': fields.get('summary', ''),
                    'status': status_name,
                    'assignee_id': assignee.get('accountId'),
                    'assignee_name': assignee.get('displayName'),
                    'priority': priority.get('name'),
                    'issue_type': issue_type.get('name')
                }

                if status_name not in issues_by_status:
                    issues_by_status[status_name] = []
                issues_by_status[status_name].append(issue_data)

            return Response({
                'issues_by_status': issues_by_status,
                'total': len(issues)
            })

        except JiraAPIError as e:
            logger.error(f"Erro na API Jira: {str(e)}")
            return Response(
                {'error': f'Erro na API Jira: {str(e)}'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        except Exception as e:
            logger.error(f"Erro ao buscar issues: {str(e)}")
            return Response(
                {'error': f'Erro ao buscar issues: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def semanas(self, request):
        """
        GET /api/planejamento-semanal/semanas/
        Lista as ultimas semanas disponiveis.
        """
        try:
            semanas = SemanaReferencia.objects.all()[:10]
            serializer = SemanaReferenciaSerializer(semanas, many=True)
            return Response({'semanas': serializer.data})

        except Exception as e:
            logger.error(f"Erro ao listar semanas: {str(e)}")
            return Response(
                {'error': f'Erro ao listar semanas: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'], url_path='criar-semana')
    def criar_semana(self, request):
        """
        POST /api/planejamento-semanal/criar-semana/
        Cria a semana atual de planejamento (apenas admins/superusers).
        A semana inicia no domingo e termina no sabado.
        """
        # Verificar se usuario e admin ou superuser
        if not request.user.is_staff and not request.user.is_superuser:
            return Response(
                {'error': 'Apenas administradores podem criar novas semanas'},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            # Calcular o domingo da semana atual
            # weekday(): 0=segunda, ..., 6=domingo
            # Convertemos para: 0=domingo, 1=segunda, ..., 6=sabado
            hoje = timezone.now().date()
            days_since_sunday = (hoje.weekday() + 1) % 7
            domingo_atual = hoje - timedelta(days=days_since_sunday)
            sabado_atual = domingo_atual + timedelta(days=6)

            # Verificar se ja existe semana para essa data
            semana_existente = SemanaReferencia.objects.filter(
                data_inicio=domingo_atual
            ).first()

            if semana_existente:
                return Response({
                    'error': 'Ja existe uma semana para esse periodo',
                    'semana': SemanaReferenciaSerializer(semana_existente).data
                }, status=status.HTTP_409_CONFLICT)

            # Criar nova semana
            nova_semana = SemanaReferencia.objects.create(
                data_inicio=domingo_atual,
                data_fim=sabado_atual
            )

            return Response({
                'message': 'Nova semana criada com sucesso',
                'semana': SemanaReferenciaSerializer(nova_semana).data
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"Erro ao criar semana: {str(e)}")
            return Response(
                {'error': f'Erro ao criar semana: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['patch'])
    def atualizar_item(self, request):
        """
        PATCH /api/planejamento-semanal/atualizar_item/
        Atualiza um item especifico do planejamento.

        Body:
        {
            "item_id": 1,
            "concluido": true
        }
        """
        item_id = request.data.get('item_id')
        if not item_id:
            return Response(
                {'error': 'item_id e obrigatorio'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            item = ItemPlanejamento.objects.select_related('planejamento').get(id=item_id)

            # Verificar se o usuario tem permissao (dono do planejamento)
            if item.planejamento.usuario != request.user:
                return Response(
                    {'error': 'Sem permissao para atualizar este item'},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Atualizar campos permitidos
            if 'concluido' in request.data:
                item.concluido = request.data['concluido']
            if 'prioridade' in request.data:
                item.prioridade = request.data['prioridade']
            if 'ordem' in request.data:
                item.ordem = request.data['ordem']

            item.save()

            return Response({
                'message': 'Item atualizado com sucesso',
                'item': {
                    'id': item.id,
                    'issue_key': item.issue_key,
                    'concluido': item.concluido,
                    'prioridade': item.prioridade,
                    'ordem': item.ordem
                }
            })

        except ItemPlanejamento.DoesNotExist:
            return Response(
                {'error': 'Item nao encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Erro ao atualizar item: {str(e)}")
            return Response(
                {'error': f'Erro ao atualizar item: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['delete'], url_path='deletar-semana')
    def deletar_semana(self, request):
        """
        DELETE /api/planejamento-semanal/deletar-semana/?semana_id=1
        Deleta uma semana e todos os planejamentos associados (apenas admins).
        """
        # Verificar se usuario e admin ou superuser
        if not request.user.is_staff and not request.user.is_superuser:
            return Response(
                {'error': 'Apenas administradores podem deletar semanas'},
                status=status.HTTP_403_FORBIDDEN
            )

        semana_id = request.query_params.get('semana_id')
        if not semana_id:
            return Response(
                {'error': 'semana_id e obrigatorio'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            semana = SemanaReferencia.objects.get(id=semana_id)
            semana.delete()  # CASCADE vai deletar planejamentos e itens
            return Response({'message': 'Semana deletada com sucesso'})
        except SemanaReferencia.DoesNotExist:
            return Response(
                {'error': 'Semana nao encontrada'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Erro ao deletar semana: {str(e)}")
            return Response(
                {'error': f'Erro ao deletar semana: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    # ==================== AVISOS IMPORTANTES ====================

    @action(detail=False, methods=['get'], url_path='avisos')
    def listar_avisos(self, request):
        """
        GET /api/planejamento-semanal/avisos/
        Lista todos os avisos importantes.
        """
        try:
            avisos = AvisoImportante.objects.all()
            serializer = AvisoImportanteSerializer(avisos, many=True)
            return Response({'avisos': serializer.data})

        except Exception as e:
            logger.error(f"Erro ao listar avisos: {str(e)}")
            return Response(
                {'error': f'Erro ao listar avisos: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'], url_path='avisos/criar')
    def criar_aviso(self, request):
        """
        POST /api/planejamento-semanal/avisos/criar/
        Cria um novo aviso importante.

        Body:
        {
            "texto": "Conteudo do aviso",
            "ordem": 0  // opcional
        }
        """
        texto = request.data.get('texto')
        if not texto:
            return Response(
                {'error': 'texto e obrigatorio'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            aviso = AvisoImportante.objects.create(
                texto=texto,
                criado_por=request.user,
                ordem=request.data.get('ordem', 0)
            )

            serializer = AvisoImportanteSerializer(aviso)
            return Response({
                'message': 'Aviso criado com sucesso',
                'aviso': serializer.data
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"Erro ao criar aviso: {str(e)}")
            return Response(
                {'error': f'Erro ao criar aviso: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['delete'], url_path='avisos/deletar')
    def deletar_aviso(self, request):
        """
        DELETE /api/planejamento-semanal/avisos/deletar/?id=X
        Deleta um aviso importante.
        """
        aviso_id = request.query_params.get('id')
        if not aviso_id:
            return Response(
                {'error': 'id e obrigatorio'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            aviso = AvisoImportante.objects.get(id=aviso_id)
            aviso.delete()
            return Response({'message': 'Aviso deletado com sucesso'})

        except AvisoImportante.DoesNotExist:
            return Response(
                {'error': 'Aviso nao encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Erro ao deletar aviso: {str(e)}")
            return Response(
                {'error': f'Erro ao deletar aviso: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
