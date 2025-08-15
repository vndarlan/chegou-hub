# 🚀 Railway - Deploy e Produção

## O que é o Railway

Railway é nossa plataforma de deploy em nuvem que oferece infraestrutura gerenciada, deploy automático e escalabilidade transparente. É uma alternativa moderna ao Heroku, focada em desenvolvedores e simplicidade operacional.

## Por que Railway?

### Vantagens Estratégicas
- **Deploy automático**: Push to deploy via Git sem configuração manual
- **Infraestrutura gerenciada**: PostgreSQL, Redis provisionados automaticamente  
- **Monitoramento integrado**: Logs, métricas e alertas prontos
- **Escalabilidade**: Auto-scaling baseado em demanda de CPU/RAM
- **Domínios customizados**: SSL automático via Let's Encrypt

### Custo-Benefício
- **Plano Developer**: $5/mês + uso (ideal para startups)
- **PostgreSQL incluído**: Sem custos adicionais de banco
- **Redis incluído**: Cache e filas sem taxa extra
- **Transferência**: 100GB incluídos no plano base

## Arquitetura de Deploy

### Processo de Deploy Automático
1. **Git Push**: Push para branch `main` dispara build
2. **Frontend Compilation**: React build otimizado para produção
3. **Backend Setup**: Django + dependências Python
4. **Static Files**: Frontend copiado para `/staticfiles/frontend/`
5. **Database Migration**: `python manage.py migrate` automático
6. **Health Check**: Verificação em `/health/` endpoint
7. **Traffic Switch**: Deploy zero-downtime

### Configurações de Produção
- **Workers**: 2 processos Gunicorn (otimizado para Railway)
- **Timeout**: 120 segundos para requisições longas
- **Health Check**: Endpoint `/health/` verifica DB e Redis
- **Restart Policy**: Reinicialização automática em caso de falha

## Infraestrutura Provisionada

### PostgreSQL Database
- **Versão**: PostgreSQL 15+
- **Localização**: US West (Oregon) ou EU West (Ireland)
- **Backup**: Diário automático com retenção de 7 dias
- **Conexões**: Até 100 conexões simultâneas
- **SSL**: Obrigatório por padrão
- **Acesso**: Via `DATABASE_URL` (auto-gerada)

### Redis Cache & Queue
- **Versão**: Redis 7+
- **Persistência**: RDB + AOF habilitado
- **Max Memory**: 512MB (plano base)
- **Uso**: Cache Django + filas Django-RQ
- **Acesso**: Via `REDIS_URL` (auto-gerada)

### File Storage
- **Arquivos estáticos**: Servidos via WhiteNoise + Django
- **Uploads**: Dentro do container (recomendado usar Cloudinary)
- **Build cache**: Reutilização entre deploys
- **Compressão**: Gzip automático para assets

## Domínio e SSL

### Configuração de Domínio
- **Domínio principal**: `chegouhub.com.br`
- **Subdomínio**: `www.chegouhub.com.br`
- **SSL**: Certificado Let's Encrypt renovado automaticamente
- **Redirecionamento**: HTTP → HTTPS forçado

### DNS Configuration
```
# Configuração no provedor DNS
CNAME www railway-domain.railway.app
A @ ip-do-railway (fornecido pelo Railway)

# Verificação de SSL
dig chegouhub.com.br
nslookup www.chegouhub.com.br
```
## Monitoramento e Observabilidade

### Métricas Automáticas
- **CPU Usage**: Monitoramento contínuo com alertas
- **RAM Usage**: Tracking de memory leaks
- **Response Time**: P50, P95, P99 de todas as requisições
- **Error Rate**: Taxa de 4xx/5xx responses
- **Database Queries**: Slow query detection

### Sistema de Logs
```bash
# Logs em tempo real
railway logs --tail --service=production

# Logs específicos
railway logs --since=1h --filter=ERROR
railway logs --service=postgres
railway logs --service=redis
```

## Health Checks e Uptime

### Endpoint de Saúde
```python
# /health/ - Verificações automáticas
{
    "status": "healthy",
    "database": "connected",
    "redis": "connected", 
    "timestamp": "2024-01-15T10:30:00Z",
    "version": "1.2.0"
}
```

### Monitoramento Externo
- **Railway Built-in**: 99.9% SLA garantido
- **Health Check Interval**: 30 segundos
- **Timeout**: 30 segundos por check
- **Failure Threshold**: 3 falhas consecutivas = restart

## Processo de Deploy

### Deploy Automático (Recomendado)
```bash
# 1. Commit e push para main
git add .
git commit -m "feat: nova funcionalidade"
git push origin main

# 2. Railway detecta push e inicia build
# 3. Build multi-stage executa
# 4. Health check valida deploy
# 5. Traffic switch zero-downtime
```

### Deploy Manual (via CLI)
```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Login e conectar projeto
railway login
railway link project-id

# Deploy manual
railway up --detach
railway logs --tail
```

### Rollback de Emergência
```bash
# Ver últimos deploys
railway deployments

# Rollback para deploy específico
railway rollback deployment-id

# Verificar status
railway status
```

## Performance e Otimizações

### Configurações de Produção
- **Gunicorn**: 2 workers (otimizado para Railway CPU cores)
- **Connection Pooling**: PostgreSQL com `conn_max_age=600`
- **Static File Caching**: Headers de cache longo
- **Gzip Compression**: Ativado para todos os text assets

### Database Optimizations
```python
# Configurações automáticas em produção
DATABASES['default'] = {
    'conn_max_age': 600,
    'conn_health_checks': True,
    'ssl_require': True,
    'options': {
        'MAX_CONNS': 20,
        'MIN_CONNS': 2,
    }
}
```

### Cache Strategy
- **Database queries**: Cache de 5 minutos para consultas pesadas
- **Static files**: Cache de 1 ano para assets versionados
- **API responses**: Cache seletivo baseado na feature

## Backup e Disaster Recovery

### Backups Automáticos
- **Database**: Backup diário às 03:00 UTC
- **Retenção**: 7 dias no plano base, 30 dias no plano Pro
- **Restauração**: Via Railway dashboard ou CLI
- **Teste de backup**: Validação automática semanal

### Estratégia de Recovery
```bash
# Backup manual antes de mudanças críticas
railway db backup create --name "pre-migration-$(date +%Y%m%d)"

# Restaurar backup específico
railway db restore backup-id

# Verificar integridade pós-restore
railway run python manage.py check_db
```

## Otimizações de Custo
- **Right-sizing**: Monitorar CPU/RAM usage regularmente
- **Database cleanup**: Rotina de limpeza de dados antigos
- **Static files**: Otimização de imagens e assets
- **Background tasks**: Otimizar workers RQ para uso eficiente


#### 🗄️ Database Connection Error
```bash
# 1. Verificar status do PostgreSQL
railway status --service=postgres

# 2. Testar conexão manualmente  
railway connect postgres

# 3. Verificar limite de conexões
railway run python -c "from django.db import connection; print(connection.queries)"
```

#### 📊 High Response Time
```bash
# 1. Verificar métricas
railway metrics --service=production

# 2. Identificar queries lentas
railway logs --filter="slow query"

# 3. Escalar recursos se necessário
railway scale --memory=1GB --cpu=1.0
```

### Comandos de Emergência
```bash
# Restart completo da aplicação
railway restart

# Escalar temporariamente
railway scale --replicas=2

# Habilitar modo de manutenção
railway variables set MAINTENANCE_MODE=True

# Verificar saúde geral
railway status && railway metrics
```
---

**O Railway oferece uma infraestrutura robusta e escalável que permite foco total no desenvolvimento de features, sem preocupações operacionais complexas.**