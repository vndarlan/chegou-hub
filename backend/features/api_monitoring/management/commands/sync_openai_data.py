from django.core.management.base import BaseCommand
from django.utils import timezone
from features.api_monitoring.services import APIMonitoringService
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Sincroniza dados de uso e custos da OpenAI API'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=7,
            help='Número de dias atrás para sincronizar (default: 7)'
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Exibir logs detalhados'
        )
    
    def handle(self, *args, **options):
        days_back = options['days']
        verbose = options['verbose']
        
        if verbose:
            self.stdout.write(f"Iniciando sincronização OpenAI - últimos {days_back} dias")
        
        try:
            service = APIMonitoringService()
            result = service.sync_openai_data(days_back=days_back)
            
            if result['success']:
                self.stdout.write(
                    self.style.SUCCESS(
                        f"✅ Sincronização concluída com sucesso!\n"
                        f"   • Registros de uso: {result['usage_records_synced']}\n"
                        f"   • Registros de custo: {result['cost_records_synced']}\n"
                        f"   • Período: {result['sync_period']}"
                    )
                )
            else:
                self.stdout.write(
                    self.style.ERROR(
                        f"❌ Erro na sincronização: {result['error']}"
                    )
                )
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"❌ Erro inesperado: {str(e)}")
            )
            logger.error(f"Erro na sincronização OpenAI: {str(e)}", exc_info=True)