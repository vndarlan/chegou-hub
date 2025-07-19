# backend/features/metricas_dropi/apps.py
from django.apps import AppConfig

class MetricasDropiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'features.metricas_dropi'
    verbose_name = 'Métricas Dropi MX'
    
    def ready(self):
        try:
            import logging
            logger = logging.getLogger(__name__)
            logger.info("Dropi MX Integration carregada com sucesso")
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"Erro ao configurar Dropi MX: {e}")