# backend/features/metricas_ecomhub/models.py - COM SISTEMA DE TRACKING DE STATUS
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
import uuid


class EcomhubStore(models.Model):
    """Armazena configurações de lojas ECOMHUB conectadas"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, help_text="Nome descritivo da loja")
    token = models.CharField(max_length=255, unique=True, help_text="Token da API ECOMHUB")
    secret = models.CharField(max_length=255, help_text="Secret da API ECOMHUB")

    # Informações detectadas via API
    country_id = models.IntegerField(null=True, blank=True, help_text="ID do país na API ECOMHUB")
    country_name = models.CharField(max_length=100, blank=True, help_text="Nome do país")
    store_id = models.CharField(max_length=255, blank=True, help_text="ID da loja retornado pela API")
    myshopify_domain = models.CharField(max_length=255, blank=True, null=True)

    # Controles
    is_active = models.BooleanField(default=True, help_text="Se False, não sincroniza pedidos")
    last_sync = models.DateTimeField(null=True, blank=True, help_text="Última sincronização de pedidos")

    # Metadados
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Loja ECOMHUB"
        verbose_name_plural = "Lojas ECOMHUB"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.country_name or 'País não detectado'})"
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


# ===========================================
# SPRINT 1: SISTEMA DE TRACKING OTIMIZADO
# ===========================================

class EcomhubOrder(models.Model):
    """Snapshot atual de cada pedido ECOMHUB"""

    # Identificação
    order_id = models.CharField(max_length=255, db_index=True, help_text="ID único do pedido na API ECOMHUB")
    store = models.ForeignKey(EcomhubStore, on_delete=models.CASCADE, related_name='orders')
    country_id = models.IntegerField(db_index=True)
    country_name = models.CharField(max_length=100)

    # Dados do pedido
    price = models.DecimalField(max_digits=10, decimal_places=2)
    date = models.DateTimeField(help_text="Data original do pedido")
    status = models.CharField(max_length=50, db_index=True, help_text="Status atual")
    shipping_postal_code = models.CharField(max_length=20, blank=True)
    customer_name = models.CharField(max_length=255, blank=True)
    customer_email = models.CharField(max_length=255, blank=True)
    product_name = models.TextField(blank=True, help_text="Nome do(s) produto(s)")

    # Custos (todos opcionais)
    cost_commission = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    cost_commission_return = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    cost_courier = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    cost_courier_return = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    cost_payment_method = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    cost_warehouse = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    cost_warehouse_return = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    # Tracking de status
    status_since = models.DateTimeField(help_text="Quando entrou no status atual")
    time_in_status_hours = models.FloatField(default=0, help_text="Horas no status atual")
    previous_status = models.CharField(max_length=50, blank=True, help_text="Status anterior")

    # Alerta
    ALERT_LEVELS = (
        ('normal', 'Normal'),
        ('yellow', 'Atenção'),
        ('red', 'Urgente'),
        ('critical', 'Crítico'),
    )
    alert_level = models.CharField(max_length=20, choices=ALERT_LEVELS, default='normal', db_index=True)

    # Metadados
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Pedido ECOMHUB"
        verbose_name_plural = "Pedidos ECOMHUB"
        unique_together = ['order_id', 'store']
        indexes = [
            models.Index(fields=['order_id']),
            models.Index(fields=['status']),
            models.Index(fields=['country_id']),
            models.Index(fields=['alert_level']),
            models.Index(fields=['-time_in_status_hours']),
        ]
        ordering = ['-date']

    def __str__(self):
        return f"{self.order_id} - {self.status} - {self.customer_name}"


class EcomhubStatusHistory(models.Model):
    """Histórico de mudanças de status de um pedido"""

    order = models.ForeignKey(EcomhubOrder, on_delete=models.CASCADE, related_name='status_history')
    status_from = models.CharField(max_length=50, help_text="Status anterior")
    status_to = models.CharField(max_length=50, help_text="Novo status")
    changed_at = models.DateTimeField(auto_now_add=True, help_text="Quando mudou")
    duration_in_previous_status_hours = models.FloatField(help_text="Tempo que ficou no status anterior")

    class Meta:
        verbose_name = "Histórico de Status"
        verbose_name_plural = "Históricos de Status"
        ordering = ['-changed_at']
        indexes = [
            models.Index(fields=['order', '-changed_at']),
        ]

    def __str__(self):
        return f"{self.order.order_id}: {self.status_from} → {self.status_to}"


class EcomhubAlertConfig(models.Model):
    """Configuração de limites de alerta por status (editável pelo usuário)"""

    STATUS_CHOICES = (
        ('processing', 'Processando'),
        ('preparing_for_shipping', 'Preparando Envio'),
        ('ready_to_ship', 'Pronto para Envio'),
        ('shipped', 'Enviado'),
        ('with_courier', 'Com Transportadora'),
        ('out_for_delivery', 'Saiu para Entrega'),
        ('returning', 'Em Devolução'),
        ('issue', 'Com Problemas'),
    )

    status = models.CharField(max_length=50, unique=True, choices=STATUS_CHOICES, help_text="Status do pedido")

    # Limites em horas
    yellow_threshold_hours = models.FloatField(default=48, help_text="Atenção após X horas (padrão: 48h = 2 dias)")
    red_threshold_hours = models.FloatField(default=120, help_text="Urgente após X horas (padrão: 120h = 5 dias)")
    critical_threshold_hours = models.FloatField(default=168, help_text="Crítico após X horas (padrão: 168h = 7 dias)")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Configuração de Alerta"
        verbose_name_plural = "Configurações de Alertas"
        ordering = ['status']

    def __str__(self):
        return f"Alertas para {self.get_status_display()}"


class EcomhubUnknownStatus(models.Model):
    """Registra status desconhecidos detectados automaticamente"""
    status = models.CharField(max_length=100, unique=True, db_index=True, help_text="Status desconhecido encontrado na API")
    first_detected = models.DateTimeField(auto_now_add=True, help_text="Primeira vez que foi detectado")
    last_seen = models.DateTimeField(auto_now=True, help_text="Última vez que apareceu")
    occurrences_count = models.IntegerField(default=1, help_text="Quantidade de vezes que apareceu")
    sample_order_id = models.CharField(max_length=255, blank=True, help_text="Exemplo de pedido com este status")

    # Classificação manual
    reviewed = models.BooleanField(default=False, help_text="Se já foi revisado pelo usuário")
    is_active = models.BooleanField(null=True, blank=True, help_text="True=ativo, False=final, None=não revisado")
    reviewed_at = models.DateTimeField(null=True, blank=True, help_text="Quando foi revisado")

    class Meta:
        db_table = 'ecomhub_unknown_statuses'
        ordering = ['-last_seen']
        verbose_name = 'Status Desconhecido'
        verbose_name_plural = 'Status Desconhecidos'

    def __str__(self):
        return f"{self.status} ({self.occurrences_count} ocorrências)"


# ===========================================
# EFETIVIDADE V2: ANÁLISES COM API DIRETA
# ===========================================

class EfetividadeAnaliseV2(models.Model):
    """
    Model separado para análises V2 - chamadas diretas à API ECOMHUB

    Diferente de AnaliseEcomhub (V1 via Selenium), este model armazena
    análises obtidas diretamente da API oficial, integradas com lojas
    cadastradas em EcomhubStore.
    """

    # Identificação
    nome = models.CharField(
        max_length=255,
        verbose_name="Nome da Análise",
        help_text="Nome descritivo para identificar a análise"
    )
    descricao = models.TextField(
        blank=True,
        null=True,
        verbose_name="Descrição",
        help_text="Descrição detalhada (opcional)"
    )

    # Parâmetros da análise
    data_inicio = models.DateField(verbose_name="Data Início")
    data_fim = models.DateField(verbose_name="Data Fim")
    store = models.ForeignKey(
        'EcomhubStore',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='analises_v2',
        verbose_name="Loja",
        help_text="Loja específica ou null para 'todas as lojas'"
    )

    # Dados processados
    dados_brutos = models.JSONField(
        verbose_name="Dados Brutos",
        help_text="Response completa da API ECOMHUB"
    )
    dados_processados = models.JSONField(
        verbose_name="Dados Processados",
        help_text="Dados calculados: visualizacao_otimizada, visualizacao_total, stats"
    )
    estatisticas = models.JSONField(
        verbose_name="Estatísticas",
        help_text="Métricas agregadas: total_produtos, efetividade_media, etc"
    )

    # Metadados
    criado_por = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        verbose_name="Criado por"
    )
    criado_em = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    atualizado_em = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")

    class Meta:
        verbose_name = "Análise Efetividade V2"
        verbose_name_plural = "Análises Efetividade V2"
        ordering = ['-criado_em']
        indexes = [
            models.Index(fields=['store', '-criado_em']),
            models.Index(fields=['criado_por', '-criado_em']),
            models.Index(fields=['data_inicio', 'data_fim']),
        ]

    def __str__(self):
        store_nome = self.store.name if self.store else "Todas as lojas"
        periodo = f"{self.data_inicio.strftime('%d/%m/%Y')} - {self.data_fim.strftime('%d/%m/%Y')}"
        return f"{self.nome} ({store_nome}) - {periodo}"

    @property
    def periodo_dias(self):
        """Retorna quantidade de dias do período analisado"""
        return (self.data_fim - self.data_inicio).days + 1

    @property
    def total_produtos(self):
        """Extrai total de produtos das estatísticas"""
        return self.estatisticas.get('total_produtos', 0) if self.estatisticas else 0

    @property
    def efetividade_media(self):
        """Extrai efetividade média das estatísticas"""
        return self.estatisticas.get('efetividade_media', 0) if self.estatisticas else 0

