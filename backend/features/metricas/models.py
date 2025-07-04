# backend/features/metricas/models.py
from django.db import models
from django.contrib.auth.models import User
import json

class AnaliseEfetividade(models.Model):
    TIPO_CHOICES = [
        ('PRIMECOD', 'Prime COD'),
        ('ECOMHUB', 'ECOMHUB'),
    ]
    
    nome = models.CharField(max_length=255, verbose_name="Nome da Análise")
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES, verbose_name="Tipo")
    descricao = models.TextField(blank=True, null=True, verbose_name="Descrição")
    
    # Dados salvos como JSON
    dados_leads = models.JSONField(null=True, blank=True, verbose_name="Dados de Leads")
    dados_efetividade = models.JSONField(null=True, blank=True, verbose_name="Dados de Efetividade")
    
    # Metadados
    criado_por = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="Criado por")
    criado_em = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    atualizado_em = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")
    
    class Meta:
        verbose_name = "Análise de Efetividade"
        verbose_name_plural = "Análises de Efetividade"
        ordering = ['-atualizado_em']
        unique_together = ['nome', 'tipo']  # Nome único por tipo
    
    def __str__(self):
        return f"[{self.tipo}] {self.nome}"
    
    def save(self, *args, **kwargs):
        # Adicionar prefixo automático se necessário
        if self.tipo == 'ECOMHUB' and not self.nome.startswith('[ECOMHUB]'):
            self.nome = f"[ECOMHUB] {self.nome}"
        super().save(*args, **kwargs)


class StatusMapping(models.Model):
    """Mapeamento de status personalizados para normalização"""
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
        verbose_name = "Mapeamento de Status"
        verbose_name_plural = "Mapeamentos de Status"
        unique_together = ['categoria', 'status_original']
    
    def __str__(self):
        return f"{self.categoria}: {self.status_original} → {self.status_mapeado}"