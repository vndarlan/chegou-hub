# backend/features/processamento/models.py
from django.db import models
from django.contrib.auth.models import User

class ShopifyConfig(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    shop_url = models.CharField(max_length=255, help_text="URL da loja (ex: minha-loja.myshopify.com)")
    access_token = models.CharField(max_length=255, help_text="Token de acesso da API do Shopify")
    api_version = models.CharField(max_length=20, default="2024-07")
    ativo = models.BooleanField(default=True)
    data_criacao = models.DateTimeField(auto_now_add=True)
    data_atualizacao = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Configuração Shopify"
        verbose_name_plural = "Configurações Shopify"
        ordering = ['-data_criacao']
    
    def __str__(self):
        return f"{self.shop_url} - {self.user.username}"

class ProcessamentoLog(models.Model):
    TIPO_CHOICES = [
        ('busca', 'Busca de Duplicatas'),
        ('cancelamento', 'Cancelamento Individual'),
        ('cancelamento_lote', 'Cancelamento em Lote'),
        ('erro', 'Erro'),
    ]
    
    STATUS_CHOICES = [
        ('sucesso', 'Sucesso'),
        ('erro', 'Erro'),
        ('parcial', 'Parcial'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    config = models.ForeignKey(ShopifyConfig, on_delete=models.CASCADE)
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES)
    detalhes = models.JSONField(default=dict)
    pedidos_encontrados = models.IntegerField(default=0)
    pedidos_cancelados = models.IntegerField(default=0)
    erro_mensagem = models.TextField(blank=True)
    data_execucao = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Log de Processamento"
        verbose_name_plural = "Logs de Processamento"
        ordering = ['-data_execucao']
    
    def __str__(self):
        return f"{self.get_tipo_display()} - {self.status} - {self.data_execucao.strftime('%d/%m/%Y %H:%M')}"