# DOCUMENTAÇÃO DE SEGURANÇA - WHATSAPP BUSINESS MONITORING

## **CONFIGURAÇÃO OBRIGATÓRIA DE SEGURANÇA**

### **1. Configurar Chave de Criptografia**

**CRÍTICO**: Configure a chave de criptografia antes de usar o sistema.

```bash
# Gerar chave de criptografia
python -c "from cryptography.fernet import Fernet; print('WHATSAPP_ENCRYPTION_KEY=' + Fernet.generate_key().decode())"
```

**Adicione ao arquivo `.env` ou variáveis de ambiente:**
```
WHATSAPP_ENCRYPTION_KEY=gAAAAABhZ2F0ZV9nZW5lcmF0ZWRfa2V5X2hlcmU...
```

⚠️ **NUNCA** commite esta chave no git ou compartilhe publicamente.

### **2. Ativar Middleware de Segurança**

Adicione ao `settings.py`:

```python
MIDDLEWARE = [
    # ... outros middlewares
    'features.ia.middleware.security_middleware.WhatsAppSecurityMiddleware',
    'features.ia.middleware.security_middleware.TokenValidationMiddleware',
    # ... resto dos middlewares
]
```

### **3. Configurar Logs de Segurança**

```python
LOGGING = {
    'loggers': {
        'features.ia.security_audit': {
            'handlers': ['file_security', 'console'],
            'level': 'INFO',
            'propagate': False,
        },
        'features.ia.middleware.security_middleware': {
            'handlers': ['file_security', 'console'],
            'level': 'WARNING',
            'propagate': False,
        },
    },
    'handlers': {
        'file_security': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': BASE_DIR / 'logs' / 'security.log',
            'formatter': 'security',
        },
    },
    'formatters': {
        'security': {
            'format': '[SECURITY] {asctime} {levelname} - {message}',
            'style': '{',
        },
    },
}
```

## **FUNCIONALIDADES DE SEGURANÇA IMPLEMENTADAS**

### **1. Criptografia Robusta de Tokens**
- Tokens Meta API são criptografados usando Fernet (AES 128)
- Chave de criptografia obrigatória em produção
- Nunca expõe tokens em logs ou erros

### **2. Validação de Entrada**
- Sanitização de HTML em todos os campos de texto
- Validação de formato para Business Manager ID (15-20 dígitos)
- Validação de formato para Access Tokens Meta
- Detecção de tokens suspeitos ou fake

### **3. Rate Limiting**
- 10 requests por minuto para Meta API por Business Manager
- 100 requests por IP em 15 minutos para endpoints protegidos
- Cache de rate limiting usando Redis/LocMem

### **4. Auditoria Completa**
- Log de todas operações com tokens
- Rastreamento de IP e User-Agent
- Detecção de atividade suspeita
- Scores de risco para usuários

### **5. Controle de Acesso**
- Segregação por usuário responsável
- Permissões granulares por grupo
- Bloqueio automático de IPs suspeitos

## **MONITORAMENTO DE SEGURANÇA**

### **Métricas de Segurança**

```python
# Obter resumo de segurança
from features.ia.security_audit import security_audit
summary = security_audit.get_security_summary(days=7)
```

### **Indicadores de Risco**

- **Tentativas de acesso falhadas**: > 5 por dia
- **Acessos em horários incomuns**: 22h-06h
- **Requests muito rápidos**: > 50 por hora
- **Múltiplos IPs**: > 5 IPs diferentes por dia

### **Alerts Automáticos**

O sistema gera alerts automáticos para:
- Score de risco > 50
- Rate limit excedido
- Tokens suspeitos detectados
- Padrões de ataque identificados

## **BOAS PRÁTICAS DE SEGURANÇA**

### **Para Administradores**

1. **Rotacionar chaves de criptografia periodicamente**
2. **Monitorar logs de segurança diariamente**
3. **Revisar usuários com score de risco alto**
4. **Configurar alertas para atividade suspeita**

### **Para Desenvolvedores**

1. **Nunca logar tokens ou dados sensíveis**
2. **Usar sempre os serializers com validação**
3. **Testar rate limiting em desenvolvimento**
4. **Verificar permissões em todas as views**

### **Para Usuários**

1. **Usar tokens Meta válidos e atualizados**
2. **Não compartilhar credenciais**
3. **Reportar atividade suspeita**
4. **Acessar apenas de IPs confiáveis**

## **CONFIGURAÇÕES DE PRODUÇÃO**

### **Variáveis de Ambiente Obrigatórias**

```bash
# Criptografia (OBRIGATÓRIO)
WHATSAPP_ENCRYPTION_KEY=sua_chave_fernet_aqui

# Rate Limiting
WHATSAPP_RATE_LIMIT_REQUESTS=10
WHATSAPP_RATE_LIMIT_WINDOW=60

# Logs de Segurança
SECURITY_LOG_LEVEL=INFO
SECURITY_LOG_FILE=/app/logs/security.log

# IPs Bloqueados (opcional)
BLOCKED_IPS=192.168.1.100,10.0.0.50
```

### **Configurações Django Recomendadas**

```python
# Security Settings
SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = 'DENY'
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_SECURE = True
```

## **RESPOSTA A INCIDENTES**

### **Em Caso de Comprometimento**

1. **Imediato**:
   - Revogar todos os tokens Meta API
   - Rotacionar chave de criptografia
   - Bloquear IPs suspeitos

2. **Investigação**:
   - Revisar logs de segurança
   - Identificar extensão do comprometimento
   - Verificar integridade dos dados

3. **Recuperação**:
   - Reconfigurar tokens com novos permissões
   - Atualizar senhas de usuários afetados
   - Implementar medidas preventivas adicionais

### **Contatos de Emergência**

- **Equipe de Segurança**: security@chegouhub.com.br
- **Administrador do Sistema**: admin@chegouhub.com.br
- **Meta Business Support**: https://business.facebook.com/support

## **COMPLIANCE E AUDITORIA**

### **LGPD (Lei Geral de Proteção de Dados)**

- Tokens são criptografados em rest e transit
- Logs de auditoria para rastreabilidade
- Controle de acesso granular
- Direito ao esquecimento implementado

### **Auditoria Externa**

O sistema está preparado para auditorias com:
- Logs estruturados e imutáveis
- Rastreamento completo de ações
- Relatórios de segurança automatizados
- Evidências de controles implementados

---

**Última atualização**: 2025-01-29
**Versão da documentação**: 1.0
**Responsável**: Equipe de Segurança ChegouHub