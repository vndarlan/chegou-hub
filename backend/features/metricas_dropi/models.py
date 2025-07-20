# backend/features/metricas_dropi/models.py
from django.db import models
from django.contrib.auth.models import User

class DropiToken(models.Model):
    """Model para armazenar tokens dos países Dropi"""
    PAIS_CHOICES = [
        ('mexico', 'México'),
        ('colombia', 'Colômbia'),
        ('chile', 'Chile'),
    ]
    
    pais = models.CharField(max_length=20, choices=PAIS_CHOICES, unique=True)
    token = models.TextField(verbose_name="Token de Acesso")
    expires_at = models.DateTimeField(verbose_name="Expira em")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")
    
    class Meta:
        verbose_name = "Token Dropi"
        verbose_name_plural = "Tokens Dropi"
        ordering = ['-updated_at']
    
    def __str__(self):
        return f"Token {self.get_pais_display()}"
    
    @property
    def is_valid(self):
        from django.utils import timezone
        return self.expires_at > timezone.now()

class AnaliseDropi(models.Model):
    """Model para análises do Dropi"""
    PAIS_CHOICES = [
        ('mexico', 'México'),
        ('colombia', 'Colômbia'),
        ('chile', 'Chile'),
    ]
    
    nome = models.CharField(max_length=255, verbose_name="Nome da Análise")
    descricao = models.TextField(blank=True, null=True, verbose_name="Descrição")
    dados_pedidos = models.JSONField(null=True, blank=True, verbose_name="Dados dos Pedidos")
    tipo_metrica = models.CharField(max_length=20, default='pedidos', verbose_name="Tipo de Métrica")
    pais = models.CharField(max_length=20, choices=PAIS_CHOICES, default='mexico', verbose_name="País")
    
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
        verbose_name = "Análise Dropi"
        verbose_name_plural = "Análises Dropi"
        ordering = ['-atualizado_em']
        unique_together = ['nome', 'criado_por']
    
    def __str__(self):
        return f"[DROPI-{self.get_pais_display().upper()}] {self.nome}"
    
    def save(self, *args, **kwargs):
        if not self.nome.startswith('[DROPI'):
            pais_display = self.get_pais_display().upper()
            self.nome = f"[DROPI-{pais_display}] {self.nome}"
        super().save(*args, **kwargs)