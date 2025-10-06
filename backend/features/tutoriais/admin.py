# backend/features/tutoriais/admin.py
from django.contrib import admin
from .models import CategoriaAula, Aula


class AulaInline(admin.TabularInline):
    """Inline para gerenciar aulas dentro da categoria"""
    model = Aula
    extra = 0
    fields = ['titulo', 'ordem', 'duracao', 'ativo']
    ordering = ['ordem']
    show_change_link = True


@admin.register(CategoriaAula)
class CategoriaAulaAdmin(admin.ModelAdmin):
    """Admin para gerenciar categorias de aulas"""

    list_display = [
        'nome', 'slug', 'ordem', 'total_aulas',
        'icone', 'ativo', 'criado_em'
    ]
    list_filter = ['ativo', 'criado_em']
    search_fields = ['nome', 'slug']
    readonly_fields = ['criado_em', 'atualizado_em', 'total_aulas']
    prepopulated_fields = {'slug': ('nome',)}
    ordering = ['ordem', 'nome']

    fieldsets = (
        ('Informações Básicas', {
            'fields': ('nome', 'slug', 'icone', 'ativo')
        }),
        ('Ordenação', {
            'fields': ('ordem',),
            'description': 'Categorias com menor número aparecem primeiro'
        }),
        ('Estatísticas', {
            'fields': ('total_aulas',),
            'classes': ('collapse',)
        }),
        ('Metadados', {
            'fields': ('criado_em', 'atualizado_em'),
            'classes': ('collapse',)
        }),
    )

    inlines = [AulaInline]

    def get_queryset(self, request):
        """Otimiza query com contagem de aulas"""
        qs = super().get_queryset(request)
        return qs.prefetch_related('aulas')


@admin.register(Aula)
class AulaAdmin(admin.ModelAdmin):
    """Admin para gerenciar aulas individuais"""

    list_display = [
        'titulo', 'categoria', 'ordem', 'duracao',
        'ativo', 'criado_em'
    ]
    list_filter = ['categoria', 'ativo', 'criado_em']
    search_fields = ['titulo', 'descricao', 'slug']
    readonly_fields = ['criado_em', 'atualizado_em', 'video_id', 'embed_url']
    prepopulated_fields = {'slug': ('titulo',)}
    ordering = ['categoria__ordem', 'ordem', 'titulo']

    fieldsets = (
        ('Informações Básicas', {
            'fields': ('titulo', 'slug', 'categoria', 'ativo')
        }),
        ('Conteúdo', {
            'fields': ('descricao', 'video_url', 'video_id', 'embed_url'),
            'description': 'Cole a URL completa do YouTube. A URL embed será gerada automaticamente.'
        }),
        ('Ordenação e Duração', {
            'fields': ('ordem', 'duracao'),
            'description': 'Aulas com menor número aparecem primeiro dentro da categoria'
        }),
        ('Metadados', {
            'fields': ('criado_em', 'atualizado_em'),
            'classes': ('collapse',)
        }),
    )

    def get_queryset(self, request):
        """Otimiza query com select_related"""
        qs = super().get_queryset(request)
        return qs.select_related('categoria')
