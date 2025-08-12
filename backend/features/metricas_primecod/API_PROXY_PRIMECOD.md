# API Proxy PrimeCOD - Documentação

## Visão Geral

Este documento descreve a implementação do proxy backend para a API PrimeCOD, que substitui chamadas diretas do frontend para a API externa, garantindo segurança e melhor controle.

## Arquitetura

```
Frontend → Backend Django → API PrimeCOD (com token seguro)
```

**ANTES (INSEGURO):**
- Frontend chamava API PrimeCOD diretamente
- Token exposto no JavaScript do cliente
- Sem controle de rate limiting ou cache

**AGORA (SEGURO):**
- Frontend chama apenas endpoints internos do Django
- Token PrimeCOD mantido seguro no backend
- Rate limiting e cache implementados
- Logs centralizados e error handling

## Endpoints Disponíveis

### Base URL
```
/api/metricas/primecod/
```

### 1. Buscar Orders
**POST** `/api/metricas/primecod/buscar-orders/`

Busca orders da API PrimeCOD com paginação progressiva até 400 páginas.

**Payload:**
```json
{
    "data_inicio": "2024-01-01",
    "data_fim": "2024-01-31", 
    "pais_filtro": "Brasil",  // opcional
    "max_paginas": 50         // opcional, padrão: 50
}
```

**Resposta:**
```json
{
    "status": "success",
    "dados_brutos": {
        "total_orders": 1250,
        "pages_processed": 45,
        "date_range_applied": {"start": "2024-01-01", "end": "2024-01-31"}
    },
    "dados_processados": [
        {
            "Produto": "Produto A",
            "País": "Brasil", 
            "Entregue": 100,
            "Cancelado": 20,
            "Total": 120
        }
    ],
    "estatisticas": {
        "total_orders": 1250,
        "produtos_unicos": 15,
        "paises_unicos": 8,
        "status_unicos": 6
    },
    "status_nao_mapeados": ["Unknown_Status"],
    "message": "Busca concluída: 1250 orders encontrados"
}
```

### 2. Processar Dados
**POST** `/api/metricas/primecod/processar-dados/`

Processa dados já buscados, permite reprocessamento com filtros diferentes.

**Payload:**
```json
{
    "orders_data": [...],     // Array de orders da busca anterior
    "pais_filtro": "Brasil",  // opcional
    "nome_analise": "Análise Janeiro 2024"  // opcional, salva se fornecido
}
```

### 3. Testar Conexão
**GET** `/api/metricas/primecod/testar-conexao/`

Testa conectividade com API PrimeCOD.

**Resposta:**
```json
{
    "status": "success",
    "message": "Conexão com PrimeCOD estabelecida com sucesso",
    "api_status": 200
}
```

## Recursos Implementados

### 1. Cliente PrimeCOD (`utils/primecod_client.py`)
- **Rate Limiting**: 500ms entre requisições
- **Error Handling**: Tratamento específico para erros da API
- **Cache**: Cache de 5 minutos para evitar requisições desnecessárias
- **Filtro Local**: Filtragem por data no backend (API externa não funciona)
- **Status Mapping**: Mapeamento de status em inglês para português

### 2. Segurança
- Token PrimeCOD armazenado seguro no backend
- Autenticação obrigatória (`IsAuthenticated`)
- Logs detalhados de todas as operações
- Validação de parâmetros de entrada

### 3. Performance
- Paginação progressiva até 400 páginas
- Cache de resultados por 5 minutos
- Rate limiting para evitar sobrecarga da API externa
- Processamento otimizado de grandes volumes de dados

### 4. Agrupamento de Dados
Os dados são agrupados por **Produto × País × Status** em formato de tabela cruzada:

```json
{
    "Produto": "Produto A",
    "País": "Brasil",
    "Entregue": 100,
    "Cancelado": 20,
    "Pendente": 5,
    "Total": 125
}
```

## Configuração

### 1. Variável de Ambiente
Adicionar no Railway e `.env` local:
```bash
PRIMECOD_API_TOKEN=seu_token_aqui
```

### 2. Settings Django
Já configurado em `settings.py`:
```python
PRIMECOD_API_TOKEN = os.getenv('PRIMECOD_API_TOKEN', '')
```

## Status Mapping

Mapeamento de status da API PrimeCOD:
- `Delivered` → `Entregue`
- `Canceled` → `Cancelado`
- `Confirmed` → `Confirmado`
- `Pending` → `Pendente`
- `Refunded` → `Reembolsado`
- `Processing` → `Processando`
- `Shipped` → `Enviado`
- `Returned` → `Devolvido`
- `Failed` → `Falhou`
- `Duplicate` → `Duplicado`
- `Invalid` → `Inválido`

## Logs e Monitoramento

### Logs Implementados
- Início/fim de buscas por usuário
- Progresso de paginação (a cada 10 páginas)
- Erros da API externa
- Filtros aplicados e resultados

### Métricas Disponíveis
- Total de orders processados
- Páginas buscadas vs total disponível
- Produtos/países/status únicos
- Status não mapeados encontrados

## Error Handling

### Tipos de Erro
1. **PrimeCODAPIError**: Erros específicos da API externa
2. **Configuração**: Token não configurado
3. **Validação**: Parâmetros obrigatórios ausentes
4. **Rate Limit**: Limite da API excedido
5. **Conectividade**: Problemas de rede

### Códigos HTTP
- `200`: Sucesso
- `400`: Parâmetros inválidos
- `500`: Erro interno do servidor
- `502`: Erro da API externa (PrimeCOD indisponível)

## Migração do Frontend

### ANTES (Chamada Direta - INSEGURA):
```javascript
// ❌ NUNCA FAZER ISSO
const response = await fetch('https://api.primecod.app/api/orders', {
    headers: {
        'Authorization': 'Bearer TOKEN_EXPOSTO'  // PERIGOSO!
    }
});
```

### AGORA (Proxy Seguro):
```javascript
// ✅ FORMA CORRETA
const response = await fetch('/api/metricas/primecod/buscar-orders/', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCsrfToken()
    },
    body: JSON.stringify({
        data_inicio: '2024-01-01',
        data_fim: '2024-01-31',
        pais_filtro: 'Brasil'
    })
});
```

## Vantagens da Implementação

1. **Segurança**: Token não exposto no frontend
2. **Performance**: Cache e rate limiting
3. **Controle**: Logs centralizados e monitoramento
4. **Flexibilidade**: Reprocessamento sem nova busca na API
5. **Robustez**: Error handling específico para API externa
6. **Escalabilidade**: Pronto para múltiplos usuários simultâneos

## Próximos Passos

1. **Configurar token real** no Railway
2. **Testar endpoints** com dados reais
3. **Migrar frontend** para usar proxy interno
4. **Monitorar logs** para otimizações
5. **Implementar cache Redis** para melhor performance (opcional)