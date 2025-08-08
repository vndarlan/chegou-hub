import os
from django.db import models
from django.contrib.auth.models import User
from django.conf import settings

try:
    from cloudinary.models import CloudinaryField
    CLOUDINARY_AVAILABLE = hasattr(settings, 'CLOUDINARY_CONFIGURED') and settings.CLOUDINARY_CONFIGURED
except ImportError:
    CLOUDINARY_AVAILABLE = False


def feedback_image_upload_path(instance, filename):
    """
    Função para gerar path de upload de imagens de feedback.
    Usado como fallback quando Cloudinary não está disponível.
    """
    # Criar path relativo
    upload_path = os.path.join('feedback', filename)
    
    # Garantir que o diretório absoluto existe
    full_dir = os.path.join(settings.MEDIA_ROOT, 'feedback')
    os.makedirs(full_dir, exist_ok=True)
    
    return upload_path


class Feedback(models.Model):
    CATEGORIA_CHOICES = [
        ('bug', 'Bug/Erro'),
        ('melhoria', 'Sugestão de melhoria'),
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
    
    # Campo de imagem que usa Cloudinary quando disponível
    if CLOUDINARY_AVAILABLE:
        imagem = CloudinaryField(
            'image', 
            blank=True, 
            null=True, 
            folder='feedback/',
            transformation={
                'quality': 'auto:good',
                'fetch_format': 'auto'
            }
        )
    else:
        imagem = models.ImageField(upload_to=feedback_image_upload_path, blank=True, null=True)
    
    data_criacao = models.DateTimeField(auto_now_add=True)
    usuario = models.ForeignKey(User, on_delete=models.CASCADE)
    
    class Meta:
        ordering = ['-data_criacao']
        verbose_name = 'Feedback'
        verbose_name_plural = 'Feedbacks'
    
    def __str__(self):
        return f"{self.titulo} - {self.get_categoria_display()}"