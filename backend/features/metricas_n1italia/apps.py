# backend/features/metricas_n1italia/apps.py
from django.apps import AppConfig

class MetricasN1ItaliaConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'features.metricas_n1italia'
    verbose_name = 'Métricas N1 Itália'

    def ready(self):
        """Configurações executadas quando a app é carregada"""
        try:
            import logging
            logger = logging.getLogger(__name__)
            logger.info("Métricas N1 Itália carregada com sucesso")

        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"Erro ao configurar N1 Itália: {e}")