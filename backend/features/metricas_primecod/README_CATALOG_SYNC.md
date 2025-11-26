# Sincronização Automática do Catálogo PrimeCOD

## Visão Geral

Sistema de sincronização automática do catálogo de produtos PrimeCOD, executado diariamente às 6h da manhã (horário de Brasília).

## Modelos

### `PrimeCODCatalogProduct`
Armazena informações completas dos produtos do catálogo PrimeCOD:
- **Identificação**: primecod_id (único), sku, name, description
- **Estoque**: quantity, stock_label (High/Medium/Low)
- **Vendas**: total_units_sold, total_orders
- **Preços**: price, cost
- **Dados complementares**: countries (JSON), images (JSON)
- **Controles**: is_new (True para produtos vistos há < 24h), first_seen_at

### `PrimeCODCatalogSnapshot`
Snapshots diários para histórico de estoque e vendas:
- **Dados**: quantity, total_units_sold
- **Data**: snapshot_date (único por produto/dia)
- **Relacionamento**: ForeignKey para PrimeCODCatalogProduct

## Task: `sync_primecod_catalog()`

### Fluxo da Sincronização

1. **Coleta da API**
   - Busca todas as páginas do endpoint `/api/catalog/products`
   - API retorna ~10 produtos por página
   - Loop automático até encontrar página vazia

2. **Processamento de Produtos**
   - Para cada produto da API:
     - Se não existe (by `primecod_id`): criar novo produto com `is_new=True`
     - Se existe: atualizar todos os dados do produto
   - Mapeia campos da API para o model:
     ```python
     {
         "id": primecod_id,
         "sku": sku,
         "name": name,
         "description": description,
         "quantity": quantity,
         "stock_label": stock_label (ou "stock"),
         "total_units_sold": total_units_sold,
         "total_orders": total_orders,
         "price": price,
         "cost": cost,
         "countries": [{"name": "...", "code": "..."}],
         "images": [{"path": "url"}]
     }
     ```

3. **Criação de Snapshots**
   - Para cada produto processado, cria/atualiza snapshot do dia
   - Permite calcular variações de estoque e vendas ao longo do tempo

4. **Limpeza de Produtos Novos**
   - Marca `is_new=False` para produtos com `first_seen_at` > 24h

### Estatísticas Retornadas

```python
{
    'status': 'success',
    'duration': 12.5,  # segundos
    'total_products_api': 30,  # produtos coletados da API
    'products_created': 5,  # novos produtos
    'products_updated': 25,  # produtos atualizados
    'products_error': 0,  # erros de processamento
    'snapshots_created': 30,  # snapshots criados hoje
    'old_products_updated': 2,  # produtos marcados como não-novos
    'sync_date': '2025-11-25',
    'message': 'Sincronização concluída: 5 novos, 25 atualizados, 30 snapshots'
}
```

## Schedule Automático

### Configuração (apps.py)

```python
# Executa diariamente às 6h (horário de Brasília)
scheduler.add_job(
    sync_primecod_catalog,
    trigger=CronTrigger(hour=6, minute=0, timezone='America/Sao_Paulo'),
    id='sync_primecod_catalog',
    name='Sincronizar catálogo PrimeCOD diariamente às 6h',
    replace_existing=True,
    max_instances=1
)
```

### Habilitação

**Produção (Railway)**: Ativado automaticamente quando `DEBUG=False`

**Desenvolvimento local**: Adicionar ao `.env`:
```bash
ENABLE_SCHEDULER=True
```

## Execução Manual

### Via Management Command

```bash
# Sincronizar catálogo manualmente
cd backend
python manage.py sync_primecod_catalog
```

### Via Django Shell

```python
from features.metricas_primecod.jobs import sync_primecod_catalog

# Executar sincronização
result = sync_primecod_catalog()
print(result)
```

## Variáveis de Ambiente

### Obrigatório

```bash
# Token de autenticação da API PrimeCOD
PRIMECOD_API_TOKEN=seu_token_aqui
```

Já configurado em `backend/config/settings.py`:
```python
PRIMECOD_API_TOKEN = os.getenv('PRIMECOD_API_TOKEN', '')
```

## Logs

### Exemplo de Saída

```
🔄 [SYNC CATALOG] Iniciando sincronização automática do catálogo PrimeCOD
✅ [SYNC CATALOG] Cliente PrimeCOD inicializado com sucesso
📡 [SYNC CATALOG] Buscando produtos da API PrimeCOD...
📄 [SYNC CATALOG] Buscando página 1...
✅ [SYNC CATALOG] Página 1: 10 produtos coletados
📄 [SYNC CATALOG] Buscando página 2...
✅ [SYNC CATALOG] Página 2: 10 produtos coletados
📄 [SYNC CATALOG] Buscando página 3...
✅ [SYNC CATALOG] Página 3: 10 produtos coletados
📄 [SYNC CATALOG] Buscando página 4...
✅ [SYNC CATALOG] Página 4 sem produtos - fim da coleta
✅ [SYNC CATALOG] Total de produtos coletados: 30
✨ [SYNC CATALOG] Produto NOVO criado: [SKU123] Nome do Produto
🔄 [SYNC CATALOG] Produto atualizado: [SKU456] Outro Produto
...
🔄 [SYNC CATALOG] Produtos marcados como não-novos: 2
✅ [SYNC CATALOG] Sincronização finalizada com sucesso em 12.5s
📊 [SYNC CATALOG] Produtos novos: 5
📊 [SYNC CATALOG] Produtos atualizados: 25
📊 [SYNC CATALOG] Snapshots criados: 30
📊 [SYNC CATALOG] Erros: 0
```

## API Endpoints (Frontend)

### GET /api/metricas-primecod/catalog/products/
Lista produtos do catálogo com variações calculadas (delta estoque/vendas vs ontem)

### GET /api/metricas-primecod/catalog/products/{id}/
Detalhes completos de um produto

### GET /api/metricas-primecod/catalog/snapshots/
Lista todos os snapshots históricos

## Serializers

- `PrimeCODCatalogProductSerializer`: Dados completos + deltas calculados
- `PrimeCODCatalogProductResumoSerializer`: Versão resumida para listagem
- `PrimeCODCatalogSnapshotSerializer`: Dados de snapshots históricos

## Troubleshooting

### Sincronização não está rodando automaticamente

1. Verificar se scheduler está habilitado:
   ```bash
   # Logs do Django ao iniciar
   ✓ APScheduler iniciado: sincronização catálogo PrimeCOD diariamente às 6h
   ```

2. Em desenvolvimento, garantir:
   ```bash
   ENABLE_SCHEDULER=True  # no .env
   ```

### Erro: "Token de autenticação inválido"

1. Verificar token no ambiente:
   ```bash
   # No .env (local) ou Railway Variables (produção)
   PRIMECOD_API_TOKEN=seu_token_valido
   ```

2. Testar autenticação:
   ```python
   from features.metricas_primecod.clients.primecod_client import PrimeCODClient

   client = PrimeCODClient()
   result = client.test_connection()
   print(result)
   ```

### Produtos não sendo marcados como não-novos

A limpeza de `is_new=False` só acontece para produtos com:
- `is_new=True`
- `first_seen_at < (agora - 24 horas)`

Isso é executado automaticamente ao final de cada sincronização.

## Próximos Passos

1. ✅ Task de sincronização criada
2. ✅ Scheduler configurado (6h diariamente)
3. ✅ Management command para testes
4. ⏳ **Aguardando**: Adicionar endpoint para trigger manual no frontend
5. ⏳ **Aguardando**: Dashboard de monitoramento de sincronizações
6. ⏳ **Aguardando**: Notificações de novos produtos

## Referências

- API PrimeCOD: `POST https://api.primecod.app/api/catalog/products?page=X`
- Models: `backend/features/metricas_primecod/models.py`
- Jobs: `backend/features/metricas_primecod/jobs.py`
- Scheduler: `backend/features/metricas_primecod/apps.py`
