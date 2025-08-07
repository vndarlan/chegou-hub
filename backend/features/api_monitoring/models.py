from django.db import models
from django.contrib.auth.models import User


class ApiProvider(models.Model):
    """Representa um provedor de API (OpenAI, Anthropic, etc.)"""
    PROVIDER_CHOICES = [
        ('openai', 'OpenAI'),
        ('anthropic', 'Anthropic'),
    ]
    
    name = models.CharField(max_length=50, choices=PROVIDER_CHOICES, unique=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'api_providers'
        verbose_name = 'Provedor de API'
        verbose_name_plural = 'Provedores de API'
    
    def __str__(self):
        return self.get_name_display()


class ApiKey(models.Model):
    """Representa uma chave de API específica"""
    provider = models.ForeignKey(ApiProvider, on_delete=models.CASCADE, related_name='api_keys')
    name = models.CharField(max_length=100, help_text="Nome identificador da API key")
    key_id = models.CharField(max_length=100, help_text="ID da chave (não a chave completa)")
    description = models.TextField(blank=True, help_text="Descrição do uso desta API key")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'api_keys'
        verbose_name = 'Chave de API'
        verbose_name_plural = 'Chaves de API'
        unique_together = ['provider', 'key_id']
    
    def __str__(self):
        return f"{self.provider.name} - {self.name}"


class UsageRecord(models.Model):
    """Registra o uso de APIs (tokens, requests, etc.)"""
    api_key = models.ForeignKey(ApiKey, on_delete=models.CASCADE, related_name='usage_records')
    date = models.DateField(help_text="Data do uso")
    model_name = models.CharField(max_length=100, help_text="Nome do modelo utilizado")
    
    # Métricas de uso
    total_requests = models.IntegerField(default=0)
    input_tokens = models.BigIntegerField(default=0)
    output_tokens = models.BigIntegerField(default=0)
    cached_tokens = models.BigIntegerField(default=0, help_text="Tokens em cache (se aplicável)")
    
    # Metadata adicional
    is_batch = models.BooleanField(default=False, help_text="Se foi processamento em batch")
    project_id = models.CharField(max_length=100, blank=True, help_text="ID do projeto (se aplicável)")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'usage_records'
        verbose_name = 'Registro de Uso'
        verbose_name_plural = 'Registros de Uso'
        unique_together = ['api_key', 'date', 'model_name', 'project_id']
        indexes = [
            models.Index(fields=['date']),
            models.Index(fields=['api_key', 'date']),
            models.Index(fields=['model_name']),
        ]
    
    def __str__(self):
        return f"{self.api_key.name} - {self.model_name} - {self.date}"
    
    @property
    def total_tokens(self):
        return self.input_tokens + self.output_tokens


class CostRecord(models.Model):
    """Registra os custos das APIs"""
    api_key = models.ForeignKey(ApiKey, on_delete=models.CASCADE, related_name='cost_records')
    date = models.DateField(help_text="Data do custo")
    model_name = models.CharField(max_length=100, help_text="Nome do modelo")
    
    # Custos detalhados
    input_cost = models.DecimalField(max_digits=10, decimal_places=4, default=0, help_text="Custo de tokens de input")
    output_cost = models.DecimalField(max_digits=10, decimal_places=4, default=0, help_text="Custo de tokens de output")
    cached_cost = models.DecimalField(max_digits=10, decimal_places=4, default=0, help_text="Custo de tokens em cache")
    other_costs = models.DecimalField(max_digits=10, decimal_places=4, default=0, help_text="Outros custos (ex: web search)")
    
    # Metadata
    currency = models.CharField(max_length=3, default='USD')
    project_id = models.CharField(max_length=100, blank=True, help_text="ID do projeto (se aplicável)")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'cost_records'
        verbose_name = 'Registro de Custo'
        verbose_name_plural = 'Registros de Custo'
        unique_together = ['api_key', 'date', 'model_name', 'project_id']
        indexes = [
            models.Index(fields=['date']),
            models.Index(fields=['api_key', 'date']),
            models.Index(fields=['model_name']),
        ]
    
    def __str__(self):
        return f"{self.api_key.name} - {self.model_name} - {self.date} - ${self.total_cost}"
    
    @property
    def total_cost(self):
        return self.input_cost + self.output_cost + self.cached_cost + self.other_costs


class DataSync(models.Model):
    """Controla a sincronização de dados das APIs"""
    provider = models.ForeignKey(ApiProvider, on_delete=models.CASCADE)
    last_sync_date = models.DateField(help_text="Última data sincronizada")
    last_sync_timestamp = models.DateTimeField(auto_now=True)
    sync_status = models.CharField(max_length=20, choices=[
        ('success', 'Sucesso'),
        ('error', 'Erro'),
        ('in_progress', 'Em Progresso'),
    ], default='success')
    error_message = models.TextField(blank=True, help_text="Mensagem de erro da última sync")
    
    class Meta:
        db_table = 'data_sync'
        verbose_name = 'Sincronização de Dados'
        verbose_name_plural = 'Sincronizações de Dados'
        unique_together = ['provider']
    
    def __str__(self):
        return f"{self.provider.name} - {self.last_sync_date} - {self.sync_status}"