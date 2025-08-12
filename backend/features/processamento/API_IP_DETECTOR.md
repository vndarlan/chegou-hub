# API do Detector de IP - Shopify

## Visão Geral

Esta documentação descreve as novas APIs implementadas para detectar e analisar pedidos do Shopify agrupados pelo mesmo endereço IP. Útil para identificar possíveis fraudes ou compras múltiplas da mesma origem.

## Endpoints Disponíveis

### 1. Buscar Pedidos por IP
**Endpoint:** `POST /processamento/buscar-ips-duplicados/`  
**Descrição:** Agrupa pedidos pelo mesmo IP dos últimos X dias  
**Autenticação:** Obrigatória (Token/Session)

#### Parâmetros de Entrada:
```json
{
    "loja_id": 1,           // ID da loja configurada (obrigatório)
    "days": 30,             // Dias para buscar (padrão: 30, máx: 90)
    "min_orders": 2         // Mínimo pedidos por IP (padrão: 2)
}
```

#### Resposta de Sucesso:
```json
{
    "success": true,
    "loja_nome": "Minha Loja",
    "data": {
        "ip_groups": [
            {
                "ip": "192.168.1.1",
                "order_count": 5,
                "unique_customers": 3,
                "total_sales": "1500.00",
                "currency": "BRL",
                "date_range": {
                    "first": "2024-01-01T10:00:00Z",
                    "last": "2024-01-07T15:30:00Z"
                },
                "orders": [
                    {
                        "id": 12345,
                        "order_number": 1001,
                        "created_at": "2024-01-01T10:00:00Z",
                        "total_price": "299.99",
                        "currency": "BRL",
                        "financial_status": "paid",
                        "fulfillment_status": "unfulfilled",
                        "customer": {
                            "email": "cliente@email.com",
                            "first_name": "João",
                            "last_name": "Silva",
                            "phone": "+5511999999999"
                        },
                        "line_items_count": 2,
                        "tags": "premium"
                    }
                ]
            }
        ],
        "total_ips_found": 12,
        "total_orders_analyzed": 450,
        "period_days": 30
    }
}
```

#### Possíveis Erros:
- `400`: Parâmetros inválidos ou loja não encontrada
- `500`: Erro interno ou falha na API do Shopify

### 2. Detalhar Pedidos de um IP
**Endpoint:** `POST /processamento/detalhar-ip/`  
**Descrição:** Retorna detalhes completos dos pedidos de um IP específico  
**Autenticação:** Obrigatória (Token/Session)

#### Parâmetros de Entrada:
```json
{
    "loja_id": 1,           // ID da loja configurada (obrigatório)
    "ip": "192.168.1.1",    // IP específico (obrigatório)
    "days": 30              // Dias para buscar (padrão: 30, máx: 90)
}
```

#### Resposta de Sucesso:
```json
{
    "success": true,
    "ip": "192.168.1.1",
    "loja_nome": "Minha Loja",
    "data": {
        "ip": "192.168.1.1",
        "order_count": 5,
        "unique_customers": 3,
        "total_sales": "1500.00",
        "currency": "BRL",
        "date_range": {
            "first": "2024-01-01T10:00:00Z",
            "last": "2024-01-07T15:30:00Z"
        },
        "orders": [
            {
                // Dados básicos do pedido (mesmo formato anterior)
                "id": 12345,
                "order_number": 1001,
                // ... outros campos ...
                
                // NOVO: Detalhes completos de endereço
                "address_details": {
                    "order_id": 12345,
                    "order_number": 1001,
                    "order_date": "2024-01-01T10:00:00Z",
                    "order_total": "299.99",
                    "has_shipping": true,
                    "has_billing": true,
                    "shipping_address": {
                        "first_name": "João",
                        "last_name": "Silva",
                        "address1": "Rua das Flores, 123",
                        "address2": "Apto 45",
                        "city": "São Paulo",
                        "province": "São Paulo",
                        "country": "Brazil",
                        "zip": "01234-567",
                        "phone": "+5511999999999",
                        "latitude": "-23.5505",
                        "longitude": "-46.6333"
                    },
                    "billing_address": {
                        // Mesmo formato do shipping_address
                    },
                    "customer_info": {
                        "email": "cliente@email.com",
                        "orders_count": 3,
                        "total_spent": "899.97",
                        "verified_email": true,
                        "state": "enabled"
                    }
                }
            }
        ]
    }
}
```

## Logs e Auditoria

Todas as operações geram logs automáticos no sistema:

- **Tipo:** `busca_ip` (Busca por IP)
- **Status:** `sucesso`, `erro`, `parcial`
- **Detalhes salvos:** Número de IPs encontrados, período, parâmetros

**Visualizar logs:** `GET /processamento/historico-logs/`

## Exemplos de Uso

### cURL - Buscar IPs duplicados
```bash
curl -X POST http://localhost:8000/processamento/buscar-ips-duplicados/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Token seu-token-aqui" \
  -d '{
    "loja_id": 1,
    "days": 30,
    "min_orders": 2
  }'
```

### cURL - Detalhar IP específico
```bash
curl -X POST http://localhost:8000/processamento/detalhar-ip/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Token seu-token-aqui" \
  -d '{
    "loja_id": 1,
    "ip": "192.168.1.1",
    "days": 30
  }'
```

### JavaScript/Fetch
```javascript
// Buscar IPs duplicados
const response = await fetch('/processamento/buscar-ips-duplicados/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRFToken': getCsrfToken()
  },
  body: JSON.stringify({
    loja_id: 1,
    days: 30,
    min_orders: 2
  })
});

const data = await response.json();
if (data.success) {
  console.log(`${data.data.total_ips_found} IPs encontrados`);
  data.data.ip_groups.forEach(group => {
    console.log(`IP: ${group.ip} - ${group.order_count} pedidos`);
  });
}
```

## Considerações Importantes

### Performance
- Limite máximo de 90 dias para evitar timeout
- Paginação automática até 50 páginas (12.500 pedidos)
- Cache recomendado para consultas frequentes
- Monitoramento de uso recomendado para lojas grandes

### Segurança
- Autenticação obrigatória em todos os endpoints
- Rate limiting recomendado (10 req/min por usuário)
- IPs são tratados como dados sensíveis
- Logs detalhados para auditoria

### Filtros Aplicados
- Apenas pedidos não cancelados
- Apenas pedidos com `client_details.browser_ip` válido
- Grouping por IP exato (sem normalização)
- Ordenação por quantidade de pedidos (decrescente)

### Limitações
- Depende do Shopify registrar o `browser_ip` 
- IPs dinâmicos podem gerar falsos positivos
- VPNs/proxies podem mascarar origem real
- Não detecta usuários usando IPs diferentes

## Casos de Uso

1. **Detecção de Fraude:** Identificar múltiplas compras do mesmo IP
2. **Análise de Comportamento:** Entender padrões de compra por localização
3. **Marketing:** Identificar regiões com alta concentração de clientes
4. **Compliance:** Auditoria de pedidos para regulamentações
5. **Suporte:** Investigar problemas reportados por clientes

## Próximos Passos

Funcionalidades planejadas:
- [ ] Exportação de relatórios em CSV/Excel
- [ ] Alertas automáticos para IPs suspeitos
- [ ] Dashboard visual com mapas e gráficos
- [ ] Integração com sistema de fraude
- [ ] API para cancelamento em lote por IP