#!/usr/bin/env python
"""
Script para verificar lojas e produtos cadastrados na produção
"""
import os
import sys
import django

# Configurar Django
sys.path.append('.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from features.processamento.models import ShopifyConfig
from features.estoque.models import ProdutoEstoque, Produto

def check_production_data():
    """Verificar dados cadastrados na produção"""

    print("=== VERIFICAÇÃO DE DADOS NA PRODUÇÃO ===\n")

    # 1. Verificar lojas Shopify configuradas
    print("1. Verificando lojas Shopify configuradas...")
    lojas = ShopifyConfig.objects.all()

    if lojas.exists():
        print(f"   Total de lojas encontradas: {lojas.count()}")
        print("\n   Lojas cadastradas:")
        for loja in lojas:
            print(f"     - ID: {loja.id}")
            print(f"       Nome: {loja.nome_loja}")
            print(f"       URL: {loja.shop_url}")
            print(f"       Usuário: {loja.user.username}")
            print(f"       Ativa: {loja.ativo}")
            print(f"       Webhook configurado: {bool(loja.webhook_secret)}")
            print(f"       Criada em: {loja.data_criacao}")
            print()
    else:
        print("   NENHUMA loja Shopify encontrada!")
        return

    # 2. Verificar produtos individuais (ProdutoEstoque)
    print("2. Verificando produtos individuais por loja...")
    for loja in lojas:
        produtos_individuais = ProdutoEstoque.objects.filter(loja_config=loja)
        print(f"\n   Loja {loja.nome_loja} ({loja.shop_url}):")
        print(f"     - Produtos individuais: {produtos_individuais.count()}")

        if produtos_individuais.exists():
            print("     - SKUs configurados:")
            for produto in produtos_individuais[:5]:  # Mostrar apenas 5 primeiros
                print(f"       * {produto.sku} - {produto.nome} (Estoque: {produto.estoque_atual})")

            if produtos_individuais.count() > 5:
                print(f"       ... e mais {produtos_individuais.count() - 5} produtos")

    # 3. Verificar produtos compartilhados
    print("\n3. Verificando produtos compartilhados...")
    produtos_compartilhados = Produto.objects.all()

    if produtos_compartilhados.exists():
        print(f"   Total de produtos compartilhados: {produtos_compartilhados.count()}")
        print("\n   Produtos compartilhados:")
        for produto in produtos_compartilhados[:5]:  # Mostrar apenas 5 primeiros
            print(f"     - ID: {produto.id}")
            print(f"       Nome: {produto.nome}")
            print(f"       Usuário: {produto.user.username}")
            print(f"       Estoque compartilhado: {produto.estoque_compartilhado}")

            # Verificar SKUs
            skus = produto.skus.filter(ativo=True)
            if skus.exists():
                print(f"       SKUs: {', '.join([sku.sku for sku in skus])}")

            # Verificar lojas associadas
            lojas_associadas = produto.lojas.filter(ativo=True)
            if lojas_associadas.exists():
                print(f"       Lojas: {', '.join([loja.nome_loja for loja in lojas_associadas])}")
            print()

        if produtos_compartilhados.count() > 5:
            print(f"   ... e mais {produtos_compartilhados.count() - 5} produtos")
    else:
        print("   NENHUM produto compartilhado encontrado!")

    # 4. Verificar se a loja específica 7b7fba.myshopify.com existe
    print("\n4. Verificando loja específica 7b7fba.myshopify.com...")
    loja_especifica = ShopifyConfig.objects.filter(shop_url='7b7fba.myshopify.com').first()

    if loja_especifica:
        print(f"   OK Loja encontrada: {loja_especifica.nome_loja}")
        print(f"     - ID: {loja_especifica.id}")
        print(f"     - Usuário: {loja_especifica.user.username}")
        print(f"     - Ativa: {loja_especifica.ativo}")

        # Verificar produtos desta loja
        produtos_loja = ProdutoEstoque.objects.filter(loja_config=loja_especifica)
        print(f"     - Produtos individuais: {produtos_loja.count()}")

        # Verificar produtos compartilhados associados
        produtos_shared = Produto.objects.filter(lojas=loja_especifica)
        print(f"     - Produtos compartilhados: {produtos_shared.count()}")

        # Verificar se tem produto com SKU 'gh5'
        produto_gh5 = ProdutoEstoque.objects.filter(
            loja_config=loja_especifica,
            sku='gh5'
        ).first()

        if produto_gh5:
            print(f"     OK Produto SKU 'gh5' encontrado: {produto_gh5.nome}")
            print(f"       Estoque atual: {produto_gh5.estoque_atual}")
        else:
            print("     ERRO Produto SKU 'gh5' NAO encontrado")

            # Verificar se existe em produtos compartilhados
            produto_gh5_shared = Produto.objects.filter(
                skus__sku='gh5',
                lojas=loja_especifica
            ).first()

            if produto_gh5_shared:
                print(f"     OK Produto compartilhado SKU 'gh5' encontrado: {produto_gh5_shared.nome}")
                print(f"       Estoque compartilhado: {produto_gh5_shared.estoque_compartilhado}")
            else:
                print("     ERRO Produto compartilhado SKU 'gh5' NAO encontrado")
    else:
        print("   ERRO Loja 7b7fba.myshopify.com NAO encontrada!")

    # 5. Resumo de configuração necessária
    print("\n=== RESUMO PARA CONFIGURAÇÃO ===")
    lojas_ativas = ShopifyConfig.objects.filter(ativo=True)

    print(f"\nLojas ativas que precisam de webhook configurado:")
    for loja in lojas_ativas:
        print(f"  - {loja.nome_loja} ({loja.shop_url})")
        print(f"    URL webhook produção: https://chegou-hubb-production.up.railway.app/api/estoque/webhook/order-created/")
        print(f"    URL webhook teste: https://backendchegouhubteste.up.railway.app/api/estoque/webhook/order-created/")

        # Verificar se tem produtos configurados
        produtos_total = (ProdutoEstoque.objects.filter(loja_config=loja).count() +
                         Produto.objects.filter(lojas=loja).count())
        print(f"    Produtos configurados: {produtos_total}")
        print()

if __name__ == "__main__":
    check_production_data()