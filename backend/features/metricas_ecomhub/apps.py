# backend/features/metricas_ecomhub/apps.py - SIMPLIFICADO
from django.apps import AppConfig

class MetricasEcomhubConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'features.metricas_ecomhub'
    verbose_name = 'Métricas ECOMHUB Selenium'
    
    def ready(self):
        """Configurações executadas quando a app é carregada"""
        try:
            import logging
            logger = logging.getLogger(__name__)
            logger.info("ECOMHUB Selenium Integration carregada com sucesso")
            
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"Erro ao configurar ECOMHUB: {e}")