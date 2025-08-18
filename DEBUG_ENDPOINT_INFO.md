# Endpoint de Debug Temporário - Detector de IP

## Problema Identificado
- Usuário autenticado recebe erro 400 no endpoint `/buscar-ips-duplicados-simples/`
- Suspeita: usuário sem loja configurada ou associação incorreta

## Endpoint Criado
**URL**: `/api/processamento/debug-detector-ip-user-data/`  
**Método**: GET  
**Autenticação**: Requerida  

### URL Completa em Produção:
```
https://chegou-hubb-production.up.railway.app/api/processamento/debug-detector-ip-user-data/
```

### URL Completa em Desenvolvimento:
```
http://localhost:8000/api/processamento/debug-detector-ip-user-data/
```

## Resposta do Endpoint

### Em caso de sucesso:
```json
{
  "success": true,
  "user_data": {
    "user_id": 123,
    "username": "usuario@email.com",
    "is_authenticated": true,
    "is_staff": false
  },
  "user_lojas_count": 1,
  "user_lojas": [
    {
      "id": 456,
      "nome_loja": "Minha Loja Shopify",
      "shop_url": "minha-loja.myshopify.com",
      "ativo": true,
      "created_at": "2024-01-01T10:00:00Z",
      "user_id": 123
    }
  ],
  "all_lojas_count": 5,
  "all_lojas": [
    {
      "id": 456,
      "nome_loja": "Minha Loja Shopify",
      "shop_url": "minha-loja.myshopify.com",
      "user_id": 123,
      "user_username": "usuario@email.com"
    }
  ],
  "debug_info": {
    "endpoint_url": "/api/processamento/debug-detector-ip-user-data/",
    "timestamp": "2024-01-01T15:30:00Z",
    "purpose": "Diagnosticar erro 400 no detector de IP"
  }
}
```

### Em caso de erro:
```json
{
  "success": false,
  "error": "Mensagem do erro",
  "debug_info": "Erro interno no endpoint de debug"
}
```

## Como Usar

1. **Fazer login no sistema** com as credenciais do usuário que está enfrentando o problema
2. **Acessar o endpoint** via GET request (pode ser pelo navegador, Postman, etc.)
3. **Analisar a resposta** para identificar:
   - Se o usuário tem lojas configuradas (`user_lojas_count`)
   - Qual é o ID da loja que deveria ser usada
   - Se há outras lojas no sistema para comparação

## Diagnóstico Esperado

### Se `user_lojas_count` = 0:
- **Problema**: Usuário não tem lojas configuradas
- **Solução**: Configurar uma loja para o usuário

### Se `user_lojas_count` > 0:
- **Problema**: Pode estar passando loja_id incorreto
- **Solução**: Usar o ID correto da loja do usuário

### Se há lojas em `all_lojas` mas não em `user_lojas`:
- **Problema**: Associação usuário <-> loja incorreta
- **Solução**: Corrigir a associação no banco de dados

## Remoção do Endpoint

⚠️ **IMPORTANTE**: Este é um endpoint temporário para debug. Deve ser removido após resolver o problema para evitar exposição desnecessária de dados.

## Arquivos Modificados

1. `backend/features/processamento/views.py` - Função `debug_detector_ip_user_data` adicionada
2. `backend/features/processamento/urls.py` - URL `debug-detector-ip-user-data/` adicionada