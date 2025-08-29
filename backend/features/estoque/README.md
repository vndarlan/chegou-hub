# Sistema de Controle de Estoque

App Django para controle completo de estoque com sincronização Shopify integrada ao Chegou Hub.

## Estrutura Criada

### Modelos

#### ProdutoEstoque
- Controle de produtos por loja (reutiliza ShopifyConfig)
- Gestão de estoque atual, mínimo e máximo
- Sincronização automática com Shopify
- Sistema de alertas configurável
- Controle de custos e preços de venda

#### MovimentacaoEstoque
- Registro completo de todas as movimentações
- Tipos: entrada, saída, ajuste, venda, devolução, perda, transferência
- Rastreamento de origem (manual, Shopify, API)
- Histórico completo com estoque anterior/posterior

#### AlertaEstoque
- Sistema automático de alertas por produto
- Tipos: estoque baixo, zerado, erros de sync
- Níveis de prioridade (baixa, média, alta, crítica)
- Controle de status (ativo, lido, resolvido, ignorado)

### APIs Disponíveis

**Base URL:** `/api/estoque/`

#### Produtos em Estoque
- `GET /produtos/` - Lista produtos com filtros
- `POST /produtos/` - Criar produto
- `GET /produtos/{id}/` - Detalhes do produto
- `PUT /produtos/{id}/` - Atualizar produto
- `POST /produtos/{id}/adicionar_estoque/` - Adicionar estoque
- `POST /produtos/{id}/remover_estoque/` - Remover estoque
- `GET /produtos/{id}/movimentacoes/` - Movimentações do produto
- `GET /produtos/resumo_geral/` - Dashboard resumo
- `GET /produtos/produtos_reposicao/` - Produtos que precisam reposição

#### Movimentações
- `GET /movimentacoes/` - Lista todas as movimentações
- `POST /movimentacoes/criar_movimentacao/` - Criar movimentação
- `GET /movimentacoes/relatorio_periodo/` - Relatório por período

#### Alertas
- `GET /alertas/` - Lista alertas (ativos por padrão)
- `POST /alertas/{id}/marcar_lido/` - Marcar como lido
- `POST /alertas/{id}/resolver/` - Resolver alerta
- `POST /alertas/resolver_multiplos/` - Resolver múltiplos
- `GET /alertas/resumo/` - Resumo dos alertas

### Funcionalidades Implementadas

1. **Controle Completo de Estoque**
   - Adição/remoção segura com validações
   - Histórico completo de movimentações
   - Cálculo automático de valores totais

2. **Sistema de Alertas Inteligente**
   - Alertas automáticos para estoque baixo/zerado
   - Priorização por criticidade
   - Sugestões de ação automáticas

3. **Integração com Shopify**
   - Reutiliza configurações existentes
   - Preparado para sincronização automática
   - Rastreamento de pedidos Shopify

4. **API Rica e Filtros Avançados**
   - Filtros por loja, status, período
   - Busca textual por SKU/nome
   - Paginação e ordenação

5. **Admin Django Completo**
   - Interface administrativa rica
   - Actions em massa
   - Visualização de status colorido

### Próximos Passos

1. **Sincronização Shopify**
   - Implementar jobs assíncronos para sync
   - Webhook para atualizações em tempo real

2. **Relatórios Avançados**
   - Gráficos de movimentação
   - Previsão de reposição
   - Análise de custos

3. **Notificações**
   - Email/SMS para alertas críticos
   - Dashboard em tempo real

## Comandos Úteis

```bash
# Migração
cd backend && python manage.py makemigrations estoque
cd backend && python manage.py migrate

# Admin
cd backend && python manage.py createsuperuser

# Servidor
cd backend && python manage.py runserver
```

## Estrutura de Arquivos

```
backend/features/estoque/
├── __init__.py
├── apps.py                 # Configuração do app
├── models.py              # Modelos principais
├── admin.py               # Interface admin
├── serializers.py         # Serializers DRF
├── views.py               # ViewSets e APIs
├── urls.py                # Roteamento
├── migrations/            # Migrações do banco
│   ├── __init__.py
│   └── 0001_initial.py
└── README.md             # Esta documentação
```

O sistema está totalmente funcional e pronto para uso!