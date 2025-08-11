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

### Multi-Stage Build Process

#### Stage 1: Frontend Build (Node.js 18)
```dockerfile
FROM node:18-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --only=production
COPY frontend/ ./
ENV CI=false DISABLE_ESLINT_PLUGIN=true GENERATE_SOURCEMAP=false
RUN npm run build
```

#### Stage 2: Backend + Frontend Integrado (Python 3.11)
```dockerfile
FROM python:3.11-slim
# ... configurações Python + Django ...
COPY --from=frontend-build /app/frontend/build ./staticfiles/frontend/
```

### Processo de Deploy Automático
1. **Git Push**: Push para branch `main` dispara build
2. **Frontend Compilation**: React build otimizado para produção
3. **Backend Setup**: Django + dependências Python
4. **Static Files**: Frontend copiado para `/staticfiles/frontend/`
5. **Database Migration**: `python manage.py migrate` automático
6. **Health Check**: Verificação em `/health/` endpoint
7. **Traffic Switch**: Deploy zero-downtime

## Configurações Railway

### railway.toml (Configuração Principal)
```toml
[build]
builder = "dockerfile"
dockerfilePath = "Dockerfile"

[deploy]
startCommand = "sh -c 'python manage.py migrate && mkdir -p staticfiles/media && gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --log-level info --timeout 120 --workers 2'"
healthcheckPath = "/health/"
healthcheckTimeout = 30
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 3

[variables]
NODE_ENV = "production"
CI = "false"
DISABLE_ESLINT_PLUGIN = "true"
GENERATE_SOURCEMAP = "false"
```

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

## Variáveis de Ambiente em Produção

### ⚙️ Configuração Django
```bash
DJANGO_SECRET_KEY=production-secret-key-50-chars-minimum
DEBUG=False
ALLOWED_HOSTS=chegouhub.com.br,www.chegouhub.com.br
DATABASE_URL=postgresql://... (auto-gerada)
REDIS_URL=redis://... (auto-gerada)
RAILWAY_ENVIRONMENT_NAME=production
```

### 🤖 APIs de IA (Obrigatórias)
```bash
OPENAI_API_KEY=sk-proj-your-openai-key-here
OPENAI_ADMIN_API_KEY=sk-your-admin-key-with-org-permissions
ANTHROPIC_API_KEY=sk-ant-api03-your-claude-key-here
```

### 🔗 Integrações Empresariais
```bash
DROPI_API_TOKEN=dropi-mx-token-for-metrics
ECOMHUB_API_TOKEN=ecomhub-integration-token
PRIMECOD_API_TOKEN=primecod-analytics-token
```

### 📊 Serviços Externos (Opcionais)
```bash
# Selenium Grid para web scraping
ECOMHUB_SELENIUM_SERVER=https://ecomhub-selenium-production.up.railway.app
DROPI_EXTRACTOR_SERVER=https://dropi-extractor.railway.app
DROPI_TOKEN_SERVICE_URL=https://dropi-tokens.railway.app

# Cloudinary para uploads (recomendado)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=123456789123456
CLOUDINARY_API_SECRET=your-secret-key
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

### Alertas Configurados
- **High CPU** (> 80% por 5 minutos)
- **High Memory** (> 90% da RAM alocada)
- **Database Connections** (> 80 conexões simultâneas)
- **Error Rate Spike** (> 5% em 10 minutos)

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

## Custos e Otimização

### Estrutura de Custos Railway
- **Base Plan**: $5/mês + uso de recursos
- **PostgreSQL**: Incluído (até 1GB, depois $0.10/GB)
- **Redis**: Incluído (até 100MB, depois $0.50/GB)
- **Compute**: $0.000463/GB-hour RAM + $0.000231/vCPU-hour
- **Network**: 100GB incluídos, $0.10/GB adicional

### Otimizações de Custo
- **Right-sizing**: Monitorar CPU/RAM usage regularmente
- **Database cleanup**: Rotina de limpeza de dados antigos
- **Static files**: Otimização de imagens e assets
- **Background tasks**: Otimizar workers RQ para uso eficiente

## Troubleshooting Produção

### Problemas Comuns

#### 🚨 Application Error (500)
```bash
# 1. Verificar logs
railway logs --tail --filter=ERROR

# 2. Verificar health check
curl https://chegouhub.com.br/health/

# 3. Verificar variáveis de ambiente
railway variables list

# 4. Restart se necessário
railway redeploy
```

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

## Próximos Passos de Infraestrutura

### Melhorias Planejadas
1. **CDN Integration**: CloudFlare para assets estáticos
2. **Multi-region**: Deploy em US + EU para latência
3. **Monitoring avançado**: Datadog ou New Relic
4. **Backup external**: S3 para backups long-term
5. **CI/CD Pipeline**: GitHub Actions para testes pré-deploy

---

**O Railway oferece uma infraestrutura robusta e escalável que permite foco total no desenvolvimento de features, sem preocupações operacionais complexas.**