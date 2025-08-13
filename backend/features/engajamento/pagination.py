# backend/features/engajamento/pagination.py
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from collections import OrderedDict


class PedidoEngajamentoPagination(PageNumberPagination):
    """
    Paginação customizada para pedidos de engajamento
    """
    page_size = 10  # Número padrão de itens por página
    page_size_query_param = 'page_size'  # Parâmetro URL para alterar o tamanho da página
    max_page_size = 100  # Máximo de itens por página
    page_query_param = 'page'  # Parâmetro URL para navegar entre páginas
    
    def get_paginated_response(self, data):
        """
        Retorna resposta paginada com metadata personalizada
        """
        return Response(OrderedDict([
            ('count', self.page.paginator.count),  # Total de itens
            ('total_pages', self.page.paginator.num_pages),  # Total de páginas
            ('current_page', self.page.number),  # Página atual
            ('page_size', self.get_page_size(self.request)),  # Itens por página
            ('next', self.get_next_link()),  # Link para próxima página
            ('previous', self.get_previous_link()),  # Link para página anterior
            ('results', data)  # Dados da página atual
        ]))
    
    def get_page_size(self, request):
        """
        Retorna o tamanho da página atual
        """
        if self.page_size_query_param:
            try:
                # Usar GET se query_params não estiver disponível
                query_params = getattr(request, 'query_params', request.GET)
                return min(
                    int(query_params[self.page_size_query_param]),
                    self.max_page_size
                )
            except (KeyError, ValueError):
                pass
        return self.page_size