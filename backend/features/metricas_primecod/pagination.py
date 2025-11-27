from rest_framework.pagination import PageNumberPagination


class CatalogPagination(PageNumberPagination):
    """
    Paginação customizada para catálogo PrimeCOD

    Configurações:
    - page_size: 10 produtos por página (padrão)
    - page_size_query_param: permite cliente ajustar via ?page_size=N
    - max_page_size: limite máximo de 100 produtos por página

    Uso:
    - GET /api/primecod/catalog/?page=1
    - GET /api/primecod/catalog/?page=2&page_size=20

    Response:
    {
        "count": 150,
        "next": "http://api.com/catalog/?page=2",
        "previous": null,
        "results": [...]
    }
    """
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100
