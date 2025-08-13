# Paginação Nativa - API de Pedidos de Engajamento

## Implementação Concluída

A paginação nativa foi implementada com sucesso na API de pedidos de engajamento (`PedidoEngajamentoViewSet`).

### Arquivos Criados/Modificados

1. **`pagination.py`** - Classe de paginação personalizada
2. **`views.py`** - Atualizado para usar a paginação
3. **`test_paginacao.py`** - Scripts de teste
4. **`demo_paginacao.py`** - Demonstração de uso

### Configuração

- **Itens por página padrão**: 10
- **Máximo por página**: 100
- **Parâmetros URL**: 
  - `page` - número da página (ex: `?page=2`)
  - `page_size` - itens por página (ex: `?page_size=20`)

### Exemplos de Uso

#### 1. Primeira página (padrão)
```
GET /api/pedidos/
```

#### 2. Segunda página
```
GET /api/pedidos/?page=2
```

#### 3. 5 itens por página
```
GET /api/pedidos/?page_size=5
```

#### 4. Página específica com tamanho customizado
```
GET /api/pedidos/?page=3&page_size=15
```

### Formato da Resposta

```json
{
    "count": 25,
    "total_pages": 3,
    "current_page": 1,
    "page_size": 10,
    "next": "http://localhost:8000/api/pedidos/?page=2",
    "previous": null,
    "results": [
        {
            "id": 1,
            "urls": "https://example.com",
            "status": "concluido",
            "total_links": 1,
            "data_criacao": "2024-01-15T10:30:00Z",
            "criado_por_nome": "João Silva",
            "itens": [...]
        }
    ]
}
```

### Campos de Metadata

- **`count`**: Total de itens na base de dados
- **`total_pages`**: Número total de páginas
- **`current_page`**: Página atual
- **`page_size`**: Número de itens por página
- **`next`**: URL da próxima página (null se for a última)
- **`previous`**: URL da página anterior (null se for a primeira)
- **`results`**: Array com os dados da página atual

### Benefícios

- ✅ Performance melhorada (menos dados transferidos)
- ✅ Interface mais responsiva
- ✅ Compatível com frontend existente (fallback)
- ✅ Flexível (10, 20, 50, 100 itens por página)
- ✅ Metadados completos para navegação

### Integração Frontend

O frontend pode detectar se a API está retornando dados paginados verificando a existência do campo `results`:

```javascript
const response = await fetch('/api/pedidos/?page=1&page_size=10');
const data = await response.json();

if (data.results) {
    // API com paginação nativa
    setPedidos(data.results);
    setPaginacao({
        total: data.count,
        totalPages: data.total_pages,
        currentPage: data.current_page,
        pageSize: data.page_size,
        hasNext: !!data.next,
        hasPrevious: !!data.previous
    });
} else {
    // Fallback para array simples (compatibilidade)
    setPedidos(data);
}
```

### Teste

Para testar a implementação:

```bash
cd backend
python -c "from features.engajamento.test_paginacao import testar_paginacao; testar_paginacao()"
```

### Status

✅ **IMPLEMENTADO E TESTADO**
- Paginação nativa funcionando
- Metadados completos retornados
- Compatível com frontend existente
- Parâmetros URL funcionais
- Fallback manual preservado