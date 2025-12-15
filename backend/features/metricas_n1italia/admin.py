# backend/features/metricas_n1italia/admin.py
from django.contrib import admin
from django.utils.html import format_html
from unfold.admin import ModelAdmin
from .models import AnaliseN1Italia


@admin.register(AnaliseN1Italia)
class AnaliseN1ItaliaAdmin(ModelAdmin):
    """Admin interface para Análises N1 Itália"""

    list_display = (
        'nome', 'criado_por_nome', 'total_pedidos_display',
        'efetividade_parcial_display', 'efetividade_total_display',
        'criado_em', 'atualizado_em'
    )

    list_filter = (
        'criado_em', 'atualizado_em', 'criado_por'
    )

    search_fields = (
        'nome', 'descricao', 'criado_por__username',
        'criado_por__first_name', 'criado_por__last_name'
    )

    readonly_fields = (
        'criado_por', 'criado_em', 'atualizado_em',
        'total_pedidos', 'efetividade_parcial', 'efetividade_total',
        'preview_dados_processados'
    )

    fieldsets = (
        ('Informações Básicas', {
            'fields': ('nome', 'descricao', 'criado_por')
        }),
        ('Estatísticas', {
            'fields': (
                'total_pedidos', 'efetividade_parcial', 'efetividade_total'
            ),
            'classes': ('collapse',)
        }),
        ('Dados Processados', {
            'fields': ('preview_dados_processados', 'dados_processados'),
            'classes': ('collapse',)
        }),
        ('Metadados', {
            'fields': ('criado_em', 'atualizado_em'),
            'classes': ('collapse',)
        })
    )

    ordering = ('-atualizado_em',)

    def criado_por_nome(self, obj):
        """Exibe nome completo do usuário que criou"""
        if obj.criado_por:
            nome_completo = obj.criado_por.get_full_name()
            return nome_completo if nome_completo else obj.criado_por.username
        return "Usuário desconhecido"
    criado_por_nome.short_description = "Criado por"
    criado_por_nome.admin_order_field = 'criado_por__first_name'

    def total_pedidos_display(self, obj):
        """Exibe total de pedidos formatado"""
        total = obj.total_pedidos
        if total > 0:
            return format_html(
                '<span style="font-weight: bold; color: #28a745;">{:,}</span>',
                total
            )
        return "—"
    total_pedidos_display.short_description = "Total Pedidos"

    def efetividade_parcial_display(self, obj):
        """Exibe efetividade parcial formatada"""
        efetividade = obj.efetividade_parcial
        if efetividade > 0:
            cor = "#28a745" if efetividade >= 80 else "#ffc107" if efetividade >= 60 else "#dc3545"
            return format_html(
                '<span style="font-weight: bold; color: {};">{:.1f}%</span>',
                cor, efetividade
            )
        return "—"
    efetividade_parcial_display.short_description = "Efet. Parcial"

    def efetividade_total_display(self, obj):
        """Exibe efetividade total formatada"""
        efetividade = obj.efetividade_total
        if efetividade > 0:
            cor = "#28a745" if efetividade >= 70 else "#ffc107" if efetividade >= 50 else "#dc3545"
            return format_html(
                '<span style="font-weight: bold; color: {};">{:.1f}%</span>',
                cor, efetividade
            )
        return "—"
    efetividade_total_display.short_description = "Efet. Total"

    def preview_dados_processados(self, obj):
        """Exibe preview dos dados processados"""
        if not obj.dados_processados:
            return "Nenhum dado processado"

        try:
            dados = obj.dados_processados
            html = "<div style='max-height: 300px; overflow-y: auto;'>"

            # Mostrar metadados se existirem
            if 'metadados' in dados:
                metadados = dados['metadados']
                html += "<h4>📊 Metadados:</h4><ul>"
                for key, value in metadados.items():
                    html += f"<li><strong>{key}:</strong> {value}</li>"
                html += "</ul>"

            # Mostrar estatísticas totais se existirem
            if 'stats_total' in dados:
                stats = dados['stats_total']
                html += "<h4>📈 Estatísticas Totais:</h4><ul>"
                for key, value in stats.items():
                    if isinstance(value, (int, float)):
                        if 'pct' in key.lower() or '%' in key or 'efetividade' in key.lower():
                            html += f"<li><strong>{key}:</strong> {value}%</li>"
                        else:
                            html += f"<li><strong>{key}:</strong> {value:,}</li>"
                    else:
                        html += f"<li><strong>{key}:</strong> {value}</li>"
                html += "</ul>"

            # Mostrar primeiros produtos da visualização total
            if 'visualizacao_total' in dados and dados['visualizacao_total']:
                produtos = dados['visualizacao_total'][:3]  # Primeiros 3 produtos
                html += f"<h4>🛍️ Produtos (mostrando {len(produtos)} de {len(dados['visualizacao_total'])}):</h4>"
                for produto in produtos:
                    nome = produto.get('Produto', 'N/A')
                    total = produto.get('Total', 0)
                    efet_total = produto.get('Efetividade Total (%)', 0)
                    html += f"<p><strong>{nome}:</strong> {total:,} pedidos, {efet_total}% efetividade</p>"

            html += "</div>"
            return format_html(html)

        except Exception as e:
            return f"Erro ao processar dados: {str(e)}"

    preview_dados_processados.short_description = "Preview dos Dados"

    def has_change_permission(self, request, obj=None):
        """Permitir edição apenas do nome e descrição"""
        return super().has_change_permission(request, obj)

    def get_readonly_fields(self, request, obj=None):
        """Campos readonly dinâmicos"""
        readonly = list(self.readonly_fields)
        if obj:  # Editando objeto existente
            readonly.extend(['dados_processados'])
        return readonly

    def save_model(self, request, obj, form, change):
        """Sobrescrever save para garantir usuário criador"""
        if not change:  # Novo objeto
            obj.criado_por = request.user
        super().save_model(request, obj, form, change)