# 📱 WhatsApp Business API - Documentação da Integração

## ✅ CORREÇÃO IMPLEMENTADA: Busca de Dados Reais da API

### 🎯 Problema Resolvido
**ANTES**: O sistema criava números WhatsApp com dados padrão/temporários:
- `display_phone_number` = `phone_number_id` (não formatado)  
- `verified_name` = vazio
- `quality_rating` = padrão
- `messaging_limit_tier` = padrão
- `status` = padrão

**AGORA**: O sistema busca dados reais da WhatsApp Business API:
- ✅ `display_phone_number` = número formatado real (ex: "+55 11 99999-9999")
- ✅ `verified_name` = nome verificado real da conta
- ✅ `quality_rating` = qualidade atual (GREEN/YELLOW/RED)
- ✅ `messaging_limit_tier` = limite real de mensagens (50/250/1000/UNLIMITED)
- ✅ `status` = status real (CONNECTED/DISCONNECTED/FLAGGED/RESTRICTED)
- ✅ `whatsapp_business_account_id` = WABA ID real

---

## 🔧 Arquivos Modificados

### 1. `backend/features/ia/serializers.py`
**Classe**: `WhatsAppPhoneNumberCreateSerializer.create()`

**Principais melhorias**:
```python
def create(self, validated_data):
    """Criar número WhatsApp - BUSCA DADOS REAIS DA API"""
    
    # 1️⃣ BUSCAR DADOS REAIS DA API PRIMEIRO
    sucesso, dados_api = api_service.obter_detalhes_numero(phone_number_id, access_token)
    
    # 2️⃣ EXTRAIR DADOS REAIS 
    display_phone_number = dados_api.get('display_phone_number')
    verified_name = dados_api.get('verified_name') 
    quality_rating = api_service._mapear_quality_rating(dados_api.get('quality_rating'))
    messaging_limit_tier = api_service._mapear_messaging_limit(dados_api.get('messaging_limit_tier'))
    status_numero = api_service._mapear_status(dados_api.get('status'))
    
    # 3️⃣ OBTER WABA ID REAL
    waba_id_real = dados_api.get('whatsapp_business_account_id')
    
    # 4️⃣ SALVAR COM DADOS REAIS
    validated_data['display_phone_number'] = display_phone_number  # ✅ REAL
    validated_data['verified_name'] = verified_name               # ✅ REAL  
    validated_data['quality_rating'] = quality_rating            # ✅ REAL
    # ... etc
```

### 2. `backend/features/ia/services.py`
**Método**: `obter_detalhes_numero()` - Melhorado

**Principais melhorias**:
```python
def obter_detalhes_numero(self, phone_number_id: str, access_token: str):
    # ✅ BUSCAR TODOS OS CAMPOS incluindo whatsapp_business_account_id
    params = {
        'fields': 'id,display_phone_number,verified_name,quality_rating,messaging_limit_tier,status,whatsapp_business_account_id'
    }
    
    # ✅ FALLBACK: Se WABA ID não veio, buscar via businesses
    if 'whatsapp_business_account_id' not in response:
        # Buscar WABA ID através de /me/businesses
```

### 3. `backend/features/ia/tasks.py` (NOVO)
**Background Tasks** para sincronização assíncrona:

```python
def sincronizar_numero_whatsapp_task(numero_id: int, access_token: str):
    """Task para sincronizar dados de um número WhatsApp em background"""
    # Atualiza dados após criação sem bloquear a resposta da API
```

---

## 🚀 Como Funciona Agora

### Fluxo de Criação de Número:

1. **🔍 Validação**: Usuário fornece `phone_number_id` + `access_token`

2. **📡 Busca API**: Sistema chama WhatsApp Business API:
   ```
   GET https://graph.facebook.com/v19.0/{phone_number_id}?fields=id,display_phone_number,verified_name,quality_rating,messaging_limit_tier,status,whatsapp_business_account_id
   ```

3. **✅ Dados Reais**: API retorna dados reais:
   ```json
   {
     "id": "123456789012345",
     "display_phone_number": "+55 11 99999-9999", 
     "verified_name": "Minha Empresa Ltda",
     "quality_rating": "GREEN",
     "messaging_limit_tier": "TIER_1000",
     "status": "CONNECTED",
     "whatsapp_business_account_id": "987654321098765"
   }
   ```

4. **🏢 WABA**: Sistema busca ou cria WhatsApp Business Account com ID real

5. **💾 Salvar**: Número é salvo com **dados reais** da API

6. **⚡ Background**: Task assíncrona pode atualizar dados posteriormente

---

## 🧪 Como Testar

### Teste Manual:
```bash
cd backend
python features/ia/test_whatsapp_integration.py
```

### Teste via API:
```http
POST /api/ia/whatsapp-phone-numbers/
Content-Type: application/json

{
  "phone_number_id": "SEU_PHONE_NUMBER_ID_REAL",
  "access_token": "SEU_ACCESS_TOKEN_REAL",
  "bm_nome_customizado": "Minha Empresa", 
  "pais_nome_customizado": "Brasil",
  "perfil": "Número principal de atendimento"
}
```

**Resposta Esperada**: Número criado com dados reais da API ✅

---

## 📊 Campos Mapeados da API

| Campo API | Campo Modelo | Descrição |
|-----------|-------------|-----------|
| `display_phone_number` | `display_phone_number` | Número formatado para exibição |
| `verified_name` | `verified_name` | Nome verificado da conta business |
| `quality_rating` | `quality_rating` | GREEN/YELLOW/RED/NA |
| `messaging_limit_tier` | `messaging_limit_tier` | TIER_50/TIER_250/TIER_1000/TIER_UNLIMITED |
| `status` | `status` | CONNECTED/DISCONNECTED/FLAGGED/RESTRICTED |
| `whatsapp_business_account_id` | `whatsapp_business_account.whatsapp_business_account_id` | ID real da WABA |

---

## 🔒 Segurança

- ✅ Access tokens são criptografados antes de serem salvos
- ✅ Validação rigorosa de entrada de dados  
- ✅ Rate limiting implementado (5 requests/minuto por WABA)
- ✅ Error handling robusto
- ✅ Logs detalhados para auditoria

---

## 🚨 Tratamento de Erros

### Erros Comuns:
- **Token inválido/expirado**: Retorna erro específico pedindo re-cadastro
- **Phone Number ID inválido**: Validação antes da criação
- **Rate limit excedido**: Sistema aguarda automaticamente
- **API offline**: Fallback graceful com dados temporários

### Logs:
```python
logger.info("🚀 CRIANDO NÚMERO: 123456789")
logger.info("📡 Buscando dados reais da WhatsApp API...")
logger.info("✅ Dados obtidos da API: {...}")
logger.info("✅ NÚMERO CRIADO COM SUCESSO:")
logger.info("   - Número formatado: +55 11 99999-9999") 
logger.info("   - Qualidade: Verde (Boa)")
```

---

## 🎉 Resultado Final

**ANTES**: Tabela mostrava apenas IDs numéricos e dados vazios  
**AGORA**: Tabela mostra números reais formatados, nomes verificados, status de qualidade atual, limites reais de mensagem

**Experiência do Usuário**: 
- ✅ Dados precisos e atuais
- ✅ Informações úteis para tomada de decisão  
- ✅ Monitoramento real da qualidade dos números
- ✅ Visibilidade completa do status dos números WhatsApp