# Sistema de Tracking de Status de Pedidos EcomHub

## Visão Geral

Sistema completo para monitoramento de tempo que pedidos ficam em cada status na EcomHub, com detecção automática de pedidos "presos" e sistema de alertas proativos.

## Estrutura Implementada

### Models

#### `PedidoStatusAtual`
- **Função**: Armazena o estado atual de cada pedido
- **Campos principais**:
  - `pedido_id`: ID único do pedido
  - `status_atual`: Status atual do pedido
  - `customer_name`, `customer_email`, `customer_phone`: Dados do cliente
  - `produto_nome`: Nome do produto
  - `pais`: País de destino
  - `preco`: Preço do pedido
  - `data_criacao`, `data_ultima_atualizacao`: Datas importantes
  - `shopify_order_number`: Número do pedido no Shopify
  - `tracking_url`: URL de rastreamento
  - `tempo_no_status_atual`: Tempo em horas no status atual
  - `nivel_alerta`: Nível de alerta calculado automaticamente

#### `HistoricoStatus`
- **Função**: Mantém histórico completo de mudanças de status
- **Campos principais**:
  - `pedido`: FK para PedidoStatusAtual
  - `status_anterior`, `status_novo`: Mudança de status
  - `data_mudanca`: Quando ocorreu a mudança
  - `tempo_no_status_anterior`: Tempo que ficou no status anterior

#### `ConfiguracaoStatusTracking`
- **Função**: Configurações do sistema de alertas
- **Campos**: Limites de tempo para cada nível de alerta

### Lógica de Alertas

#### Níveis de Alerta
- 🟢 **Normal**: Dentro dos prazos normais
- 🟡 **Amarelo**: > 168 horas (7 dias) - Atenção
- 🔴 **Vermelho**: > 336 horas (14 dias) - Urgente
- ⚠️ **Crítico**: > 504 horas (21 dias) - Crítico

#### Regras Especiais
- **Status finais** (`delivered`, `returned`, `cancelled`): Sempre normal
- **`out_for_delivery`**: Limites menores (72h, 120h, 168h)
- **`shipped`, `with_courier`**: Limite vermelho em 10 dias
- **`processing`, `preparing_for_shipping`**: Regras padrão

## Endpoints da API

### Dashboard e Métricas

#### `GET /api/metricas/ecomhub/status-tracking/dashboard/`
Retorna métricas completas do sistema:
```json
{
  "total_pedidos": 150,
  "alertas_criticos": 5,
  "alertas_vermelhos": 12,
  "alertas_amarelos": 23,
  "pedidos_normais": 110,
  "distribuicao_status": {
    "processing": 45,
    "shipped": 67,
    "delivered": 38
  },
  "tempo_medio_por_status": {
    "processing": 5.2,
    "shipped": 8.7
  },
  "pedidos_mais_tempo": [...],
  "estatisticas_pais": {...},
  "ultima_sincronizacao": "2023-12-01T10:30:00Z"
}
```

### Sincronização

#### `POST /api/metricas/ecomhub/status-tracking/sincronizar/`
Executa sincronização manual com a API externa:
```json
{
  "data_inicio": "2023-12-01",
  "data_fim": "2023-12-31",
  "pais_id": "164",
  "forcar_sincronizacao": false
}
```

**Resposta**:
```json
{
  "status": "success",
  "message": "Sincronização concluída",
  "dados_processados": {
    "novos_pedidos": 10,
    "pedidos_atualizados": 25,
    "mudancas_status": 8,
    "erros": 0,
    "total_processados": 35
  },
  "ultima_sincronizacao": "2023-12-01T15:45:00Z"
}
```

### Listagem de Pedidos

#### `GET /api/metricas/ecomhub/status-tracking/pedidos/`
Lista pedidos com filtros avançados e paginação:

**Parâmetros de filtro**:
- `pais`: Filtro por país
- `status_atual`: Filtro por status
- `nivel_alerta`: Filtro por nível de alerta (`normal`, `amarelo`, `vermelho`, `critico`)
- `tempo_minimo`: Tempo mínimo no status (horas)
- `customer_name`: Busca por nome do cliente
- `pedido_id`: Busca por ID do pedido
- `data_criacao_inicio`, `data_criacao_fim`: Filtro por data de criação
- `ordenacao`: Campo para ordenação (padrão: `-tempo_no_status_atual`)

**Exemplo**: `GET /api/metricas/ecomhub/status-tracking/pedidos/?nivel_alerta=critico&pais=Espanha`

### Histórico de Pedido

#### `GET /api/metricas/ecomhub/status-tracking/historico/{pedido_id}/`
Retorna dados completos de um pedido e seu histórico:
```json
{
  "pedido": {
    "pedido_id": "ABC123",
    "status_atual": "shipped",
    "customer_name": "João Silva",
    "tempo_no_status_atual": 192,
    "nivel_alerta": "amarelo",
    // ... outros campos
  },
  "historico": [
    {
      "status_anterior": "processing",
      "status_novo": "shipped",
      "data_mudanca": "2023-12-01T10:00:00Z",
      "tempo_no_status_anterior": 168
    }
    // ... outros registros
  ]
}
```

### Configuração

#### `GET /api/metricas/ecomhub/status-tracking/configuracao/`
Busca configurações atuais do sistema.

#### `PUT /api/metricas/ecomhub/status-tracking/configuracao/`
Atualiza configurações do sistema:
```json
{
  "limite_amarelo_padrao": 168,
  "limite_vermelho_padrao": 336,
  "limite_critico_padrao": 504,
  "limite_amarelo_entrega": 72,
  "limite_vermelho_entrega": 120,
  "limite_critico_entrega": 168,
  "intervalo_sincronizacao": 6
}
```

### Utilitários

#### `POST /api/metricas/ecomhub/status-tracking/atualizar-tempos/`
Atualiza tempos de status de todos os pedidos ativos.

### Compatibilidade

#### `POST /api/metricas/ecomhub/pedidos-status-tracking/`
Mantém compatibilidade com endpoint existente, redirecionando para `processar_selenium`.

## Serviços

### `StatusTrackingService`
Classe principal para lógica de negócio:

#### Métodos principais:
- `sincronizar_dados_pedidos()`: Sincronização completa
- `gerar_metricas_dashboard()`: Gera dados para dashboard
- `atualizar_tempos_status()`: Atualiza tempos de todos os pedidos
- `_processar_pedido_individual()`: Processa um pedido
- `_calcular_tempo_status()`: Calcula tempo em horas

## Comandos de Management

### `python manage.py sincronizar_status_tracking`
Comando para sincronização via linha de comando:

```bash
# Sincronização básica
python manage.py sincronizar_status_tracking

# Com parâmetros específicos
python manage.py sincronizar_status_tracking \
  --data-inicio 2023-12-01 \
  --data-fim 2023-12-31 \
  --pais-id 164 \
  --forcar \
  --verbose

# Apenas atualizar tempos
python manage.py sincronizar_status_tracking --atualizar-tempos
```

**Parâmetros**:
- `--data-inicio`: Data início (YYYY-MM-DD)
- `--data-fim`: Data fim (YYYY-MM-DD)
- `--pais-id`: ID do país ou "todos"
- `--forcar`: Forçar sincronização
- `--atualizar-tempos`: Só atualizar tempos
- `--verbose`: Logs detalhados

## Países Suportados

```python
PAISES = {
    '164': 'Espanha',
    '41': 'Croácia', 
    '66': 'Grécia',
    '82': 'Itália',
    '142': 'Romênia',
    '44': 'República Checa',
    '139': 'Polônia',
    'todos': 'Todos os Países'
}
```

## Admin Django

### Interface administrativa completa com:
- **PedidoStatusAtual**: Lista com cores por nível de alerta
- **HistoricoStatus**: Histórico readonly com links
- **ConfiguracaoStatusTracking**: Configurações do sistema
- Filtros avançados e busca
- Inline de histórico nos pedidos
- Campos calculados (tempo em dias, alertas coloridos)

## Testes

### Suíte completa de testes incluindo:
- **Models**: Testes de cálculo de alertas e validações
- **Services**: Testes de lógica de negócio
- **APIs**: Testes de endpoints com autenticação
- **Comandos**: Testes de management commands

Execute os testes:
```bash
python manage.py test features.metricas_ecomhub.tests
```

## Integração com API Externa

### O sistema integra com servidor Selenium EcomHub:
- URL configurável via `ECOMHUB_SELENIUM_SERVER`
- Timeout de 5 minutos para requisições
- Retry automático e tratamento de erros
- Suporte a todos os países ou países específicos

### Formato esperado da API externa:
```json
{
  "dados_processados": [
    {
      "pedido_id": "ABC123",
      "status": "processing",
      "customer_name": "João Silva",
      "customer_email": "joao@email.com",
      "produto_nome": "Produto Teste",
      "pais": "Brasil",
      "preco": 100.00,
      "data_criacao": "2023-12-01T10:00:00",
      "data_ultima_atualizacao": "2023-12-01T10:00:00",
      "shopify_order_number": "ORD123",
      "tracking_url": "https://..."
    }
  ]
}
```

## Monitoramento e Logs

### Sistema completo de logging:
- Logs de sincronização
- Logs de mudanças de status
- Logs de erros da API externa
- Métricas de performance

### Configuração no Django settings:
```python
LOGGING = {
    'loggers': {
        'features.metricas_ecomhub': {
            'handlers': ['file'],
            'level': 'INFO',
        }
    }
}
```

## Uso Recomendado

### 1. **Sincronização Inicial**
```bash
python manage.py sincronizar_status_tracking --forcar --verbose
```

### 2. **Sincronização Automática** (via cron/scheduler)
```bash
# A cada 6 horas
0 */6 * * * python manage.py sincronizar_status_tracking
```

### 3. **Monitoramento via Dashboard**
- Acesse `/api/metricas/ecomhub/status-tracking/dashboard/`
- Configure alertas baseados em métricas críticas

### 4. **Investigação de Problemas**
- Use filtros por nível de alerta
- Analise histórico de pedidos específicos
- Verifique configurações de limites

## Performance

### Otimizações implementadas:
- Indexes em campos de busca frequente
- Queries otimizadas com select_related/prefetch_related
- Paginação para grandes volumes
- Cache de configurações
- Processamento em lotes para sincronização

### Monitoramento recomendado:
- Tempo de resposta dos endpoints
- Volume de pedidos processados
- Erros na API externa
- Uso de memória durante sincronização

## Segurança

### Implementações de segurança:
- Autenticação obrigatória em todos os endpoints
- Validação rigorosa de parâmetros
- Proteção contra SQL injection
- Rate limiting recomendado
- Logs de auditoria para mudanças críticas