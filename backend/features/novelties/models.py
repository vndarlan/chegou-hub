# backend/features/novelties/models.py
from django.db import models
from django.contrib.auth.models import User

class NoveltyExecution(models.Model):
    """Modelo para armazenar execuções das novelties do Chile Bot"""
    
    # Informações básicas da execução
    execution_date = models.DateTimeField(auto_now_add=True, verbose_name="Data/Hora da Execução")
    country = models.CharField(max_length=50, default="chile", verbose_name="País")
    
    # Estatísticas da execução  
    total_processed = models.IntegerField(default=0, verbose_name="Total Processadas")
    successful = models.IntegerField(default=0, verbose_name="Sucessos")
    failed = models.IntegerField(default=0, verbose_name="Falhas")
    tabs_closed = models.IntegerField(default=0, verbose_name="Guias Fechadas")
    
    # Tempos e performance
    execution_time = models.FloatField(default=0.0, verbose_name="Tempo de Execução (segundos)")
    found_pagination = models.BooleanField(default=False, verbose_name="Encontrou Paginação")
    
    # Status da execução
    STATUS_CHOICES = [
        ('success', 'Sucesso'),
        ('partial', 'Parcial'), 
        ('failed', 'Falha'),
        ('error', 'Erro Crítico'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='success', verbose_name="Status")
    
    # Detalhes adicionais
    error_message = models.TextField(blank=True, null=True, verbose_name="Mensagem de Erro")
    details = models.JSONField(default=dict, blank=True, verbose_name="Detalhes Adicionais")
    
    # Metadados
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Criado por")
    
    class Meta:
        verbose_name = "Execução de Novelty"
        verbose_name_plural = "Execuções de Novelties"
        ordering = ['-execution_date']
        indexes = [
            models.Index(fields=['execution_date']),
            models.Index(fields=['country']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"{self.country.title()} - {self.execution_date.strftime('%d/%m/%Y %H:%M')} - {self.get_status_display()}"
    
    @property
    def success_rate(self):
        """Calcula taxa de sucesso em porcentagem"""
        if self.total_processed == 0:
            return 0
        return round((self.successful / self.total_processed) * 100, 1)
    
    @property
    def execution_time_minutes(self):
        """Tempo de execução em minutos"""
        return round(self.execution_time / 60, 2)
    
    def determine_status(self):
        """Determina status automático baseado nos resultados"""
        # Se há mensagem de erro, é erro crítico
        if self.error_message:
            return 'error'
        
        # Se não processou nada mas não há erro, é sucesso (sem novelties disponíveis)
        if self.total_processed == 0:
            return 'success'
        
        # Se processou tudo com sucesso
        elif self.successful == self.total_processed:
            return 'success' 
        
        # Se processou alguns com sucesso
        elif self.successful > 0:
            return 'partial'
        
        # Se processou mas nenhum sucesso
        else:
            return 'failed'

class NoveltyFailure(models.Model):
    """Modelo para armazenar detalhes das falhas específicas"""
    
    execution = models.ForeignKey(NoveltyExecution, on_delete=models.CASCADE, related_name='failures')
    item_id = models.CharField(max_length=100, verbose_name="ID do Item")
    error_type = models.CharField(max_length=100, verbose_name="Tipo de Erro")
    error_message = models.TextField(verbose_name="Mensagem de Erro")
    timestamp = models.DateTimeField(auto_now_add=True, verbose_name="Timestamp")
    
    class Meta:
        verbose_name = "Falha de Novelty"
        verbose_name_plural = "Falhas de Novelties"
        ordering = ['-timestamp']
    
    def __str__(self):
        return f"{self.item_id} - {self.error_type}"