"""
Management command para sincronizar catálogo PrimeCOD manualmente
"""
from django.core.management.base import BaseCommand
from features.metricas_primecod.jobs import sync_primecod_catalog


class Command(BaseCommand):
    help = 'Sincroniza o catálogo PrimeCOD manualmente (normalmente executado automaticamente às 6h)'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Iniciando sincronização do catálogo PrimeCOD...'))

        try:
            result = sync_primecod_catalog()

            if result.get('status') == 'success':
                self.stdout.write(self.style.SUCCESS(f"\n✅ Sincronização concluída com sucesso!"))
                self.stdout.write(f"   Duração: {result['duration']:.1f}s")
                self.stdout.write(f"   Produtos da API: {result['total_products_api']}")
                self.stdout.write(f"   Produtos NOVOS: {result['products_created']}")
                self.stdout.write(f"   Produtos atualizados: {result['products_updated']}")
                self.stdout.write(f"   Snapshots criados: {result['snapshots_created']}")
                self.stdout.write(f"   Erros: {result['products_error']}")
                self.stdout.write(f"   Produtos marcados como não-novos: {result['old_products_updated']}")
                self.stdout.write(f"\n   {result['message']}")
            else:
                self.stdout.write(self.style.ERROR(f"\n❌ Erro na sincronização:"))
                self.stdout.write(f"   {result.get('message', 'Erro desconhecido')}")
                self.stdout.write(f"   Tipo: {result.get('error_type', 'N/A')}")

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"\n❌ Erro inesperado: {str(e)}"))
            raise
