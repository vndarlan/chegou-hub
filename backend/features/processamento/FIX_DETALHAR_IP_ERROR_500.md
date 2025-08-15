# Correção do Erro 500 no Endpoint `/processamento/detalhar-ip/`

## Problema Identificado

O endpoint `/processamento/detalhar-ip/` estava retornando erro 500 (Internal Server Error) quando havia problemas de comunicação com a API do Shopify, especialmente:

- **401 Unauthorized**: Token de acesso inválido ou expirado
- **403 Forbidden**: Token sem permissões necessárias
- **Timeout/Connection errors**: Problemas de conectividade
- Outros erros de API

## Causa Raiz

A função `detalhar_pedidos_ip()` em `views.py` chamava `detector.get_orders_by_ip()` que, em caso de erro na API do Shopify, levantava uma `Exception` genérica. O tratamento de erro original capturava qualquer exceção e retornava um HTTP 500 genérico:

```python
# ANTES - Tratamento genérico
except Exception as search_error:
    logger.error(f"Erro na busca por IP - User: {request.user.username}, Error: {str(search_error)}")
    return Response({'error': 'Erro ao buscar dados de IP'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
```

## Solução Implementada

Melhorei o tratamento de erro para identificar tipos específicos de problemas e retornar status codes e mensagens mais apropriadas:

```python
# DEPOIS - Tratamento específico por tipo de erro
except Exception as search_error:
    logger.error(f"Erro na busca por IP - User: {request.user.username}, Error: {str(search_error)}")
    
    # Verifica se é erro de autenticação ou configuração
    error_str = str(search_error).lower()
    if '401' in error_str or 'unauthorized' in error_str:
        return Response({
            'error': 'Erro de autenticação com Shopify. Verifique o token de acesso da loja.',
            'details': 'Token de acesso inválido ou expirado'
        }, status=status.HTTP_400_BAD_REQUEST)
    elif '403' in error_str or 'forbidden' in error_str:
        return Response({
            'error': 'Acesso negado pela API do Shopify. Verifique as permissões do token.',
            'details': 'Token não possui permissões necessárias para acessar pedidos'
        }, status=status.HTTP_400_BAD_REQUEST)
    elif 'timeout' in error_str or 'connection' in error_str:
        return Response({
            'error': 'Erro de conexão com o Shopify. Tente novamente em alguns minutos.',
            'details': 'Problemas de conectividade com a API'
        }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    else:
        return Response({
            'error': 'Erro ao buscar dados de IP no Shopify',
            'details': f'Erro técnico: {str(search_error)[:100]}...' if len(str(search_error)) > 100 else str(search_error)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
```

## Arquivos Alterados

1. **`views.py`** - Função `detalhar_pedidos_ip()` (linhas ~475-501)
2. **`views.py`** - Função `buscar_pedidos_mesmo_ip()` (linhas ~316-345)  
3. **`views.py`** - Função de debug (linhas ~2312-2336)

## Benefícios da Correção

### Antes
- ❌ Todos os erros resultavam em HTTP 500
- ❌ Mensagem genérica "Erro ao buscar dados de IP"
- ❌ Usuário não sabia se era problema de configuração ou sistema
- ❌ Difícil de debugar problemas de API

### Depois
- ✅ **HTTP 400** para erros de configuração (401/403)
- ✅ **HTTP 503** para problemas temporários (timeout/conexão)
- ✅ **HTTP 500** apenas para erros realmente internos
- ✅ Mensagens específicas orientam o usuário sobre a correção
- ✅ Campo `details` fornece informações técnicas adicionais
- ✅ Melhor experiência do usuário e facilita debugging

## Tipos de Resposta por Erro

| Erro da API Shopify | Status Code | Mensagem para Usuário |
|---------------------|-------------|----------------------|
| 401 Unauthorized | 400 Bad Request | "Erro de autenticação com Shopify. Verifique o token de acesso da loja." |
| 403 Forbidden | 400 Bad Request | "Acesso negado pela API do Shopify. Verifique as permissões do token." |
| Timeout/Connection | 503 Service Unavailable | "Erro de conexão com o Shopify. Tente novamente em alguns minutos." |
| Outros erros | 500 Internal Server Error | "Erro ao buscar dados de IP no Shopify" + detalhes técnicos |

## Teste da Correção

Para testar se a correção está funcionando:

1. Configure uma loja com token inválido
2. Faça uma requisição para `/processamento/detalhar-ip/`
3. Deve retornar HTTP 400 com mensagem de autenticação
4. O frontend deve mostrar a mensagem específica ao invés do erro genérico

## Impacto no Frontend

O frontend (`DetectorIPPage.js`) agora receberá:
- Status codes mais específicos para tratamento diferenciado
- Mensagens mais claras para exibir ao usuário
- Campo `details` com informações técnicas adicionais se necessário

Isso permite uma melhor experiência do usuário e facilita a identificação de problemas de configuração versus problemas técnicos temporários.