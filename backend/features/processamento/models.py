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
        ('detalhamento_ip', 'Detalhamento de IP'),
        ('cancelamento', 'Cancelamento Individual'),
        ('cancelamento_lote', 'Cancelamento em Lote'),
        ('analise_pedido', 'Análise de Pedido'),
        ('debug', 'Debug de Dados'),
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
        ('debug_shopify_raw_data', 'Debug de Dados RAW Shopify'),
        ('debug_shopify_error', 'Erro no Debug Shopify'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    action = models.CharField(max_length=30, choices=ACTION_CHOICES)
    user_ip = models.GenericIPAddressField(help_text="IP do usuário que fez a requisição")
    user_agent = models.TextField(blank=True)
    target_ip_hash = models.CharField(max_length=64, blank=True, help_text="Hash SHA256 do IP consultado")
    target_ip_masked = models.CharField(max_length=45, blank=True, help_text="IP consultado completo")
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

# ===== NOVOS MODELOS PARA SISTEMA DE LOGS ESTRUTURADO =====

class IPDetectionStatistics(models.Model):
    """
    Estatísticas detalhadas de detecção de IP por loja e período
    Permite análise histórica de performance e tendências
    """
    
    config = models.ForeignKey(ShopifyConfig, on_delete=models.CASCADE, related_name='ip_statistics')
    data_referencia = models.DateField(help_text="Data de referência para estas estatísticas")
    
    # === VOLUMES DE PROCESSAMENTO ===
    total_pedidos_processados = models.IntegerField(default=0, help_text="Total de pedidos analisados")
    pedidos_com_ip_detectado = models.IntegerField(default=0, help_text="Pedidos onde foi possível detectar IP")
    pedidos_sem_ip = models.IntegerField(default=0, help_text="Pedidos onde nenhum IP foi encontrado")
    pedidos_ip_rejeitado = models.IntegerField(default=0, help_text="Pedidos onde IP foi rejeitado por filtros de segurança")
    
    # === MÉTODOS DE DETECÇÃO (hierarquia) ===
    ips_via_client_details = models.IntegerField(default=0, help_text="IPs encontrados via client_details.browser_ip")
    ips_via_customer_address = models.IntegerField(default=0, help_text="IPs encontrados via customer.default_address")
    ips_via_shipping_address = models.IntegerField(default=0, help_text="IPs encontrados via shipping_address")
    ips_via_billing_address = models.IntegerField(default=0, help_text="IPs encontrados via billing_address")
    ips_via_metodos_alternativos = models.IntegerField(default=0, help_text="IPs encontrados via métodos alternativos")
    
    # === QUALIDADE DOS IPs DETECTADOS ===
    ips_alta_confianca = models.IntegerField(default=0, help_text="IPs com confidence >= 0.8")
    ips_media_confianca = models.IntegerField(default=0, help_text="IPs com 0.6 <= confidence < 0.8")
    ips_baixa_confianca = models.IntegerField(default=0, help_text="IPs com confidence < 0.6")
    ips_suspeitos_detectados = models.IntegerField(default=0, help_text="IPs identificados como suspeitos")
    
    # === PERFORMANCE TEMPORAL ===
    tempo_medio_deteccao_ms = models.FloatField(default=0, help_text="Tempo médio de detecção em milissegundos")
    tempo_max_deteccao_ms = models.FloatField(default=0, help_text="Maior tempo de detecção registrado")
    api_calls_externas = models.IntegerField(default=0, help_text="Chamadas para APIs externas de geolocalização")
    
    # === TAXAS DE SUCESSO ===
    taxa_sucesso_hierarquia = models.FloatField(default=0, help_text="% de sucesso do método hierárquico padrão")
    taxa_sucesso_alternativo = models.FloatField(default=0, help_text="% de sucesso dos métodos alternativos")
    taxa_sucesso_geral = models.FloatField(default=0, help_text="% de sucesso geral de detecção")
    
    # === METADADOS ===
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)
    versao_detector = models.CharField(max_length=20, default="v2.0", help_text="Versão do detector usado")
    dados_extras = models.JSONField(default=dict, help_text="Dados adicionais específicos")
    
    class Meta:
        verbose_name = "Estatística de Detecção de IP"
        verbose_name_plural = "Estatísticas de Detecção de IP"
        unique_together = ['config', 'data_referencia']
        ordering = ['-data_referencia', '-criado_em']
        indexes = [
            models.Index(fields=['config', 'data_referencia']),
            models.Index(fields=['data_referencia']),
            models.Index(fields=['taxa_sucesso_geral']),
            models.Index(fields=['criado_em']),
        ]
    
    def __str__(self):
        return f"{self.config.nome_loja} - {self.data_referencia} - {self.taxa_sucesso_geral:.1f}% sucesso"
    
    @property
    def taxa_deteccao_percentual(self):
        """Calcula taxa de detecção como percentual"""
        if self.total_pedidos_processados == 0:
            return 0
        return (self.pedidos_com_ip_detectado / self.total_pedidos_processados) * 100
    
    @property
    def metodo_mais_eficaz(self):
        """Identifica qual método de detecção foi mais eficaz"""
        metodos = {
            'client_details': self.ips_via_client_details,
            'customer_address': self.ips_via_customer_address,
            'shipping_address': self.ips_via_shipping_address,
            'billing_address': self.ips_via_billing_address,
            'metodos_alternativos': self.ips_via_metodos_alternativos
        }
        return max(metodos, key=metodos.get) if max(metodos.values()) > 0 else 'nenhum'

class IPDetectionDebugLog(models.Model):
    """
    Log estruturado JSON para debug detalhado de cada detecção de IP
    Permite análise granular de problemas específicos
    """
    
    NIVEL_CHOICES = [
        ('DEBUG', 'Debug'),
        ('INFO', 'Informação'),
        ('WARNING', 'Aviso'),
        ('ERROR', 'Erro'),
        ('CRITICAL', 'Crítico'),
    ]
    
    CATEGORIA_CHOICES = [
        ('ip_detection', 'Detecção de IP'),
        ('hierarchy_analysis', 'Análise de Hierarquia'),
        ('alternative_methods', 'Métodos Alternativos'),
        ('validation', 'Validação de IP'),
        ('geolocation', 'Geolocalização'),
        ('performance', 'Performance'),
        ('security', 'Segurança'),
        ('data_quality', 'Qualidade de Dados'),
    ]
    
    # === IDENTIFICAÇÃO ===
    config = models.ForeignKey(ShopifyConfig, on_delete=models.CASCADE, related_name='debug_logs')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    session_id = models.CharField(max_length=64, help_text="ID único da sessão de análise")
    order_id = models.CharField(max_length=50, help_text="ID do pedido analisado")
    
    # === CLASSIFICAÇÃO ===
    nivel = models.CharField(max_length=10, choices=NIVEL_CHOICES, default='INFO')
    categoria = models.CharField(max_length=30, choices=CATEGORIA_CHOICES)
    subcategoria = models.CharField(max_length=50, blank=True, help_text="Subcategoria específica")
    
    # === DADOS ESTRUTURADOS ===
    titulo = models.CharField(max_length=200, help_text="Título descritivo do log")
    detalhes_json = models.JSONField(help_text="Dados estruturados em JSON")
    
    # === RESULTADOS ===
    ip_detectado = models.GenericIPAddressField(null=True, blank=True, help_text="IP que foi detectado (se houver)")
    metodo_deteccao = models.CharField(max_length=50, blank=True, help_text="Método que detectou o IP")
    score_confianca = models.FloatField(null=True, blank=True, help_text="Score de confiança (0.0-1.0)")
    tempo_processamento_ms = models.FloatField(null=True, blank=True, help_text="Tempo de processamento em ms")
    
    # === CONTEXTO ===
    user_agent = models.TextField(blank=True, help_text="User Agent do browser")
    ip_requisicao = models.GenericIPAddressField(help_text="IP de quem fez a requisição")
    
    # === METADADOS ===
    timestamp = models.DateTimeField(auto_now_add=True)
    versao_sistema = models.CharField(max_length=20, default="2.0", help_text="Versão do sistema")
    
    class Meta:
        verbose_name = "Log de Debug de Detecção IP"
        verbose_name_plural = "Logs de Debug de Detecção IP"
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['config', 'timestamp']),
            models.Index(fields=['session_id']),
            models.Index(fields=['nivel', 'categoria']),
            models.Index(fields=['order_id']),
            models.Index(fields=['timestamp']),
            models.Index(fields=['metodo_deteccao']),
            models.Index(fields=['score_confianca']),
        ]
    
    def __str__(self):
        return f"{self.config.nome_loja} - {self.titulo} - {self.timestamp.strftime('%d/%m %H:%M')}"
    
    @classmethod
    def log_detection_attempt(cls, config, user, session_id, order_id, titulo, detalhes, 
                            nivel='INFO', categoria='ip_detection', subcategoria='',
                            ip_detectado=None, metodo_deteccao='', score_confianca=None,
                            tempo_processamento_ms=None, user_agent='', ip_requisicao=None):
        """
        Método helper para criar logs de detecção estruturados
        
        Args:
            config: ShopifyConfig object
            user: User object
            session_id: ID único da sessão
            order_id: ID do pedido
            titulo: Título do log
            detalhes: Dados estruturados (dict)
            nivel: Nível do log (DEBUG, INFO, WARNING, ERROR, CRITICAL)
            categoria: Categoria do log
            subcategoria: Subcategoria específica
            ip_detectado: IP detectado (se houver)
            metodo_deteccao: Método usado
            score_confianca: Score de confiança
            tempo_processamento_ms: Tempo de processamento
            user_agent: User agent
            ip_requisicao: IP de quem fez a requisição
        """
        from django.utils import timezone
        import uuid
        
        # Gera session_id se não fornecido
        if not session_id:
            session_id = str(uuid.uuid4())[:16]
        
        # IP da requisição padrão
        if not ip_requisicao:
            ip_requisicao = '127.0.0.1'
        
        return cls.objects.create(
            config=config,
            user=user,
            session_id=session_id,
            order_id=str(order_id),
            nivel=nivel,
            categoria=categoria,
            subcategoria=subcategoria,
            titulo=titulo,
            detalhes_json=detalhes or {},
            ip_detectado=ip_detectado,
            metodo_deteccao=metodo_deteccao,
            score_confianca=score_confianca,
            tempo_processamento_ms=tempo_processamento_ms,
            user_agent=user_agent,
            ip_requisicao=ip_requisicao
        )

class IPDetectionAlert(models.Model):
    """
    Alertas automáticos baseados em thresholds e padrões anômalos
    Sistema proativo de notificação para administradores
    """
    
    TIPO_ALERTA_CHOICES = [
        ('taxa_baixa', 'Taxa de Detecção Baixa'),
        ('performance_degradada', 'Performance Degradada'),
        ('muitos_ips_suspeitos', 'Muitos IPs Suspeitos'),
        ('metodo_falhando', 'Método de Detecção Falhando'),
        ('api_externa_indisponivel', 'API Externa Indisponível'),
        ('dados_malformados', 'Dados Malformados Frequentes'),
        ('volume_anormal', 'Volume Anormal de Requisições'),
        ('threshold_configuravel', 'Threshold Configurável Atingido'),
    ]
    
    SEVERIDADE_CHOICES = [
        ('low', 'Baixa'),
        ('medium', 'Média'),
        ('high', 'Alta'),
        ('critical', 'Crítica'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Ativo'),
        ('acknowledged', 'Reconhecido'),
        ('resolved', 'Resolvido'),
        ('false_positive', 'Falso Positivo'),
    ]
    
    # === IDENTIFICAÇÃO ===
    config = models.ForeignKey(ShopifyConfig, on_delete=models.CASCADE, related_name='ip_alerts')
    tipo_alerta = models.CharField(max_length=30, choices=TIPO_ALERTA_CHOICES)
    severidade = models.CharField(max_length=10, choices=SEVERIDADE_CHOICES)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='active')
    
    # === CONTEÚDO ===
    titulo = models.CharField(max_length=200, help_text="Título do alerta")
    descricao = models.TextField(help_text="Descrição detalhada do problema")
    dados_contexto = models.JSONField(default=dict, help_text="Dados que geraram o alerta")
    
    # === THRESHOLDS E MÉTRICAS ===
    valor_detectado = models.FloatField(help_text="Valor que disparou o alerta")
    threshold_configurado = models.FloatField(help_text="Threshold que foi ultrapassado")
    periodo_referencia = models.CharField(max_length=50, help_text="Período analisado (ex: '24h', '7d')")
    
    # === SUGESTÕES AUTOMÁTICAS ===
    sugestao_acao = models.TextField(blank=True, help_text="Sugestão automática de ação")
    pode_resolver_automaticamente = models.BooleanField(default=False, 
                                                        help_text="Sistema pode resolver automaticamente")
    
    # === TRACKING ===
    primeira_ocorrencia = models.DateTimeField(help_text="Primeira vez que este problema foi detectado")
    ultima_ocorrencia = models.DateTimeField(help_text="Última ocorrência do problema")
    contagem_ocorrencias = models.IntegerField(default=1, help_text="Quantas vezes este problema ocorreu")
    
    # === GESTÃO ===
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)
    reconhecido_por = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL,
                                       related_name='alertas_reconhecidos')
    reconhecido_em = models.DateTimeField(null=True, blank=True)
    resolvido_em = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        verbose_name = "Alerta de Detecção IP"
        verbose_name_plural = "Alertas de Detecção IP"
        ordering = ['-severidade', '-primeira_ocorrencia']
        indexes = [
            models.Index(fields=['config', 'status']),
            models.Index(fields=['tipo_alerta', 'severidade']),
            models.Index(fields=['status', 'primeira_ocorrencia']),
            models.Index(fields=['criado_em']),
        ]
    
    def __str__(self):
        return f"{self.config.nome_loja} - {self.titulo} - {self.get_severidade_display()}"
    
    def acknowledge(self, user):
        """Marca alerta como reconhecido"""
        from django.utils import timezone
        self.status = 'acknowledged'
        self.reconhecido_por = user
        self.reconhecido_em = timezone.now()
        self.save()
    
    def resolve(self):
        """Marca alerta como resolvido"""
        from django.utils import timezone
        self.status = 'resolved'
        self.resolvido_em = timezone.now()
        self.save()
    
    @classmethod
    def create_alert(cls, config, tipo_alerta, severidade, titulo, descricao, 
                    valor_detectado, threshold_configurado, periodo_referencia,
                    dados_contexto=None, sugestao_acao='', pode_resolver_automaticamente=False):
        """
        Cria novo alerta ou atualiza existente
        
        Args:
            config: ShopifyConfig object
            tipo_alerta: Tipo do alerta
            severidade: Severidade (low, medium, high, critical)
            titulo: Título do alerta
            descricao: Descrição detalhada
            valor_detectado: Valor que disparou o alerta
            threshold_configurado: Threshold configurado
            periodo_referencia: Período analisado
            dados_contexto: Dados contextuais
            sugestao_acao: Sugestão de ação
            pode_resolver_automaticamente: Se pode ser resolvido automaticamente
        """
        from django.utils import timezone
        
        # Verifica se já existe alerta ativo do mesmo tipo
        existing_alert = cls.objects.filter(
            config=config,
            tipo_alerta=tipo_alerta,
            status='active'
        ).first()
        
        if existing_alert:
            # Atualiza alerta existente
            existing_alert.ultima_ocorrencia = timezone.now()
            existing_alert.contagem_ocorrencias += 1
            existing_alert.valor_detectado = valor_detectado
            existing_alert.dados_contexto = dados_contexto or {}
            existing_alert.save()
            return existing_alert
        else:
            # Cria novo alerta
            now = timezone.now()
            return cls.objects.create(
                config=config,
                tipo_alerta=tipo_alerta,
                severidade=severidade,
                titulo=titulo,
                descricao=descricao,
                dados_contexto=dados_contexto or {},
                valor_detectado=valor_detectado,
                threshold_configurado=threshold_configurado,
                periodo_referencia=periodo_referencia,
                sugestao_acao=sugestao_acao,
                pode_resolver_automaticamente=pode_resolver_automaticamente,
                primeira_ocorrencia=now,
                ultima_ocorrencia=now
            )
    
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
            target_ip_masked = target_ip  # IP completo sem mascaramento
        
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