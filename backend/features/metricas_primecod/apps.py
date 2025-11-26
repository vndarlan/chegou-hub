from django.apps import AppConfig

class MetricasPrimecodConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'features.metricas_primecod'
    verbose_name = 'Métricas Prime COD'

    def ready(self):
        """Configurações executadas quando a app é carregada"""
        try:
            import logging
            logger = logging.getLogger(__name__)
            logger.info("PrimeCOD Integration carregada com sucesso")

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
                    from apscheduler.triggers.cron import CronTrigger
                    from .jobs import sync_primecod_catalog

                    scheduler = BackgroundScheduler()

                    # Adicionar job de sincronização do catálogo PrimeCOD (diariamente às 6h)
                    # CronTrigger: dia_da_semana='*' = todos os dias, hora=6 = 6h da manhã
                    scheduler.add_job(
                        sync_primecod_catalog,
                        trigger=CronTrigger(hour=6, minute=0, timezone='America/Sao_Paulo'),
                        id='sync_primecod_catalog',
                        name='Sincronizar catálogo PrimeCOD diariamente às 6h',
                        replace_existing=True,
                        max_instances=1
                    )

                    scheduler.start()
                    logger.info("✓ APScheduler iniciado: sincronização catálogo PrimeCOD diariamente às 6h (horário de Brasília)")

                except ImportError:
                    logger.warning("APScheduler não instalado. Job de sincronização do catálogo desabilitado.")
                except Exception as scheduler_error:
                    logger.error(f"Erro ao iniciar scheduler PrimeCOD: {scheduler_error}")
            else:
                logger.info("Scheduler PrimeCOD desabilitado em modo DEBUG (use ENABLE_SCHEDULER=True para habilitar)")

        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"Erro ao configurar PrimeCOD: {e}")