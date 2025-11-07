"""
Comando Django para verificar e corrigir permissões de organizações
Uso: python manage.py fix_org_permissions <email>
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from core.models import Organization, OrganizationMember

User = get_user_model()


class Command(BaseCommand):
    help = 'Verifica e corrige permissões de organizações para um usuário'

    def add_arguments(self, parser):
        parser.add_argument('email', type=str, help='Email do usuário')
        parser.add_argument('--org-id', type=int, help='ID da organização (opcional)')

    def handle(self, *args, **options):
        email = options['email']
        org_id = options.get('org_id')

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'❌ Usuário com email {email} não encontrado'))
            return

        self.stdout.write(self.style.SUCCESS(f'✅ Usuário encontrado: {user.email} (ID: {user.id})'))

        # Listar organizações
        if org_id:
            orgs = Organization.objects.filter(id=org_id, ativo=True)
        else:
            orgs = Organization.objects.filter(ativo=True)

        if not orgs.exists():
            self.stdout.write(self.style.ERROR('❌ Nenhuma organização encontrada'))
            return

        self.stdout.write(self.style.SUCCESS(f'\n📋 Organizações encontradas: {orgs.count()}'))

        for org in orgs:
            self.stdout.write(self.style.WARNING(f'\n🏢 Organização: {org.nome} (ID: {org.id})'))

            # Verificar se usuário é membro
            try:
                member = OrganizationMember.objects.get(organization=org, user=user, ativo=True)
                self.stdout.write(self.style.SUCCESS(f'   ✅ Usuário é membro'))
                self.stdout.write(f'   📌 Role: {member.role}')
                self.stdout.write(f'   📅 Entrou em: {member.joined_at}')
                
                if member.role == 'owner':
                    self.stdout.write(self.style.SUCCESS(f'   👑 Usuário já é OWNER!'))
                elif member.role == 'admin':
                    self.stdout.write(self.style.WARNING(f'   🔧 Usuário é ADMIN (pode convidar membros)'))
                else:
                    self.stdout.write(self.style.ERROR(f'   ⚠️ Usuário é MEMBER (NÃO pode convidar membros)'))
                    
                    # Perguntar se quer promover
                    self.stdout.write(self.style.WARNING(f'\n   💡 Para promover para OWNER, rode:'))
                    self.stdout.write(f'      python manage.py fix_org_permissions {email} --org-id {org.id} --promote')

            except OrganizationMember.DoesNotExist:
                self.stdout.write(self.style.ERROR(f'   ❌ Usuário NÃO é membro!'))
                self.stdout.write(self.style.WARNING(f'\n   💡 Para adicionar como OWNER, rode:'))
                self.stdout.write(f'      python manage.py fix_org_permissions {email} --org-id {org.id} --add-owner')

        # Adicionar owner se flag presente
        if options.get('add_owner'):
            if not org_id:
                self.stdout.write(self.style.ERROR('\n❌ --org-id é obrigatório com --add-owner'))
                return
            
            org = Organization.objects.get(id=org_id)
            OrganizationMember.objects.create(
                organization=org,
                user=user,
                role='owner',
                convidado_por=user
            )
            self.stdout.write(self.style.SUCCESS(f'\n✅ Usuário adicionado como OWNER de {org.nome}!'))

        # Promover para owner se flag presente
        if options.get('promote'):
            if not org_id:
                self.stdout.write(self.style.ERROR('\n❌ --org-id é obrigatório com --promote'))
                return
            
            org = Organization.objects.get(id=org_id)
            member = OrganizationMember.objects.get(organization=org, user=user, ativo=True)
            member.role = 'owner'
            member.save()
            self.stdout.write(self.style.SUCCESS(f'\n✅ Usuário promovido para OWNER de {org.nome}!'))

    def add_arguments(self, parser):
        parser.add_argument('email', type=str, help='Email do usuário')
        parser.add_argument('--org-id', type=int, help='ID da organização')
        parser.add_argument('--add-owner', action='store_true', help='Adicionar como owner')
        parser.add_argument('--promote', action='store_true', help='Promover para owner')
