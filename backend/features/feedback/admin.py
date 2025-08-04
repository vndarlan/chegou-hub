from django.contrib import admin
from .models import Feedback


@admin.register(Feedback)
class FeedbackAdmin(admin.ModelAdmin):
    list_display = ['titulo', 'categoria', 'prioridade', 'status', 'usuario', 'data_criacao']
    list_filter = ['categoria', 'prioridade', 'status', 'data_criacao']
    search_fields = ['titulo', 'descricao', 'usuario__username']
    readonly_fields = ['data_criacao', 'usuario', 'url_pagina']
    
    fieldsets = (
        ('Informações Básicas', {
            'fields': ('titulo', 'descricao', 'categoria', 'prioridade')
        }),
        ('Status e Controle', {
            'fields': ('status',)
        }),
        ('Detalhes Técnicos', {
            'fields': ('url_pagina', 'imagem', 'usuario', 'data_criacao'),
            'classes': ('collapse',)
        }),
    )
    
    def has_add_permission(self, request):
        return False