from django.db import models
from django.contrib.auth.models import User

class AnaliseEcomhub(models.Model):
    nome = models.CharField(max_length=255, verbose_name="Nome da Análise")
    descricao = models.TextField(blank=True, null=True, verbose_name="Descrição")
    
    # Dados salvos como JSON
    dados_efetividade = models.JSONField(null=True, blank=True, verbose_name="Dados de Efetividade por Loja")
    
    # Metadados
    criado_por = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="Criado por")
    criado_em = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    atualizado_em = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")
    
    class Meta:
        verbose_name = "Análise ECOMHUB"
        verbose_name_plural = "Análises ECOMHUB"
        ordering = ['-atualizado_em']
        unique_together = ['nome', 'criado_por']
    
    def __str__(self):
        return f"[ECOMHUB] {self.nome}"
    
    def save(self, *args, **kwargs):
        if not self.nome.startswith('[ECOMHUB]'):
            self.nome = f"[ECOMHUB] {self.nome}"
        super().save(*args, **kwargs)

class StatusMappingEcomhub(models.Model):
    """Mapeamento de status para ECOMHUB"""
    status_original = models.CharField(max_length=100, verbose_name="Status Original")
    status_mapeado = models.CharField(max_length=50, verbose_name="Status Mapeado")
    ativo = models.BooleanField(default=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Mapeamento de Status ECOMHUB"
        verbose_name_plural = "Mapeamentos de Status ECOMHUB"
        unique_together = ['status_original']
    
    def __str__(self):
        return f"ECOMHUB: {self.status_original} → {self.status_mapeado}"