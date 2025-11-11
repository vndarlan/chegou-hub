# Correção: Erro 404 no Endpoint `/api/organizations/{id}/modulos_disponiveis/`

## 🎯 Problema Identificado

O endpoint `/api/organizations/{id}/modulos_disponiveis/` retornava **404 Not Found** quando acessado pelo frontend, mesmo existindo e estando corretamente registrado nas rotas.

## 🔍 Causa Raiz

O problema estava na interação entre dois comportamentos do Django REST Framework:

1. **get_queryset() filtrado por membership**:
   ```python
   def get_queryset(self):
       """Retorna apenas organizações que o usuário é membro"""
       return Organization.objects.filter(
           membros__user=self.request.user,
           membros__ativo=True
       ).distinct()
   ```

2. **DRF chama get_object() automaticamente** antes de executar actions com `detail=True`
   - `get_object()` usa `get_queryset()` para buscar o objeto
   - Se o usuário NÃO for membro, o queryset está vazio
   - **Resultado**: 404 antes mesmo da action ser executada

3. **O endpoint `modulos_disponiveis` não usava `get_object()`**:
   - Não validava membership
   - Apenas listava TODOS os módulos (dados estáticos)
   - Era conceitualmente um endpoint "público" (para usuários autenticados)

## ✅ Solução Implementada

Modificamos o endpoint para **NÃO depender de `get_object()`**, validando manualmente apenas a existência da organização:

```python
@action(detail=True, methods=['get'])
def modulos_disponiveis(self, request, pk=None):
    """
    Lista todos os módulos disponíveis agrupados por categoria
    GET /api/organizations/{id}/modulos_disponiveis/

    NOTA: Não valida se usuário é membro da organização.
    Apenas verifica se a organização existe.
    """
    # Verificar se a organização existe (sem validar membership)
    try:
        Organization.objects.get(pk=pk, ativo=True)
    except Organization.DoesNotExist:
        return Response(
            {'error': 'Organização não encontrada'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Agrupar módulos por categoria
    grupos = {}
    for modulo in MODULES:
        grupo = modulo['group']
        if grupo not in grupos:
            grupos[grupo] = []
        grupos[grupo].append(modulo)

    return Response({
        'modulos': MODULES,
        'grupos': grupos
    })
```

## 📝 Comportamento Após Correção

| Cenário | Status | Resposta |
|---------|--------|----------|
| Usuário autenticado E membro | ✅ 200 OK | Lista de módulos |
| Usuário autenticado mas NÃO membro | ✅ 200 OK | Lista de módulos |
| Organização inexistente | ✅ 404 | `{"error": "Organização não encontrada"}` |
| Usuário não autenticado | ✅ 403 | Bloqueado por `IsAuthenticated` |

## 🧪 Validação

Execute o script de teste:

```bash
cd backend
python test_modulos_endpoint_final.py
```

**Resultado esperado:**
```
RESULTADO FINAL:
  Testes passaram: 4/4
  Status: TODOS OS TESTES PASSARAM
```

## 🔐 Considerações de Segurança

**Decisão de Design:** Permitir que qualquer usuário autenticado liste os módulos disponíveis, mesmo que não seja membro da organização.

**Justificativa:**
- Lista de módulos é informação **não-sensível** (apenas nomes e categorias)
- Facilita criação de interfaces de convite ("veja os módulos que terá acesso")
- Permissões reais são validadas nos endpoints de ACESSO aos módulos
- Endpoint `meus_modulos` continua validando membership corretamente

## 📁 Arquivos Modificados

- `backend/core/views_organizations.py` (linhas 391-420)

## 🔗 Commit

- Adicionar esta correção ao próximo commit de bugfix
- Tag sugerida: `v1.8.2-dev.2` (correção de bug no endpoint de módulos)
