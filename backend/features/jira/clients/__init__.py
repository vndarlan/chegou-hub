# backend/features/jira/clients/__init__.py
from .jira_client import JiraClient, JiraAPIError

__all__ = ['JiraClient', 'JiraAPIError']
