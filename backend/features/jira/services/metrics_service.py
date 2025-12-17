# backend/features/jira/services/metrics_service.py
"""
Serviço para cálculo de métricas e agregações Jira
"""

import logging
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from collections import defaultdict
from ..clients.jira_client import JiraClient, JiraAPIError

logger = logging.getLogger(__name__)


class JiraMetricsService:
    """Serviço para cálculo de métricas Jira"""

    def __init__(self, client: JiraClient = None):
        """
        Inicializa o serviço de métricas

        Args:
            client: Cliente Jira (opcional, cria um novo se não fornecido)
        """
        self.client = client or JiraClient()

    def get_resolved_by_assignee(
        self,
        period: str,
        board_id: int = None,
        assignee: str = None,
        start_date: str = None,
        end_date: str = None
    ) -> Dict:
        """
        Retorna atividades resolvidas por responsável

        Args:
            period: Período (current_week, last_week, 2_weeks_ago, 15d, 30d, 45d, 3m, 6m, custom)
            board_id: ID do board (opcional)
            assignee: Account ID do assignee (opcional)
            start_date: Data início (para period=custom)
            end_date: Data fim (para period=custom)
        """
        try:
            # Construir JQL
            jql_parts = [f"project = {self.client.project_key}"]
            jql_parts.append("statusCategory in (Done)")

            # Filtro de período (usa 'updated' porque resolutiondate pode estar vazio)
            period_jql = self.client._build_period_jql(period, start_date, end_date, field='updated')
            jql_parts.append(f"({period_jql})")

            # Filtro de assignee
            if assignee:
                jql_parts.append(f"assignee = '{assignee}'")

            # Filtro de board (busca sprints específicos do board)
            if board_id:
                sprint_ids = self.client.get_board_sprints(board_id)
                if sprint_ids:
                    sprint_list = ','.join(str(sid) for sid in sprint_ids)
                    jql_parts.append(f"Sprint in ({sprint_list})")

            jql = " AND ".join(jql_parts)
            logger.info(f"[JIRA] Executando JQL para resolvidos: {jql}")

            # Buscar issues (com paginação para garantir todos os resultados)
            issues = self.client.search_issues_paginated(jql, fields=['assignee', 'updated'])
            logger.info(f"[JIRA] Encontradas {len(issues)} issues resolvidas")

            # Agrupar por assignee
            by_assignee = defaultdict(int)
            for issue in issues:
                fields = issue.get('fields', {})
                assignee_data = fields.get('assignee')

                if assignee_data:
                    assignee_name = assignee_data.get('displayName', 'Sem nome')
                    by_assignee[assignee_name] += 1
                else:
                    by_assignee['Sem assignee'] += 1

            # Converter para lista ordenada
            result = [
                {'assignee': name, 'count': count}
                for name, count in sorted(by_assignee.items(), key=lambda x: x[1], reverse=True)
            ]

            return {
                'status': 'success',
                'data': result,
                'total': len(issues),
                'period': period,
            }

        except Exception as e:
            logger.error(f"[JIRA] Erro ao buscar resolvidos por assignee: {str(e)}")
            return {
                'status': 'error',
                'message': str(e)
            }

    def get_created_vs_resolved(
        self,
        period: str,
        board_id: int = None,
        assignee: str = None,
        start_date: str = None,
        end_date: str = None
    ) -> Dict:
        """
        Retorna métricas de criado vs resolvido semanal

        Args:
            period: Período
            board_id: ID do board (opcional)
            assignee: Account ID do assignee (opcional)
            start_date: Data início (para period=custom)
            end_date: Data fim (para period=custom)
        """
        try:
            # JQL base
            jql_base = f"project = {self.client.project_key}"

            # Filtro de assignee (se fornecido)
            if assignee:
                jql_base += f" AND assignee = '{assignee}'"

            # Filtro de board (se fornecido)
            if board_id:
                sprint_ids = self.client.get_board_sprints(board_id)
                if sprint_ids:
                    sprint_list = ','.join(str(sid) for sid in sprint_ids)
                    jql_base += f" AND Sprint in ({sprint_list})"

            # Filtro de período (usa campo 'created' para ambos - consistente com "Por Status")
            period_jql = self.client._build_period_jql(period, start_date, end_date, field='created')

            # Buscar issues criadas (todos os status, com paginação)
            jql_created = f"{jql_base} AND ({period_jql})"
            logger.info(f"[JIRA CRIADO VS RESOLVIDO] JQL criados: {jql_created}")
            issues_created = self.client.search_issues_paginated(jql_created, fields=['created', 'assignee', 'status'])
            logger.info(f"[JIRA CRIADO VS RESOLVIDO] Issues criadas: {len(issues_created)}")

            # Buscar issues criadas no período E resolvidas (statusCategory Done) - mesma base do "Por Status"
            jql_resolved = f"{jql_base} AND ({period_jql}) AND statusCategory = \"Done\""
            logger.info(f"[JIRA CRIADO VS RESOLVIDO] JQL resolvidos: {jql_resolved}")
            issues_resolved = self.client.search_issues_paginated(jql_resolved, fields=['created', 'assignee', 'status'])
            logger.info(f"[JIRA CRIADO VS RESOLVIDO] Issues resolvidas: {len(issues_resolved)}")

            # Log dos status encontrados (para debug)
            if len(issues_resolved) > 0:
                status_sample = [issue.get('fields', {}).get('status', {}).get('name') for issue in issues_resolved[:3]]
                logger.info(f"[JIRA CRIADO VS RESOLVIDO] Sample de status encontrados: {status_sample}")

            # Agrupar por usuário
            by_user = defaultdict(lambda: {'created': 0, 'resolved': 0})

            for issue in issues_created:
                assignee_data = issue.get('fields', {}).get('assignee')
                name = assignee_data.get('displayName') if assignee_data else 'Sem assignee'
                by_user[name]['created'] += 1

            for issue in issues_resolved:
                assignee_data = issue.get('fields', {}).get('assignee')
                name = assignee_data.get('displayName') if assignee_data else 'Sem assignee'
                by_user[name]['resolved'] += 1

            # Converter para lista ordenada
            result = [{
                'user': name,
                'created': counts['created'],
                'resolved': counts['resolved'],
                'delta': counts['created'] - counts['resolved'],
            } for name, counts in sorted(by_user.items(), key=lambda x: x[1]['created'] + x[1]['resolved'], reverse=True)]

            return {
                'status': 'success',
                'data': result,
                'period': period,
            }

        except Exception as e:
            logger.error(f"[JIRA] Erro ao buscar criado vs resolvido: {str(e)}")
            return {
                'status': 'error',
                'message': str(e)
            }

    def get_by_status(
        self,
        period: str = '30d',
        board_id: int = None,
        assignee: str = None,
        start_date: str = None,
        end_date: str = None
    ) -> Dict:
        """
        Retorna contagem de issues por status

        Args:
            period: Período de filtro (default: 30d)
            board_id: ID do board (opcional)
            assignee: Account ID do assignee (opcional)
            start_date: Data início (para period=custom)
            end_date: Data fim (para period=custom)
        """
        try:
            # JQL base
            jql_parts = [f"project = {self.client.project_key}"]

            # Filtro de período
            period_jql = self.client._build_period_jql(period, start_date, end_date)
            jql_parts.append(f"({period_jql})")

            # Filtro de assignee
            if assignee:
                jql_parts.append(f"assignee = '{assignee}'")

            # Filtro de board (busca sprints específicos do board)
            if board_id:
                sprint_ids = self.client.get_board_sprints(board_id)
                if sprint_ids:
                    sprint_list = ','.join(str(sid) for sid in sprint_ids)
                    jql_parts.append(f"Sprint in ({sprint_list})")

            jql = " AND ".join(jql_parts)

            # Buscar issues (com paginação para garantir todos os resultados)
            issues = self.client.search_issues_paginated(jql, fields=['status'])

            # Agrupar por status
            by_status = defaultdict(int)
            for issue in issues:
                status = issue.get('fields', {}).get('status', {}).get('name', 'Sem status')
                by_status[status] += 1

            # Converter para lista ordenada
            result = [
                {'status': status, 'count': count}
                for status, count in sorted(by_status.items(), key=lambda x: x[1], reverse=True)
            ]

            return {
                'status': 'success',
                'data': result,
                'total': len(issues),
            }

        except Exception as e:
            logger.error(f"[JIRA] Erro ao buscar por status: {str(e)}")
            return {
                'status': 'error',
                'message': str(e)
            }

    def get_timesheet(
        self,
        assignee: str,
        period: str,
        start_date: str = None,
        end_date: str = None
    ) -> Dict:
        """
        Retorna horas trabalhadas (worklog) por assignee

        Args:
            assignee: Account ID do assignee
            period: Período
            start_date: Data início (para period=custom)
            end_date: Data fim (para period=custom)
        """
        try:
            from datetime import datetime, timedelta

            # Calcular range de datas para filtrar worklogs
            if period == 'custom' and start_date and end_date:
                date_start = datetime.fromisoformat(start_date)
                date_end = datetime.fromisoformat(end_date)
            else:
                # Usar período padrão (converter dias em datetime)
                date_end = datetime.now()
                if period == '15d':
                    date_start = date_end - timedelta(days=15)
                elif period == '30d':
                    date_start = date_end - timedelta(days=30)
                elif period == '45d':
                    date_start = date_end - timedelta(days=45)
                elif period == '3m':
                    date_start = date_end - timedelta(days=90)
                elif period == '6m':
                    date_start = date_end - timedelta(days=180)
                else:
                    date_start = date_end - timedelta(days=30)  # Default 30 dias

            # JQL base - buscar issues recentes do assignee para evitar rate limit
            # Usa 'updated' para pegar issues que podem ter worklog recente
            period_jql = self.client._build_period_jql(period, start_date, end_date, field='updated')
            jql = f"project = {self.client.project_key} AND assignee = '{assignee}' AND ({period_jql})"
            logger.info(f"[JIRA] Executando JQL para timesheet: {jql}")

            # Buscar issues (com paginação para garantir todos os resultados)
            issues = self.client.search_issues_paginated(jql, fields=['summary'])
            logger.info(f"[JIRA] Encontradas {len(issues)} issues do assignee para processar worklogs")

            # Buscar worklog de cada issue e filtrar por data
            total_seconds = 0
            issues_aggregated = {}  # Agregar por issue_key

            logger.info(f"[JIRA] Processando {len(issues)} issues para worklogs")
            logger.info(f"[JIRA] Período: {date_start} até {date_end}")

            for issue in issues:
                issue_key = issue.get('key')
                issue_summary = issue.get('fields', {}).get('summary', issue_key)
                worklogs = self.client.get_worklog(issue_key)

                issue_total_seconds = 0
                logger.debug(f"[JIRA] Issue {issue_key}: {len(worklogs)} worklogs encontrados")

                for wl in worklogs:
                    if wl['author_id'] == assignee:
                        # Filtrar worklogs por data
                        worklog_date = datetime.fromisoformat(wl['started'].replace('Z', '+00:00'))
                        worklog_date_naive = worklog_date.replace(tzinfo=None)

                        logger.debug(f"[JIRA] Worklog {issue_key}: {wl['time_spent_seconds']}s em {worklog_date_naive}")
                        logger.debug(f"[JIRA] Range: {date_start} <= {worklog_date_naive} <= {date_end} = {date_start <= worklog_date_naive <= date_end}")

                        if date_start <= worklog_date_naive <= date_end:
                            issue_total_seconds += wl['time_spent_seconds']
                            total_seconds += wl['time_spent_seconds']
                            logger.debug(f"[JIRA] ✓ Worklog incluído: {wl['time_spent_seconds']}s")

                # Adicionar issue apenas se tiver worklogs no período
                if issue_total_seconds > 0:
                    issues_aggregated[issue_key] = {
                        'key': issue_key,
                        'summary': issue_summary,
                        'hours': round(issue_total_seconds / 3600, 2),
                    }
                    logger.info(f"[JIRA] Issue {issue_key} adicionada: {round(issue_total_seconds / 3600, 2)}h")
                else:
                    logger.debug(f"[JIRA] Issue {issue_key} ignorada: 0h no período")

            # Converter para lista ordenada por horas (decrescente)
            issues_list = sorted(
                issues_aggregated.values(),
                key=lambda x: x['hours'],
                reverse=True
            )

            return {
                'status': 'success',
                'data': {
                    'total_seconds': total_seconds,
                    'total_hours': round(total_seconds / 3600, 2),
                    'issues': issues_list,
                },
                'period': period,
            }

        except Exception as e:
            logger.error(f"[JIRA] Erro ao buscar timesheet: {str(e)}")
            return {
                'status': 'error',
                'message': str(e)
            }

    @staticmethod
    def _get_week_key(date_str: str) -> str:
        """Retorna chave da semana no formato 'YYYY-Www'"""
        dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        return dt.strftime('%Y-W%U')
