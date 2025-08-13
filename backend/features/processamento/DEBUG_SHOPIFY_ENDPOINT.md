# 🔍 Endpoint Debug Shopify - Ferramenta Temporária

## Endpoint
**POST** `/api/processamento/debug-shopify-data/`

## Descrição
Ferramenta temporária de debug para capturar dados RAW exatamente como chegam da API do Shopify, com foco na análise dos campos de IP disponíveis.

## Parâmetros

```json
{
    "loja_id": 123  // ID da loja configurada no sistema
}
```

## Resposta de Sucesso

```json
{
    "success": true,
    "debug_info": {
        "loja_nome": "Minha Loja",
        "api_version": "2024-07",
        "order_id": 5678901234,
        "order_number": "#1001",
        "timestamp": "2025-08-13T11:50:00Z"
    },
    "ip_analysis": {
        "ips_found": [
            {
                "ip": "192.168.1.100",
                "source_path": "client_details.browser_ip",
                "source_description": "client_details.browser_ip"
            }
        ],
        "ip_fields_structure": {
            "client_details.browser_ip": {
                "value": "192.168.1.100",
                "type": "str",
                "is_ip_like": true
            }
        },
        "potential_ip_sources": ["client_details.browser_ip"],
        "client_details_analysis": {
            "exists": true,
            "all_fields": ["browser_ip", "accept_language", "user_agent", "session_hash"],
            "ip_related_fields": {
                "browser_ip": {
                    "value": "192.168.1.100",
                    "looks_like_ip": true
                }
            }
        },
        "address_analysis": {
            "shipping_address": {
                "exists": true,
                "all_fields": ["first_name", "last_name", "address1", "city", "zip", "country"],
                "ip_related_fields": {}
            },
            "billing_address": {
                "exists": true,
                "all_fields": ["first_name", "last_name", "address1", "city", "zip", "country"],
                "ip_related_fields": {}
            }
        },
        "customer_analysis": {
            "exists": true,
            "all_fields": ["id", "email", "first_name", "last_name", "phone", "default_address"],
            "ip_related_fields": {},
            "default_address": {
                "exists": true,
                "all_fields": ["first_name", "last_name", "address1", "city", "zip", "country"],
                "ip_related_fields": {}
            }
        },
        "order_level_analysis": {
            "ip_related_fields": {},
            "total_root_fields": 45
        },
        "summary": {
            "total_ips_found": 1,
            "total_ip_fields": 1,
            "has_client_details": true,
            "has_shipping_address": true,
            "has_billing_address": true,
            "has_customer_data": true,
            "has_customer_default_address": true
        }
    },
    "raw_order_data": {
        "id": 5678901234,
        "order_number": "#1001",
        "created_at": "2025-08-13T11:00:00Z",
        "total_price": "29.99",
        "currency": "BRL",
        "financial_status": "paid",
        "fulfillment_status": null,
        "customer": {
            "id": 123456,
            "email": "cus***@email.com",  // Sanitizado
            "first_name": "Jo***",        // Sanitizado
            "last_name": "Si***",         // Sanitizado
            "phone": "1199****99",        // Sanitizado
            "default_address": {
                "first_name": "Jo***",    // Sanitizado
                "last_name": "Si***",     // Sanitizado
                "address1": "Rua ***",    // Sanitizado
                "city": "São Paulo",
                "zip": "01310-000",
                "country": "Brazil"
            }
        },
        "shipping_address": {
            "first_name": "Jo***",        // Sanitizado
            "last_name": "Si***",         // Sanitizado
            "address1": "Rua ***",        // Sanitizado
            "city": "São Paulo",
            "zip": "01310-000",
            "country": "Brazil"
        },
        "billing_address": {
            "first_name": "Jo***",        // Sanitizado
            "last_name": "Si***",         // Sanitizado
            "address1": "Rua ***",        // Sanitizado
            "city": "São Paulo",
            "zip": "01310-000",
            "country": "Brazil"
        },
        "client_details": {
            "browser_ip": "192.168.1.100",  // MANTIDO para análise
            "accept_language": "pt-BR,pt;q=0.9,en;q=0.8",
            "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
            "session_hash": "abc123def456"
        },
        "line_items": [
            {
                "id": 789012345,
                "product_id": 987654321,
                "variant_id": 111222333,
                "title": "Produto Teste",
                "price": "29.99",
                "quantity": 1,
                "sku": "PROD-001"
            }
        ]
    },
    "warning": "Esta é uma ferramenta temporária de debug. Dados sensíveis foram removidos."
}
```

## Exemplo de Uso (cURL)

```bash
curl -X POST http://localhost:8000/api/processamento/debug-shopify-data/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "loja_id": 1
  }'
```

## Exemplo de Uso (Python)

```python
import requests

url = "http://localhost:8000/api/processamento/debug-shopify-data/"
headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer YOUR_TOKEN"  # Ajustar conforme autenticação
}
data = {
    "loja_id": 1
}

response = requests.post(url, json=data, headers=headers)
result = response.json()

if result.get("success"):
    print("=== ANÁLISE DE IPs ===")
    ip_analysis = result["ip_analysis"]
    
    print(f"Total de IPs encontrados: {ip_analysis['summary']['total_ips_found']}")
    print(f"Possui client_details: {ip_analysis['summary']['has_client_details']}")
    print(f"Possui customer.default_address: {ip_analysis['summary']['has_customer_default_address']}")
    
    print("\n=== IPs ENCONTRADOS ===")
    for ip_info in ip_analysis["ips_found"]:
        print(f"IP: {ip_info['ip']} (Fonte: {ip_info['source_path']})")
    
    print("\n=== CAMPOS DE IP NA ESTRUTURA ===")
    for field, info in ip_analysis["ip_fields_structure"].items():
        print(f"{field}: {info['value']} (Tipo: {info['type']}, É IP: {info['is_ip_like']})")

else:
    print(f"Erro: {result.get('error')}")
```

## Funcionalidades

### 1. **Busca de Dados RAW**
- Busca 1 pedido recente dos últimos 7 dias
- Mantém estrutura completa dos dados do Shopify
- Remove apenas dados muito sensíveis (pagamentos, tokens)

### 2. **Análise Automática de IPs**
- Detecta todos os campos relacionados a IP
- Analisa estrutura de `client_details`, endereços e customer
- Identifica possíveis fontes de IP do cliente

### 3. **Sanitização Inteligente**
- Remove dados sensíveis mas mantém estrutura
- Preserva campos de IP para análise
- Mascara informações pessoais (nome, email, telefone)

### 4. **Auditoria de Segurança**
- Registra todos os acessos ao debug
- Logs detalhados para rastreamento
- Controle de acesso com autenticação

## Possíveis Fontes de IP Encontradas

Com base na análise do código, o endpoint irá verificar estas possíveis fontes:

1. **client_details.browser_ip** (fonte atual principal)
2. **customer.default_address.client_ip**
3. **customer.default_address.customer_ip**
4. **customer.default_address.ip_address**
5. **shipping_address.client_ip**
6. **shipping_address.customer_ip**
7. **billing_address.client_ip**
8. **billing_address.customer_ip**
9. **customer.last_order_ip**
10. **order.customer_ip** (nível raiz)

## Análise dos Resultados

### O que Procurar:

1. **Verificar se `client_details` existe**
   - Se não existir, o IP atual não funcionará
   - Procurar fontes alternativas

2. **Analisar `customer.default_address`**
   - Pode conter dados de IP mais confiáveis
   - Prioridade na hierarquia de busca

3. **Verificar endereços de entrega/cobrança**
   - Podem ter campos de IP específicos
   - Útil para validação cruzada

4. **Campos no nível do pedido**
   - Verificar se existem IPs diretos no pedido
   - Campos alternativos como `real_ip`, `origin_ip`

## Status Temporário

⚠️ **IMPORTANTE**: Este é um endpoint temporário para debug e deve ser removido após a análise.

- Contém logs de auditoria para rastrear uso
- Remove dados sensíveis mas mantém estrutura para análise
- Limitado a 1 pedido por consulta para evitar sobrecarga
- Acesso restrito a usuários autenticados

## Próximos Passos

1. **Executar debug em loja real**
2. **Analisar estrutura de IP retornada**
3. **Identificar melhor fonte de IP disponível**
4. **Ajustar lógica de extração em `shopify_detector.py`**
5. **Remover endpoint após conclusão**