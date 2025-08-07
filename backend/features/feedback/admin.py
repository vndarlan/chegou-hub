import os
from django.contrib import admin
from django.utils.html import format_html
from django.contrib import messages
from .models import Feedback


@admin.register(Feedback)
class FeedbackAdmin(admin.ModelAdmin):
    list_display = ['titulo', 'categoria', 'prioridade', 'status', 'usuario', 'data_criacao', 'status_imagem', 'aparece_em_notificacoes']
    list_filter = ['categoria', 'prioridade', 'status', 'data_criacao']
    search_fields = ['titulo', 'descricao', 'usuario__username']
    readonly_fields = ['data_criacao', 'usuario', 'url_pagina', 'preview_imagem', 'info_imagem']
    actions = ['limpar_imagens_orfas', 'marcar_como_resolvido', 'marcar_como_pendente']
    
    fieldsets = (
        ('Informações Básicas', {
            'fields': ('titulo', 'descricao', 'categoria', 'prioridade')
        }),
        ('Status e Controle', {
            'fields': ('status',)
        }),
        ('Detalhes Técnicos', {
            'fields': ('url_pagina', 'usuario', 'data_criacao'),
            'classes': ('collapse',)
        }),
        ('Imagem', {
            'fields': ('imagem', 'preview_imagem', 'info_imagem'),
            'classes': ('collapse',)
        }),
    )
    
    def status_imagem(self, obj):
        """Mostra o status da imagem (existe ou não)"""
        if not obj.imagem or not obj.imagem.name:
            return format_html('<span style="color: gray;">Sem imagem</span>')
        
        try:
            if os.path.exists(obj.imagem.path):
                return format_html('<span style="color: green;">✓ OK</span>')
            else:
                return format_html('<span style="color: red;">✗ Arquivo perdido</span>')
        except:
            return format_html('<span style="color: orange;">⚠ Erro</span>')
    status_imagem.short_description = 'Status da Imagem'
    
    def preview_imagem(self, obj):
        """Mostra preview da imagem no admin"""
        if not obj.imagem or not obj.imagem.name:
            return "Nenhuma imagem anexada"
            
        try:
            if os.path.exists(obj.imagem.path):
                return format_html(
                    '<div style="max-width: 400px; text-align: center;">'
                    '<img src="{}" style="max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">'
                    '<br><br><a href="{}" target="_blank" style="background: #007cba; color: white; padding: 5px 10px; text-decoration: none; border-radius: 3px;">Abrir imagem</a>'
                    '</div>',
                    obj.imagem.url,
                    obj.imagem.url
                )
            else:
                return format_html(
                    '<div style="color: red; padding: 10px; background: #ffebee; border: 1px solid #ffcdd2; border-radius: 4px;">'
                    '<strong>⚠ Arquivo de imagem não encontrado!</strong><br>'
                    'Caminho esperado: {}<br>'
                    'URL: {}'
                    '</div>',
                    obj.imagem.path,
                    obj.imagem.url
                )
        except Exception as e:
            return format_html(
                '<div style="color: orange; padding: 10px; background: #fff3e0; border: 1px solid #ffcc02; border-radius: 4px;">'
                '<strong>Erro ao processar imagem:</strong><br>{}'
                '</div>',
                str(e)
            )
    preview_imagem.short_description = 'Preview da Imagem'
    
    def info_imagem(self, obj):
        """Mostra informações técnicas da imagem"""
        if not obj.imagem or not obj.imagem.name:
            return "N/A"
            
        try:
            path = obj.imagem.path
            if os.path.exists(path):
                size = os.path.getsize(path)
                size_kb = round(size / 1024, 1)
                return format_html(
                    '<small>'
                    '<strong>Nome:</strong> {}<br>'
                    '<strong>Tamanho:</strong> {} KB<br>'
                    '<strong>Caminho:</strong> {}'
                    '</small>',
                    obj.imagem.name,
                    size_kb,
                    path
                )
            else:
                return format_html('<small style="color: red;">Arquivo não existe: {}</small>', path)
        except Exception as e:
            return format_html('<small style="color: orange;">Erro: {}</small>', str(e))
    info_imagem.short_description = 'Info Técnica'
    
    def limpar_imagens_orfas(self, request, queryset):
        """Action para limpar registros com imagens que não existem mais"""
        count = 0
        for feedback in queryset:
            if feedback.imagem and feedback.imagem.name:
                try:
                    if not os.path.exists(feedback.imagem.path):
                        feedback.imagem.delete(save=False)  # Remove apenas a referência
                        feedback.save()
                        count += 1
                except:
                    pass
        
        if count > 0:
            messages.success(request, f'{count} imagem(ns) órfã(s) removida(s) com sucesso.')
        else:
            messages.info(request, 'Nenhuma imagem órfã encontrada nos registros selecionados.')
    limpar_imagens_orfas.short_description = "Limpar imagens órfãs (arquivos inexistentes)"
    
    def aparece_em_notificacoes(self, obj):
        """Indica se o feedback aparece nas notificações"""
        if obj.status in ['pendente', 'em_analise']:
            return format_html('<span style="color: orange; font-weight: bold;">✓ Sim</span>')
        else:
            return format_html('<span style="color: green;">✗ Não</span>')
    aparece_em_notificacoes.short_description = 'Nas Notificações'
    
    def marcar_como_resolvido(self, request, queryset):
        """Action para marcar feedbacks como resolvidos"""
        count = 0
        for feedback in queryset:
            if feedback.status != 'resolvido':
                feedback.status = 'resolvido'
                feedback.save()
                count += 1
        
        if count > 0:
            messages.success(request, f'{count} feedback(s) marcado(s) como resolvido(s) e removido(s) das notificações.')
        else:
            messages.info(request, 'Nenhum feedback foi alterado (já estavam resolvidos).')
    marcar_como_resolvido.short_description = "Marcar como resolvido (remove das notificações)"
    
    def marcar_como_pendente(self, request, queryset):
        """Action para marcar feedbacks como pendentes"""
        count = 0
        for feedback in queryset:
            if feedback.status != 'pendente':
                feedback.status = 'pendente'
                feedback.save()
                count += 1
        
        if count > 0:
            messages.success(request, f'{count} feedback(s) marcado(s) como pendente(s) e adicionado(s) às notificações.')
        else:
            messages.info(request, 'Nenhum feedback foi alterado (já estavam pendentes).')
    marcar_como_pendente.short_description = "Marcar como pendente (adiciona às notificações)"
    
    def has_add_permission(self, request):
        return False