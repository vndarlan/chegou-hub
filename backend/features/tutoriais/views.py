# backend/features/tutoriais/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from django.db.models import Count, Q

from .models import CategoriaAula, Aula
from .serializers import (
    CategoriaAulaSerializer,
    CategoriaAulaListSerializer,
    AulaSerializer,
    AulaListSerializer
)


class CategoriaAulaViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gerenciar categorias de aulas.

    Endpoints disponíveis:
    - GET /api/tutoriais/categorias/ - Lista todas as categorias ativas com suas aulas
    - GET /api/tutoriais/categorias/{id}/ - Detalhe de uma categoria específica
    - POST /api/tutoriais/categorias/ - Criar nova categoria (requer autenticação)
    - PUT/PATCH /api/tutoriais/categorias/{id}/ - Atualizar categoria (requer autenticação)
    - DELETE /api/tutoriais/categorias/{id}/ - Deletar categoria (requer autenticação)
    """

    queryset = CategoriaAula.objects.all()
    permission_classes = [IsAuthenticatedOrReadOnly]
    lookup_field = 'slug'

    def get_queryset(self):
        """Filtra apenas categorias ativas por padrão"""
        queryset = CategoriaAula.objects.all()

        # Filtro de categorias ativas (apenas para leitura)
        if self.action in ['list', 'retrieve']:
            queryset = queryset.filter(ativo=True)
            # Prefetch aulas ativas para melhor performance
            queryset = queryset.prefetch_related(
                'aulas'
            ).annotate(
                total_aulas_count=Count('aulas', filter=Q(aulas__ativo=True))
            )

        return queryset

    def get_serializer_class(self):
        """Usa serializers diferentes para listagem e detalhes"""
        if self.action == 'list':
            return CategoriaAulaListSerializer
        return CategoriaAulaSerializer

    @action(detail=False, methods=['get'])
    def com_aulas(self, request):
        """
        Retorna apenas categorias que possuem aulas ativas.

        Endpoint: GET /api/tutoriais/categorias/com_aulas/
        """
        categorias = self.get_queryset().filter(
            aulas__ativo=True
        ).distinct()

        serializer = CategoriaAulaSerializer(categorias, many=True)
        return Response(serializer.data)


class AulaViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gerenciar aulas individuais.

    Endpoints disponíveis:
    - GET /api/tutoriais/aulas/ - Lista todas as aulas ativas
    - GET /api/tutoriais/aulas/{slug}/ - Detalhe de uma aula específica
    - GET /api/tutoriais/aulas/categoria/{categoria_slug}/ - Aulas de uma categoria
    - POST /api/tutoriais/aulas/ - Criar nova aula (requer autenticação)
    - PUT/PATCH /api/tutoriais/aulas/{slug}/ - Atualizar aula (requer autenticação)
    - DELETE /api/tutoriais/aulas/{slug}/ - Deletar aula (requer autenticação)
    """

    queryset = Aula.objects.all()
    permission_classes = [IsAuthenticatedOrReadOnly]
    lookup_field = 'slug'

    def get_queryset(self):
        """Filtra apenas aulas ativas de categorias ativas"""
        queryset = Aula.objects.select_related('categoria')

        # Filtro de aulas ativas (apenas para leitura)
        if self.action in ['list', 'retrieve', 'por_categoria']:
            queryset = queryset.filter(
                ativo=True,
                categoria__ativo=True
            )

        # Filtro por categoria via query param
        categoria_slug = self.request.query_params.get('categoria', None)
        if categoria_slug:
            queryset = queryset.filter(categoria__slug=categoria_slug)

        return queryset

    def get_serializer_class(self):
        """Usa serializers diferentes para listagem e detalhes"""
        if self.action == 'list':
            return AulaListSerializer
        return AulaSerializer

    @action(detail=False, methods=['get'], url_path='categoria/(?P<categoria_slug>[^/.]+)')
    def por_categoria(self, request, categoria_slug=None):
        """
        Retorna todas as aulas de uma categoria específica.

        Endpoint: GET /api/tutoriais/aulas/categoria/{categoria_slug}/
        """
        try:
            categoria = CategoriaAula.objects.get(slug=categoria_slug, ativo=True)
        except CategoriaAula.DoesNotExist:
            return Response(
                {'error': 'Categoria não encontrada'},
                status=status.HTTP_404_NOT_FOUND
            )

        aulas = self.get_queryset().filter(categoria=categoria)
        serializer = AulaSerializer(aulas, many=True)

        return Response({
            'categoria': {
                'id': categoria.id,
                'nome': categoria.nome,
                'slug': categoria.slug,
                'icone': categoria.icone
            },
            'total': aulas.count(),
            'aulas': serializer.data
        })

    @action(detail=True, methods=['get'])
    def proxima(self, request, slug=None):
        """
        Retorna a próxima aula na sequência.

        Endpoint: GET /api/tutoriais/aulas/{slug}/proxima/
        """
        aula_atual = self.get_object()

        proxima_aula = Aula.objects.filter(
            categoria=aula_atual.categoria,
            ordem__gt=aula_atual.ordem,
            ativo=True
        ).order_by('ordem').first()

        if proxima_aula:
            serializer = AulaSerializer(proxima_aula)
            return Response(serializer.data)

        return Response(
            {'message': 'Esta é a última aula da categoria'},
            status=status.HTTP_404_NOT_FOUND
        )

    @action(detail=True, methods=['get'])
    def anterior(self, request, slug=None):
        """
        Retorna a aula anterior na sequência.

        Endpoint: GET /api/tutoriais/aulas/{slug}/anterior/
        """
        aula_atual = self.get_object()

        aula_anterior = Aula.objects.filter(
            categoria=aula_atual.categoria,
            ordem__lt=aula_atual.ordem,
            ativo=True
        ).order_by('-ordem').first()

        if aula_anterior:
            serializer = AulaSerializer(aula_anterior)
            return Response(serializer.data)

        return Response(
            {'message': 'Esta é a primeira aula da categoria'},
            status=status.HTTP_404_NOT_FOUND
        )
