# Changelog - Shopify Detector - Inclusão de Pedidos Cancelados

## Data: 2025-08-15

### Modificações Realizadas

#### Problema Identificado
- O método `get_orders_by_ip()` estava ignorando pedidos cancelados (linha 958-960)
- Isso impedia detectar IPs duplicados quando alguns pedidos foram cancelados
- Exemplo real: IP 31.217.1.48 tem 6 pedidos hoje, mas 5 estão cancelados

#### Mudanças Implementadas

1. **Método `get_orders_by_ip()`**:
   - ❌ Removido filtro que ignora pedidos cancelados na linha 958-960
   - ✅ Adicionados campos `_is_cancelled` e `_cancelled_at` nos dados dos pedidos
   - ✅ Incluído contador `cancelled_orders_included` nas estatísticas de debug
   - ✅ Adicionados campos `cancelled_orders` e `active_orders` nos resultados por IP

2. **Método `get_all_orders()`**:
   - ❌ Removido filtro `if not is_cancelled` na linha 202
   - ✅ Mantida validação de cliente válido
   - ✅ Adicionados campos de cancelamento nos pedidos retornados

3. **Estrutura dos Dados Retornados**:
   ```python
   # Para cada pedido individual:
   {
       "id": order_id,
       "cancelled_at": "2025-01-15T10:30:00Z" | null,
       "is_cancelled": true | false,
       # ... outros campos existentes
   }
   
   # Para cada grupo de IP:
   {
       "ip": "31.217.1.48",
       "order_count": 6,
       "cancelled_orders": 5,  # NOVO
       "active_orders": 1,     # NOVO
       # ... outros campos existentes
   }
   ```

4. **Estatísticas de Debug Atualizadas**:
   - Adicionado `cancelled_orders_included` no debug_stats
   - Logs atualizados para mostrar quantidade de cancelados incluídos

#### Compatibilidade
- ✅ Mantida compatibilidade total com código existente
- ✅ API não quebra - apenas adiciona novos campos
- ✅ Funcionalidade existente preservada
- ✅ Adicionadas informações extras sobre cancelamento

#### Benefícios
- Detecta IPs duplicados mesmo quando pedidos estão cancelados
- Fornece visibilidade completa sobre status dos pedidos por IP
- Permite análise mais precisa de padrões suspeitos
- Melhora capacidade de detecção de fraudes

#### Teste Recomendado
Após deploy, testar com o IP 31.217.1.48 para verificar se agora retorna todos os 6 pedidos (5 cancelados + 1 ativo).