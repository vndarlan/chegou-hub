# backend/core/models.py
from django.db import models
from django.conf import settings # Usar settings.AUTH_USER_MODEL é mais robusto
# from django.contrib.auth.models import User # Alternativa se não usar AUTH_USER_MODEL

# Create your models here.

class ImageStyle(models.Model):
    """
    Define um estilo pré-definido que pode ser aplicado aos prompts de geração de imagem.
    Cada estilo pertence a um usuário específico.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='image_styles',
        verbose_name="Usuário"
    )
    name = models.CharField(
        max_length=100,
        verbose_name="Nome do Estilo",
        help_text="Um nome curto e descritivo para o estilo (ex: 'Anúncio Google Ads', 'Desenho Infantil')."
    )
    instructions = models.TextField(
        verbose_name="Instruções do Estilo",
        help_text="O texto/prompt base que será adicionado ANTES do prompt do usuário ao gerar imagens com este estilo.",
        blank=False # Instruções são obrigatórias para um estilo
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")

    class Meta:
        verbose_name = "Estilo de Imagem"
        verbose_name_plural = "Estilos de Imagem"
        ordering = ['name'] # Ordenar estilos por nome por padrão
        unique_together = ('user', 'name') # Um usuário não pode ter dois estilos com o mesmo nome

    def __str__(self):
        return f"{self.name} (Usuário: {self.user.username})"
    
class ManagedCalendar(models.Model):
    name = models.CharField(
        max_length=100,
        verbose_name="Nome do Calendário",
        help_text="Um nome descritivo para o calendário (Ex: Marketing, Feriados)."
    )
    # Substituído google_calendar_id por iframe_code
    iframe_code = models.TextField(
        verbose_name="Código Iframe do Google Calendar",
        help_text="Cole aqui o código iframe completo obtido do Google Calendar.",
        unique=True # Garante que o mesmo iframe não seja adicionado duas vezes
    )
    added_at = models.DateTimeField(auto_now_add=True, verbose_name="Adicionado em")
    # Opcional: added_by

    class Meta:
        verbose_name = "Calendário Gerenciado (Iframe)" # Nome atualizado
        verbose_name_plural = "Calendários Gerenciados (Iframe)"
        ordering = ['name']

    def __str__(self):
        # Exibe o início do iframe para identificação
        src_start = self.iframe_code.find('src="')
        src_end = self.iframe_code.find('"', src_start + 5) if src_start != -1 else -1
        src_preview = self.iframe_code[src_start+5:src_end] if src_end != -1 else "[código iframe]"
        return f"{self.name} ({src_preview[:50]}...)" # Mostra início da URL src