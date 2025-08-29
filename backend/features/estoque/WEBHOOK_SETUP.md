# 🚀 Configuração do Webhook Shopify para Estoque Automático

## ✅ Implementação Completa

O webhook do Shopify para decrementar estoque automaticamente foi implementado com sucesso! 

### 📁 Arquivos Criados/Modificados:

1. **`services/shopify_webhook_service.py`** - Validação e processamento de webhooks
2. **`services/estoque_service.py`** - Lógica de decremento de estoque  
3. **`views.py`** - Endpoints de webhook adicionados
4. **`urls.py`** - URLs de webhook configuradas
5. **`models.py` (processamento)** - Campo `webhook_secret` adicionado

### 🔗 URLs Disponíveis:

- **POST** `/api/estoque/webhook/order-created/` - Endpoint principal do webhook
- **GET** `/api/estoque/webhook/status/` - Status do sistema
- **GET** `/api/estoque/webhook/stats/` - Estatísticas detalhadas

## 🛠️ Como Configurar

### 1. Configurar no Shopify Admin

1. Acesse: **Settings > Notifications > Webhooks**
2. Clique em **"Create webhook"**
3. Configure:
   - **Event:** `Order payment` (recomendado) ou `Order creation`  
   - **Format:** JSON
   - **URL:** `https://seu-dominio.com/api/estoque/webhook/order-created/`
   - **API version:** 2024-07 ou superior

### 2. Configurar Segurança (Recomendado)

1. No webhook do Shopify, gere um **secret** (string aleatória)
2. No Django Admin → **Configurações Shopify**, edite sua loja
3. Cole o secret no campo **"Webhook secret"**

### 3. Cadastrar Produtos

Para cada produto que deve ter estoque controlado:

1. Acesse `/api/estoque/produtos/` ou Django Admin
2. Cadastre o produto com:
   - **SKU:** Exatamente igual ao SKU no Shopify
   - **Loja:** Selecione a configuração correta
   - **Estoque inicial/atual:** Quantidade disponível
   - **Estoque mínimo:** Para alertas automáticos

## ⚡ Fluxo Automático

1. **Cliente faz pedido** no Shopify
2. **Shopify envia webhook** quando pedido é pago
3. **Sistema valida** assinatura HMAC (se configurado)
4. **Sistema processa** cada item do pedido:
   - Busca produto por loja + SKU
   - Verifica estoque disponível
   - Decrementa estoque automaticamente
   - Cria movimentação tipo "venda"
   - Gera alertas se estoque baixo/zerado
5. **Sistema responde** ao Shopify com resultado

## 📊 Monitoramento

### Verificar Status
```bash
curl https://seu-dominio.com/api/estoque/webhook/status/
```

### Estatísticas (últimos 7 dias)
```bash
curl -H "Authorization: Bearer <token>" \
  "https://seu-dominio.com/api/estoque/webhook/stats/?days=7"
```

### Logs do Sistema
```bash
# Ver logs de webhook
tail -f backend/logs/errors.log | grep webhook

# Ver todas as movimentações de venda
python manage.py shell -c "
from features.estoque.models import MovimentacaoEstoque
vendas = MovimentacaoEstoque.objects.filter(tipo_movimento='venda')
print(f'Total de vendas processadas: {vendas.count()}')
"
```

## 🧪 Teste Local

### Usando ngrok:
```bash
# Terminal 1: Servidor Django
cd backend && python manage.py runserver

# Terminal 2: ngrok
ngrok http 8000

# Configure webhook Shopify para:
# https://abc123.ngrok.io/api/estoque/webhook/order-created/
```

### Teste Automatizado:
```bash
cd backend
python manage.py shell -c "exec(open('features/estoque/test_webhook.py').read())"
```

## 🛡️ Segurança Implementada

- ✅ **Validação HMAC** - Verifica assinatura do Shopify
- ✅ **Rate Limiting** - Via middleware do Django
- ✅ **Logs de Auditoria** - Todas as operações registradas
- ✅ **CSRF Exempt** - Apenas para endpoint de webhook
- ✅ **Validação de Domínio** - Apenas lojas configuradas
- ✅ **Transações Atômicas** - Rollback em caso de erro

## 🔧 Configurações Avançadas

### Filtrar por Status Financeiro
O webhook processa pedidos apenas com status:
- `paid` (pago)
- `partially_paid` (parcialmente pago)

### Tratamento de Erros
- **Produto não encontrado**: Item ignorado, outros processados
- **Estoque insuficiente**: Erro registrado, não decrementa
- **Loja não configurada**: Webhook rejeitado com 404
- **Assinatura inválida**: Webhook rejeitado com 401

### Alertas Automáticos
Gerados automaticamente quando:
- Estoque zera → Alerta **CRÍTICO**
- Estoque fica abaixo do mínimo → Alerta **ALTO**
- Estoque fica negativo → Alerta **CRÍTICO** (situação anômala)

## 📈 Próximos Passos Sugeridos

1. **Configurar notificações** por email/Slack para alertas críticos
2. **Implementar dashboard** para monitoramento em tempo real  
3. **Adicionar webhook** de reembolso para reversão de estoque
4. **Integrar com fornecedores** para reposição automática
5. **Expandir para outras plataformas** (WooCommerce, etc.)

## 🆘 Troubleshooting

### Webhook não está funcionando?
1. Verifique se o endpoint está acessível externamente
2. Confirme se a URL está correta no Shopify
3. Verifique logs do Django para erros
4. Teste localmente com ngrok primeiro

### Estoque não está decrementando?
1. Confirme se o produto existe com SKU exato
2. Verifique se a loja está configurada corretamente
3. Confirme se o pedido tem status "paid"
4. Verifique se há estoque suficiente

### Erros de assinatura?
1. Confirme se o webhook secret está correto
2. Verifique se não há espaços extras no secret
3. Teste sem secret primeiro para confirmar funcionamento

---

**✨ Implementação finalizada com sucesso!**

O sistema está pronto para processar vendas do Shopify automaticamente e manter o controle de estoque sempre atualizado.