# backend/features/sync_realtime/apps.py
from django.apps import AppConfig


class SyncRealtimeConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'features.sync_realtime'
    verbose_name = 'Sincronização em Tempo Real'