"""
Comando para criar/resetar usuário admin e organização inicial
Uso: python manage.py setup_admin
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from core.models import Organization, OrganizationMember


class Command(BaseCommand):
    help = 'Cria ou reseta usuário admin e organização inicial'

    def add_arguments(self, parser):
        parser.add_argument(
            '--email',
            type=str,
            default='admin@chegouhub.com',
            help='Email do admin (padrão: admin@chegouhub.com)'
        )
        parser.add_argument(
            '--password',
            type=str,
            default='admin123',
            help='Senha do admin (padrão: admin123)'
        )
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Resetar senha se usuário já existir'
        )

    def handle(self, *args, **options):
        User = get_user_model()
        email = options['email']
        password = options['password']
        reset = options['reset']

        self.stdout.write('=' * 60)
        self.stdout.write(self.style.SUCCESS('🔧 SETUP ADMIN - ChegouHub'))
        self.stdout.write('=' * 60)

        # Verificar situação atual
        total_users = User.objects.count()
        total_orgs = Organization.objects.count()

        self.stdout.write(f'\n📊 Situação Atual:')
        self.stdout.write(f'   - Usuários: {total_users}')
        self.stdout.write(f'   - Organizações: {total_orgs}')

        # Criar ou obter usuário
        try:
            user = User.objects.get(email=email)
            self.stdout.write(f'\n✅ Usuário {email} já existe')

            if reset:
                user.set_password(password)
                user.is_superuser = True
                user.is_staff = True
                user.save()
                self.stdout.write(self.style.SUCCESS(f'🔑 Senha resetada para: {password}'))
            else:
                self.stdout.write(self.style.WARNING('   Use --reset para resetar a senha'))

        except User.DoesNotExist:
            self.stdout.write(f'\n🆕 Criando usuário {email}...')
            user = User.objects.create_superuser(
                email=email,
                name='Admin',
                area='admin',
                password=password
            )
            self.stdout.write(self.style.SUCCESS(f'✅ Superuser criado!'))
            self.stdout.write(f'   Email: {email}')
            self.stdout.write(f'   Senha: {password}')

        # Criar ou obter organização
        org, org_created = Organization.objects.get_or_create(
            slug='chegouhub',
            defaults={
                'nome': 'ChegouHub',
                'descricao': 'Organização principal do ChegouHub',
                'plano': 'business',
                'limite_membros': 50
            }
        )

        if org_created:
            self.stdout.write(self.style.SUCCESS(f'\n✅ Organização criada: {org.nome}'))
        else:
            self.stdout.write(f'\n✅ Organização já existe: {org.nome}')

        # Adicionar usuário como owner se não for membro
        member, member_created = OrganizationMember.objects.get_or_create(
            organization=org,
            user=user,
            defaults={'role': 'owner'}
        )

        if member_created:
            self.stdout.write(self.style.SUCCESS(f'✅ {user.email} adicionado como Owner'))
        else:
            self.stdout.write(f'✅ {user.email} já é membro ({member.get_role_display()})')

        # Resumo final
        self.stdout.write('\n' + '=' * 60)
        self.stdout.write(self.style.SUCCESS('✅ SETUP CONCLUÍDO!'))
        self.stdout.write('=' * 60)
        self.stdout.write(f'\n📝 Credenciais de Acesso:')
        self.stdout.write(f'   Email: {email}')
        self.stdout.write(f'   Senha: {password}')
        self.stdout.write(f'\n🏢 Organização: {org.nome}')
        self.stdout.write(f'   Plano: {org.get_plano_display()}')
        self.stdout.write(f'   Membros: {org.membros.count()}')
        self.stdout.write('\n' + '=' * 60)
