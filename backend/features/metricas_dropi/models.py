# backend/features/metricas_dropi/models.py
from django.db import models
from django.contrib.auth.models import User

class AnaliseDropi(models.Model):
    """Model para análises do Dropi MX"""
    nome = models.CharField(max_length=255, verbose_name="Nome da Análise")
    descricao = models.TextField(blank=True, null=True, verbose_name="Descrição")
    dados_pedidos = models.JSONField(null=True, blank=True, verbose_name="Dados dos Pedidos")
    tipo_metrica = models.CharField(max_length=20, default='pedidos', verbose_name="Tipo de Métrica")
    
    # Filtros aplicados
    data_inicio = models.DateField(verbose_name="Data Início")
    data_fim = models.DateField(verbose_name="Data Fim") 
    user_id_dropi = models.CharField(max_length=50, verbose_name="User ID Dropi")
    total_pedidos = models.IntegerField(default=0, verbose_name="Total de Pedidos")
    
    # Metadados
    criado_por = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="Criado por")
    criado_em = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    atualizado_em = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")
    
    class Meta:
        verbose_name = "Análise Dropi MX"
        verbose_name_plural = "Análises Dropi MX"
        ordering = ['-atualizado_em']
        unique_together = ['nome', 'criado_por']
    
    def __str__(self):
        return f"[DROPI] {self.nome}"
    
    def save(self, *args, **kwargs):
        if not self.nome.startswith('[DROPI]'):
            self.nome = f"[DROPI] {self.nome}"
        super().save(*args, **kwargs)