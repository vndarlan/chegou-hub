# Arquitetura: Detector de IP - Chegou Hub

## Contexto Estratégico

### Por que detectar pedidos por IP
O Detector de IP foi desenvolvido para identificar padrões suspeitos de compra que podem indicar fraudes, comportamentos anômalos ou concentração geográfica de clientes. A funcionalidade analisa pedidos agrupados pelo mesmo endereço IP (`browser_ip` do Shopify) para detectar:

- **Fraudes por múltiplas compras**: Detecção de tentativas de burlar promoções ou políticas de desconto
- **Análise comportamental**: Identificação de padrões de compra por região ou localização
- **Compliance e auditoria**: Rastreabilidade para investigações e conformidade legal
- **Inteligência de marketing**: Concentração de clientes por área geográfica

### Casos de uso principais
- Detecção proativa de fraudes em e-commerce
- Auditoria de campanhas promocionais com limite por cliente
- Análise de penetração geográfica de mercado
- Investigação de pedidos suspeitos para compliance
- Otimização de estratégias de marketing regional

### Benefícios para o negócio
- **Redução de chargebacks**: Detecção precoce de fraudes
- **Proteção de margens**: Prevenção de abuso de promoções
- **Insights geográficos**: Dados para estratégias regionais
- **Compliance legal**: Rastreabilidade para auditoria
- **Eficiência operacional**: Automatização da detecção de padrões

## Stack Técnica

### Backend (Django 5.2)
- **Django REST Framework**: APIs robustas para consulta de dados
- **PostgreSQL**: Armazenamento principal com indexes otimizados
- **Redis**: Cache para performance e rate limiting
- **Shopify API**: Integração nativa com plataforma e-commerce

### Frontend (React 19.1)
- **React Hooks**: Estado reativo para interface responsiva
- **shadcn/ui**: Componentes modernos e acessíveis
- **Tailwind CSS**: Estilização utilitária e responsiva
- **Axios**: Cliente HTTP com interceptadores de segurança

### Segurança & Monitoramento
- **Rate Limiting**: Controle de requisições por usuário
- **Audit Logging**: Rastreamento completo de operações
- **IP Masking**: Proteção de dados sensíveis
- **CSRF Protection**: Tokens de segurança para requisições

## Fluxo de Dados

### 1. Coleta de Dados
```
Shopify API → Django Models → PostgreSQL
```
- Importação automática de pedidos via Shopify API
- Armazenamento do `browser_ip` para análise posterior
- Indexação otimizada para consultas por IP

### 2. Processamento de Análise
```
Request → Rate Limiting → IP Security → Shopify Detector → Response
```
- Validação de parâmetros (período máximo 90 dias)
- Agrupamento por `browser_ip` com mínimo configurável de pedidos
- Cálculo de métricas: total de vendas, clientes únicos, intervalo temporal

### 3. Segurança de Dados
```
Raw IP → Hash/Mask → Audit Log → Masked Response
```
- Mascaramento de IPs (`xxx.xxx.xxx.xxx`)
- Hash SHA256 para rastreabilidade sem exposição
- Log completo de auditoria para compliance

## Decisões Arquiteturais

### Agrupamento por browser_ip
**Decisão**: Utilizar campo `browser_ip` do Shopify como chave de agrupamento
**Motivação**: Maior precisão que IP de servidor, representa origem real do cliente
**Trade-off**: Dependência do Shopify registrar corretamente o campo

### Período de 30 dias (padrão)
**Decisão**: Limite padrão de 30 dias, máximo de 90 dias
**Motivação**: Balanceamento entre relevância temporal e performance de consulta
**Trade-off**: Pode não detectar fraudes de longo prazo

### Mascaramento de IPs
**Decisão**: Exibir apenas primeiros dois octetos (`XXX.XXX.xxx.xxx`)
**Motivação**: Proteção de dados pessoais e compliance LGPD
**Trade-off**: Redução da granularidade para análise manual

### Estrutura de segurança multicamada
**Decisão**: Rate limiting + audit logs + middleware de segurança
**Motivação**: Proteção contra abuse e rastreabilidade completa
**Trade-off**: Overhead de performance por requisição

## Endpoints API

### POST `/processamento/buscar-ips-duplicados/`
**Propósito**: Busca pedidos agrupados por IP

**Parâmetros**:
```json
{
  "loja_id": 123,
  "days": 30,
  "min_orders": 2
}
```

**Response de Sucesso**:
```json
{
  "success": true,
  "data": {
    "ip_groups": [
      {
        "ip": "192.168.xxx.xxx",
        "order_count": 5,
        "unique_customers": 2,
        "total_sales": "1250.00",
        "currency": "BRL",
        "date_range": {
          "first": "2024-01-01",
          "last": "2024-01-15"
        }
      }
    ],
    "total_ips_found": 12,
    "total_orders_analyzed": 450
  },
  "security_notice": "IPs foram mascarados por segurança"
}
```

**Rate Limiting**: 50 requisições/hora por usuário

### POST `/processamento/detalhar-ip/`
**Propósito**: Detalhes completos dos pedidos de um IP específico

**Parâmetros**:
```json
{
  "loja_id": 123,
  "ip": "192.168.xxx.xxx",
  "days": 30
}
```

**Response de Sucesso**:
```json
{
  "success": true,
  "data": {
    "order_count": 5,
    "unique_customers": 2,
    "total_sales": "1250.00",
    "currency": "BRL",
    "orders": [
      {
        "id": "order_123",
        "order_number": "1001",
        "total_price": "250.00",
        "customer": {
          "first_name": "João",
          "last_name": "Silva",
          "email": "joao@example.com"
        }
      }
    ]
  }
}
```

**Rate Limiting**: 20 requisições/hora por usuário

### Códigos de Erro
- **400**: Parâmetros inválidos ou faltantes
- **404**: IP não encontrado nos dados
- **429**: Rate limit excedido
- **500**: Erro interno do servidor

## Segurança Implementada

### Rate Limiting
- **IP Search**: 50 requisições/hora por usuário
- **IP Detail**: 20 requisições/hora por usuário
- **Headers**: `X-RateLimit-Remaining` informativo

### Logs de Auditoria
**Tipos de evento rastreados**:
- `ip_search`: Busca por IPs duplicados
- `ip_detail_access`: Acesso a detalhes de IP específico
- `massive_ip_search`: Busca com muitos resultados (>20 IPs)
- `suspicious_activity`: Padrões anômalos detectados
- `rate_limit_exceeded`: Tentativas de abuse

**Dados registrados**:
```json
{
  "user_ip": "client_ip_address",
  "target_ip_hash": "sha256_hash",
  "target_ip_masked": "xxx.xxx.xxx.xxx",
  "details": {
    "orders_count": 5,
    "days": 30,
    "unique_ips_accessed": 12
  },
  "risk_level": "medium"
}
```

### Mascaramento de dados
- **IPs**: Mostrar apenas `XXX.XXX.xxx.xxx`
- **Hash interno**: SHA256 para rastreabilidade
- **Emails**: Dados reais apenas em detalhamento autorizado

### Middleware de Segurança
- **SQL Injection**: Detecção de padrões maliciosos
- **XSS Protection**: Validação de entrada
- **CSRF**: Tokens obrigatórios para POST
- **Headers Security**: Cache-Control, X-Frame-Options

## Monitoramento & Alertas

### Métricas importantes
- **Volume de consultas**: Requisições por hora/dia
- **Rate limit hits**: Usuários excedendo limites
- **IPs únicos consultados**: Amplitude de análise
- **Tempo de resposta**: Performance das consultas
- **Erros de API**: Falhas na integração Shopify

### Logs críticos
- **Massive searches**: >20 IPs em uma consulta
- **Suspicious activity**: Múltiplas consultas do mesmo usuário
- **Failed authentications**: Tentativas não autorizadas
- **API errors**: Falhas na comunicação com Shopify

### Alertas configurados
- **Rate limit abuse**: >80% do limite em período curto
- **Múltiplos IPs consultados**: >50 IPs/dia por usuário
- **Errors spike**: >10 erros/hora por usuário
- **Shopify API down**: Falhas consecutivas na API

## Troubleshooting Guide

### Erro "IP não encontrado"
**Causa**: IP consultado não existe nos dados do período
**Solução**: Verificar se IP foi mascarado corretamente ou expandir período

### Rate limit excedido
**Causa**: Usuário ultrapassou limite de requisições
**Solução**: Aguardar reset do limite ou revisar necessidade de consultas

### Shopify API timeout
**Causa**: Lentidão ou indisponibilidade da API Shopify
**Solução**: Retry automático após intervalo ou verificar status Shopify

### Performance lenta
**Causa**: Consulta de período muito amplo ou muitos pedidos
**Solução**: Reduzir período de análise ou implementar paginação

### Dados inconsistentes
**Causa**: Diferença entre cache e dados atuais
**Solução**: Invalidar cache Redis ou reprocessar dados