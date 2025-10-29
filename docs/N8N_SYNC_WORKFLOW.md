# Configuração n8n - Sincronização Automática ECOMHUB

Este documento descreve como configurar um workflow no n8n para sincronizar automaticamente os pedidos ECOMHUB a cada hora.

## 📋 Visão Geral

O sistema de Status Tracking ECOMHUB já possui um endpoint REST pronto para sincronização manual:
- **Endpoint**: `POST /metricas/ecomhub/orders/sync/`
- **Função**: Busca pedidos de todas as lojas ativas via API ECOMHUB
- **Retorno**: Estatísticas (orders_created, orders_updated, status_changes, errors)

O n8n executará uma chamada HTTP para este endpoint a cada hora, automatizando o processo.

---

## 🔧 Configuração do Workflow n8n

### **1. Cron Trigger Node**

Configura a execução periódica do workflow.

**Configurações**:
```
Mode: Every Hour
Trigger Interval: Custom Cron
Cron Expression: 0 * * * *
```

**Explicação**: `0 * * * *` = executa no minuto 0 de cada hora (1:00, 2:00, 3:00, etc.)

**Timezone**: Configurar para `America/Sao_Paulo` (UTC-3)

---

### **2. HTTP Request Node**

Executa a chamada para o endpoint de sincronização.

**Configurações Básicas**:
```
Method: POST
URL: https://seu-dominio.railway.app/metricas/ecomhub/orders/sync/
Authentication: Generic Credential Type (ver opções abaixo)
```

**Headers**:
```json
{
  "Content-Type": "application/json",
  "Accept": "application/json"
}
```

**Body**: Vazio (não precisa enviar nada)

**Response Format**: JSON

---

### **3. Autenticação (Escolha uma opção)**

#### **Opção A: Token de API Django (Recomendado)**

**No Django**:
1. Acesse o Django Admin: `/admin/`
2. Navegue até: **Authentication and Authorization** → **Tokens**
3. Crie um novo token ou use um existente
4. Copie o token gerado

**No n8n**:
- **Authentication**: Header Auth
- **Name**: `Authorization`
- **Value**: `Token SEU_TOKEN_AQUI`

**Exemplo**:
```
Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b
```

---

#### **Opção B: API Key Customizada (Para maior segurança)**

**No Railway** (Variáveis de Ambiente):
1. Acesse o projeto no Railway
2. Vá em **Variables**
3. Adicione:
   ```
   N8N_API_KEY=sua-chave-secreta-complexa-aqui
   ```

**No Django** (Criar middleware):
```python
# backend/core/middleware/n8n_auth.py
from django.http import JsonResponse
from django.conf import settings

class N8NAuthMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Verificar apenas em endpoints específicos
        if '/metricas/ecomhub/orders/sync/' in request.path:
            api_key = request.headers.get('X-API-Key')
            expected_key = settings.N8N_API_KEY

            if api_key != expected_key:
                return JsonResponse({
                    'error': 'Unauthorized',
                    'message': 'Invalid API Key'
                }, status=401)

        return self.get_response(request)
```

**No n8n**:
- **Authentication**: Header Auth
- **Name**: `X-API-Key`
- **Value**: `sua-chave-secreta-complexa-aqui`

---

### **4. Conditional Node (Verificar Sucesso)**

Adicione lógica para verificar se a sincronização foi bem-sucedida.

**Configuração**:
```javascript
// Condição 1: Sucesso
{{ $json.success }} === true

// Condição 2: Erro
{{ $json.success }} === false || {{ $json.success }} === undefined
```

---

### **5. (Opcional) Notification Node**

Envie notificações em caso de erro ou sucesso.

#### **Slack Notification**:
```
Channel: #ecomhub-alerts
Message:
✅ Sincronização ECOMHUB concluída!
📊 Novos: {{ $json.stats.orders_created }}
🔄 Atualizados: {{ $json.stats.orders_updated }}
🔀 Mudanças de status: {{ $json.stats.status_changes }}
⏰ Horário: {{ $now.toLocaleString('pt-BR') }}
```

#### **Discord Webhook**:
```json
{
  "content": "✅ Sincronização ECOMHUB concluída!",
  "embeds": [{
    "title": "Estatísticas",
    "color": 3066993,
    "fields": [
      {
        "name": "Novos Pedidos",
        "value": "{{ $json.stats.orders_created }}",
        "inline": true
      },
      {
        "name": "Atualizados",
        "value": "{{ $json.stats.orders_updated }}",
        "inline": true
      },
      {
        "name": "Status Alterados",
        "value": "{{ $json.stats.status_changes }}",
        "inline": true
      }
    ],
    "timestamp": "{{ $now.toISOString() }}"
  }]
}
```

---

## 🔄 Exemplo de Resposta da API

**Sucesso**:
```json
{
  "success": true,
  "message": "Sincronização concluída com sucesso",
  "stats": {
    "stores_processed": 3,
    "orders_created": 12,
    "orders_updated": 45,
    "status_changes": 8,
    "errors": [],
    "unknown_statuses": 0
  }
}
```

**Erro**:
```json
{
  "success": false,
  "error": "Erro na sincronização",
  "message": "Detalhes do erro aqui"
}
```

---

## 🎯 Workflow Completo Sugerido

```
┌──────────────────┐
│  Cron Trigger    │
│  (0 * * * *)     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  HTTP Request    │
│  POST /sync/     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  IF Node         │
│  success === true│
└─────┬────────┬───┘
      │        │
   ✅ SIM    ❌ NÃO
      │        │
      ▼        ▼
  ┌───────┐ ┌────────────┐
  │ Log   │ │ Retry Node │
  │ Stats │ │ (3x, 5min) │
  └───────┘ └──────┬─────┘
                   │
                   ▼
            ┌─────────────┐
            │ Notification│
            │ (Erro)      │
            └─────────────┘
```

---

## 📊 Monitoramento

### **No n8n**:
- Histórico de execuções: Menu "Executions"
- Ver logs de cada execução
- Estatísticas de sucesso/falha
- Tempo de execução

### **No Django/Railway**:
```bash
# Ver logs do backend
railway logs

# Verificar última sincronização
# No Django Admin: Lojas ECOMHUB → Campo "last_sync"
```

### **No Frontend**:
- Dashboard mostra "Última sincronização"
- Botão "Sincronizar" para teste manual

---

## 🛡️ Segurança

### **Boas Práticas**:
1. ✅ **Use HTTPS** (Railway já fornece)
2. ✅ **Proteja o endpoint** com token ou API key
3. ✅ **Rotacione tokens** periodicamente
4. ✅ **Configure rate limiting** (se necessário)
5. ✅ **Monitore tentativas de acesso não autorizadas**

### **Variáveis de Ambiente Sensíveis**:
```bash
# No Railway
N8N_API_KEY=chave-super-secreta-aqui
DJANGO_SECRET_KEY=...
DATABASE_URL=...
```

---

## 🔍 Troubleshooting

### **Problema**: Erro 401 Unauthorized
**Solução**: Verificar se o token está correto e no formato certo:
```
Authorization: Token abc123xyz  # ✅ Correto
Authorization: Bearer abc123xyz # ❌ Errado (Bearer é para JWT)
```

### **Problema**: Timeout na requisição
**Solução**: Aumentar timeout no n8n:
```
HTTP Request Node → Settings → Timeout: 60000 (60 segundos)
```

### **Problema**: Sincronização não está trazendo novos pedidos
**Solução**:
1. Verificar se as lojas estão ativas (`is_active=True`)
2. Verificar tokens/secrets das lojas no Django Admin
3. Testar endpoint manualmente:
```bash
curl -X POST https://seu-dominio.railway.app/metricas/ecomhub/orders/sync/ \
  -H "Authorization: Token SEU_TOKEN" \
  -H "Content-Type: application/json"
```

---

## 📝 Checklist de Configuração

- [ ] n8n instalado e rodando
- [ ] Workflow criado com Cron Trigger (0 * * * *)
- [ ] HTTP Request configurado com URL correta
- [ ] Autenticação configurada (Token ou API Key)
- [ ] Headers configurados (Content-Type, Authorization)
- [ ] Conditional Node para verificar sucesso
- [ ] (Opcional) Notificações configuradas
- [ ] Teste manual executado com sucesso
- [ ] Primeira execução agendada funcionando
- [ ] Monitoramento ativo (n8n Executions)

---

## 🚀 Próximos Passos

Após configurar:
1. Execute manualmente no n8n para testar
2. Aguarde a primeira execução agendada
3. Verifique os logs no Railway
4. Confira o dashboard no frontend
5. Configure alertas (Slack/Discord) se necessário

---

## 📚 Referências

- [Documentação n8n - Cron Trigger](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.cron/)
- [Documentação n8n - HTTP Request](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/)
- [Django REST Framework - Authentication](https://www.django-rest-framework.org/api-guide/authentication/)
- [Railway - Environment Variables](https://docs.railway.app/develop/variables)

---

**Dúvidas?** Entre em contato com o time de desenvolvimento.

**Versão**: 1.0
**Última atualização**: {{ DATA_ATUAL }}
