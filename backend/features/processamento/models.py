# backend/features/processamento/models.py
from django.db import models
from django.contrib.auth.models import User

class ShopifyConfig(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    nome_loja = models.CharField(max_length=100, help_text="Nome para identificar a loja")
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
        unique_together = ['user', 'shop_url']  # Evita duplicar mesma loja
    
    def __str__(self):
        return f"{self.nome_loja} ({self.shop_url}) - {self.user.username}"

class ProcessamentoLog(models.Model):
    TIPO_CHOICES = [
        ('busca', 'Busca de Duplicatas'),
        ('busca_ip', 'Busca por IP'),
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
        return f"{self.config.nome_loja} - {self.get_tipo_display()} - {self.status} - {self.data_execucao.strftime('%d/%m/%Y %H:%M')}"

class IPSecurityAuditLog(models.Model):
    """Log de auditoria específico para operações com dados de IP"""
    
    ACTION_CHOICES = [
        ('ip_search', 'Busca por IP'),
        ('ip_detail_access', 'Acesso a Detalhes de IP'),
        ('massive_ip_search', 'Busca Massiva de IPs'),
        ('suspicious_activity', 'Atividade Suspeita'),
        ('rate_limit_exceeded', 'Rate Limit Excedido'),
        ('ip_not_found', 'IP Não Encontrado'),
        ('ip_search_error', 'Erro na Busca IP'),
        ('ip_detail_error', 'Erro no Detalhamento IP'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    action = models.CharField(max_length=30, choices=ACTION_CHOICES)
    user_ip = models.GenericIPAddressField(help_text="IP do usuário que fez a requisição")
    user_agent = models.TextField(blank=True)
    target_ip_hash = models.CharField(max_length=64, blank=True, help_text="Hash SHA256 do IP consultado")
    target_ip_masked = models.CharField(max_length=45, blank=True, help_text="IP mascarado para exibição")
    details = models.JSONField(default=dict, help_text="Detalhes da operação")
    timestamp = models.DateTimeField(auto_now_add=True)
    risk_level = models.CharField(
        max_length=10,
        choices=[
            ('low', 'Baixo'),
            ('medium', 'Médio'), 
            ('high', 'Alto'),
            ('critical', 'Crítico')
        ],
        default='low'
    )
    
    class Meta:
        verbose_name = "Log de Auditoria de Segurança IP"
        verbose_name_plural = "Logs de Auditoria de Segurança IP"
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', 'action']),
            models.Index(fields=['timestamp']),
            models.Index(fields=['risk_level']),
            models.Index(fields=['target_ip_hash']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.get_action_display()} - {self.timestamp.strftime('%d/%m/%Y %H:%M')}"
    
    @classmethod
    def log_activity(cls, user, action, user_ip, target_ip=None, details=None, user_agent='', risk_level='low'):
        """
        Método helper para criar logs de auditoria
        
        Args:
            user: Django User object
            action: Ação realizada
            user_ip: IP do usuário
            target_ip: IP consultado (opcional)
            details: Detalhes adicionais
            user_agent: User agent do browser
            risk_level: Nível de risco da operação
        """
        from .utils.security_utils import IPSecurityUtils
        
        # Processa IP alvo se fornecido
        target_ip_hash = ''
        target_ip_masked = ''
        if target_ip:
            target_ip_hash = IPSecurityUtils.hash_ip(target_ip)
            target_ip_masked = IPSecurityUtils.mask_ip(target_ip)
        
        return cls.objects.create(
            user=user,
            action=action,
            user_ip=user_ip,
            user_agent=user_agent,
            target_ip_hash=target_ip_hash,
            target_ip_masked=target_ip_masked,
            details=details or {},
            risk_level=risk_level
        )