# backend/features/metricas_ecomhub/models.py - COM SISTEMA DE TRACKING DE STATUS
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta

class AnaliseEcomhub(models.Model):
    """Model simplificado apenas para análises"""
    nome = models.CharField(max_length=255, verbose_name="Nome da Análise")
    descricao = models.TextField(blank=True, null=True, verbose_name="Descrição")
    dados_efetividade = models.JSONField(null=True, blank=True, verbose_name="Dados de Efetividade")
    tipo_metrica = models.CharField(max_length=20, default='produto', verbose_name="Tipo de Métrica")
    
    # Metadados
    criado_por = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="Criado por")
    criado_em = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    atualizado_em = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")
    
    class Meta:
        verbose_name = "Análise ECOMHUB"
        verbose_name_plural = "Análises ECOMHUB"
        ordering = ['-atualizado_em']
        unique_together = ['nome', 'criado_por']
    
    def __str__(self):
        return f"[ECOMHUB] {self.nome}"
    
    def save(self, *args, **kwargs):
        if not self.nome.startswith('[ECOMHUB]'):
            self.nome = f"[ECOMHUB] {self.nome}"
        super().save(*args, **kwargs)


class PedidoStatusAtual(models.Model):
    """Estado atual de cada pedido EcomHub"""
    
    # Status que não precisam de monitoramento (finalizados)
    STATUS_FINAIS = ['delivered', 'returned', 'cancelled']
    
    # Status que precisam de monitoramento (ativos - podem ter problemas)
    STATUS_ATIVOS = [
        'processing',             # Processando
        'preparing_for_shipping', # Preparando envio
        'ready_to_ship',         # Pronto para enviar
        'shipped',               # Enviado
        'with_courier',          # Com transportadora
        'out_for_delivery',      # Saiu para entrega
        'issue'                  # Com problema (CRÍTICO)
    ]
    
    NIVEL_ALERTA_CHOICES = [
        ('normal', 'Normal'),
        ('amarelo', 'Amarelo'),
        ('vermelho', 'Vermelho'),
        ('critico', 'Crítico')
    ]
    
    # Dados básicos do pedido
    pedido_id = models.CharField(max_length=100, unique=True, verbose_name="ID do Pedido")
    status_atual = models.CharField(max_length=50, verbose_name="Status Atual")
    customer_name = models.CharField(max_length=200, verbose_name="Nome do Cliente")
    customer_email = models.EmailField(verbose_name="Email do Cliente")
    customer_phone = models.CharField(max_length=50, blank=True, verbose_name="Telefone do Cliente")
    produto_nome = models.CharField(max_length=300, verbose_name="Nome do Produto")
    pais = models.CharField(max_length=100, verbose_name="País")
    preco = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Preço")
    data_criacao = models.DateTimeField(verbose_name="Data de Criação")
    data_ultima_atualizacao = models.DateTimeField(verbose_name="Última Atualização")
    shopify_order_number = models.CharField(max_length=100, verbose_name="Número do Pedido Shopify")
    tracking_url = models.URLField(blank=True, verbose_name="URL de Rastreamento")
    
    # Campos de controle de tempo e alertas
    tempo_no_status_atual = models.IntegerField(default=0, verbose_name="Tempo no Status Atual (horas)")
    nivel_alerta = models.CharField(
        max_length=20, 
        choices=NIVEL_ALERTA_CHOICES, 
        default='normal',
        verbose_name="Nível de Alerta"
    )
    
    # Metadados
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")
    
    class Meta:
        verbose_name = "Pedido Status Atual"
        verbose_name_plural = "Pedidos Status Atual"
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['status_atual']),
            models.Index(fields=['nivel_alerta']),
            models.Index(fields=['pais']),
            models.Index(fields=['tempo_no_status_atual']),
        ]
    
    def __str__(self):
        return f"Pedido {self.pedido_id} - {self.status_atual} ({self.nivel_alerta})"
    
    @property
    def is_ativo(self):
        """Verifica se o pedido está em status ativo (precisa monitoramento)"""
        return self.status_atual.lower() not in self.STATUS_FINAIS
    
    @property
    def is_finalizado(self):
        """Verifica se o pedido está finalizado (não precisa monitoramento)"""
        return self.status_atual.lower() in self.STATUS_FINAIS
    
    def calcular_nivel_alerta(self):
        """Calcula o nível de alerta baseado no tempo no status atual e tipo de status"""
        horas = self.tempo_no_status_atual
        status = self.status_atual.lower()
        
        # IGNORAR STATUS FINAIS - não geram alertas
        if status in self.STATUS_FINAIS:
            return 'normal'
        
        # APLICAR REGRAS APENAS PARA STATUS ATIVOS
        if status == 'issue':
            # PROBLEMA - sempre crítico se > 24h
            if horas >= 24:
                return 'critico'
            else:
                return 'amarelo'  # Problema recente
        
        elif status == 'out_for_delivery':
            # Mais urgente - saiu para entrega
            if horas >= 168:  # 7 dias
                return 'critico'
            elif horas >= 120: # 5 dias
                return 'vermelho'
            elif horas >= 72:  # 3 dias
                return 'amarelo'
        
        elif status in ['shipped', 'with_courier']:
            # Médio - em trânsito
            if horas >= 336:  # 14 dias
                return 'critico'
            elif horas >= 240: # 10 dias
                return 'vermelho'
            elif horas >= 168: # 7 dias
                return 'amarelo'
        
        elif status in ['processing', 'preparing_for_shipping', 'ready_to_ship']:
            # Processamento interno
            if horas >= 504:  # 21 dias
                return 'critico'
            elif horas >= 336: # 14 dias
                return 'vermelho'
            elif horas >= 168: # 7 dias
                return 'amarelo'
        
        # Status não reconhecido ou ainda dentro dos limites normais
        return 'normal'
    
    def save(self, *args, **kwargs):
        # Atualizar nível de alerta automaticamente
        self.nivel_alerta = self.calcular_nivel_alerta()
        super().save(*args, **kwargs)


class HistoricoStatus(models.Model):
    """Histórico de mudanças de status dos pedidos"""
    
    pedido = models.ForeignKey(
        PedidoStatusAtual, 
        on_delete=models.CASCADE, 
        related_name='historico',
        verbose_name="Pedido"
    )
    status_anterior = models.CharField(max_length=50, blank=True, verbose_name="Status Anterior")
    status_novo = models.CharField(max_length=50, verbose_name="Status Novo")
    data_mudanca = models.DateTimeField(verbose_name="Data da Mudança")
    tempo_no_status_anterior = models.IntegerField(default=0, verbose_name="Tempo no Status Anterior (horas)")
    
    # Metadados
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    
    class Meta:
        verbose_name = "Histórico de Status"
        verbose_name_plural = "Histórico de Status"
        ordering = ['-data_mudanca']
        indexes = [
            models.Index(fields=['pedido', '-data_mudanca']),
            models.Index(fields=['status_novo']),
        ]
    
    def __str__(self):
        return f"{self.pedido.pedido_id}: {self.status_anterior} → {self.status_novo}"


class ConfiguracaoStatusTracking(models.Model):
    """Configurações do sistema de tracking"""
    
    # Configurações de tempo (em horas)
    limite_amarelo_padrao = models.IntegerField(default=168, verbose_name="Limite Amarelo Padrão (horas)")
    limite_vermelho_padrao = models.IntegerField(default=336, verbose_name="Limite Vermelho Padrão (horas)")
    limite_critico_padrao = models.IntegerField(default=504, verbose_name="Limite Crítico Padrão (horas)")
    
    # Configurações específicas para out_for_delivery
    limite_amarelo_entrega = models.IntegerField(default=72, verbose_name="Limite Amarelo Entrega (horas)")
    limite_vermelho_entrega = models.IntegerField(default=120, verbose_name="Limite Vermelho Entrega (horas)")
    limite_critico_entrega = models.IntegerField(default=168, verbose_name="Limite Crítico Entrega (horas)")
    
    # Configurações de sincronização
    intervalo_sincronizacao = models.IntegerField(default=6, verbose_name="Intervalo de Sincronização (horas)")
    ultima_sincronizacao = models.DateTimeField(null=True, blank=True, verbose_name="Última Sincronização")
    
    # Metadados
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Configuração Status Tracking"
        verbose_name_plural = "Configurações Status Tracking"
    
    def __str__(self):
        return f"Configuração Status Tracking - {self.updated_at.strftime('%d/%m/%Y %H:%M')}"
    
    @classmethod
    def get_configuracao(cls):
        """Retorna a configuração atual ou cria uma padrão"""
        config, created = cls.objects.get_or_create(
            pk=1,
            defaults={
                'limite_amarelo_padrao': 168,
                'limite_vermelho_padrao': 336,
                'limite_critico_padrao': 504,
                'limite_amarelo_entrega': 72,
                'limite_vermelho_entrega': 120,
                'limite_critico_entrega': 168,
                'intervalo_sincronizacao': 6
            }
        )
        return config