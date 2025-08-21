# REFINAMENTO DO SISTEMA DE STATUS TRACKING ECOMHUB

## 🎯 OBJETIVO REFINADO

**Focar APENAS em pedidos que podem ter problemas**, ignorando pedidos já finalizados com sucesso.

**FOCO**: Identificar pedidos "travados" em status por muito tempo, não pedidos já resolvidos.

---

## ✅ MUDANÇAS IMPLEMENTADAS

### 1. **DEFINIÇÃO DE STATUS**

#### **STATUS FINAIS** (não precisam monitoramento):
```python
STATUS_FINAIS = [
    'delivered',      # Entregue com sucesso
    'returned',       # Devolvido (finalizado)  
    'cancelled'       # Cancelado (finalizado)
]
```

#### **STATUS ATIVOS** (precisam monitoramento):
```python
STATUS_ATIVOS = [
    'processing',             # Processando
    'preparing_for_shipping', # Preparando envio
    'ready_to_ship',         # Pronto para enviar
    'shipped',               # Enviado
    'with_courier',          # Com transportadora
    'out_for_delivery',      # Saiu para entrega
    'issue'                  # Com problema (CRÍTICO)
]
```

### 2. **LÓGICA DE ALERTAS REFINADA**

```python
def calcular_nivel_alerta(self):
    # IGNORAR STATUS FINAIS
    if status in self.STATUS_FINAIS:
        return 'normal'
    
    # APLICAR REGRAS APENAS PARA STATUS ATIVOS
    if status == 'issue':
        # PROBLEMA - sempre crítico se > 24h
        if horas >= 24: return 'critico'
        else: return 'amarelo'
    
    elif status == 'out_for_delivery':
        # Mais urgente - saiu para entrega
        if horas >= 168: return 'critico'  # 7 dias
        elif horas >= 120: return 'vermelho' # 5 dias
        elif horas >= 72: return 'amarelo'   # 3 dias
    
    elif status in ['shipped', 'with_courier']:
        # Médio - em trânsito
        if horas >= 336: return 'critico'  # 14 dias
        elif horas >= 240: return 'vermelho' # 10 dias
        elif horas >= 168: return 'amarelo'  # 7 dias
        
    elif status in ['processing', 'preparing_for_shipping', 'ready_to_ship']:
        # Processamento interno
        if horas >= 504: return 'critico'  # 21 dias
        elif horas >= 336: return 'vermelho' # 14 dias
        elif horas >= 168: return 'amarelo'  # 7 dias
```

### 3. **DASHBOARD FOCADO EM ATIVOS**

#### **Métricas Principais**:
- **total_pedidos_ativos**: Pedidos que precisam monitoramento
- **alertas_criticos**: Pedidos com problemas graves
- **alertas_vermelhos**: Pedidos com atraso significativo
- **alertas_amarelos**: Pedidos com atraso moderado
- **pedidos_normais_ativos**: Pedidos ativos sem problemas

#### **Distribuições**:
- **distribuicao_status**: Por status específico
- **distribuicao_categorias**: 
  - `processando`: processing, preparing_for_shipping, ready_to_ship
  - `em_transito`: shipped, with_courier, out_for_delivery
  - `problemas`: issue

#### **Métricas de Eficiência**:
- **eficiencia_entrega_pct**: % de pedidos entregues com sucesso
- **taxa_problemas_pct**: % de pedidos ativos com problemas

### 4. **NOVOS ENDPOINTS**

#### **Pedidos Problemáticos**:
```
GET /api/status-tracking/pedidos-problematicos/
```
- Retorna apenas pedidos com alertas (amarelo, vermelho, crítico)
- Foco total em problemas operacionais

#### **Resumo de Eficiência**:
```
GET /api/status-tracking/resumo-eficiencia/
```
- Visão geral: ativos vs finalizados
- Métricas de performance do sistema

#### **Listagem com Filtro de Finalizados**:
```
GET /api/status-tracking/pedidos/?incluir_finalizados=true
```
- Por padrão: apenas ativos
- Opção para incluir finalizados quando necessário

---

## 🚀 BENEFÍCIOS

### **1. FOCO OPERACIONAL**
- Dashboard mostra apenas o que precisa de ação
- Elimina "ruído" de pedidos já resolvidos
- Identifica rapidamente problemas reais

### **2. ALERTAS INTELIGENTES**
- Status `issue` sempre crítico (> 24h)
- `out_for_delivery` com limite baixo (muito urgente)
- Limites específicos por tipo de status

### **3. MÉTRICAS ÚTEIS**
- **Taxa de Problemas**: % de ativos com alertas
- **Eficiência de Entrega**: % de entregas bem-sucedidas
- **Distribuição por Categorias**: processando, em trânsito, problemas

### **4. PERFORMANCE**
- Queries otimizadas (apenas ativos)
- Dashboard mais rápido
- Foco em dados relevantes

---

## 📊 EXEMPLO DE USO

### **Dashboard Antes** (todos os pedidos):
```json
{
  "total_pedidos": 10000,
  "alertas_criticos": 50,
  "alertas_vermelhos": 30,
  "alertas_amarelos": 20
}
```

### **Dashboard Depois** (apenas ativos):
```json
{
  "total_pedidos_ativos": 2000,
  "alertas_criticos": 50,
  "alertas_vermelhos": 30, 
  "alertas_amarelos": 20,
  "eficiencia_entrega_pct": 85.5,
  "taxa_problemas_pct": 5.0
}
```

**RESULTADO**: Foco em 2000 pedidos que realmente precisam de atenção, ao invés de 10000 onde 8000 já estão finalizados!

---

## 🔧 CONFIGURAÇÕES

### **Models**:
- Constantes `STATUS_FINAIS` e `STATUS_ATIVOS`
- Properties `is_ativo` e `is_finalizado`
- Lógica refinada em `calcular_nivel_alerta()`

### **Services**:
- Filtros automáticos por pedidos ativos
- Métricas de eficiência adicionadas
- Performance otimizada

### **Views**:
- Parâmetro `incluir_finalizados` (padrão: false)
- Novos endpoints específicos
- Filtros inteligentes

### **Serializers**:
- Campos `is_ativo` e `is_finalizado`
- Métricas atualizadas no dashboard
- Suporte ao novo filtro

---

## 💡 PRÓXIMOS PASSOS

1. **Frontend**: Adaptar dashboard para novas métricas
2. **Alertas**: Implementar notificações para pedidos críticos
3. **Relatórios**: Criar relatórios de eficiência
4. **Automação**: Jobs para monitoramento contínuo

**FOCO TOTAL EM IDENTIFICAR PROBLEMAS OPERACIONAIS! 🎯**