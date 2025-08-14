# Sistema de Logs e Debug para Detector de IPs - Versão 2.0

## Visão Geral

Sistema abrangente de logging estruturado e debug implementado para o detector de IPs do Chegou Hub, fornecendo visibilidade completa, estatísticas detalhadas e diagnóstico automático de problemas.

## Funcionalidades Implementadas

### 1. **Logs Estruturados Detalhados** ✅

#### Modelos de Banco de Dados:
- **`IPDetectionStatistics`**: Estatísticas agregadas por loja e data
- **`IPDetectionDebugLog`**: Logs estruturados JSON detalhados
- **`IPDetectionAlert`**: Sistema de alertas automáticos

#### Características:
- **Logs em formato JSON** para análise posterior
- **Timestamps precisos** com timezone awareness
- **Categorias organizadas**: ip_detection, hierarchy_analysis, validation, performance, security
- **Separação por níveis**: DEBUG, INFO, WARNING, ERROR, CRITICAL
- **Tracking por sessão** com IDs únicos
- **Metadados completos** de contexto e auditoria

### 2. **Estatísticas em Tempo Real** ✅

#### Dashboard de Métricas:
- **Taxa de sucesso** de detecção de IP por loja
- **Métodos mais eficazes** (hierarquia vs alternativo vs geolocalização)
- **Tempos de resposta** detalhados por método
- **Volume de pedidos** processados vs IPs encontrados
- **Distribuição de confiança** (alta, média, baixa)
- **Taxa de erro** e análise de problemas

#### Endpoints Disponíveis:
```
GET /api/processamento/debug-stats/
- Parâmetros: loja_id, period (24h, 7d, 30d), include_trends, include_alerts

GET /api/processamento/performance-metrics/
- Métricas detalhadas de performance com histórico

GET /api/processamento/detailed-logs/
- Logs detalhados com filtros avançados
```

### 3. **Dashboard de Monitoramento** ✅

#### Endpoints Específicos:
- **`/api/processamento/debug-stats/`**: Métricas completas de debug
- **`/api/processamento/performance-metrics/`**: Análise de performance
- **`/api/processamento/detailed-logs/`**: Logs com filtros avançados
- **`/api/processamento/alerts/`**: Gerenciamento de alertas

#### Funcionalidades:
- **Histórico dos últimos 30 dias** por padrão
- **Alertas automáticos** quando taxa de detecção < threshold
- **Comparação entre períodos** diferentes
- **Filtros avançados** por nível, categoria, sessão, pedido
- **Paginação otimizada** para grandes volumes

### 4. **Logs de Auditoria Detalhados** ✅

#### Tracking Granular:
- **Campo específico** que forneceu o IP
- **Logs de IPs rejeitados** e motivo da rejeição
- **Histórico de mudanças** na hierarquia de campos
- **Tracking de API calls** externas (quando habilitadas)
- **Correlação IP-pedido** para detectar inconsistências
- **User agent e IP** de quem fez a requisição

#### Estrutura de Session Tracking:
```python
session_data = {
    'session_id': 'uuid-único',
    'config_id': loja_id,
    'user_id': user_id,
    'started_at': timestamp,
    'processed_orders': contador,
    'successful_detections': contador,
    'failed_detections': contador,
    'processing_times': [tempos_ms],
    'methods_used': Counter(),
    'errors': [detalhes_erros],
    'warnings': [detalhes_warnings]
}
```

### 5. **Diagnóstico Automático** ✅

#### Sistema Proativo:
- **Detecção automática** de problemas comuns
- **APIs indisponíveis** - tracking de timeouts
- **Dados malformados** - validação automática
- **Performance degradada** - alertas por threshold
- **Taxa de detecção baixa** - comparação com baseline

#### Sugestões Automáticas:
- **Otimização de configuração** baseada nos logs
- **Identificação de campos** mais eficazes
- **Recomendações de hierarquia** otimizada
- **Alertas proativos** para administradores

## Arquitetura Técnica

### Serviços Principais:

#### 1. **StructuredLoggingService**
```python
# Serviço centralizado para logging estruturado
logging_service = get_structured_logging_service()

# Inicia sessão de tracking
session_id = logging_service.start_detection_session(config, user, order_ids)

# Registra tentativas
logging_service.log_ip_detection_attempt(session_id, order_id, start_time, result)

# Finaliza com estatísticas
stats = logging_service.end_detection_session(session_id)
```

#### 2. **EnhancedIPDetector**
```python
# Detector aprimorado com logging integrado
detector = get_enhanced_ip_detector(shop_url, access_token)

# Detecção com logging completo
result = detector.get_orders_by_ip_enhanced(config, user, days, min_orders)

# Diagnóstico completo
diagnostics = detector.get_detection_diagnostics(config, user, period_hours)
```

### Endpoints Aprimorados:

#### 1. **Busca Aprimorada**
```
POST /api/processamento/buscar-ips-duplicados-enhanced/
{
    "loja_id": 123,
    "days": 30,
    "min_orders": 2,
    "enable_detailed_logging": true
}
```

#### 2. **Análise Individual**
```
POST /api/processamento/analyze-single-order-ip/
{
    "loja_id": 123,
    "order_id": "456789"
}
```

#### 3. **Diagnóstico Completo**
```
GET /api/processamento/system-diagnostics/?loja_id=123&period_hours=24
```

## Integração Completa

### Com Sistema Existente:
- **Compatibilidade total** com funcionalidades existentes
- **Zero impacto** na performance dos endpoints atuais
- **Logs adicionais** sem interferir no fluxo principal
- **Fallback graceful** em caso de erros no logging

### Cache e Performance:
- **Redis integration** para session tracking
- **Cache local** para dados frequentes
- **Queries otimizadas** com índices apropriados
- **Lazy loading** de dados não-essenciais

## Admin Interface

### Dashboard Administrativo:
- **IPDetectionStatistics**: Visão agregada por loja/data
- **IPDetectionDebugLog**: Logs detalhados com filtros
- **IPDetectionAlert**: Gerenciamento de alertas

### Funcionalidades Admin:
- **Filtros avançados** por todos os campos relevantes
- **Busca inteligente** por loja, IP, pedido, sessão
- **Ações em lote** para gerenciar alertas
- **Export de dados** para análise externa
- **Read-only** para logs (integridade dos dados)

## Monitoramento Proativo

### Alertas Automáticos:
- **Taxa baixa**: < 70% de detecção de IP
- **Performance degradada**: > 5s tempo médio
- **Muitos IPs suspeitos**: > 30% da amostra
- **APIs indisponíveis**: > 10 timeouts/hora
- **Volume anormal**: Picos ou quedas abruptas

### Thresholds Configuráveis:
```python
alert_thresholds = {
    'taxa_deteccao_minima': 0.7,  # 70%
    'tempo_maximo_ms': 5000,      # 5 segundos
    'taxa_suspeitos_maxima': 0.3, # 30%
    'api_timeout_max_count': 10,   # 10 timeouts em 1h
}
```

## Análise de Trends

### Histórico de Performance:
- **30 dias** de dados por padrão
- **Médias móveis** para identificar tendências
- **Comparação período a período**
- **Identificação de padrões** sazonais
- **Alertas de degradação** progressiva

### Insights Automáticos:
- **Método mais eficaz** por período
- **Horários de pico** de problemas
- **Correlação** entre eventos
- **Predição de problemas** futuros

## Casos de Uso Práticos

### 1. **Troubleshooting de Loja Específica**
```python
# Análise completa de uma loja
diagnostics = enhanced_detector.get_detection_diagnostics(
    config=loja_config,
    user=request.user,
    period_hours=24
)

# Inclui:
# - Estatísticas em tempo real
# - Análise de tendências
# - Alertas ativos
# - Recomendações específicas
```

### 2. **Debug de Pedido Individual**
```python
# Análise granular de um pedido
analysis = enhanced_detector.detect_single_order_ip_enhanced(
    config=loja_config,
    user=request.user,
    order_id="123456"
)

# Inclui:
# - Hierarquia de campos analisados
# - Tentativas de extração detalhadas
# - Validação de IP step-by-step
# - Resumo dos dados disponíveis
```

### 3. **Monitoramento Geral**
```python
# Dashboard consolidado
dashboard = logging_service.get_realtime_statistics(
    config_id=loja_id,
    period_hours=24
)

# Inclui:
# - Taxa de sucesso por método
# - Performance por categoria
# - Distribuição de confiança
# - Alertas e recomendações
```

## Benefícios Alcançados

### Para Desenvolvimento:
- **Visibilidade completa** do funcionamento interno
- **Debugging eficiente** de problemas específicos
- **Otimização baseada em dados** reais
- **Identificação proativa** de melhorias

### Para Operação:
- **Monitoramento em tempo real** de todas as lojas
- **Alertas automáticos** antes dos problemas impactarem usuários  
- **Métricas confiáveis** para tomada de decisão
- **Histórico completo** para análise posterior

### Para Usuários:
- **Performance otimizada** com base no monitoramento
- **Problemas resolvidos** antes de serem percebidos
- **Taxa de detecção** sempre melhorando
- **Experiência consistente** entre diferentes lojas

## Próximos Passos

### Expansões Futuras:
1. **Machine Learning**: Predição de problemas com base nos padrões
2. **Alertas Externos**: Integração com Slack/Discord/Email
3. **Dashboard Visual**: Interface React para visualização
4. **Export/Import**: Backup e restauração de configurações
5. **API Pública**: Acesso programático aos dados de monitoramento

---

**Status**: ✅ **IMPLEMENTADO E FUNCIONAL**  
**Versão**: 2.0  
**Data**: 13/01/2025  
**Responsável**: Backend Agent (Claude Code)  
**Compatibilidade**: Django 5.2 + DRF + PostgreSQL + Redis