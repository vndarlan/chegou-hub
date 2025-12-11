# backend/features/jira/clients/jira_client.py
"""
Cliente para integração com API Jira Cloud
Implementação segura com Basic Auth (email:token)
"""

import requests
import time
import logging
import base64
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from django.conf import settings
from ..models import JiraConfig

logger = logging.getLogger(__name__)


class JiraAPIError(Exception):
    """Exceção personalizada para erros da API Jira"""
    pass


class JiraClient:
    """Cliente para comunicação segura com API Jira Cloud"""

    def __init__(self, email=None, token=None, jira_url=None, project_key=None):
        """
        Inicializa cliente Jira.

        Args:
            email: Email do usuário Jira (opcional, busca de JiraConfig)
            token: API Token (opcional, busca de JiraConfig)
            jira_url: URL base do Jira (opcional, busca de JiraConfig)
            project_key: Chave do projeto (opcional, busca de JiraConfig)
        """
        # Buscar configuração do banco se não fornecida
        if not all([email, token, jira_url, project_key]):
            config = JiraConfig.get_config()
            if not config:
                raise JiraAPIError(
                    "Configuração Jira não encontrada. "
                    "Configure em: Admin > Jira Integration > Configuração Jira"
                )

            email = email or config.get('jira_email')
            token = token or config.get('api_token')
            jira_url = jira_url or config.get('jira_url')
            project_key = project_key or config.get('jira_project_key')

        if not all([email, token, jira_url, project_key]):
            raise JiraAPIError("Configuração Jira incompleta")

        self.jira_url = jira_url.rstrip('/')
        self.email = email
        self.token = token
        self.project_key = project_key

        # Criar Basic Auth
        auth_string = f"{self.email}:{self.token}"
        auth_bytes = auth_string.encode('utf-8')
        auth_b64 = base64.b64encode(auth_bytes).decode('utf-8')

        self.headers = {
            'Authorization': f'Basic {auth_b64}',
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'ChegouHub-Backend/1.0'
        }

        # Rate limiting (50ms entre requests, igual PrimeCOD)
        self.last_request_time = 0
        self.min_request_interval = 0.05  # 50ms

        # Session para reutilizar conexões
        self.session = requests.Session()
        self.session.headers.update(self.headers)

    def _rate_limit(self):
        """Implementa rate limiting básico"""
        current_time = time.time()
        elapsed = current_time - self.last_request_time

        if elapsed < self.min_request_interval:
            sleep_time = self.min_request_interval - elapsed
            time.sleep(sleep_time)

        self.last_request_time = time.time()

    def _make_request(self, method: str, endpoint: str, **kwargs) -> requests.Response:
        """Faz requisição HTTP com tratamento de erros e rate limiting"""
        url = f"{self.jira_url}/rest/api/3/{endpoint}"

        # Sanitizar headers para logging (remover token)
        safe_headers = {k: '***REDACTED***' if k.lower() == 'authorization' else v
                       for k, v in self.headers.items()}

        logger.debug(f"[JIRA] {method} {url}")
        logger.debug(f"[JIRA] Headers: {safe_headers}")

        self._rate_limit()

        try:
            response = self.session.request(
                method=method,
                url=url,
                timeout=60,
                **kwargs
            )

            logger.info(f"Jira API {method} {endpoint} - Status: {response.status_code}")

            if response.status_code == 401:
                raise JiraAPIError("Token de autenticação inválido ou expirado")
            elif response.status_code == 403:
                raise JiraAPIError("Sem permissão para acessar este recurso")
            elif response.status_code == 429:
                raise JiraAPIError("Rate limit excedido. Tente novamente em alguns minutos")
            elif response.status_code >= 400:
                raise JiraAPIError(f"Erro da API Jira: {response.status_code} - {response.text}")

            return response

        except requests.RequestException as e:
            logger.error(f"[JIRA ERROR] Erro na requisição: {str(e)}")
            raise JiraAPIError(f"Erro de conectividade: {str(e)}")
        except Exception as e:
            logger.error(f"[JIRA ERROR] Erro inesperado: {str(e)}")
            raise JiraAPIError(f"Erro inesperado: {str(e)}")

    def test_connection(self) -> Dict:
        """Testa conectividade com API Jira"""
        try:
            response = self._make_request('GET', 'myself')
            data = response.json()

            return {
                'status': 'success',
                'message': 'Conexão com Jira estabelecida com sucesso',
                'user': {
                    'email': data.get('emailAddress'),
                    'display_name': data.get('displayName'),
                    'account_id': data.get('accountId'),
                }
            }

        except JiraAPIError as e:
            return {
                'status': 'error',
                'message': str(e)
            }
        except Exception as e:
            return {
                'status': 'error',
                'message': f'Erro inesperado: {str(e)}'
            }

    def get_users(self) -> List[Dict]:
        """Lista usuários assignáveis do projeto CHEGOU"""
        try:
            response = self._make_request(
                'GET',
                f'user/assignable/search',
                params={'project': self.project_key, 'maxResults': 100}
            )
            users = response.json()

            return [{
                'account_id': user.get('accountId'),
                'display_name': user.get('displayName'),
                'email': user.get('emailAddress'),
                'avatar_url': user.get('avatarUrls', {}).get('48x48'),
                'active': user.get('active', True),
            } for user in users]

        except Exception as e:
            logger.error(f"[JIRA] Erro ao buscar usuários: {str(e)}")
            raise JiraAPIError(f"Erro ao buscar usuários: {str(e)}")

    def get_boards(self) -> List[Dict]:
        """Lista boards do projeto"""
        try:
            response = self._make_request(
                'GET',
                'board',
                params={'projectKeyOrId': self.project_key}
            )
            data = response.json()
            boards = data.get('values', [])

            return [{
                'id': board.get('id'),
                'name': board.get('name'),
                'type': board.get('type'),
            } for board in boards]

        except Exception as e:
            logger.error(f"[JIRA] Erro ao buscar boards: {str(e)}")
            raise JiraAPIError(f"Erro ao buscar boards: {str(e)}")

    def search_issues(self, jql: str, fields: List[str] = None, max_results: int = 100) -> List[Dict]:
        """
        Busca issues usando JQL

        Args:
            jql: Query JQL
            fields: Lista de campos para retornar
            max_results: Máximo de resultados
        """
        if fields is None:
            fields = ['summary', 'status', 'assignee', 'created', 'updated', 'resolutiondate']

        try:
            response = self._make_request(
                'POST',
                'search',
                json={
                    'jql': jql,
                    'fields': fields,
                    'maxResults': max_results,
                }
            )
            data = response.json()

            return data.get('issues', [])

        except Exception as e:
            logger.error(f"[JIRA] Erro ao buscar issues: {str(e)}")
            raise JiraAPIError(f"Erro ao buscar issues: {str(e)}")

    def get_issue_with_changelog(self, issue_key: str) -> Dict:
        """
        Busca detalhes de uma issue incluindo changelog

        Args:
            issue_key: Chave da issue (ex: CHEGOU-123)
        """
        try:
            response = self._make_request(
                'GET',
                f'issue/{issue_key}',
                params={'expand': 'changelog'}
            )
            return response.json()

        except Exception as e:
            logger.error(f"[JIRA] Erro ao buscar issue {issue_key}: {str(e)}")
            raise JiraAPIError(f"Erro ao buscar issue: {str(e)}")

    def get_worklog(self, issue_key: str) -> List[Dict]:
        """
        Busca worklog (horas trabalhadas) de uma issue

        Args:
            issue_key: Chave da issue
        """
        try:
            response = self._make_request(
                'GET',
                f'issue/{issue_key}/worklog'
            )
            data = response.json()

            worklogs = data.get('worklogs', [])
            return [{
                'author': wl.get('author', {}).get('displayName'),
                'author_id': wl.get('author', {}).get('accountId'),
                'time_spent_seconds': wl.get('timeSpentSeconds', 0),
                'started': wl.get('started'),
                'comment': wl.get('comment'),
            } for wl in worklogs]

        except Exception as e:
            logger.error(f"[JIRA] Erro ao buscar worklog: {str(e)}")
            raise JiraAPIError(f"Erro ao buscar worklog: {str(e)}")

    def _build_period_jql(self, period: str, start_date: str = None, end_date: str = None) -> str:
        """
        Constrói filtro JQL para período

        Períodos suportados:
        - current_week, last_week, 2_weeks_ago
        - 15d, 30d, 45d, 3m, 6m
        - custom (requer start_date e end_date)
        """
        today = datetime.now().date()

        if period == 'current_week':
            # Semana atual (segunda a domingo)
            days_since_monday = today.weekday()
            start = today - timedelta(days=days_since_monday)
            end = start + timedelta(days=6)
            return f"created >= '{start}' AND created <= '{end}'"

        elif period == 'last_week':
            # Semana passada
            days_since_monday = today.weekday()
            last_week_monday = today - timedelta(days=days_since_monday + 7)
            last_week_sunday = last_week_monday + timedelta(days=6)
            return f"created >= '{last_week_monday}' AND created <= '{last_week_sunday}'"

        elif period == '2_weeks_ago':
            # Duas semanas atrás
            days_since_monday = today.weekday()
            two_weeks_monday = today - timedelta(days=days_since_monday + 14)
            two_weeks_sunday = two_weeks_monday + timedelta(days=6)
            return f"created >= '{two_weeks_monday}' AND created <= '{two_weeks_sunday}'"

        elif period.endswith('d'):
            # Dias (15d, 30d, 45d)
            days = int(period[:-1])
            start = today - timedelta(days=days)
            return f"created >= '-{days}d'"

        elif period.endswith('m'):
            # Meses (3m, 6m)
            months = int(period[:-1])
            return f"created >= '-{months * 30}d'"

        elif period == 'custom':
            if not start_date or not end_date:
                raise ValueError("Período 'custom' requer start_date e end_date")
            return f"created >= '{start_date}' AND created <= '{end_date}'"

        else:
            raise ValueError(f"Período inválido: {period}")
