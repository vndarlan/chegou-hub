# DIAGNÓSTICO: Sistema não busca todos os pedidos da loja

## PROBLEMA IDENTIFICADO

O sistema está deixando de buscar pedidos antigos da API ECOMHUB devido a **problemas na lógica de paginação**.

### Evidência 1: `sync_service.py` - Busca apenas 1 página
**Arquivo:** `backend/features/metricas_ecomhub/services/sync_service.py`

```python
def fetch_orders_from_api(token, secret):
    """Busca pedidos da API ECOMHUB"""
    try:
        response = requests.get(
            'https://api.ecomhub.app/apps/orders',
            params={
                'token': token,
                'orderBy': 'updatedAt',  # ⚠️ PROBLEMA 1
                'skip': 0                 # ⚠️ PROBLEMA 2: Sem paginação!
            },
            ...
        )
        if response.status_code == 200:
            return response.json()  # Retorna apenas 1 página (até 500 pedidos)
        else:
            return []
```

**Problemas:**
1. NÃO implementa paginação - busca apenas primeira página
2. Retorna no máximo 500 pedidos
3. API pode ter milhares de pedidos históricos

### Evidência 2: Duas implementações diferentes

#### IMPLEMENTAÇÃO ERRADA (sync_service.py)
- Busca: **1 página apenas** (linhas 202-235)
- Pedidos retornados: **até 500**
- Usa: `orderBy: 'updatedAt'` (pode pegar pedidos antigos atualizados)

#### IMPLEMENTAÇÃO CORRETA (efetividade_v2_service.py)
- Busca: **até 200 páginas** com paginação completa (linhas 62-146)
- Pedidos retornados: **até 100.000** (200 x 500)
- Usa: `orderBy: 'date'` (ordena por data)
- Para quando: `len(orders) < 500` OU array vazio

```python
# efetividade_v2_service.py - CORRETO
while True:
    response = requests.get(
        f"{API_BASE_URL}/orders",
        params={
            'token': token,
            'orderBy': 'date',
            'skip': skip  # ✓ Paginação implementada
        },
        ...
    )
    
    orders = response.json()
    
    if not orders or len(orders) == 0:
        break  # ✓ Para em array vazio
    
    all_orders.extend(orders)
    
    if len(orders) < page_size:
        break  # ✓ Para quando menos de 500
    
    skip += page_size  # ✓ Incrementa skip
```

---

## ROOT CAUSE

O comando `sync_ecomhub_orders.py` usa `sync_store()` que chama `fetch_orders_from_api()` 
do `sync_service.py`, que **NÃO implementa paginação**.

Resultado: Sistema sincroniza apenas os 500 pedidos mais recentes, deixando de pegar pedidos antigos.

---

## IMPACTO

**Cenário do usuário:**
- Loja tem ~5.000 pedidos históricos
- Sistema busca apenas: 500 pedidos (últimos atualizados)
- Pedidos em falta: ~4.500

**Se usar períodos grandes (ex: últimos 120 dias):**
- Dados incompletos
- Métricas erradas
- Taxa de efetividade calculada incorretamente

---

## TESTE: Confirmar o problema

Executar `test_limite_paginacao.py` para descobrir:
1. Quantos pedidos reais a loja tem
2. Se `orderBy: 'date'` é ASC ou DESC
3. Quantas páginas são necessárias para buscar TODOS

**Resultado esperado:**
- Descobrir que há muito mais pedidos do que os 500 da primeira busca

---

## SOLUÇÃO RECOMENDADA

### Opção A: Usar função correta (efetividade_v2_service.py)
Trocar `sync_service.py` para usar a função `fetch_orders_from_ecomhub_api()` que 
já implementa paginação corretamente.

### Opção B: Corrigir sync_service.py
Implementar paginação em `fetch_orders_from_api()` assim como em 
`efetividade_v2_service.py` (linhas 90-145).

---

## CHECKLIST DE IMPLEMENTAÇÃO

- [ ] 1. Executar `test_limite_paginacao.py` para descobrir volume real
- [ ] 2. Escolher estratégia: Opção A ou B
- [ ] 3. Atualizar código (se Opção B)
- [ ] 4. Testar com período grande (ex: últimos 120 dias)
- [ ] 5. Verificar se todos os pedidos foram sincronizados
- [ ] 6. Confirmar métricas estão corretas

---

## ARQUIVOS ENVOLVIDOS

- **Problema:** `backend/features/metricas_ecomhub/services/sync_service.py` (linhas 202-235)
- **Exemplo correto:** `backend/features/metricas_ecomhub/services/efetividade_v2_service.py` (linhas 62-146)
- **Teste:** `backend/test_limite_paginacao.py`
- **Comando que sincroniza:** `backend/features/metricas_ecomhub/management/commands/sync_ecomhub_orders.py`

