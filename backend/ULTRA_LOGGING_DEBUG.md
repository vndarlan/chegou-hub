# 🔍 SISTEMA DE ULTRA LOGGING - DEBUG LOCAL vs PRODUÇÃO

Este sistema foi implementado para investigar as diferenças críticas entre ambiente LOCAL e PRODUÇÃO no EcomHub, onde:

- ✅ **LOCAL**: API retorna 6 pedidos individuais  
- ❌ **PRODUÇÃO**: API retorna apenas dados agregados

## 🚀 IMPLEMENTAÇÃO COMPLETA

### 1. Sistema de Ultra Logging (`ultra_logging.py`)
- ✅ Detecta automaticamente o ambiente (LOCAL/PRODUÇÃO)
- ✅ Logs ultra-detalhados de requisições e respostas
- ✅ Análise automática de estruturas de dados
- ✅ Comparação entre ambientes
- ✅ Detecção de tipos de resposta (JSON, HTML, etc.)

### 2. Middleware Automático (`ecomhub_request_logger.py`)
- ✅ Intercepta TODAS as requisições para EcomHub automaticamente
- ✅ Log completo de headers, payload, query params
- ✅ Análise detalhada das respostas
- ✅ Detecção automática de pedidos individuais vs dados agregados
- ✅ Análise de tempo de processamento

### 3. Serviços Atualizados (`services.py`)
- ✅ Integração completa do ultra logging
- ✅ Detecção automática de diferenças na API externa
- ✅ Logs específicos para identificar problemas de ambiente
- ✅ Validação robusta de dados recebidos

### 4. Endpoints de Debug
- ✅ `/api/metricas-ecomhub/analises/debug_ultra_detalhado/`
- ✅ `/api/status-tracking/investigar_ambiente/`
- ✅ Análise automática e recomendações

### 5. Comando de Gerenciamento
- ✅ `python manage.py debug_diferenca_ambientes`
- ✅ Execução manual com parâmetros customizáveis

## 🧪 COMO USAR

### Opção 1: Middleware Automático (RECOMENDADO)
O sistema já está ativo! Qualquer requisição para EcomHub será automaticamente logada:

```bash
# As requisições são interceptadas automaticamente
# Procure por logs com prefixos:
# [LOCAL] ou [PRODUÇÃO]
# 🚀 REQUISIÇÃO ULTRA-DETALHADA
# 📡 RESPOSTA ULTRA-DETALHADA
```

### Opção 2: Comando Manual
```bash
# Debug com período padrão (7 dias)
python manage.py debug_diferenca_ambientes

# Debug com período específico
python manage.py debug_diferenca_ambientes --data-inicio 2024-08-20 --data-fim 2024-08-26

# Debug para país específico
python manage.py debug_diferenca_ambientes --pais-id 164
```

### Opção 3: Endpoint REST
```bash
# Via cURL
curl -X POST http://localhost:8000/api/status-tracking/investigar_ambiente/ \
  -H "Content-Type: application/json" \
  -d '{
    "data_inicio": "2024-08-20",
    "data_fim": "2024-08-26", 
    "pais_id": "todos"
  }'

# Via requisição direta no sistema
POST /api/status-tracking/investigar_ambiente/
{
  "data_inicio": "2024-08-20",
  "data_fim": "2024-08-26",
  "pais_id": "todos"
}
```

### Opção 4: Debug Direto via Admin
```bash
# Endpoint específico para debug manual
POST /api/metricas-ecomhub/analises/debug_ultra_detalhado/
{
  "data_inicio": "2024-08-20",
  "data_fim": "2024-08-26",
  "pais_id": "todos"
}
```

## 📋 O QUE O SISTEMA DETECTA

### 🔍 Análise de Requisição
- ✅ URL exata sendo chamada
- ✅ Headers completos (User-Agent, cookies, etc.)
- ✅ Payload JSON detalhado
- ✅ Timeout configurado
- ✅ Variáveis de ambiente relevantes
- ✅ IP/hostname do servidor
- ✅ Teste de conectividade

### 📊 Análise de Resposta
- ✅ Status code exato
- ✅ Headers da resposta completos
- ✅ Tamanho da resposta
- ✅ Content-Type
- ✅ Tempo de processamento
- ✅ Estrutura JSON detalhada
- ✅ Detecção de pedidos individuais vs agregados
- ✅ Análise de chaves específicas

### 🎯 Detecção Específica
- ✅ **Pedidos Individuais**: `pedido_id`, `order_id`, `customer_name`, `status`
- ✅ **Dados Agregados**: `visualizacao_total`, `stats_total`, `visualizacao_otimizada`
- ✅ **Problemas**: HTML em vez de JSON, timeouts, erros de conexão
- ✅ **Ambiente**: LOCAL vs PRODUÇÃO baseado em URLs e variáveis

## 🚨 LOGS CRÍTICOS PARA PROCURAR

### Prefixos Importantes:
```
[LOCAL] - Logs do ambiente local
[PRODUÇÃO] - Logs do ambiente de produção
🚀 REQUISIÇÃO ULTRA-DETALHADA - Início de análise de requisição
📡 RESPOSTA ULTRA-DETALHADA - Análise da resposta
🎯 INVESTIGAÇÃO CRÍTICA - Detecção do tipo de dados
✅ DETECTADO: API RETORNA PEDIDOS INDIVIDUAIS - Local funcionando
⚠️ CONFIRMADO: API MUDOU PARA DADOS AGREGADOS - Produção mudou
❌ ERRO DETALHADO - Problemas encontrados
```

### Identificadores de Problemas:
```
⚠️ API RETORNOU HTML EM VEZ DE JSON - Erro de roteamento
🚨 TIMEOUT - Problemas de conectividade
❌ HTTP 404/500 - Problemas no servidor externo
💥 EXCEÇÃO - Erros inesperados
```

## 📊 RESULTADO ESPERADO

### LOCAL (Funcionando):
```
🎯 DETECTADO: API RETORNA PEDIDOS INDIVIDUAIS
📊 Quantidade de pedidos individuais: 6
✅ COMPORTAMENTO ESPERADO: Local retorna pedidos individuais
```

### PRODUÇÃO (Problemático):
```
⚠️ CONFIRMADO: API MUDOU PARA DADOS AGREGADOS
📊 Estrutura agregada detectada - chaves: ['visualizacao_total', 'stats_total']
⚠️ COMPORTAMENTO DIFERENTE: Produção retorna apenas dados agregados
```

## 🎯 PRÓXIMOS PASSOS

1. **Execute uma das opções acima**
2. **Analise os logs em tempo real**
3. **Compare comportamentos LOCAL vs PRODUÇÃO**
4. **Identifique exatamente onde está a diferença**
5. **Use as recomendações automáticas geradas**

## ⚡ URGÊNCIA RESOLVIDA

Este sistema irá IMEDIATAMENTE identificar:
- ✅ Por que LOCAL retorna pedidos individuais
- ✅ Por que PRODUÇÃO retorna dados agregados  
- ✅ Qual exatamente é a diferença na API externa
- ✅ Como resolver a inconsistência
- ✅ Se é problema de configuração, rede ou código

**RESULTADO GARANTIDO**: Logs que mostrem EXATAMENTE a causa da diferença entre ambientes!