"""
Script de teste para verificar dados de organizacoes no banco
"""
import os
import sys
import django

# Configurar encoding para UTF-8
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from core.models import Organization, OrganizationMember

User = get_user_model()

print("=" * 80)
print("VERIFICACAO DE DADOS - ORGANIZACOES E MEMBROS")
print("=" * 80)

# Verificar se ha usuarios e organizacoes
print(f"\nESTATISTICAS GERAIS:")
print(f"   Total de usuarios: {User.objects.count()}")
print(f"   Total de organizacoes ativas: {Organization.objects.filter(ativo=True).count()}")
print(f"   Total de membros ativos: {OrganizationMember.objects.filter(ativo=True).count()}")

# Listar todos os usuarios e suas organizacoes
print(f"\nDETALHAMENTO POR USUARIO:")
for user in User.objects.all():
    memberships = OrganizationMember.objects.filter(
        user=user,
        ativo=True,
        organization__ativo=True
    ).select_related('organization')

    print(f"\n   Usuario: {user.email} (ID: {user.id})")
    print(f"   Autenticado: {user.is_authenticated}")
    print(f"   Ativo: {user.is_active}")
    print(f"   Total de organizacoes: {memberships.count()}")

    if memberships.count() > 0:
        for m in memberships:
            print(f"      OK - Organizacao: {m.organization.nome}")
            print(f"         - ID: {m.organization.id}")
            print(f"         - Role: {m.role}")
            print(f"         - Plano: {m.organization.plano}")
            print(f"         - Membros: {m.organization.membros.filter(ativo=True).count()}/{m.organization.limite_membros}")
    else:
        print(f"      ERRO - Nenhuma organizacao encontrada")

# Listar todas as organizacoes
print(f"\nDETALHAMENTO POR ORGANIZACAO:")
for org in Organization.objects.filter(ativo=True):
    membros = org.membros.filter(ativo=True)
    print(f"\n   Organizacao: {org.nome} (ID: {org.id})")
    print(f"   Plano: {org.plano}")
    print(f"   Membros: {membros.count()}/{org.limite_membros}")

    for m in membros:
        print(f"      - {m.user.email} ({m.role})")

print("\n" + "=" * 80)
print("FIM DA VERIFICACAO")
print("=" * 80)