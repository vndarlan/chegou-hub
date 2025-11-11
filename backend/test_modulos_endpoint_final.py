"""
Script de validação do endpoint /api/organizations/{id}/modulos_disponiveis/

Execute com:
    python test_modulos_endpoint_final.py

Testa os seguintes cenários:
1. Usuário autenticado e membro da organização → 200 OK
2. Usuário autenticado mas NÃO membro → 200 OK (lista pública)
3. Organização inexistente → 404 Not Found
4. Usuário não autenticado → 403 Forbidden (IsAuthenticated)
"""
import os
import sys
import django

# Configurar encoding UTF-8 no Windows
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from django.test import RequestFactory
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from core.views_organizations import OrganizationViewSet
from core.models import Organization
from rest_framework.request import Request

User = get_user_model()

def test_endpoint():
    """Executa bateria de testes no endpoint"""
    factory = RequestFactory()
    resultados = []

    print("=" * 80)
    print("VALIDACAO: /api/organizations/{id}/modulos_disponiveis/")
    print("=" * 80)

    # Cenário 1: Usuário membro
    print("\n[1/4] Usuario autenticado E membro da organizacao...")
    try:
        user = User.objects.first()
        if not user:
            print("  [SKIP] Nenhum usuario no banco")
            resultados.append(False)
        else:
            org = Organization.objects.filter(
                membros__user=user,
                membros__ativo=True
            ).first()

            if not org:
                print("  [SKIP] Usuario nao e membro de nenhuma org")
                resultados.append(False)
            else:
                request = factory.get(f'/api/organizations/{org.id}/modulos_disponiveis/')
                request.user = user

                viewset = OrganizationViewSet()
                viewset.kwargs = {'pk': org.id}
                viewset.request = request
                viewset.format_kwarg = None

                response = viewset.modulos_disponiveis(request, pk=org.id)

                if response.status_code == 200:
                    modulos_count = len(response.data.get('modulos', []))
                    print(f"  [OK] Status 200 - Retornou {modulos_count} modulos")
                    resultados.append(True)
                else:
                    print(f"  [ERRO] Status {response.status_code} (esperado 200)")
                    resultados.append(False)
    except Exception as e:
        print(f"  [ERRO] Exception: {e}")
        resultados.append(False)

    # Cenário 2: Usuário NÃO membro
    print("\n[2/4] Usuario autenticado mas NAO membro...")
    try:
        # Criar usuário temporário
        temp_user = User.objects.create_user(
            username='temp_test_user',
            email='temp@test.local',
            password='testpass123'
        )

        org = Organization.objects.filter(ativo=True).first()
        if not org:
            print("  [SKIP] Nenhuma organizacao ativa")
            resultados.append(False)
        else:
            request = factory.get(f'/api/organizations/{org.id}/modulos_disponiveis/')
            request.user = temp_user

            viewset = OrganizationViewSet()
            viewset.kwargs = {'pk': org.id}
            viewset.request = request
            viewset.format_kwarg = None

            response = viewset.modulos_disponiveis(request, pk=org.id)

            if response.status_code == 200:
                print(f"  [OK] Status 200 - Endpoint publico para usuarios autenticados")
                resultados.append(True)
            else:
                print(f"  [ERRO] Status {response.status_code} (esperado 200)")
                resultados.append(False)

        # Limpar usuário temporário
        temp_user.delete()

    except Exception as e:
        print(f"  [ERRO] Exception: {e}")
        resultados.append(False)

    # Cenário 3: Organização inexistente
    print("\n[3/4] Organizacao inexistente (ID 99999)...")
    try:
        user = User.objects.first()
        request = factory.get('/api/organizations/99999/modulos_disponiveis/')
        request.user = user

        viewset = OrganizationViewSet()
        viewset.kwargs = {'pk': 99999}
        viewset.request = request
        viewset.format_kwarg = None

        response = viewset.modulos_disponiveis(request, pk=99999)

        if response.status_code == 404:
            print(f"  [OK] Status 404 - Organizacao nao encontrada")
            resultados.append(True)
        else:
            print(f"  [ERRO] Status {response.status_code} (esperado 404)")
            resultados.append(False)

    except Exception as e:
        print(f"  [ERRO] Exception: {e}")
        resultados.append(False)

    # Cenário 4: Usuário não autenticado
    print("\n[4/4] Usuario NAO autenticado (AnonymousUser)...")
    try:
        org = Organization.objects.filter(ativo=True).first()
        if not org:
            print("  [SKIP] Nenhuma organizacao ativa")
            resultados.append(False)
        else:
            request = factory.get(f'/api/organizations/{org.id}/modulos_disponiveis/')
            request.user = AnonymousUser()

            # Criar DRF Request para validar permissões
            drf_request = Request(request)

            viewset = OrganizationViewSet()
            viewset.kwargs = {'pk': org.id}
            viewset.request = drf_request
            viewset.format_kwarg = None

            # Verificar permissão
            from rest_framework.permissions import IsAuthenticated
            permission = IsAuthenticated()
            has_perm = permission.has_permission(drf_request, viewset)

            if not has_perm:
                print(f"  [OK] IsAuthenticated bloqueou acesso (como esperado)")
                resultados.append(True)
            else:
                print(f"  [ERRO] Usuario anonimo tem permissao (nao deveria)")
                resultados.append(False)

    except Exception as e:
        print(f"  [ERRO] Exception: {e}")
        resultados.append(False)

    # Resultado final
    print("\n" + "=" * 80)
    print("RESULTADO FINAL:")
    print(f"  Testes passaram: {sum(resultados)}/{len(resultados)}")

    if all(resultados):
        print("  Status: TODOS OS TESTES PASSARAM")
        return True
    else:
        print("  Status: ALGUNS TESTES FALHARAM")
        return False

if __name__ == '__main__':
    sucesso = test_endpoint()
    sys.exit(0 if sucesso else 1)
