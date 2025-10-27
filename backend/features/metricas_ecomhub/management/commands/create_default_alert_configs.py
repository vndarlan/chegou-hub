from django.core.management.base import BaseCommand
from features.metricas_ecomhub.models import EcomhubAlertConfig


class Command(BaseCommand):
    help = 'Cria configurações padrão de alertas para todos os status'

    def handle(self, *args, **options):
        # Configurações padrão por status (status, yellow, red, critical)
        configs = [
            ('processing', 24, 72, 168),  # 1, 3, 7 dias
            ('preparing_for_shipping', 48, 120, 168),  # 2, 5, 7 dias
            ('ready_to_ship', 72, 168, 240),  # 3, 7, 10 dias
            ('shipped', 72, 168, 240),  # 3, 7, 10 dias
            ('with_courier', 120, 240, 360),  # 5, 10, 15 dias
            ('out_for_delivery', 72, 168, 336),  # 3, 7, 14 dias
            ('issue', 24, 72, 168),  # 1, 3, 7 dias (crítico)
        ]

        created_count = 0
        for status, yellow, red, critical in configs:
            config, created = EcomhubAlertConfig.objects.get_or_create(
                status=status,
                defaults={
                    'yellow_threshold_hours': yellow,
                    'red_threshold_hours': red,
                    'critical_threshold_hours': critical
                }
            )
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f'[OK] Criado config para {status}'))
            else:
                self.stdout.write(f'  Config para {status} ja existe')

        self.stdout.write(self.style.SUCCESS(f'\n[SUCESSO] {created_count} novas configuracoes criadas'))
