# backend/features/jira/services/lead_time_service.py
"""
Serviço para cálculo de Lead Time com breakdown por coluna
"""

import logging
from typing import Dict, List, Optional
from datetime import datetime
from collections import defaultdict
from ..clients.jira_client import JiraClient, JiraAPIError

logger = logging.getLogger(__name__)


class JiraLeadTimeService:
    """Serviço para cálculo de Lead Time"""

    # Workflows dos boards
    WORKFLOWS = {
        'OPERACIONAL': [
            'BACKLOG',
            'EM REFINAMENTO',
            'PRIORIZADO',
            'EM ANDAMENTO',
            'EM REVISÃO',
            'CONCLUÍDO'
        ],
        'LAB IA': [
            'BACKLOG',
            'REFINAMENTO',
            'PRIORIZADO',
            'EM DESENVOLVIMENTO',
            'PERÍODO DE TESTE',
            'VALIDAÇÃO',
            'REVISÃO',
            'CONCLUÍDO'
        ]
    }

    def __init__(self, client: JiraClient = None):
        """
        Inicializa o serviço de lead time

        Args:
            client: Cliente Jira (opcional)
        """
        self.client = client or JiraClient()

    def calculate_lead_time(
        self,
        period: str,
        board_id: int = None,
        assignee: str = None,
        start_date: str = None,
        end_date: str = None
    ) -> Dict:
        """
        Calcula lead time com breakdown por coluna

        Args:
            period: Período
            board_id: ID do board (opcional)
            assignee: Account ID do assignee (opcional)
            start_date: Data início (para period=custom)
            end_date: Data fim (para period=custom)
        """
        try:
            # Construir JQL
            jql_parts = [f"project = {self.client.project_key}"]

            # Filtrar apenas issues concluídas (statusCategory Done)
            jql_parts.append("statusCategory in (Done)")

            # Filtro de período usando 'updated' (resolutiondate pode estar vazio)
            period_jql = self.client._build_period_jql(
                period,
                start_date,
                end_date,
                field='updated'  # Usa 'updated' porque resolutiondate pode estar vazio
            )
            jql_parts.append(f"({period_jql})")

            # Filtro de assignee
            if assignee:
                jql_parts.append(f"assignee = '{assignee}'")

            jql = " AND ".join(jql_parts)

            # Buscar issues (com paginação)
            logger.info(f"[JIRA LEAD TIME] JQL executado: {jql}")
            issues = self.client.search_issues_paginated(jql, fields=['created', 'resolutiondate', 'assignee', 'summary', 'status', 'updated'])
            logger.info(f"[JIRA LEAD TIME] Issues encontradas: {len(issues)}")

            # Calcular lead time para cada issue
            lead_times = []

            for issue in issues:
                issue_key = issue.get('key')

                # Buscar changelog para calcular tempo em cada coluna
                issue_detail = self.client.get_issue_with_changelog(issue_key)

                lead_time_data = self._calculate_issue_lead_time(issue_detail)
                if lead_time_data:
                    lead_times.append(lead_time_data)

            # Calcular médias
            if lead_times:
                avg_total = sum(lt['total_days'] for lt in lead_times) / len(lead_times)

                # Calcular média por coluna
                column_totals = defaultdict(list)
                for lt in lead_times:
                    for col, days in lt['breakdown'].items():
                        column_totals[col].append(days)

                avg_by_column = {
                    col: round(sum(days) / len(days), 2)
                    for col, days in column_totals.items()
                }

                return {
                    'status': 'success',
                    'data': {
                        'average_total_days': round(avg_total, 2),
                        'average_by_column': avg_by_column,
                        'issues_analyzed': len(lead_times),
                        'details': lead_times,
                    },
                    'period': period,
                }
            else:
                return {
                    'status': 'success',
                    'data': {
                        'average_total_days': 0,
                        'average_by_column': {},
                        'issues_analyzed': 0,
                        'details': [],
                    },
                    'period': period,
                }

        except Exception as e:
            logger.error(f"[JIRA] Erro ao calcular lead time: {str(e)}")
            return {
                'status': 'error',
                'message': str(e)
            }

    def _calculate_issue_lead_time(self, issue_detail: Dict) -> Optional[Dict]:
        """
        Calcula lead time de uma issue individual

        Args:
            issue_detail: Dados completos da issue com changelog
        """
        try:
            fields = issue_detail.get('fields', {})
            changelog = issue_detail.get('changelog', {}).get('histories', [])

            created = fields.get('created')
            resolved = fields.get('resolutiondate')

            # Se não tem data de criação, não dá pra calcular
            if not created:
                return None

            # Se não tem resolutiondate, tentar usar updated como fallback
            if not resolved:
                resolved = fields.get('updated')
                if not resolved:
                    return None

            # Datas como datetime
            created_dt = datetime.fromisoformat(created.replace('Z', '+00:00'))
            resolved_dt = datetime.fromisoformat(resolved.replace('Z', '+00:00'))

            # Total de dias
            total_days = (resolved_dt - created_dt).total_seconds() / 86400

            # Calcular tempo em cada coluna
            breakdown = self._calculate_column_breakdown(created_dt, resolved_dt, changelog)

            # Extrair assignee
            assignee_data = fields.get('assignee')
            assignee_name = None
            if assignee_data:
                assignee_name = assignee_data.get('displayName')

            return {
                'issue_key': issue_detail.get('key'),
                'summary': fields.get('summary'),
                'assignee': assignee_name,
                'created': created,
                'resolved': resolved,
                'total_days': round(total_days, 2),
                'breakdown': breakdown,
            }

        except Exception as e:
            logger.error(f"[JIRA] Erro ao calcular lead time da issue: {str(e)}")
            return None

    def _calculate_column_breakdown(
        self,
        created_dt: datetime,
        resolved_dt: datetime,
        changelog: List[Dict]
    ) -> Dict[str, float]:
        """
        Calcula tempo gasto em cada coluna baseado no changelog

        Args:
            created_dt: Data de criação
            resolved_dt: Data de resolução
            changelog: Histórico de mudanças
        """
        breakdown = {}

        # Extrair mudanças de status do changelog
        status_changes = []

        for history in changelog:
            created = history.get('created')
            items = history.get('items', [])

            for item in items:
                if item.get('field') == 'status':
                    status_changes.append({
                        'date': datetime.fromisoformat(created.replace('Z', '+00:00')),
                        'from': item.get('fromString'),
                        'to': item.get('toString'),
                    })

        # Ordenar por data
        status_changes.sort(key=lambda x: x['date'])

        # Calcular tempo em cada status
        if status_changes:
            # Tempo no primeiro status (criação até primeira mudança)
            first_change = status_changes[0]
            first_status = first_change['from'] or 'BACKLOG'
            first_time = (first_change['date'] - created_dt).total_seconds() / 86400
            breakdown[first_status] = round(first_time, 2)

            # Tempo entre mudanças
            for i in range(len(status_changes) - 1):
                current = status_changes[i]
                next_change = status_changes[i + 1]

                status = current['to']
                time_days = (next_change['date'] - current['date']).total_seconds() / 86400
                breakdown[status] = round(time_days, 2)

            # Tempo no último status (última mudança até resolução)
            last_change = status_changes[-1]
            last_status = last_change['to']
            last_time = (resolved_dt - last_change['date']).total_seconds() / 86400
            breakdown[last_status] = breakdown.get(last_status, 0) + round(last_time, 2)
        else:
            # Sem mudanças de status, todo tempo no status inicial
            total_time = (resolved_dt - created_dt).total_seconds() / 86400
            breakdown['BACKLOG'] = round(total_time, 2)

        return breakdown
