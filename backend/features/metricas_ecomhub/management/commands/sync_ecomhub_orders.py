# backend/features/metricas_ecomhub/management/commands/sync_ecomhub_orders.py
from django.core.management.base import BaseCommand
from features.metricas_ecomhub.services.sync_service import sync_all_stores
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Sincroniza pedidos de todas as lojas ECOMHUB ativas'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('Iniciando sincronizacao de pedidos ECOMHUB...'))

        try:
            stats = sync_all_stores()

            if stats['success']:
                self.stdout.write(self.style.SUCCESS('\n[OK] Sincronizacao concluida!'))
                self.stdout.write(f"  - Lojas processadas: {stats['stores_processed']}")
                self.stdout.write(f"  - Pedidos criados: {stats['orders_created']}")
                self.stdout.write(f"  - Pedidos atualizados: {stats['orders_updated']}")
                self.stdout.write(f"  - Mudancas de status: {stats['status_changes']}")

                if stats['errors']:
                    self.stdout.write(self.style.WARNING(f"\n[AVISO] {len(stats['errors'])} erros:"))
                    for error in stats['errors']:
                        self.stdout.write(f"  - {error}")
            else:
                self.stdout.write(self.style.ERROR(f"[ERRO] Falha: {stats.get('message', 'Erro desconhecido')}"))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'[ERRO] Erro fatal: {str(e)}'))
            raise
