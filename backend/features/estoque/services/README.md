# Serviços de Estoque - Webhooks Shopify

## Visão Geral

Esta pasta contém os serviços responsáveis pelo processamento automático de vendas via webhooks do Shopify, decrementando o estoque automaticamente quando pedidos são criados ou pagos.

## Arquivos

### `shopify_webhook_service.py`
Serviço para validação e processamento de webhooks do Shopify:
- Verificação de assinatura HMAC para segurança
- Extração de dados relevantes do payload
- Validação se o pedido deve ser processado
- Logs estruturados de todas as operações

### `estoque_service.py`  
Serviço para operações de controle de estoque:
- Processamento de vendas via webhook
- Decremento automático de estoque
- Criação de movimentações tipo 'venda'
- Geração de alertas de estoque baixo/zerado
- Estatísticas de processamento

## Como Configurar

### 1. Configurar Webhook no Shopify Admin

1. Vá em `Settings > Notifications > Webhooks`
2. Clique em "Create webhook"  
3. Configure:
   - **Event:** `Order creation` ou `Order payment`
   - **Format:** JSON
   - **URL:** `https://seu-dominio.com/api/estoque/webhook/order-created/`
   - **API version:** 2024-07 ou mais recente

### 2. Configurar Secret (Recomendado)

Para maior segurança, configure um webhook secret:

1. No webhook do Shopify, defina um secret (string aleatória)
2. No Django Admin, edite a configuração da loja (`ShopifyConfig`)
3. Adicione o mesmo secret no campo `webhook_secret`

### 3. Cadastrar Produtos no Estoque

Antes de receber webhooks, certifique-se que os produtos estão cadastrados:

1. Vá em `/api/estoque/produtos/`
2. Cadastre cada produto com:
   - **SKU:** Deve coincidir exatamente com o SKU no Shopify
   - **Loja:** Selecione a configuração correta do Shopify
   - **Estoque inicial:** Quantidade em estoque
   - **Estoque mínimo:** Para alertas automáticos

## URLs Disponíveis

### Webhook Principal
- **POST** `/api/estoque/webhook/order-created/`
  - Recebe webhooks do Shopify
  - Público (CSRF exempt)
  - Processa pedidos automaticamente

### Monitoramento
- **GET** `/api/estoque/webhook/status/`
  - Status do sistema (público)
  - Estatísticas básicas
  
- **GET** `/api/estoque/webhook/stats/`
  - Estatísticas detalhadas (autenticado)
  - Filtrável por período e loja

## Fluxo de Processamento

1. **Shopify** envia webhook quando pedido é criado/pago
2. **Sistema** valida assinatura HMAC (se configurado)
3. **Sistema** extrai line_items com SKUs do payload
4. **Sistema** verifica se pedido deve ser processado (status financeiro)
5. Para cada item:
   - Busca produto no estoque pela combinação loja+SKU
   - Verifica se há estoque suficiente
   - Decrementa estoque usando `produto.remover_estoque()`
   - Cria movimentação tipo 'venda'
   - Gera alertas se estoque ficou baixo/zerado
6. **Sistema** retorna resposta JSON com resultado

## Logs e Monitoramento

Todos os webhooks são logados com:
- IP de origem
- Headers do Shopify
- Dados do pedido processado
- Resultado de cada item
- Erros detalhados (se houver)

Para monitorar, use:
```python
# Ver logs recentes
tail -f backend/logs/errors.log | grep webhook

# Estatísticas via API
curl -H "Authorization: Bearer <token>" \
  https://seu-dominio.com/api/estoque/webhook/stats/?days=7
```

## Tratamento de Erros

### Erros Comuns:
1. **Produto não encontrado**: SKU não existe no estoque da loja
2. **Estoque insuficiente**: Quantidade solicitada > disponível
3. **Loja não encontrada**: Domínio do webhook não corresponde a nenhuma loja configurada
4. **Assinatura inválida**: HMAC não confere (se secret configurado)

### Estratégias de Resiliência:
- Processamento transacional (rollback em caso de erro)
- Logs detalhados para debug
- Respostas HTTP apropriadas para o Shopify
- Processamento parcial (alguns itens com sucesso, outros com erro)

## Segurança

- **HMAC Validation**: Sempre configure webhook secret em produção
- **Rate Limiting**: Implementado via middleware do Django
- **IP Allowlist**: Configure IPs do Shopify se necessário
- **Logs de Auditoria**: Todas as operações são registradas
- **CSRF Exempt**: Apenas para o endpoint de webhook

## Exemplo de Payload

```json
{
  "id": 123456789,
  "order_number": 1001,
  "financial_status": "paid",
  "line_items": [
    {
      "id": 987654321,
      "sku": "PROD-001",
      "title": "Produto Exemplo",
      "quantity": 2,
      "price": "29.90"
    }
  ],
  "shop_domain": "minha-loja.myshopify.com"
}
```

## Teste Local

Para testar localmente:

```bash
# Usar ngrok para expor localhost
ngrok http 8000

# Configurar webhook do Shopify para:
https://abc123.ngrok.io/api/estoque/webhook/order-created/

# Fazer pedido de teste no Shopify
# Verificar logs do Django
```