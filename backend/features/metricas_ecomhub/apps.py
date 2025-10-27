# backend/features/metricas_ecomhub/apps.py - COM SCHEDULER DE SINCRONIZAÇÃO
from django.apps import AppConfig

class MetricasEcomhubConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'features.metricas_ecomhub'
    verbose_name = 'Métricas ECOMHUB'

    def ready(self):
        """Configurações executadas quando a app é carregada"""
        try:
            import logging
            logger = logging.getLogger(__name__)
            logger.info("ECOMHUB Integration carregada com sucesso")

            # Iniciar scheduler de sincronização apenas em produção ou se habilitado
            from django.conf import settings

            # Verificar se deve habilitar o scheduler
            should_enable_scheduler = (
                not settings.DEBUG or
                getattr(settings, 'ENABLE_SCHEDULER', False)
            )

            if should_enable_scheduler:
                try:
                    from apscheduler.schedulers.background import BackgroundScheduler
                    from apscheduler.triggers.interval import IntervalTrigger
                    from .services.sync_service import sync_all_stores

                    scheduler = BackgroundScheduler()

                    # Adicionar job de sincronização ECOMHUB (a cada 6 horas)
                    scheduler.add_job(
                        sync_all_stores,
                        trigger=IntervalTrigger(hours=6),
                        id='sync_ecomhub_orders',
                        name='Sincronizar pedidos ECOMHUB',
                        replace_existing=True,
                        max_instances=1
                    )

                    scheduler.start()
                    logger.info("✓ APScheduler iniciado: sincronização ECOMHUB a cada 6 horas")

                except ImportError:
                    logger.warning("APScheduler não instalado. Job de sincronização desabilitado.")
                except Exception as scheduler_error:
                    logger.error(f"Erro ao iniciar scheduler ECOMHUB: {scheduler_error}")
            else:
                logger.info("Scheduler desabilitado em modo DEBUG (use ENABLE_SCHEDULER=True para habilitar)")

        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"Erro ao configurar ECOMHUB: {e}")