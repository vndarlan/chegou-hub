from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
import os

User = get_user_model()

class Command(BaseCommand):
    help = 'Cria um superusuário para ambiente de teste automaticamente'

    def handle(self, *args, **options):
        # Só executa em ambiente de teste (quando DEBUG=True)
        if not os.getenv('DEBUG', 'False').lower() == 'true':
            self.stdout.write('Comando só funciona em ambiente de teste (DEBUG=True)')
            return

        username = 'admin'
        email = 'admin@teste.com'
        password = '123456'

        # Verifica se já existe
        if User.objects.filter(username=username).exists():
            self.stdout.write(f'Superusuário "{username}" já existe!')
            return

        # Cria o superusuário
        User.objects.create_superuser(
            username=username,
            email=email,
            password=password
        )

        self.stdout.write(
            self.style.SUCCESS(
                f'Superusuário criado com sucesso!\n'
                f'Username: {username}\n'
                f'Password: {password}\n'
                f'Email: {email}'
            )
        )