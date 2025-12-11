# backend/features/jira/apps.py
from django.apps import AppConfig


class JiraConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'features.jira'
    verbose_name = 'Jira Integration'
