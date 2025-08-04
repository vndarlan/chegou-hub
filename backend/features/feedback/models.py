from django.db import models
from django.contrib.auth.models import User


class Feedback(models.Model):
    CATEGORIA_CHOICES = [
        ('bug', 'Bug/Erro'),
        ('melhoria', 'Sugestão de melhoria'),
        ('usabilidade', 'Problema de usabilidade'),
        ('outro', 'Outro'),
    ]
    
    PRIORIDADE_CHOICES = [
        ('baixa', 'Baixa'),
        ('media', 'Média'),
        ('alta', 'Alta'),
    ]
    
    STATUS_CHOICES = [
        ('pendente', 'Pendente'),
        ('em_analise', 'Em análise'),
        ('resolvido', 'Resolvido'),
    ]
    
    titulo = models.CharField(max_length=200)
    descricao = models.TextField()
    categoria = models.CharField(max_length=20, choices=CATEGORIA_CHOICES)
    prioridade = models.CharField(max_length=10, choices=PRIORIDADE_CHOICES, default='media')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pendente')
    url_pagina = models.URLField(max_length=500)
    imagem = models.ImageField(upload_to='feedback_images/', blank=True, null=True)
    data_criacao = models.DateTimeField(auto_now_add=True)
    usuario = models.ForeignKey(User, on_delete=models.CASCADE)
    
    class Meta:
        ordering = ['-data_criacao']
        verbose_name = 'Feedback'
        verbose_name_plural = 'Feedbacks'
    
    def __str__(self):
        return f"{self.titulo} - {self.get_categoria_display()}"