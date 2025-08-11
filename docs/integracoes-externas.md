# 🔗 Integrações Externas - Chegou Hub

## Visão Geral

O Chegou Hub funciona como um hub de integração que conecta múltiplas plataformas e serviços externos, centralizando dados e automações. Cada integração foi escolhida estrategicamente para fornecer valor específico ao negócio.

## 🤖 Inteligência Artificial

### OpenAI GPT Platform

#### Propósito Estratégico
Fornecedor principal de modelos de linguagem para automações, chatbots e análises inteligentes. Usado extensivamente em projetos de IA internos.

#### Integração Técnica
- **SDK**: OpenAI Python Library v1.x
- **Modelos utilizados**: GPT-4, GPT-4-turbo, GPT-3.5-turbo
- **Rate limiting**: Controlado por projeto e usuário
- **Cost tracking**: Monitoramento automático via Usage API

#### Configuração
```python
# Variáveis obrigatórias
OPENAI_API_KEY = "sk-proj-..."          # API key padrão
OPENAI_ADMIN_API_KEY = "sk-..."         # Key com permissões org

# Uso típico
client = OpenAI(api_key=settings.OPENAI_API_KEY)
response = client.chat.completions.create(
    model="gpt-4",
    messages=[{"role": "user", "content": "..."}]
)
```

#### Features que Usam
- **Dashboard IA**: Análises e insights automáticos
- **Chatbot interno**: Conversas inteligentes com documentação
- **Automações**: Processamento de linguagem natural
- **OpenAI Analytics**: Monitoramento de custos e uso

### Anthropic Claude

#### Propósito Estratégico
Modelo de IA alternativo focado em segurança e helpfulness, usado principalmente para o chatbot interno devido à sua capacidade superior de seguir instruções.

#### Integração Técnica
- **SDK**: Anthropic Python SDK
- **Modelo**: claude-3-5-sonnet-20241022
- **Context window**: 200K tokens (documentação extensa)
- **Safety**: Filtros nativos de conteúdo sensível

#### Configuração
```python
ANTHROPIC_API_KEY = "sk-ant-api03-..."

# Client setup
client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
response = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    max_tokens=2000,
    messages=[{"role": "user", "content": "..."}]
)
```

#### Vantagens sobre OpenAI
- **Maior context window**: Processa documentação completa
- **Melhor instruction following**: Segue guidelines rigorosamente  
- **Safety focused**: Menos propenso a respostas inadequadas
- **Document understanding**: Excelente para Q&A sobre docs

## 📊 Plataformas de Métricas

### PRIMECOD Integration

#### Propósito do Negócio
Plataforma de análise de performance de tráfego pago e orgânico. Fornece métricas essenciais para otimização de campanhas.

#### Integração Técnica
- **Método**: REST API direta
- **Autenticação**: API Token via headers
- **Frequência**: Coleta diária automática via background jobs
- **Dados coletados**: CTR, conversões, ROI por campanha

#### Configuração
```python
PRIMECOD_API_TOKEN = "token-primecod-analytics"

# API calls
headers = {"Authorization": f"Bearer {settings.PRIMECOD_API_TOKEN}"}
response = requests.get("https://api.primecod.com/v1/metrics", headers=headers)
```

#### Métricas Principais
- **Traffic metrics**: Impressões, cliques, CTR
- **Conversion data**: Leads, vendas, ROI
- **Campaign performance**: Performance por campanha
- **Attribution**: Tracking de conversões multi-touch

### ECOMHUB Integration

#### Propósito do Negócio
Plataforma de e-commerce com métricas de vendas, produtos e performance de lojas. Crítica para análise de performance comercial.

#### Integração Técnica
**Método**: REST API direta
**Autenticação**: API Token via headers
**Frequência**: Coleta automática via background jobs

#### Configuração da API
```python
ECOMHUB_API_TOKEN = "token-ecomhub-api"

# API calls
headers = {"Authorization": f"Bearer {settings.ECOMHUB_API_TOKEN}"}
response = requests.get("https://api.ecomhub.com/v1/metrics", headers=headers)
```

#### Dados Coletados
- **Sales data**: Vendas por período, produto, região
- **Product metrics**: Performance de produtos individuais
- **Customer insights**: Comportamento e padrões de compra
- **Financial reports**: Receita, margem, custos

### DROPI MX Integration

#### Propósito do Negócio
Plataforma de dropshipping mexicana. Métricas de produtos, fornecedores e performance de vendas para o mercado mexicano.

#### Integração Técnica
**Método**: REST API direta
**Autenticação**: API Token com sistema de refresh
**Rate limiting**: Controlado automaticamente

#### Configuração
```python
DROPI_API_TOKEN = "dropi-mx-api-key"

# API calls diretas
headers = {"Authorization": f"Bearer {settings.DROPI_API_TOKEN}"}
response = requests.get("https://api.dropi.mx/v1/products", headers=headers)
```

#### Dados Críticos
- **Product performance**: Top products no mercado mexicano
- **Supplier metrics**: Performance de fornecedores
- **Market trends**: Tendências de categoria e preços
- **Competition analysis**: Análise competitiva automatizada

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


## 📧 Email & Notifications

### SMTP Integration
```python
# Email settings para notificações
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD')
```

### Tipos de Notificações
- **Error alerts**: Falhas críticas em integrações
- **Data anomalies**: Métricas fora do padrão normal
- **System health**: Status de integrações e APIs
- **Reports**: Relatórios automáticos semanais/mensais

## 🔒 Segurança das Integrações

### API Key Management
```python
# Hierarquia de secrets
production_secrets = {
    "OPENAI_API_KEY": "Produção + staging",
    "ANTHROPIC_API_KEY": "Produção apenas", 
    "PRIMECOD_API_TOKEN": "Rotacionado mensalmente",
    "DROPI_API_TOKEN": "Sistema de refresh automático"
}
```

### Rate Limiting Strategy
- **OpenAI**: 3500 requests/min (enterprise)
- **Anthropic**: 1000 requests/min (pro plan)
- **PRIMECOD**: 1000 requests/hour
- **ECOMHUB**: 10 requests/min (via scraping)
- **DROPI**: 500 requests/hour via token service

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
    "openai": check_openai_api(),
    "anthropic": check_anthropic_api(), 
    "primecod": check_primecod_api(),
    "google_calendar": check_google_calendar(),
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
    "primecod_metrics": 300,      # 5 minutos
    "ecomhub_data": 900,          # 15 minutos  
    "dropi_products": 1800,       # 30 minutos
    "google_calendar": 120,       # 2 minutos
    "openai_responses": 0         # Sem cache (sempre fresh)
}
```

### Background Jobs Optimization
- **Job prioritization**: Critical vs normal vs low priority
- **Batch processing**: Multiple records per job
- **Failure recovery**: Automatic retry with exponential backoff
- **Queue monitoring**: Dead letter queue para jobs falhados

### Cost Optimization
- **OpenAI**: Usar modelos menores quando possível
- **API calls**: Batch requests quando APIs suportam
- **Caching**: Evitar calls desnecessários
- **Rate limiting**: Respeitar limites para evitar custos extras

---

**As integrações externas do Chegou Hub foram arquitetadas para máxima confiabilidade, performance e segurança, fornecendo dados críticos para o negócio de forma automatizada e escalável.**