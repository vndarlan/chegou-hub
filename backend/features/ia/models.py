# backend/features/ia/models.py - VERSÃO CORRIGIDA
from django.db import models
from django.contrib.auth.models import User

class TipoFerramenta(models.TextChoices):
    NICOCHAT = 'Nicochat', 'Nicochat'
    N8N = 'N8N', 'N8N'

class NivelLog(models.TextChoices):
    INFO = 'info', 'Info'
    WARNING = 'warning', 'Warning'
    ERROR = 'error', 'Error'
    CRITICAL = 'critical', 'Critical'

class PaisNicochat(models.TextChoices):
    COLOMBIA = 'colombia', 'Colômbia'
    CHILE = 'chile', 'Chile'
    MEXICO = 'mexico', 'México'
    POLONIA = 'polonia', 'Polônia'
    ROMENIA = 'romenia', 'Romênia'
    ESPANHA = 'espanha', 'Espanha'
    ITALIA = 'italia', 'Itália'

class LogEntry(models.Model):
    ferramenta = models.CharField(
        max_length=20, 
        choices=TipoFerramenta.choices,
        verbose_name="Ferramenta"
    )
    nivel = models.CharField(
        max_length=20, 
        choices=NivelLog.choices, 
        default=NivelLog.INFO,
        verbose_name="Nível"
    )
    mensagem = models.TextField(verbose_name="Mensagem")
    detalhes = models.JSONField(
        null=True, 
        blank=True, 
        default=dict,
        verbose_name="Detalhes Técnicos"
    )
    
    # Campos específicos para Nicochat
    pais = models.CharField(
        max_length=20, 
        choices=PaisNicochat.choices,
        null=True, 
        blank=True,
        verbose_name="País (Nicochat)"
    )
    usuario_conversa = models.CharField(
        max_length=100, 
        null=True, 
        blank=True,
        verbose_name="Usuário da Conversa"
    )
    id_conversa = models.CharField(
        max_length=100, 
        null=True, 
        blank=True,
        verbose_name="ID da Conversa"
    )
    
    # Campos gerais
    ip_origem = models.GenericIPAddressField(
        null=True, 
        blank=True,
        verbose_name="IP de Origem"
    )
    user_agent = models.TextField(
        null=True, 
        blank=True,
        verbose_name="User Agent"
    )
    timestamp = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Data/Hora"
    )
    resolvido = models.BooleanField(
        default=False,
        verbose_name="Resolvido"
    )
    resolvido_por = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        verbose_name="Resolvido por",
        related_name='ia_logs_resolvidos'  # ← CORREÇÃO: Nome único para evitar conflito
    )
    data_resolucao = models.DateTimeField(
        null=True, 
        blank=True,
        verbose_name="Data de Resolução"
    )
    
    class Meta:
        verbose_name = "Log de IA"
        verbose_name_plural = "Logs de IA"
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['ferramenta', 'timestamp']),
            models.Index(fields=['nivel', 'timestamp']),
            models.Index(fields=['pais', 'timestamp']),
            models.Index(fields=['resolvido']),
        ]
    
    def __str__(self):
        pais_info = f" ({self.pais})" if self.pais else ""
        return f"[{self.ferramenta}]{pais_info} {self.nivel.upper()}: {self.mensagem[:50]}..."