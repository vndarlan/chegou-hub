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
            jql_parts.append("status = Done")

            # Filtro de período (usa 'resolutiondate' pois estamos buscando atividades resolvidas)
            period_jql = self.client._build_period_jql(period, start_date, end_date, field='resolutiondate')
            jql_parts.append(f"({period_jql})")

            # Filtro de assignee
            if assignee:
                jql_parts.append(f"assignee = '{assignee}'")

            # Filtro de board (sprint)
            if board_id:
                jql_parts.append(f"Sprint in openSprints() OR Sprint in closedSprints()")

            jql = " AND ".join(jql_parts)

            # Buscar issues
            issues = self.client.search_issues(jql, fields=['assignee', 'resolutiondate'])

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
        start_date: str = None,
        end_date: str = None
    ) -> Dict:
        """
        Retorna métricas de criado vs resolvido semanal

        Args:
            period: Período
            board_id: ID do board (opcional)
            start_date: Data início (para period=custom)
            end_date: Data fim (para period=custom)
        """
        try:
            # JQL base
            jql_base = f"project = {self.client.project_key}"

            # Filtro de período
            period_jql = self.client._build_period_jql(period, start_date, end_date)

            # Buscar issues criadas
            jql_created = f"{jql_base} AND ({period_jql})"
            issues_created = self.client.search_issues(jql_created, fields=['created'])

            # Buscar issues resolvidas (usa 'resolutiondate' para filtrar por data de resolução)
            resolved_period_jql = self.client._build_period_jql(period, start_date, end_date, field='resolutiondate')
            jql_resolved = f"{jql_base} AND status = Done AND ({resolved_period_jql})"
            issues_resolved = self.client.search_issues(jql_resolved, fields=['resolutiondate'])

            # Agrupar por semana
            created_by_week = defaultdict(int)
            resolved_by_week = defaultdict(int)

            for issue in issues_created:
                created_date = issue.get('fields', {}).get('created')
                if created_date:
                    week = self._get_week_key(created_date)
                    created_by_week[week] += 1

            for issue in issues_resolved:
                resolved_date = issue.get('fields', {}).get('resolutiondate')
                if resolved_date:
                    week = self._get_week_key(resolved_date)
                    resolved_by_week[week] += 1

            # Combinar dados
            all_weeks = sorted(set(created_by_week.keys()) | set(resolved_by_week.keys()))

            result = [{
                'week': week,
                'created': created_by_week.get(week, 0),
                'resolved': resolved_by_week.get(week, 0),
                'delta': created_by_week.get(week, 0) - resolved_by_week.get(week, 0),
            } for week in all_weeks]

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

    def get_by_status(self, board_id: int = None) -> Dict:
        """
        Retorna contagem de issues por status

        Args:
            board_id: ID do board (opcional)
        """
        try:
            # JQL base
            jql = f"project = {self.client.project_key}"

            if board_id:
                jql += f" AND Sprint in openSprints()"

            # Buscar todas as issues
            issues = self.client.search_issues(jql, fields=['status'], max_results=1000)

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
            # JQL base
            jql = f"project = {self.client.project_key} AND assignee = '{assignee}'"

            # Filtro de período
            period_jql = self.client._build_period_jql(period, start_date, end_date)
            jql += f" AND ({period_jql})"

            # Buscar issues
            issues = self.client.search_issues(jql, fields=['summary'])

            # Buscar worklog de cada issue
            total_seconds = 0
            worklogs_detail = []

            for issue in issues:
                issue_key = issue.get('key')
                worklogs = self.client.get_worklog(issue_key)

                for wl in worklogs:
                    if wl['author_id'] == assignee:
                        total_seconds += wl['time_spent_seconds']
                        worklogs_detail.append({
                            'issue_key': issue_key,
                            'time_spent_seconds': wl['time_spent_seconds'],
                            'time_spent_hours': round(wl['time_spent_seconds'] / 3600, 2),
                            'started': wl['started'],
                            'comment': wl['comment'],
                        })

            return {
                'status': 'success',
                'data': {
                    'total_seconds': total_seconds,
                    'total_hours': round(total_seconds / 3600, 2),
                    'worklogs': worklogs_detail,
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
