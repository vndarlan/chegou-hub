# 📈 Monitoramento e Logs - Chegou Hub

## Filosofia de Observabilidade

O Chegou Hub implementa uma estratégia abrangente de monitoramento que combina logs estruturados, métricas de performance e alertas proativos. O objetivo é detectar e resolver problemas antes que afetem os usuários.

## 🔍 Sistema de Logs

### Arquitetura de Logging

#### Estrutura Hierárquica
```
logs/
├── django.log          # Logs gerais da aplicação
├── rq.log              # Workers e background jobs
├── feedback.log        # Sistema de feedback de usuários
├── ia.log              # Operações de IA e APIs externas
├── integracoes.log     # APIs externas e web scraping
└── security.log        # Eventos de segurança e auth
```

#### Níveis de Log Estratégicos
- **DEBUG**: Informações detalhadas para desenvolvimento
- **INFO**: Operações normais e marcos importantes
- **WARNING**: Situações anômalas que não são erros
- **ERROR**: Erros que afetam funcionalidade específica
- **CRITICAL**: Falhas que podem derrubar o sistema

### Configuração de Logs por Feature

#### Sistema de IA
```python
# Logs específicos para operações de IA
logger = logging.getLogger('features.ia')

# Exemplos de logs estruturados
logger.info(f"📊 Projeto criado: {projeto.nome} por {user.username}")
logger.warning(f"⚠️ API OpenAI lenta: {response_time}ms")
logger.error(f"❌ Falha na API Anthropic: {error_msg}")
```

#### Background Jobs (RQ)
```python
# Worker logs com contexto
logger.info(f"🔄 [JOB] Iniciando coleta ECOMHUB - JobID: {job.id}")
logger.info(f"✅ [JOB] ECOMHUB concluído - {records_processed} registros")
logger.error(f"❌ [JOB] Selenium timeout - Tentativa {retry_count}/3")
```

#### Integrações Externas
```python
# API calls com performance
logger.info(f"🔗 [API] OpenAI request - Tokens: {tokens} Custo: ${cost}")
logger.warning(f"⚡ [API] PRIMECOD slow response: {response_time}ms")
logger.error(f"🚨 [API] DROPI auth failed - Token expirado")
```

### Formatação e Estrutura

#### Log Format Padrão
```
[LEVEL] TIMESTAMP FEATURE [USER] MESSAGE - CONTEXT
[INFO] 2024-01-15 14:30:25 ia [joao_silva] 📊 Projeto criado: ChatBot V2 - ROI: 250%
[ERROR] 2024-01-15 14:31:10 integracoes [system] 🚨 OpenAI API timeout - Request: gpt-4 tokens: 1500
```

#### Campos Estruturados
- **Timestamp**: ISO format com timezone
- **Level**: DEBUG/INFO/WARNING/ERROR/CRITICAL
- **Feature**: Módulo/app responsável
- **User**: Usuário relacionado (quando aplicável)
- **Message**: Descrição clara com emojis para categorização
- **Context**: Dados adicionais (IDs, valores, etc.)

## 📊 Métricas de Performance

### Application Performance Monitoring (APM)

#### Métricas Core da Aplicação
```python
# Métricas coletadas automaticamente
performance_metrics = {
    "response_time": "P50, P95, P99 por endpoint",
    "throughput": "Requests por segundo",
    "error_rate": "% de responses 4xx/5xx",
    "memory_usage": "RAM utilizada por processo",
    "cpu_usage": "CPU % por container",
    "database_queries": "Tempo de query + N+1 detection"
}
```

#### Performance por Feature
- **Dashboard IA**: Tempo de cálculo de ROI, queries complexas
- **OpenAI Analytics**: Latência de APIs externas, volume de dados
- **Sistema Métricas**: Performance de web scraping, jobs assíncronos
- **Chatbot**: Response time do Claude, cache hit rate

### Database Performance

#### Query Monitoring
```sql
-- Queries lentas automaticamente logadas
SELECT query, mean_time, calls 
FROM pg_stat_statements 
WHERE mean_time > 1000 
ORDER BY mean_time DESC;
```

#### Connection Pooling
- **Max connections**: 100 (PostgreSQL limit)
- **Pool size**: 20 conexões ativas
- **Connection timeout**: 30 segundos
- **Idle timeout**: 600 segundos

### Background Jobs Performance

#### RQ Metrics
```python
# Métricas de workers coletadas via RQ
job_metrics = {
    "queue_size": redis_client.llen("default"),
    "active_workers": len(Worker.all()),
    "jobs_processed_hour": get_processed_jobs_count(timedelta(hours=1)),
    "failed_jobs": len(get_failed_job_registry()),
    "average_job_duration": calculate_avg_duration()
}
```

#### Job Categories Performance
- **Data Collection**: PRIMECOD/ECOMHUB/DROPI sync jobs
- **Report Generation**: Relatórios pesados de IA/métricas  
- **Email Processing**: Notificações e alerts
- **Cache Warming**: Pre-load de dados frequentes

## 🚨 Sistema de Alertas

### Alertas Automáticos por Categoria

#### Performance Alerts
- **High Response Time**: P95 > 5 segundos por 5 minutos
- **High Error Rate**: > 5% de erros em 10 minutos
- **Memory Leak**: Crescimento constante de RAM > 90%
- **Database Slow Queries**: Query > 10 segundos

#### Business Logic Alerts
- **IA API Costs**: Gasto OpenAI > $100/dia
- **Integration Failures**: API externa down > 15 minutos
- **Data Anomalies**: Métricas fora do padrão (ex: 0 vendas ECOMHUB)
- **Background Job Failures**: > 10 jobs falhados em 1 hora

#### Security Alerts
- **Multiple Login Failures**: > 5 tentativas por IP em 10 min
- **Unusual API Usage**: Pattern anômalo de uso de APIs
- **Admin Access**: Acesso não autorizado a dados financeiros
- **CSRF Attacks**: Múltiplas tentativas de CSRF em curto período

### Canal de Notificações

#### Email Alerts (Críticos)
```python
# Alertas críticos via email
critical_alerts = [
    "Sistema down > 5 minutos",
    "Database connection failed",
    "OpenAI API key inválida",
    "Selenium Grid completamente down"
]
```

#### Slack Integration (Futuro)
- Canal #chegou-hub-alerts para notificações em tempo real
- Alerts categorizados por emoji (🔥 crítico, ⚠️ warning, 📊 info)
- Bot commands para acknowledge/resolve alerts

## 📱 Dashboards de Monitoramento

### Railway Built-in Monitoring

#### Métricas Nativas
- **CPU Usage**: Histórico e alertas automáticos
- **RAM Usage**: Memory usage com spike detection
- **Network I/O**: Inbound/outbound traffic
- **Response Time**: P50/P95/P99 automáticos
- **Error Rate**: 4xx/5xx tracking
- **Uptime**: SLA de 99.9% monitorado

#### Custom Metrics via Railway
```python
# Métricas customizadas enviadas para Railway
import psutil
import railway_metrics

# CPU e Memory detalhados
railway_metrics.gauge("cpu_percent", psutil.cpu_percent())
railway_metrics.gauge("memory_percent", psutil.virtual_memory().percent)

# Business metrics
railway_metrics.counter("openai_api_calls", tags={"model": "gpt-4"})
railway_metrics.histogram("selenium_scrape_duration", duration)
```

### Internal Health Dashboard

#### /health/ Endpoint Avançado
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T14:30:00Z",
  "version": "1.2.0",
  "environment": "production",
  "services": {
    "database": {
      "status": "healthy",
      "connections": 15,
      "slow_queries": 0
    },
    "redis": {
      "status": "healthy", 
      "memory_usage": "45MB",
      "queue_size": 3
    },
    "external_apis": {
      "openai": {
        "status": "healthy",
        "last_call": "2024-01-15T14:29:30Z",
        "response_time": "850ms"
      },
      "anthropic": {
        "status": "degraded",
        "last_call": "2024-01-15T14:25:10Z", 
        "response_time": "3200ms"
      }
    }
  },
  "metrics": {
    "active_users_24h": 47,
    "api_calls_hour": 342,
    "background_jobs_pending": 3,
    "error_rate_24h": 0.02
  }
}
```

## 🔧 Log Analytics e Insights

### Automated Log Analysis

#### Error Pattern Detection
```python
# Análise automática de padrões de erro
def analyze_error_patterns():
    patterns = {
        "api_timeouts": count_log_pattern("timeout", hours=24),
        "auth_failures": count_log_pattern("auth.*failed", hours=24),
        "database_errors": count_log_pattern("database.*error", hours=24),
        "selenium_crashes": count_log_pattern("selenium.*crash", hours=24)
    }
    return patterns
```

#### Performance Insights
- **Slowest endpoints**: Top 10 endpoints por response time
- **Resource hungry jobs**: Background jobs que mais consomem CPU/RAM
- **API cost analysis**: Custo por feature/usuário/período
- **User behavior patterns**: Features mais utilizadas por horário

### Business Intelligence via Logs

#### Usage Analytics
```python
# Métricas de negócio extraídas dos logs
business_metrics = {
    "dashboard_views": count_feature_usage("ia_dashboard"),
    "chatbot_interactions": count_feature_usage("chatbot"),
    "reports_generated": count_log_pattern("report.*generated"),
    "integrations_health": analyze_integration_uptime()
}
```

#### ROI de Features
- **Feature adoption**: Usuários ativos por feature
- **Performance impact**: Features que mais afetam response time
- **Error contribution**: Features que mais geram erros
- **Resource consumption**: CPU/RAM por feature

## 🛠️ Ferramentas de Debug

### Development Debug Tools

#### Django Debug Toolbar (Dev)
```python
# Habilitado apenas em desenvolvimento
if DEBUG:
    INSTALLED_APPS += ['debug_toolbar']
    MIDDLEWARE += ['debug_toolbar.middleware.DebugToolbarMiddleware']
```

#### SQL Query Analysis
```python
# Log de queries longas em desenvolvimento
if DEBUG:
    LOGGING['loggers']['django.db.backends'] = {
        'level': 'DEBUG',
        'handlers': ['console'],
        'propagate': False,
    }
```

### Production Debug Strategies

#### Structured Logging for Debug
```python
# Logs com contexto para debugging em produção
logger.info(f"🔍 [DEBUG] User {user.id} action {action}", extra={
    "user_id": user.id,
    "action": action,
    "ip": request.META.get('REMOTE_ADDR'),
    "user_agent": request.META.get('HTTP_USER_AGENT'),
    "path": request.path,
    "method": request.method
})
```

#### Feature Flags para Debug
```python
# Feature flags para habilitar debug específico
DEBUG_FEATURES = {
    "verbose_api_logs": os.getenv("DEBUG_API_LOGS", "false").lower() == "true",
    "selenium_screenshots": os.getenv("DEBUG_SELENIUM", "false").lower() == "true",
    "job_profiling": os.getenv("DEBUG_JOBS", "false").lower() == "true"
}
```

## 📋 Compliance e Auditoria

### Audit Trail

#### User Actions Tracking
```python
# Todas as ações importantes são auditadas
def audit_log(user, action, resource, details=None):
    AuditLog.objects.create(
        user=user,
        action=action,  # CREATE, UPDATE, DELETE, VIEW
        resource=resource,  # projeto_ia, feedback, etc.
        ip_address=get_client_ip(request),
        user_agent=request.META.get('HTTP_USER_AGENT'),
        details=details or {}
    )
```

#### Compliance Requirements
- **Data access**: Quem acessou que dados quando
- **Modifications**: Histórico completo de mudanças
- **Admin actions**: Ações administrativas logadas
- **API usage**: Tracking de uso de APIs externas por usuário

### Data Retention Policies

#### Log Retention
```python
# Políticas de retenção por tipo
retention_policies = {
    "application_logs": "30 days",      # Logs gerais da aplicação
    "security_logs": "1 year",          # Logs de segurança e auth
    "audit_logs": "7 years",            # Compliance legal
    "performance_metrics": "90 days",   # Métricas de performance
    "debug_logs": "7 days"              # Logs de debug apenas
}
```

## 🔮 Observabilidade Avançada (Roadmap)

### Próximas Implementações

#### Distributed Tracing
- **OpenTelemetry**: Tracking de requests cross-services
- **Jaeger**: Visualização de traces distribuídos
- **Correlation IDs**: Tracking de requests end-to-end

#### Advanced Metrics
- **Business KPIs**: Métricas de negócio em tempo real
- **Predictive Analytics**: ML para predição de problemas
- **Anomaly Detection**: Detecção automática de padrões anômalos

#### Enhanced Alerting
- **Smart Alerting**: Redução de false positives via ML
- **Alert Correlation**: Agrupamento de alerts relacionados
- **Auto-remediation**: Correção automática de problemas conhecidos

---

**O sistema de monitoramento e logs do Chegou Hub fornece visibilidade completa sobre a saúde, performance e uso da plataforma, permitindo operação proativa e troubleshooting eficiente.**