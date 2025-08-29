# backend/features/ia/management/commands/fix_whatsapp_tokens.py
from django.core.management.base import BaseCommand
from django.db import transaction
from features.ia.models import BusinessManager


class Command(BaseCommand):
    help = 'Corrige tokens WhatsApp corrompidos por mudança de chave de criptografia'

    def handle(self, *args, **options):
        try:
            with transaction.atomic():
                # Buscar BMs com tokens corrompidos
                business_managers = BusinessManager.objects.filter(
                    access_token_encrypted__isnull=False
                ).exclude(access_token_encrypted='')

                count = business_managers.count()
                
                if count == 0:
                    self.stdout.write(
                        self.style.SUCCESS('Nenhum token corrompido encontrado.')
                    )
                    return

                self.stdout.write(f'Encontradas {count} Business Managers com tokens para corrigir...')

                for bm in business_managers:
                    self.stdout.write(f'- Limpando token da BM: {bm.nome} (ID: {bm.id})')
                    bm.access_token_encrypted = ''
                    bm.erro_ultima_sincronizacao = 'Token limpo - re-cadastre o access token'
                    bm.save()

                self.stdout.write(
                    self.style.SUCCESS(
                        f'SUCESSO: {count} tokens limpos com sucesso!\n'
                        'ACAO NECESSARIA: Re-cadastre o access token de todas as Business Managers\n'
                        'no painel administrativo para que funcionem novamente.'
                    )
                )

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'ERRO ao limpar tokens: {str(e)}')
            )
            raise