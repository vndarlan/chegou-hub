# Troubleshooting de Produção - Chegou Hub

## Problemas Identificados e Soluções Implementadas

### 1. Erro Redis ConnectionError (Resolvido)
**Problema**: `ConnectionError: Error 111 connecting to localhost:6379. Connection refused`

**Causa**: O código estava tentando conectar ao Redis localhost em produção.

**Soluções implementadas**:
- ✅ Verificação de URL Redis válida em produção (não localhost)
- ✅ Fallback gracioso para LocMem cache quando Redis não disponível
- ✅ Desabilitação automática do django_rq quando Redis não está disponível
- ✅ Cache manager respeitando configuração global de Redis

### 2. Erro 500 ao Salvar Projetos
**Problema**: Erro interno do servidor ao criar/editar projetos IA.

**Diagnósticos implementados**:
- ✅ Validação de encoding UTF-8 nos serializers
- ✅ Middleware de error logging detalhado para produção
- ✅ Configurações específicas de PostgreSQL para UTF-8
- ✅ Logging estruturado de erros em `/logs/errors.log`
- ✅ Tratamento específico para erros de encoding e integridade

### 3. Configurações de Banco de Dados
**Melhorias implementadas**:
- ✅ Configurações específicas PostgreSQL para produção
- ✅ Client encoding UTF-8 explícito
- ✅ SSL mode require para conexões seguras
- ✅ Timeout de conexão configurado

## Como Monitorar em Produção

### 1. Logs de Erro
```bash
# Railway
railway logs --filter error

# Logs específicos (quando disponível)
cat logs/errors.log
cat logs/rq.log
```

### 2. Endpoints de Diagnóstico
- `GET /api/ia/dashboard-stats/` - Verifica Redis e cálculos
- `GET /api/ia/opcoes-formulario/` - Verifica choices do DB
- `GET /api/ia/verificar-permissoes/` - Verifica autenticação

### 3. Verificações de Saúde
```python
# No Django shell
from django.core.cache import cache
cache.set('test', 'value', 30)
print(cache.get('test'))  # Testa cache

from features.ia.models import ProjetoIA
print(ProjetoIA.objects.count())  # Testa DB
```

## Variáveis de Ambiente Importantes

### Redis
```
REDIS_URL=redis://usuario:senha@host:porta/db
```

### PostgreSQL
```
DATABASE_URL=postgresql://usuario:senha@host:porta/database
DATABASE_PUBLIC_URL=postgresql://... (opcional)
DB_SSL_REQUIRE=true
```

### Debugging
```
DEBUG=false
RAILWAY_ENVIRONMENT_NAME=production
```

## Próximos Passos

1. **Deployer para Railway** com todas as correções
2. **Verificar logs de produção** após deploy
3. **Testar endpoints críticos** em produção
4. **Monitorar performance** do cache Redis

## Comandos Úteis

```bash
# Deploy para Railway
railway up

# Ver logs em tempo real
railway logs --tail

# Conectar ao banco
railway connect

# Executar migrate em produção
railway run python manage.py migrate
```