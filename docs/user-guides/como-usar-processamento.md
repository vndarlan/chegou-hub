# Como usar Shopify Duplicados

## Para que serve
Detectar e cancelar automaticamente pedidos duplicados nas suas lojas Shopify, evitando envios em dobro e problemas operacionais.

## Como acessar
1. Faça login no sistema
2. Clique em "Suporte" no menu
3. Clique em "⚙️ Processamento"
4. A página "Shopify Duplicados" abre

## Funcionalidades principais

### Adicionar loja Shopify
**Como usar:**
1. Clique no botão "+" no header
2. Preencha:
   - **Nome da Loja:** Identificação (ex: "Loja Principal")
   - **URL da Loja:** dominio.myshopify.com
   - **Access Token:** Token de acesso da API
3. Clique "Testar Conexão" primeiro
4. Se teste passar, clique "Adicionar Loja"

### Buscar pedidos duplicados
**Como usar:**
1. Selecione a loja no dropdown
2. Clique "Buscar Duplicatas"
3. Sistema analisa todos os pedidos automaticamente
4. Resultados aparecem na tabela

### Visualizar duplicatas encontradas
**Como interpretar a tabela:**
- **Cliente:** Nome e telefone
- **Pedido Original:** Primeiro pedido (será mantido)
- **Duplicata:** Pedido duplicado (será cancelado)
- **Produtos (Match):** Como foi detectada a duplicata
- **Intervalo:** Dias entre os pedidos

### Cancelar pedidos duplicados
**Individual:**
1. Clique no botão vermelho (lixeira) na linha
2. Pedido duplicado é cancelado no Shopify

**Em lote:**
1. Marque checkboxes dos pedidos desejados
2. Clique "Cancelar Selecionados"
3. Confirme a ação no modal

### Ver detalhes do cliente
**Como usar:**
1. Clique no botão "olho" na linha
2. Modal mostra informações completas:
   - Dados dos dois pedidos
   - Endereços de entrega
   - Produtos em comum
   - Critérios de detecção

### Consultar histórico
**Como usar:**
1. Clique no botão "histórico" (relógio) no header
2. Veja todas as operações realizadas
3. Filtra por loja, data e status

## Como o sistema detecta duplicatas

### Critérios de detecção
**Todas essas condições devem ser atendidas:**
1. **Mesmo cliente** - Telefone idêntico (apenas dígitos)
2. **Mesmo produto** - SKU idêntico OU nome idêntico
3. **Status diferentes** - Original processado, duplicata não processada
4. **Intervalo máximo** - 30 dias entre pedidos
5. **Pedidos ativos** - Não cancelados

### Qual pedido é cancelado
- **Pedido Original:** Aquele que tem tags de processamento ("order sent to dropi", "eh", "prime cod", etc.)
- **Pedido Duplicata:** Aquele sem essas tags (será cancelado)
- **Se nenhum foi processado:** Original = mais antigo, Duplicata = mais novos

## Problemas comuns

### Não encontra duplicatas
**Possíveis causas:**
- Lojas com poucos pedidos duplicados
- Critérios muito restritivos
- Produtos com SKUs/nomes diferentes

### Erro ao cancelar pedido
**Soluções:**
- Verifique se access token tem permissão "write_orders"
- Pedido pode já estar cancelado
- Recarregue página e tente novamente

### Conexão com loja falha
**Soluções:**
- Verifique URL (deve ser loja.myshopify.com)
- Confirme access token válido
- Teste permissões: read_orders, write_orders, read_customers

## Dicas importantes

- **Sempre teste conexão** antes de adicionar loja
- **Revise resultados** antes de cancelar em lote
- **Use detalhes do cliente** para confirmar duplicatas
- **Monitore histórico** para acompanhar operações
- **Cuidado com cancelamentos** - ação não pode ser desfeita
- **Configure tags corretas** no Shopify para melhor detecção