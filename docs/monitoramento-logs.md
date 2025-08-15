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

#### ROI de Features
- **Feature adoption**: Usuários ativos por feature
- **Performance impact**: Features que mais afetam response time
- **Error contribution**: Features que mais geram erros
- **Resource consumption**: CPU/RAM por feature

---

**O sistema de monitoramento e logs do Chegou Hub fornece visibilidade completa sobre a saúde, performance e uso da plataforma, permitindo operação proativa e troubleshooting eficiente.**