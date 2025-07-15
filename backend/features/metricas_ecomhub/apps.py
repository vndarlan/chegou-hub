# backend/features/metricas_ecomhub/apps.py - VERSÃO ATUALIZADA
from django.apps import AppConfig

class MetricasEcomhubConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'features.metricas_ecomhub'
    verbose_name = 'Métricas ECOMHUB'
    
    def ready(self):
        """Configurações executadas quando a app é carregada"""
        try:
            # Configurar logging específico da feature
            from .config import setup_shopify_logging
            setup_shopify_logging()
            
            # Log de inicialização
            import logging
            logger = logging.getLogger(__name__)
            logger.info("ECOMHUB + Shopify Integration carregada com sucesso")
            
        except Exception as e:
            # Falha silenciosa para não quebrar o Django se algo der errado
            import logging
            logging.getLogger(__name__).warning(f"Erro ao configurar ECOMHUB: {e}")