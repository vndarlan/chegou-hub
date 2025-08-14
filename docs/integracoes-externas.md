# 🔗 Integrações Externas - Chegou Hub

## Visão Geral

O Chegou Hub funciona como um hub de integração que conecta múltiplas plataformas e serviços externos, centralizando dados e automações. Cada integração foi escolhida estrategicamente para fornecer valor específico ao negócio.

## 🤖 Inteligência Artificial

### OpenAI GPT Platform

#### Propósito Estratégico
Usado EXCLUSIVAMENTE para monitoramento de custos e gastos de API. Verificar quanto está sendo gasto nas APIs da OpenAI.

#### Integração Técnica
- **Localização**: `frontend/src/features/ia/OpenAIAnalytics.js`
- **Propósito único**: Monitoramento de custos de API
- **Usage API**: Coleta dados de gasto via OpenAI Usage API
- **Dashboard**: Interface para análise de gastos por período

#### Configuração
```python
# Apenas para monitoramento de custos
OPENAI_ADMIN_API_KEY = "sk-..."         # Key com permissões org para Usage API
```

#### Funcionalidade Atual
- **OpenAI Analytics**: Monitoramento de custos e uso das API keys
- **Validação de API Keys**: Verificação de permissões
- **Exportação de dados**: CSV e JSON dos gastos
- **Sincronização de dados**: Coleta automática de métricas de uso

### Anthropic Claude

#### Propósito Estratégico
API do Claude Sonnet usada como assistente de IA interno da empresa. Funciona como chatbot corporativo para suporte aos colaboradores.

#### Integração Técnica
- **SDK**: Anthropic Python SDK
- **Modelo**: claude-sonnet (versão atual)
- **Uso**: Assistente interno da empresa
- **Context window**: Suporte a documentação extensa

#### Configuração
```python
ANTHROPIC_API_KEY = "sk-ant-api03-..."

# Uso como assistente interno
client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
response = client.messages.create(
    model="claude-sonnet",
    max_tokens=2000,
    messages=[{"role": "user", "content": "..."}]
)
```

#### Funcionalidade
- **Chatbot Assistente**: Suporte interno aos colaboradores
- **Documentação**: Consulta guias e procedimentos
- **Referência**: Ver `docs/user-guides/como-usar-chatbot-assistente.md`

## 📊 Plataformas de Métricas

### PRIMECOD Integration

#### Propósito do Negócio
API para coleta de métricas de pedidos. Integração focada em dados de performance comercial.

#### Integração Técnica
- **Método**: REST API direta
- **Autenticação**: API Token via headers
- **Dados coletados**: Métricas de pedidos e vendas

#### Configuração
```python
PRIMECOD_API_TOKEN = "token-primecod-analytics"

# API calls para métricas de pedidos
headers = {"Authorization": f"Bearer {settings.PRIMECOD_API_TOKEN}"}
response = requests.get("https://api.primecod.com/v1/orders", headers=headers)
```

#### Métricas Coletadas
- **Pedidos**: Volume e status de pedidos
- **Performance**: Métricas básicas de vendas

### ECOMHUB Integration

#### Propósito do Negócio
API para coleta de métricas de pedidos. Foco em dados básicos de performance comercial.

#### Integração Técnica
- **Método**: REST API direta
- **Autenticação**: API Token via headers
- **Dados coletados**: Métricas de pedidos

#### Configuração da API
```python
ECOMHUB_API_TOKEN = "token-ecomhub-api"

# API calls para métricas de pedidos
headers = {"Authorization": f"Bearer {settings.ECOMHUB_API_TOKEN}"}
response = requests.get("https://api.ecomhub.com/v1/orders", headers=headers)
```

#### Dados Coletados
- **Métricas de pedidos**: Volume e performance básica de vendas

### DROPI Integration

#### Propósito do Negócio
API para coleta de métricas de pedidos do mercado mexicano. Dados básicos de performance comercial.

#### Integração Técnica
- **Método**: REST API direta
- **Autenticação**: API Token
- **Dados coletados**: Métricas de pedidos

#### Configuração
```python
DROPI_API_TOKEN = "dropi-mx-api-key"

# API calls para métricas de pedidos
headers = {"Authorization": f"Bearer {settings.DROPI_API_TOKEN}"}
response = requests.get("https://api.dropi.mx/v1/orders", headers=headers)
```

#### Dados Coletados
- **Métricas de pedidos**: Performance básica de vendas no mercado mexicano

## 🛒 Plataformas de E-commerce

### Shopify Integration

#### Propósito Estratégico
Integração com lojas Shopify para processamento de pedidos e detecção de padrões. Usado em duas funcionalidades principais do sistema.

#### Integração Técnica
- **Localização**: 
  - `frontend/src/features/processamento/ProcessamentoPage.js`
  - `frontend/src/features/processamento/DetectorIPPage.js`
- **Método**: REST API do Shopify
- **Autenticação**: Access Token por loja
- **Permissões**: read_orders, write_orders, read_customers

#### Funcionalidades Implementadas

##### Processamento de Pedidos Duplicados
- **Detecção automática**: Identifica pedidos duplicados por cliente/produto
- **Critérios de detecção**: Mesmo telefone + mesmo SKU/produto + tags de processamento
- **Cancelamento**: Cancela pedidos duplicados não processados
- **Análise temporal**: Hierarquia por data e status de processamento

##### Detector de IP
- **Análise por endereço IP**: Identifica múltiplos pedidos do mesmo IP
- **Detecção de padrões**: Suspeita de fraude ou uso de proxies/servidores
- **Métricas detalhadas**: Total de pedidos, clientes únicos, valor total por IP
- **Configuração flexível**: Período ajustável (até 365 dias) e mínimo de pedidos

#### Configuração
```python
# Configuração por loja
SHOPIFY_STORES = {
    "loja1": {
        "shop_url": "minha-loja.myshopify.com",
        "access_token": "shpat_..."
    }
}
```

### SMMRAJA API

#### Propósito Estratégico
API usada para compra de engajamento em anúncios do Facebook. Permite automatizar campanhas de marketing social.

#### Integração Técnica
- **Localização**: `frontend/src/features/engajamento/EngajamentoPage.js`
- **Método**: REST API
- **Funcionalidades**: Compra de likes, reações e engajamento para posts do Facebook

#### Tipos de Engajamento
- **Like**: Curtidas em posts
- **Amei**: Reações "amei"
- **Uau**: Reações "uau"
- **Configuração flexível**: Quantidade por tipo de engajamento

#### Configuração
```python
SMMRAJA_API_KEY = "smmraja-api-token"

# Envio de pedidos de engajamento
response = requests.post(
    "https://api.smmraja.com/v1/orders",
    headers={"Authorization": f"Bearer {settings.SMMRAJA_API_KEY}"},
    data={"service_id": service_id, "link": fb_url, "quantity": quantity}
)
```

### Novelties API

#### Propósito Estratégico
API para processamento e análise de dados de novelties (novidades/tendências). Sistema de monitoramento automatizado.

#### Integração Técnica
- **Localização**: `frontend/src/features/novelties/NoveltiesPage.js`
- **Dashboard**: Interface completa com métricas e tendências
- **Países suportados**: Chile e México
- **Monitoramento**: Execuções automáticas com tracking de performance

#### Funcionalidades
- **Dashboard de métricas**: Total de execuções, taxa de sucesso, tempo economizado
- **Análise por país**: Filtros por Chile, México ou todos os países
- **Histórico detalhado**: Lista de execuções com status e performance
- **Gráficos de tendência**: Visualização temporal dos dados

#### Configuração
```python
NOVELTIES_API_KEY = "novelties-api-token"

# Coleta de dados automatizada
response = requests.get(
    "https://api.novelties.com/v1/executions",
    headers={"Authorization": f"Bearer {settings.NOVELTIES_API_KEY}"},
    params={"country": "chile", "days": 7}
)
```

## 📅 Google Calendar Integration

### Propósito Estratégico
Sincronização bidirecional com Google Calendar para gestão unificada de agenda corporativa e pessoal.

### OAuth 2.0 Implementation
```python
# Google Calendar API setup
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

# Credentials flow
flow = InstalledAppFlow.from_client_secrets_file(
    'credentials.json', 
    ['https://www.googleapis.com/auth/calendar']
)
creds = flow.run_local_server(port=0)

# Calendar service
service = build('calendar', 'v3', credentials=creds)
```

### Funcionalidades Implementadas
- **Event CRUD**: Criar, ler, atualizar, deletar eventos
- **Multiple calendars**: Suporte a múltiplos calendários
- **Real-time sync**: Webhooks para sincronização instantânea
- **Conflict detection**: Identificação de conflitos de agenda

### Configuração Necessária
```python
# Google API credentials (OAuth 2.0)
GOOGLE_CLIENT_ID = "your-client-id.googleusercontent.com"
GOOGLE_CLIENT_SECRET = "your-client-secret"
GOOGLE_REDIRECT_URI = "http://localhost:8000/auth/callback"

# Calendar settings
CALENDAR_TIME_ZONE = "America/Sao_Paulo"
DEFAULT_EVENT_DURATION = 60  # minutes
```

## 🔒 Segurança das Integrações

### API Key Management
```python
# Hierarquia de secrets
production_secrets = {
    "OPENAI_ADMIN_API_KEY": "Monitoramento de custos",
    "ANTHROPIC_API_KEY": "Assistente interno", 
    "SHOPIFY_ACCESS_TOKENS": "Por loja configurada",
    "SMMRAJA_API_KEY": "Engajamento Facebook",
    "NOVELTIES_API_KEY": "Sistema de monitoramento",
    "PRIMECOD_API_TOKEN": "Métricas de pedidos",
    "ECOMHUB_API_TOKEN": "Métricas de pedidos",
    "DROPI_API_TOKEN": "Métricas de pedidos"
}
```

### Rate Limiting Strategy
- **OpenAI**: Apenas para Usage API (monitoramento de custos)
- **Anthropic**: Para assistente interno (uso moderado)
- **Shopify**: Por loja configurada (padrão Shopify)
- **SMMRAJA**: Para compra de engajamento
- **Novelties**: Para coleta de dados automatizada
- **PRIMECOD/ECOMHUB/DROPI**: APIs de métricas de pedidos

### Error Handling & Resilience
```python
# Retry strategy padrão
@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=4, max=10),
    retry=retry_if_exception_type((ConnectionError, Timeout))
)
def api_call_with_retry(url, headers):
    return requests.get(url, headers=headers, timeout=30)
```

## 📈 Monitoramento de Integrações

### Health Checks Automáticos
```python
# /health/ endpoint verifica todas as integrações
health_status = {
    "openai_analytics": check_openai_usage_api(),
    "anthropic_assistant": check_anthropic_api(), 
    "shopify_stores": check_shopify_integrations(),
    "smmraja": check_smmraja_api(),
    "novelties": check_novelties_api(),
    "primecod": check_primecod_api(),
    "ecomhub": check_ecomhub_api(),
    "dropi": check_dropi_api(),
}
```

### Métricas de Performance
- **Response time**: P50, P95, P99 por integração
- **Success rate**: % de sucesso nas últimas 24h
- **Error categorization**: Timeouts vs auth vs rate limiting
- **Cost tracking**: Especialmente para APIs de IA pagas

### Alertas Configurados
- **API down**: Falha > 5 tentativas consecutivas
- **High latency**: Response time > 10s
- **Rate limit hit**: Approaching ou hitting limits
- **Cost spike**: Gasto anormal em APIs pagas

## 🚀 Otimizações e Performance

### Caching Strategy
```python
# Cache por integração
cache_settings = {
    "openai_analytics": 0,         # Sem cache (dados financeiros)
    "shopify_orders": 300,         # 5 minutos
    "smmraja_balance": 600,        # 10 minutos
    "novelties_metrics": 900,      # 15 minutos
    "primecod_orders": 300,        # 5 minutos
    "ecomhub_orders": 300,         # 5 minutos  
    "dropi_orders": 300,           # 5 minutos
}
```

### Background Jobs Optimization
- **Job prioritization**: Critical vs normal vs low priority
- **Batch processing**: Multiple records per job
- **Failure recovery**: Automatic retry with exponential backoff
- **Queue monitoring**: Dead letter queue para jobs falhados

### Cost Optimization
- **OpenAI**: Monitoramento rigoroso de custos via Usage API
- **Anthropic**: Uso controlado para assistente interno
- **Shopify**: Otimização de consultas por loja
- **SMMRAJA**: Controle de gastos em engajamento
- **Caching**: Evitar calls desnecessários para APIs de métricas
- **Rate limiting**: Respeitar limites para evitar custos extras

---

---

## 📈 Resumo das Integrações

### Por Categoria

**🤖 Inteligência Artificial**
- **OpenAI**: Monitoramento de custos de API exclusivamente
- **Anthropic Claude**: Assistente interno da empresa

**🛒 E-commerce e Processamento**
- **Shopify**: Processamento de pedidos e detecção de duplicatas/IPs
- **SMMRAJA**: Compra de engajamento para anúncios do Facebook
- **Novelties**: Sistema de monitoramento automatizado

**📉 Métricas de Pedidos**
- **PRIMECOD**: Coleta de métricas de pedidos
- **ECOMHUB**: Coleta de métricas de pedidos
- **DROPI**: Coleta de métricas de pedidos (mercado mexicano)

### Status Atual
Todas as integrações estão ativas e operacionais, com propósitos bem definidos e implementações específicas no frontend. O sistema foi arquitetado para máxima confiabilidade e performance, fornecendo dados críticos de forma automatizada.