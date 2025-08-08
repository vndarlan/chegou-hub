# FIX: Problema com API OpenAI - Timestamps e API Key

## Problema Identificado

O erro relatado inicialmente era:
```
400 Client Error: Bad Request for url: https://api.openai.com/v1/organization/usage/completions?start_time=1754017200&bucket_width=1d&limit=1000&end_time=1754622000
Status da API Key: Não configurada / Inválida / Não foi possível acessar informações da organização (status 404)
```

## Análise da Investigação

### ✅ Timestamps ESTÃO corretos
- `1754017200` = `2025-08-01 00:00:00` (correto)
- `1754622000` = `2025-08-08 00:00:00` (correto)
- **NÃO** há problema na conversão de timestamps
- O código está gerando os valores Unix timestamp corretos

### ❌ Problema REAL: API Key inválida
- A `OPENAI_ADMIN_API_KEY` está configurada como `your_openai_api_key_here` (placeholder)
- Isso causa erro 401/404 na API OpenAI
- O erro 400 Bad Request pode ocorrer quando a API OpenAI recusa requests de keys inválidas

## Solução Implementada

### 1. Melhorias no `services.py`
- ✅ Validação rigorosa da API key no `__init__`
- ✅ Detecção de placeholders
- ✅ Verificação do formato da API key (deve começar com `sk-`)
- ✅ Logs detalhados com timestamps para debug
- ✅ Mensagens de erro específicas por tipo de problema

### 2. Melhorias no `views.py`
- ✅ Instruções passo-a-passo para configurar API key
- ✅ Links diretos para criação de Admin Keys
- ✅ Tratamento específico por tipo de erro

### 3. Comando de diagnóstico
- ✅ Criado `test_openai_config` para diagnosticar problemas
- ✅ Teste completo da configuração
- ✅ Validação de timestamps se necessário

## Como Corrigir

### Passo 1: Configure a API Key correta
1. Acesse [OpenAI Admin Keys](https://platform.openai.com/settings/organization/admin-keys)
2. Crie uma nova **Admin API Key** (não uma API key comum)
3. Copie a key gerada

### Passo 2: Configure no ambiente
No arquivo `.env`:
```bash
OPENAI_ADMIN_API_KEY=sk-proj-sua-admin-key-real-aqui
```

### Passo 3: Reinicie o servidor
```bash
cd backend && python manage.py runserver
```

### Passo 4: Teste a configuração
```bash
cd backend && python manage.py test_openai_config
```

Para teste completo com timestamps:
```bash
cd backend && python manage.py test_openai_config --fix-timestamps
```

## Validação da Correção

Após configurar a API key correta:

1. **Status 200**: ✅ Requests funcionarão normalmente
2. **Dados retornados**: ✅ API retornará dados de usage/costs
3. **Timestamps corretos**: ✅ Continuarão sendo gerados corretamente
4. **Frontend funcionando**: ✅ OpenAI Analytics funcionará sem erros

## Diferença entre API Key comum vs Admin Key

| Tipo | Acesso | Uso |
|------|--------|-----|
| **API Key comum** | Apenas uso da API (chat, embeddings) | Para aplicações normais |
| **Admin Key** | Uso + dados de organização + usage/costs | Para dashboards administrativos |

**IMPORTANTE**: Para acessar endpoints de `/organization/usage` e `/organization/costs`, você DEVE usar uma Admin Key.

## Logs de Debug Adicionados

O sistema agora registra logs detalhados:
- Timestamp Unix gerado
- Data correspondente ao timestamp  
- URL completa chamada
- Resposta da API (primeiros 500 caracteres)

Exemplo de log:
```
ERROR: Erro na API OpenAI Usage: Status 400
ERROR: URL chamada: https://api.openai.com/v1/organization/usage/completions?{'start_time': 1754017200, 'end_time': 1754622000, 'bucket_width': '1d', 'limit': 1000}
ERROR: Timestamps enviados: start=1754017200 (2025-08-01 00:00:00), end=1754622000
```

## Monitoramento Contínuo

O sistema agora inclui:
- Validação automática de placeholders
- Verificação do formato da API key
- Mensagens de erro específicas
- Instruções de correção integradas
- Comando de diagnóstico dedicado

## Prevenção de Problemas Futuros

1. ✅ API keys placeholder são detectadas automaticamente
2. ✅ Formato da API key é validado
3. ✅ Status da organização é verificado
4. ✅ Permissões de admin são confirmadas
5. ✅ Logs detalhados para debugging

---

**Resumo**: O problema não era de timestamps (que estão corretos), mas sim de API key inválida. A solução é configurar uma Admin API Key real da OpenAI.