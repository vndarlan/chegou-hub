
import os
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from features.estoque.models import Produto
from django.contrib.auth.models import User

# Verificar se existe algum produto
total_produtos = Produto.objects.count()
print(f"Total de produtos no banco: {total_produtos}")

# Verificar usuários
total_usuarios = User.objects.count()
print(f"Total de usuários no banco: {total_usuarios}")

if total_usuarios > 0:
    usuario = User.objects.first()
    produtos_usuario = Produto.objects.filter(user=usuario).count()
    print(f"Produtos do primeiro usuário ({usuario.username}): {produtos_usuario}")

# Tentar criar um produto manualmente
try:
    if total_usuarios > 0:
        usuario = User.objects.first()
        produto_teste = Produto.objects.create(
            user=usuario,
            nome="Produto Teste Direto",
            fornecedor="N1",
            estoque_compartilhado=5,
            estoque_minimo=1
        )
        print(f"Produto criado diretamente no banco: ID {produto_teste.id}")

        # Verificar se foi salvo
        total_apos = Produto.objects.count()
        print(f"Total apos criacao: {total_apos}")

    else:
        print("Nenhum usuario encontrado para criar produto")

except Exception as e:
    print(f"Erro ao criar produto direto: {e}")
