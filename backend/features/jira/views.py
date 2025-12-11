# backend/features/jira/views.py
import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone

from .models import JiraConfig
from .serializers import (
    JiraConfigSerializer,
    JiraConfigStatusSerializer,
    JiraUserSerializer,
    JiraBoardSerializer,
    JiraIssueSerializer,
    JiraMetricsByAssigneeSerializer,
    JiraCreatedVsResolvedSerializer,
    JiraByStatusSerializer,
    JiraTimesheetSerializer,
    JiraLeadTimeSerializer,
)
from .clients.jira_client import JiraClient, JiraAPIError
from .services.metrics_service import JiraMetricsService
from .services.lead_time_service import JiraLeadTimeService

logger = logging.getLogger(__name__)


class JiraConfigViewSet(viewsets.ModelViewSet):
    """ViewSet para gerenciar configurações Jira"""

    queryset = JiraConfig.objects.all()
    serializer_class = JiraConfigSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'], url_path='status')
    def get_status(self, request):
        """Retorna status da configuração Jira"""
        try:
            config = JiraConfig.objects.filter(ativo=True).first()

            if not config:
                return Response({
                    'configurado': False,
                    'message': 'Nenhuma configuração Jira encontrada'
                })

            serializer = JiraConfigStatusSerializer({
                'configurado': True,
                'jira_url': config.jira_url,
                'jira_email': config.jira_email,
                'jira_project_key': config.jira_project_key,
                'ativo': config.ativo,
                'ultima_sincronizacao': config.ultima_sincronizacao,
            })

            return Response(serializer.data)

        except Exception as e:
            logger.error(f"[JIRA] Erro ao buscar status: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'], url_path='test')
    def test_connection(self, request):
        """Testa conexão com Jira"""
        try:
            client = JiraClient()
            result = client.test_connection()

            # Atualizar última sincronização se sucesso
            if result['status'] == 'success':
                config = JiraConfig.objects.filter(ativo=True).first()
                if config:
                    config.ultima_sincronizacao = timezone.now()
                    config.save()

            return Response(result)

        except JiraAPIError as e:
            return Response(
                {'status': 'error', 'message': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"[JIRA] Erro ao testar conexão: {str(e)}")
            return Response(
                {'status': 'error', 'message': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], url_path='diagnostico')
    def diagnostico(self, request):
        """Endpoint de diagnóstico para identificar problemas de configuração"""
        from django.conf import settings

        diagnostico = {
            'status': 'ok',
            'checks': {}
        }

        # Check 1: JIRA_ENCRYPTION_KEY configurada
        has_encryption_key = bool(getattr(settings, 'JIRA_ENCRYPTION_KEY', None))
        diagnostico['checks']['encryption_key'] = {
            'status': 'ok' if has_encryption_key else 'error',
            'message': 'JIRA_ENCRYPTION_KEY configurada' if has_encryption_key else 'JIRA_ENCRYPTION_KEY não encontrada nas variáveis de ambiente'
        }

        # Check 2: Configuração no banco
        config = JiraConfig.objects.filter(ativo=True).first()
        if config:
            diagnostico['checks']['config_banco'] = {
                'status': 'ok',
                'message': f'Configuração ativa encontrada (ID: {config.id})',
                'jira_url': config.jira_url,
                'jira_email': config.jira_email,
                'jira_project_key': config.jira_project_key,
                'token_encrypted_length': len(config.api_token_encrypted) if config.api_token_encrypted else 0
            }
        else:
            diagnostico['checks']['config_banco'] = {
                'status': 'error',
                'message': 'Nenhuma configuração Jira ATIVA encontrada no banco. Crie uma em Admin > Jira > Configuração Jira e marque como ativa.'
            }
            diagnostico['status'] = 'error'

        # Check 3: Token descriptografável
        if config and has_encryption_key:
            try:
                token = JiraConfig.get_token()
                if token:
                    diagnostico['checks']['token_decrypt'] = {
                        'status': 'ok',
                        'message': 'Token descriptografado com sucesso',
                        'token_length': len(token)
                    }
                else:
                    diagnostico['checks']['token_decrypt'] = {
                        'status': 'error',
                        'message': 'Não foi possível descriptografar o token. Verifique se a JIRA_ENCRYPTION_KEY é a mesma usada para criptografar.'
                    }
                    diagnostico['status'] = 'error'
            except Exception as e:
                diagnostico['checks']['token_decrypt'] = {
                    'status': 'error',
                    'message': f'Erro ao descriptografar token: {str(e)}'
                }
                diagnostico['status'] = 'error'
        elif config and not has_encryption_key:
            diagnostico['checks']['token_decrypt'] = {
                'status': 'error',
                'message': 'Não é possível descriptografar sem JIRA_ENCRYPTION_KEY'
            }
            diagnostico['status'] = 'error'

        # Check 4: Teste de conexão (só se tudo acima estiver ok)
        if diagnostico['status'] == 'ok':
            try:
                client = JiraClient()
                result = client.test_connection()
                diagnostico['checks']['conexao_jira'] = {
                    'status': result['status'],
                    'message': result.get('message', ''),
                    'user': result.get('user')
                }
                if result['status'] != 'success':
                    diagnostico['status'] = 'error'
            except JiraAPIError as e:
                diagnostico['checks']['conexao_jira'] = {
                    'status': 'error',
                    'message': str(e)
                }
                diagnostico['status'] = 'error'

        return Response(diagnostico)


class JiraUsersViewSet(viewsets.ViewSet):
    """ViewSet para usuários Jira"""

    permission_classes = [IsAuthenticated]

    def list(self, request):
        """Lista usuários assignáveis do projeto"""
        try:
            client = JiraClient()
            users = client.get_users()

            serializer = JiraUserSerializer(users, many=True)
            return Response(serializer.data)

        except JiraAPIError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"[JIRA] Erro ao buscar usuários: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class JiraBoardsViewSet(viewsets.ViewSet):
    """ViewSet para boards Jira"""

    permission_classes = [IsAuthenticated]

    def list(self, request):
        """Lista boards do projeto"""
        try:
            client = JiraClient()
            boards = client.get_boards()

            serializer = JiraBoardSerializer(boards, many=True)
            return Response(serializer.data)

        except JiraAPIError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"[JIRA] Erro ao buscar boards: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class JiraMetricsViewSet(viewsets.ViewSet):
    """ViewSet para métricas Jira"""

    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'], url_path='resolved')
    def resolved_by_assignee(self, request):
        """Atividades resolvidas por responsável"""
        try:
            # Parâmetros
            period = request.query_params.get('period', '30d')
            board_id = request.query_params.get('board')
            assignee = request.query_params.get('assignee')
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')

            # Converter board_id para int se fornecido
            if board_id:
                board_id = int(board_id)

            # Buscar métricas
            service = JiraMetricsService()
            result = service.get_resolved_by_assignee(
                period=period,
                board_id=board_id,
                assignee=assignee,
                start_date=start_date,
                end_date=end_date
            )

            if result['status'] == 'error':
                return Response(result, status=status.HTTP_400_BAD_REQUEST)

            return Response(result)

        except Exception as e:
            logger.error(f"[JIRA] Erro ao buscar resolvidos: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], url_path='created-vs-resolved')
    def created_vs_resolved(self, request):
        """Criado vs Resolvido semanal"""
        try:
            # Parâmetros
            period = request.query_params.get('period', '30d')
            board_id = request.query_params.get('board')
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')

            # Converter board_id para int se fornecido
            if board_id:
                board_id = int(board_id)

            # Buscar métricas
            service = JiraMetricsService()
            result = service.get_created_vs_resolved(
                period=period,
                board_id=board_id,
                start_date=start_date,
                end_date=end_date
            )

            if result['status'] == 'error':
                return Response(result, status=status.HTTP_400_BAD_REQUEST)

            return Response(result)

        except Exception as e:
            logger.error(f"[JIRA] Erro ao buscar criado vs resolvido: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], url_path='by-status')
    def by_status(self, request):
        """Contagem por status"""
        try:
            # Parâmetros
            board_id = request.query_params.get('board')

            # Converter board_id para int se fornecido
            if board_id:
                board_id = int(board_id)

            # Buscar métricas
            service = JiraMetricsService()
            result = service.get_by_status(board_id=board_id)

            if result['status'] == 'error':
                return Response(result, status=status.HTTP_400_BAD_REQUEST)

            return Response(result)

        except Exception as e:
            logger.error(f"[JIRA] Erro ao buscar por status: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], url_path='timesheet')
    def timesheet(self, request):
        """Horas trabalhadas"""
        try:
            # Parâmetros obrigatórios
            assignee = request.query_params.get('assignee')
            if not assignee:
                return Response(
                    {'error': 'Parâmetro "assignee" é obrigatório'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            period = request.query_params.get('period', '30d')
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')

            # Buscar métricas
            service = JiraMetricsService()
            result = service.get_timesheet(
                assignee=assignee,
                period=period,
                start_date=start_date,
                end_date=end_date
            )

            if result['status'] == 'error':
                return Response(result, status=status.HTTP_400_BAD_REQUEST)

            return Response(result)

        except Exception as e:
            logger.error(f"[JIRA] Erro ao buscar timesheet: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class JiraLeadTimeViewSet(viewsets.ViewSet):
    """ViewSet para lead time Jira"""

    permission_classes = [IsAuthenticated]

    def list(self, request):
        """Calcula lead time com breakdown por coluna"""
        try:
            # Parâmetros
            period = request.query_params.get('period', '30d')
            board_id = request.query_params.get('board')
            assignee = request.query_params.get('assignee')
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')

            # Converter board_id para int se fornecido
            if board_id:
                board_id = int(board_id)

            # Calcular lead time
            service = JiraLeadTimeService()
            result = service.calculate_lead_time(
                period=period,
                board_id=board_id,
                assignee=assignee,
                start_date=start_date,
                end_date=end_date
            )

            if result['status'] == 'error':
                return Response(result, status=status.HTTP_400_BAD_REQUEST)

            return Response(result)

        except Exception as e:
            logger.error(f"[JIRA] Erro ao calcular lead time: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class JiraIssuesViewSet(viewsets.ViewSet):
    """ViewSet para issues Jira"""

    permission_classes = [IsAuthenticated]

    def list(self, request):
        """Lista issues com filtros"""
        try:
            # Parâmetros
            status_filter = request.query_params.get('status')
            board_id = request.query_params.get('board')
            assignee = request.query_params.get('assignee')
            period = request.query_params.get('period', '30d')
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')

            # Construir JQL
            client = JiraClient()
            jql_parts = [f"project = {client.project_key}"]

            # Filtro de status
            if status_filter:
                jql_parts.append(f"status = '{status_filter}'")

            # Filtro de assignee
            if assignee:
                jql_parts.append(f"assignee = '{assignee}'")

            # Filtro de board
            if board_id:
                jql_parts.append("Sprint in openSprints() OR Sprint in closedSprints()")

            # Filtro de período
            if period:
                period_jql = client._build_period_jql(period, start_date, end_date)
                jql_parts.append(f"({period_jql})")

            jql = " AND ".join(jql_parts)

            # Buscar issues
            issues = client.search_issues(
                jql,
                fields=['summary', 'status', 'assignee', 'created', 'updated', 'resolutiondate'],
                max_results=100
            )

            # Formatar resposta
            issues_data = []
            for issue in issues:
                fields = issue.get('fields', {})
                assignee_data = fields.get('assignee')

                issues_data.append({
                    'key': issue.get('key'),
                    'summary': fields.get('summary'),
                    'status': fields.get('status', {}).get('name'),
                    'assignee': assignee_data.get('displayName') if assignee_data else None,
                    'created': fields.get('created'),
                    'updated': fields.get('updated'),
                    'resolved': fields.get('resolutiondate'),
                })

            return Response({
                'status': 'success',
                'data': issues_data,
                'total': len(issues_data),
            })

        except JiraAPIError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"[JIRA] Erro ao buscar issues: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
