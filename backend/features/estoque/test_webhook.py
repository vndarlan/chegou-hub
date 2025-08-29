# backend/features/estoque/test_webhook.py
"""
Script de teste para o webhook do Shopify
Execute: python manage.py shell -c "exec(open('features/estoque/test_webhook.py').read())"
"""

import json
import requests
from django.test import Client
from django.contrib.auth.models import User
from features.processamento.models import ShopifyConfig
from features.estoque.models import ProdutoEstoque

def create_test_data():
    """Criar dados de teste"""
    print("=== Criando dados de teste ===")
    
    # Criar usuário de teste
    user, created = User.objects.get_or_create(
        username='test_webhook',
        defaults={'email': 'test@exemplo.com'}
    )
    print(f"Usuário: {user.username} ({'criado' if created else 'existente'})")
    
    # Criar configuração Shopify
    config, created = ShopifyConfig.objects.get_or_create(
        user=user,
        shop_url='minha-loja.myshopify.com',
        defaults={
            'nome_loja': 'Loja Teste Webhook',
            'access_token': 'test_token_123',
            'webhook_secret': 'test_secret_456',
            'ativo': True
        }
    )
    print(f"Loja: {config.nome_loja} ({'criada' if created else 'existente'})")
    
    # Criar produto de teste
    produto, created = ProdutoEstoque.objects.get_or_create(
        user=user,
        loja_config=config,
        sku='TESTE-001',
        defaults={
            'nome': 'Produto Teste Webhook',
            'estoque_inicial': 100,
            'estoque_atual': 100,
            'estoque_minimo': 10,
            'ativo': True
        }
    )
    print(f"Produto: {produto.sku} - Estoque: {produto.estoque_atual} ({'criado' if created else 'existente'})")
    
    return user, config, produto

def create_test_payload():
    """Criar payload de teste do Shopify"""
    return {
        "id": 123456789,
        "order_number": 1001,
        "created_at": "2025-01-20T10:00:00Z",
        "financial_status": "paid",
        "fulfillment_status": "unfulfilled",
        "total_price": "59.80",
        "currency": "BRL",
        "email": "cliente@exemplo.com",
        "shop_domain": "minha-loja.myshopify.com",
        "line_items": [
            {
                "id": 987654321,
                "product_id": 555666777,
                "variant_id": 888999111,
                "sku": "TESTE-001",
                "title": "Produto Teste Webhook",
                "name": "Produto Teste Webhook",
                "quantity": 2,
                "price": "29.90",
                "variant_title": "Default Title"
            },
            {
                "id": 987654322,
                "product_id": 555666778,
                "variant_id": 888999112,
                "sku": "TESTE-999",  # SKU não existe - deve gerar erro
                "title": "Produto Inexistente",
                "name": "Produto Inexistente", 
                "quantity": 1,
                "price": "19.90",
                "variant_title": "Default Title"
            }
        ]
    }

def test_webhook_locally():
    """Testar webhook localmente"""
    print("\n=== Testando Webhook Localmente ===")
    
    # Criar dados de teste
    user, config, produto = create_test_data()
    
    # Criar payload
    payload = create_test_payload()
    
    print(f"\nEstoque antes do teste: {produto.estoque_atual}")
    
    # Criar cliente de teste
    client = Client()
    
    # Headers simulando Shopify
    headers = {
        'HTTP_X_SHOPIFY_TOPIC': 'orders/paid',
        'HTTP_X_SHOPIFY_SHOP_DOMAIN': 'minha-loja.myshopify.com',
        'HTTP_CONTENT_TYPE': 'application/json',
    }
    
    # Fazer requisição POST
    response = client.post(
        '/api/estoque/webhook/order-created/',
        data=json.dumps(payload),
        content_type='application/json',
        **headers
    )
    
    print(f"\nStatus da resposta: {response.status_code}")
    
    try:
        response_data = response.json()
        print(f"Resposta JSON: {json.dumps(response_data, indent=2, ensure_ascii=False)}")
    except:
        print(f"Resposta raw: {response.content}")
    
    # Verificar estoque após o teste
    produto.refresh_from_db()
    print(f"Estoque após o teste: {produto.estoque_atual}")
    
    # Verificar movimentações criadas
    from features.estoque.models import MovimentacaoEstoque
    movimentacoes = MovimentacaoEstoque.objects.filter(
        produto=produto,
        tipo_movimento='venda'
    ).order_by('-data_movimentacao')
    
    print(f"\nMovimentações encontradas: {movimentacoes.count()}")
    for mov in movimentacoes[:3]:  # Mostrar apenas as 3 mais recentes
        print(f"- {mov.tipo_movimento}: {mov.quantidade} unidades - {mov.data_movimentacao}")
    
    # Verificar alertas gerados
    from features.estoque.models import AlertaEstoque
    alertas = AlertaEstoque.objects.filter(
        produto=produto,
        status='ativo'
    ).order_by('-data_criacao')
    
    print(f"\nAlertas ativos: {alertas.count()}")
    for alerta in alertas[:3]:
        print(f"- {alerta.get_tipo_alerta_display()}: {alerta.titulo}")

def test_webhook_status():
    """Testar endpoint de status"""
    print("\n=== Testando Endpoint de Status ===")
    
    client = Client()
    response = client.get('/api/estoque/webhook/status/')
    
    print(f"Status: {response.status_code}")
    try:
        response_data = response.json()
        print(f"Resposta: {json.dumps(response_data, indent=2, ensure_ascii=False)}")
    except:
        print(f"Resposta raw: {response.content}")

if __name__ == "__main__":
    print("🚀 Iniciando testes do webhook do Shopify")
    
    # Executar testes
    test_webhook_locally()
    test_webhook_status()
    
    print("\n✅ Testes concluídos!")
    print("\nPara testar com o Shopify real:")
    print("1. Use ngrok: ngrok http 8000")
    print("2. Configure webhook: https://SEU_NGROK.ngrok.io/api/estoque/webhook/order-created/")
    print("3. Faça um pedido de teste na sua loja")