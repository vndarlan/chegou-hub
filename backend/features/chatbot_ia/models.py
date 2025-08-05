from django.db import models
from django.contrib.auth.models import User


class ChatMessage(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    message = models.TextField()
    response = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    response_time_ms = models.IntegerField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Mensagem do Chat'
        verbose_name_plural = 'Mensagens do Chat'
    
    def __str__(self):
        return f"{self.user.username} - {self.created_at.strftime('%d/%m/%Y %H:%M')}"


class DocumentCache(models.Model):
    file_path = models.CharField(max_length=500, unique=True)
    content = models.TextField()
    last_modified = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Cache de Documento'
        verbose_name_plural = 'Cache de Documentos'
    
    def __str__(self):
        return f"Cache: {self.file_path}"