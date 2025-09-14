# backend/features/estoque/test_unificado.py
"""
Script de teste para verificar se a API unificada está funcionando corretamente.

Como executar:
cd backend && python manage.py shell -c "exec(open('features/estoque/test_unificado.py').read())"
"""

from django.contrib.auth.models import User
from features.processamento.models import ShopifyConfig
from features.estoque.models import ProdutoEstoque, Produto, ProdutoSKU
from features.estoque.serializers import ProdutoUnificadoSerializer

# Limpar dados de teste anteriores
print("🧹 Limpando dados de teste anteriores...")
ProdutoEstoque.objects.filter(nome__startswith='[TESTE]').delete()
Produto.objects.filter(nome__startswith='[TESTE]').delete()

# Criar/buscar usuário de teste
user, created = User.objects.get_or_create(
    username='teste_unificado',
    defaults={'email': 'teste@chegouhub.com'}
)
print(f"👤 Usuário: {user.username} ({'criado' if created else 'existente'})")

# Criar/buscar loja de teste
loja, created = ShopifyConfig.objects.get_or_create(
    user=user,
    nome_loja='loja_teste_unificado',
    defaults={
        'shop_url': 'loja-teste.myshopify.com',
        'access_token': 'token_teste'
    }
)
print(f"🏪 Loja: {loja.nome_loja} ({'criada' if created else 'existente'})")

# Criar produto individual de teste
produto_individual = ProdutoEstoque.objects.create(
    user=user,
    loja_config=loja,
    sku='[TESTE]SKU001',
    nome='[TESTE] Produto Individual',
    fornecedor='N1',
    estoque_atual=50,
    estoque_minimo=10,
    custo_unitario=25.00
)
print(f"📦 Produto individual criado: {produto_individual.sku}")

# Criar produto compartilhado de teste
produto_compartilhado = Produto.objects.create(
    user=user,
    nome='[TESTE] Produto Compartilhado',
    fornecedor='Dropi',
    estoque_compartilhado=100,
    estoque_minimo=20,
    custo_unitario=15.00
)
print(f"🔗 Produto compartilhado criado: {produto_compartilhado.nome}")

# Criar SKU para produto compartilhado
sku_compartilhado = ProdutoSKU.objects.create(
    produto=produto_compartilhado,
    sku='[TESTE]SKU002',
    descricao_variacao='Variação teste'
)
print(f"🏷️ SKU criado para produto compartilhado: {sku_compartilhado.sku}")

# Testar serializer unificado
print("\n📊 Testando serializer unificado...")

# Serializar produto individual
dados_individual = ProdutoUnificadoSerializer(produto_individual).data
print(f"✅ Produto individual serializado:")
print(f"   - Nome: {dados_individual['nome']}")
print(f"   - Tipo: {dados_individual['tipo_produto']}")
print(f"   - SKU: {dados_individual['sku']}")
print(f"   - Estoque: {dados_individual['estoque_atual']}")
print(f"   - Lojas conectadas: {len(dados_individual['lojas_conectadas'])}")

# Serializar produto compartilhado
dados_compartilhado = ProdutoUnificadoSerializer(produto_compartilhado).data
print(f"✅ Produto compartilhado serializado:")
print(f"   - Nome: {dados_compartilhado['nome']}")
print(f"   - Tipo: {dados_compartilhado['tipo_produto']}")
print(f"   - SKU: {dados_compartilhado['sku']}")
print(f"   - Estoque: {dados_compartilhado['estoque_atual']}")
print(f"   - Lojas conectadas: {len(dados_compartilhado['lojas_conectadas'])}")

# Testar campos específicos
print("\n🔍 Verificando campos específicos...")

# Verificar tipo do produto
assert dados_individual['tipo_produto'] == 'individual', "Tipo produto individual incorreto"
assert dados_compartilhado['tipo_produto'] == 'compartilhado', "Tipo produto compartilhado incorreto"

# Verificar estoque
assert dados_individual['estoque_atual'] == 50, "Estoque individual incorreto"
assert dados_compartilhado['estoque_atual'] == 100, "Estoque compartilhado incorreto"

# Verificar SKUs
assert dados_individual['sku'] == '[TESTE]SKU001', "SKU individual incorreto"
assert dados_compartilhado['sku'] == '[TESTE]SKU002', "SKU compartilhado incorreto"

# Verificar lojas conectadas
assert len(dados_individual['lojas_conectadas']) == 1, "Número de lojas individual incorreto"
assert dados_individual['lojas_conectadas'][0]['nome_loja'] == 'loja_teste_unificado', "Nome da loja incorreto"

# Verificar campos calculados
assert dados_individual['estoque_disponivel'] == True, "estoque_disponivel individual incorreto"
assert dados_individual['estoque_baixo'] == False, "estoque_baixo individual incorreto"
assert dados_individual['estoque_negativo'] == False, "estoque_negativo individual incorreto"

print("✅ Todos os testes passaram!")

# Testar consulta unificada
print("\n🔍 Testando consulta unificada (simulação)...")
from itertools import chain

# Simular o que a view faz
produtos_individuais = ProdutoEstoque.objects.filter(user=user, nome__startswith='[TESTE]')
produtos_compartilhados = Produto.objects.filter(user=user, nome__startswith='[TESTE]')
resultado = list(chain(produtos_individuais, produtos_compartilhados))

print(f"📊 Total de produtos encontrados: {len(resultado)}")
print(f"   - Produtos individuais: {len(produtos_individuais)}")
print(f"   - Produtos compartilhados: {len(produtos_compartilhados)}")

# Serializar todos juntos
dados_unificados = ProdutoUnificadoSerializer(resultado, many=True).data
print(f"✅ {len(dados_unificados)} produtos serializados com sucesso")

for i, produto in enumerate(dados_unificados):
    print(f"   {i+1}. {produto['nome']} ({produto['tipo_produto']}) - Estoque: {produto['estoque_atual']}")

print("\n🎉 Teste completo! A API unificada está funcionando corretamente.")
print("\n📡 Endpoints disponíveis:")
print("   - GET /api/estoque/produtos-unificados/ - Lista todos os produtos")
print("   - GET /api/estoque/produtos-unificados/estatisticas_unificadas/ - Estatísticas")

# Limpar dados de teste
print("\n🧹 Limpando dados de teste...")
produto_individual.delete()
produto_compartilhado.delete()
loja.delete()
user.delete()
print("✨ Limpeza concluída!")