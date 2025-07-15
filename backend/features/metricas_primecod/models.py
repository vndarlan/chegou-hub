from django.db import models
from django.contrib.auth.models import User

class AnalisePrimeCOD(models.Model):
    nome = models.CharField(max_length=255, verbose_name="Nome da Análise")
    descricao = models.TextField(blank=True, null=True, verbose_name="Descrição")
    
    # Dados salvos como JSON
    dados_leads = models.JSONField(null=True, blank=True, verbose_name="Dados de Leads")
    dados_orders = models.JSONField(null=True, blank=True, verbose_name="Dados de Orders")
    dados_efetividade = models.JSONField(null=True, blank=True, verbose_name="Dados de Efetividade")
    
    # Metadados
    criado_por = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="Criado por")
    criado_em = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    atualizado_em = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")
    
    class Meta:
        verbose_name = "Análise Prime COD"
        verbose_name_plural = "Análises Prime COD"
        ordering = ['-atualizado_em']
        unique_together = ['nome', 'criado_por']
    
    def __str__(self):
        return f"[PRIMECOD] {self.nome}"

class StatusMappingPrimeCOD(models.Model):
    """Mapeamento de status para Prime COD"""
    CATEGORIA_CHOICES = [
        ('LEADS', 'Status de Leads'),
        ('ORDERS', 'Status de Orders'),
    ]
    
    categoria = models.CharField(max_length=10, choices=CATEGORIA_CHOICES)
    status_original = models.CharField(max_length=100, verbose_name="Status Original")
    status_mapeado = models.CharField(max_length=50, verbose_name="Status Mapeado")
    ativo = models.BooleanField(default=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Mapeamento de Status Prime COD"
        verbose_name_plural = "Mapeamentos de Status Prime COD"
        unique_together = ['categoria', 'status_original']
    
    def __str__(self):
        return f"PrimeCOD {self.categoria}: {self.status_original} → {self.status_mapeado}"