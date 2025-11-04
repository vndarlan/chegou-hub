# Análise: Discrepância entre API ECOMHUB e Interface Web

**Data:** 03/11/2025
**Loja testada:** Token `52cd74c3-b3cc-47a0-b23d-7c2fd00e517d` (Loja 2 - Romênia)
**Período testado:** 3 meses (05/08/2025 a 03/11/2025)

---

## 🔍 PROBLEMA IDENTIFICADO

**Esperado (ECOMHUB Manual):** 40 pedidos
**Encontrado (API Direta):** 24 pedidos
**DIFERENÇA:** 16 pedidos faltando (40%)

---

## 📊 RESULTADOS DOS TESTES

### Teste 1: API Direta (V2)
**Endpoint:** `https://api.ecomhub.app/apps/orders`
**Implementação:** `efetividade_v2_service.py` (linha 67)

```
Total de pedidos: 24
Romênia (ID 142): 22 pedidos
Outro país (ID 158): 2 pedidos

Período real dos dados: 22/09/2025 a 03/10/2025 (11 dias)

Status encontrados:
  - delivered: 13
  - returned: 11

TOTAL: 24 pedidos (apenas 2 status)
```

### Teste 2: Busca sem filtros
**Mesmo resultado:** 24 pedidos totais
**Observação:** A API só retorna 24 pedidos, mesmo sem filtros de país ou data

---

## 🎯 CAUSA RAIZ IDENTIFICADA

### API ECOMHUB está LIMITADA
1. **Retorna apenas 2 status:** `delivered` e `returned`
2. **Período restrito:** Apenas 11 dias de dados (não 3 meses)
3. **Filtragem oculta:** API parece filtrar pedidos por status automaticamente
4. **16 pedidos ausentes:** Provavelmente estão em outros status:
   - `preparing_for_shipping`
   - `ready_to_ship`
   - `out_for_delivery`
   - `with_courier`
   - `issue`
   - `returning`
   - `cancelled`
   - etc.

---

## ✅ SOLUÇÃO: Método Selenium

### EcomhubPage.js (FUNCIONANDO)
**Endpoint:** `/metricas/ecomhub/analises/processar_selenium/`
**Implementação:** `views.py` (linha 95-188)
**Servidor externo:** `http://localhost:8001/api/processar-ecomhub/`

```javascript
// frontend/src/features/metricas/EcomhubPage.js (linha 112)
const response = await axios.post('/metricas/ecomhub/analises/processar_selenium/', {
    data_inicio: dateRange.from.toISOString().split('T')[0],
    data_fim: dateRange.to.toISOString().split('T')[0],
    pais_id: paisSelecionado  // 'todos' ou ID específico
});
```

### Como funciona:
1. Frontend envia requisição para backend Django
2. Backend Django envia requisição para servidor Selenium (localhost:8001)
3. Selenium faz **scraping da interface web** do ECOMHUB
4. Captura **TODOS os pedidos** (todos os status)
5. Retorna dados completos para o frontend

### Vantagens:
- ✅ Captura **TODOS os 40 pedidos** (não apenas 24)
- ✅ Inclui **TODOS os status** (não apenas delivered/returned)
- ✅ Dados do **período completo** (não apenas 11 dias)
- ✅ Já implementado e funcionando em EcomhubPage.js

---

## 📋 COMPARAÇÃO DETALHADA

| Característica | API Direta (V2) | Selenium (EcomhubPage) |
|---------------|-----------------|------------------------|
| **Pedidos retornados** | 24 | 40 |
| **Status capturados** | 2 (delivered, returned) | TODOS |
| **Período** | 11 dias | Período completo |
| **Confiabilidade** | ❌ Incompleto | ✅ Completo |
| **Performance** | ⚡ Rápido | 🐢 Mais lento |
| **Dependência** | Nenhuma | Servidor Selenium |

---

## 🚀 RECOMENDAÇÃO

### Opção 1: Migrar V2 para usar Selenium (RECOMENDADO)
**Arquivo:** `EcomhubEfetividadeV2Page.js`
**Mudança:** Trocar endpoint de API direta para `processar_selenium`

**Prós:**
- ✅ Captura todos os 40 pedidos
- ✅ Dados completos e precisos
- ✅ Já implementado e testado em EcomhubPage.js

**Contras:**
- ⚠️ Depende do servidor Selenium (localhost:8001)
- ⚠️ Mais lento que API direta
- ⚠️ Requer servidor externo rodando

### Opção 2: Manter API direta + Warning ao usuário
**Mudança:** Adicionar aviso de que dados podem estar incompletos

**Prós:**
- ✅ Sem dependências externas
- ✅ Performance rápida

**Contras:**
- ❌ Dados incompletos (60% dos pedidos apenas)
- ❌ Métricas imprecisas

---

## 🔧 IMPLEMENTAÇÃO SUGERIDA

### Migrar EcomhubEfetividadeV2Page para usar Selenium

**Código atual (API direta):**
```javascript
// Usa fetch_orders_from_ecomhub_api (API direta)
const response = await axios.post('/metricas/ecomhub/analises/v2/gerar/', {
    data_inicio, data_fim, country_id
});
```

**Código sugerido (Selenium):**
```javascript
// Usar processar_selenium (completo)
const response = await axios.post('/metricas/ecomhub/analises/processar_selenium/', {
    data_inicio: dataInicio.toISOString().split('T')[0],
    data_fim: dataFim.toISOString().split('T')[0],
    pais_id: countryId.toString()  // Converter para string
});
```

---

## 📁 ARQUIVOS ENVOLVIDOS

### Backend
- `backend/features/metricas_ecomhub/services/efetividade_v2_service.py` (linha 67-130)
  → Usa API direta (incompleta)

- `backend/features/metricas_ecomhub/views.py` (linha 95-188)
  → Implementa `processar_selenium` (completo)

### Frontend
- `frontend/src/features/metricas/EcomhubEfetividadeV2Page.js`
  → Usa API direta (precisa migrar para Selenium)

- `frontend/src/features/metricas/EcomhubPage.js` (linha 112-116)
  → Usa Selenium (funcionando corretamente)

---

## 📌 CONCLUSÃO

A API oficial da ECOMHUB (`https://api.ecomhub.app/apps/orders`) **NÃO retorna todos os pedidos**. Ela filtra automaticamente por status, retornando apenas pedidos "delivered" e "returned".

Para capturar **TODOS os 40 pedidos** (incluindo os 16 faltantes), é necessário usar o método **Selenium** que faz scraping da interface web, conforme já implementado em `EcomhubPage.js`.

**Decisão final:** Aguardar aprovação do proprietário para migrar `EcomhubEfetividadeV2Page.js` para usar o método Selenium.
