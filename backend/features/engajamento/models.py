# backend/features/engajamento/models.py
from django.db import models
from django.contrib.auth.models import User

class TipoEngajamento(models.TextChoices):
    LIKE = 'Like', 'Like'
    AMEI = 'Amei', 'Amei'
    UAU = 'Uau', 'Uau'

class Engajamento(models.Model):
    nome = models.CharField(max_length=100)
    engajamento_id = models.CharField(max_length=50)
    tipo = models.CharField(max_length=10, choices=TipoEngajamento.choices)
    funcionando = models.BooleanField(default=True)
    ativo = models.BooleanField(default=True)
    data_criacao = models.DateTimeField(auto_now_add=True)
    criado_por = models.ForeignKey(User, on_delete=models.CASCADE)
    
    class Meta:
        verbose_name = "Engajamento"
        verbose_name_plural = "Engajamentos"
        ordering = ['-data_criacao']
    
    def __str__(self):
        return f"{self.nome} ({self.tipo})"

class PedidoEngajamento(models.Model):
    STATUS_CHOICES = [
        ('pendente', 'Pendente'),
        ('processando', 'Processando'),
        ('concluido', 'Concluído'),
        ('erro', 'Erro'),
    ]
    
    engajamentos = models.ManyToManyField(Engajamento, through='ItemPedido')
    urls = models.TextField(help_text="URLs separadas por linha")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pendente')
    resultado_api = models.JSONField(default=dict, blank=True)
    total_links = models.IntegerField(default=0)
    criado_por = models.ForeignKey(User, on_delete=models.CASCADE)
    data_criacao = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Pedido de Engajamento"
        verbose_name_plural = "Pedidos de Engajamento"
        ordering = ['-data_criacao']

class ItemPedido(models.Model):
    pedido = models.ForeignKey(PedidoEngajamento, on_delete=models.CASCADE)
    engajamento = models.ForeignKey(Engajamento, on_delete=models.CASCADE)
    quantidade = models.PositiveIntegerField()
    ordem_api = models.CharField(max_length=50, blank=True)
    status = models.CharField(max_length=20, default='pendente')
    
    class Meta:
        verbose_name = "Item do Pedido"
        verbose_name_plural = "Itens do Pedido"