# backend/features/metricas_n1italia/models.py
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

class AnaliseN1Italia(models.Model):
    """Model para armazenar análises de métricas N1 Itália"""

    nome = models.CharField(max_length=255, verbose_name="Nome da Análise")
    descricao = models.TextField(blank=True, null=True, verbose_name="Descrição")
    dados_processados = models.JSONField(null=True, blank=True, verbose_name="Dados do Relatório N1")

    # Metadados de controle
    criado_por = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="Criado por")
    criado_em = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    atualizado_em = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")

    class Meta:
        verbose_name = "Análise N1 Itália"
        verbose_name_plural = "Análises N1 Itália"
        ordering = ['-atualizado_em']
        # Removido unique_together para permitir compartilhamento entre usuários

    def __str__(self):
        return f"[N1 ITÁLIA] {self.nome}"

    def save(self, *args, **kwargs):
        if not self.nome.startswith('[N1 ITÁLIA]'):
            self.nome = f"[N1 ITÁLIA] {self.nome}"
        super().save(*args, **kwargs)

    @property
    def total_pedidos(self):
        """Retorna total de pedidos da análise"""
        if self.dados_processados and 'visualizacao_total' in self.dados_processados:
            return sum(item.get('Total', 0) for item in self.dados_processados['visualizacao_total'])
        return 0

    @property
    def efetividade_parcial(self):
        """Retorna efetividade parcial média"""
        if self.dados_processados and 'visualizacao_total' in self.dados_processados:
            efetividades = [item.get('Efetividade Parcial (%)', 0) for item in self.dados_processados['visualizacao_total']]
            return round(sum(efetividades) / len(efetividades), 2) if efetividades else 0
        return 0

    @property
    def efetividade_total(self):
        """Retorna efetividade total média"""
        if self.dados_processados and 'visualizacao_total' in self.dados_processados:
            efetividades = [item.get('Efetividade Total (%)', 0) for item in self.dados_processados['visualizacao_total']]
            return round(sum(efetividades) / len(efetividades), 2) if efetividades else 0
        return 0