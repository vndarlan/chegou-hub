# backend/features/estoque/models.py
from django.db import models
from django.contrib.auth.models import User
from features.processamento.models import ShopifyConfig


class Produto(models.Model):
    """Modelo para produtos master com estoque compartilhado entre lojas"""
    
    FORNECEDOR_CHOICES = [
        ('Dropi', 'Dropi'),
        ('PrimeCod', 'PrimeCod'),
        ('Ecomhub', 'Ecomhub'),
        ('N1', 'N1'),
        ('N1 Itália', 'N1 Itália'),
        ('N1 Romênia', 'N1 Romênia'),
        ('N1 Polônia', 'N1 Polônia'),
    ]
    
    # Relacionamentos
    user = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="Usuário")
    
    # Identificação do produto
    nome = models.CharField(max_length=255, verbose_name="Nome do produto")
    descricao = models.TextField(blank=True, verbose_name="Descrição")
    fornecedor = models.CharField(max_length=50, choices=FORNECEDOR_CHOICES, verbose_name="Fornecedor", default='N1')
    
    # Controle de estoque compartilhado
    estoque_compartilhado = models.IntegerField(default=0, verbose_name="Estoque compartilhado")
    estoque_minimo = models.IntegerField(default=0, verbose_name="Estoque mínimo")
    estoque_maximo = models.IntegerField(default=0, verbose_name="Estoque máximo", null=True, blank=True)
    
    # Configurações de alerta
    alerta_estoque_baixo = models.BooleanField(default=True, verbose_name="Alertar estoque baixo")
    alerta_estoque_zero = models.BooleanField(default=True, verbose_name="Alertar estoque zerado")
    
    # Status e controle
    ativo = models.BooleanField(default=True, verbose_name="Produto ativo")
    custo_unitario = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name="Custo unitário")
    
    # Metadados
    data_criacao = models.DateTimeField(auto_now_add=True)
    data_atualizacao = models.DateTimeField(auto_now=True)
    observacoes = models.TextField(blank=True, verbose_name="Observações")
    
    # Relacionamentos many-to-many
    lojas = models.ManyToManyField(ShopifyConfig, through='ProdutoLoja', related_name='produtos')
    
    class Meta:
        verbose_name = "Produto"
        verbose_name_plural = "Produtos"
        ordering = ['-data_criacao']
        indexes = [
            models.Index(fields=['user', 'ativo']),
            models.Index(fields=['estoque_compartilhado']),
            models.Index(fields=['fornecedor']),
        ]
    
    def __str__(self):
        return f"{self.nome} ({self.fornecedor})"
    
    @property
    def estoque_disponivel(self):
        """Retorna se há estoque disponível"""
        return self.estoque_compartilhado > 0
    
    @property 
    def estoque_negativo(self):
        """Verifica se o estoque está negativo (pedidos pendentes)"""
        return self.estoque_compartilhado < 0
    
    @property
    def pedidos_pendentes(self):
        """Retorna quantidade de pedidos pendentes (quando estoque negativo)"""
        return abs(self.estoque_compartilhado) if self.estoque_compartilhado < 0 else 0
    
    @property
    def estoque_baixo(self):
        """Verifica se o estoque está baixo"""
        return self.estoque_compartilhado <= self.estoque_minimo
    
    @property
    def necessita_reposicao(self):
        """Verifica se precisa de reposição baseado no estoque mínimo"""
        return self.estoque_compartilhado < self.estoque_minimo and self.ativo
    
    @property
    def valor_total_estoque(self):
        """Calcula o valor total do estoque baseado no custo unitário"""
        if self.custo_unitario:
            return self.estoque_compartilhado * self.custo_unitario
        return 0
    
    @property
    def total_lojas(self):
        """Retorna o número de lojas onde o produto está disponível"""
        return self.lojas.filter(produtoloja__ativo=True).count()
    
    @property
    def todos_skus(self):
        """Retorna todos os SKUs deste produto"""
        return [sku.sku for sku in self.skus.filter(ativo=True)]
    
    def adicionar_estoque(self, quantidade, observacao="", loja_origem=None):
        """Adiciona estoque compartilhado e registra a movimentação"""
        if quantidade <= 0:
            raise ValueError("Quantidade deve ser maior que zero")
        
        estoque_anterior = self.estoque_compartilhado
        self.estoque_compartilhado += quantidade
        self.save()
        
        # Registrar movimentação
        MovimentacaoEstoqueCompartilhado.objects.create(
            produto=self,
            tipo_movimento='entrada',
            quantidade=quantidade,
            estoque_anterior=estoque_anterior,
            estoque_posterior=self.estoque_compartilhado,
            observacoes=observacao,
            loja_origem=loja_origem
        )
        # Notificar atualização de estoque em tempo real
        self._notify_estoque_update(estoque_anterior, 'entrada', observacao)
    
    def remover_estoque(self, quantidade, observacao="", loja_origem=None):
        """Remove estoque compartilhado e registra a movimentação - PERMITE ESTOQUE NEGATIVO"""
        if quantidade <= 0:
            raise ValueError("Quantidade deve ser maior que zero")
        
        # PERMITE estoque negativo para visualizar pedidos pendentes
        
        estoque_anterior = self.estoque_compartilhado
        self.estoque_compartilhado -= quantidade
        self.save()
        
        # Registrar movimentação
        MovimentacaoEstoqueCompartilhado.objects.create(
            produto=self,
            tipo_movimento='saida',
            quantidade=quantidade,
            estoque_anterior=estoque_anterior,
            estoque_posterior=self.estoque_compartilhado,
            observacoes=observacao,
            loja_origem=loja_origem
        )
        
        # Notificar atualização de estoque em tempo real
        self._notify_estoque_update(estoque_anterior, 'saida', observacao)

    def _notify_estoque_update(self, quantidade_anterior: int, tipo_movimento: str, observacao: str = ""):
        """Notifica atualização de estoque via WebSocket"""
        try:
            from features.sync_realtime.services import notify_estoque_update
            notify_estoque_update(
                produto=self,
                quantidade_anterior=quantidade_anterior,
                tipo_movimento=tipo_movimento,
                observacao=observacao
            )
        except ImportError:
            # Notificações em tempo real não disponíveis
            pass
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Erro ao notificar atualização de estoque: {str(e)}")
class ProdutoSKU(models.Model):
    """Modelo para múltiplos SKUs por produto"""

    # Relacionamentos
    produto = models.ForeignKey(Produto, on_delete=models.CASCADE, related_name='skus')

    # Dados do SKU
    sku = models.CharField(max_length=100, help_text="SKU único em todo o sistema")
    descricao_variacao = models.CharField(max_length=255, blank=True, verbose_name="Descrição da variação")
    ativo = models.BooleanField(default=True, verbose_name="SKU ativo")

    # Metadados
    data_criacao = models.DateTimeField(auto_now_add=True)
    data_atualizacao = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "SKU do Produto"
        verbose_name_plural = "SKUs dos Produtos"
        ordering = ['produto', 'sku']
        # MUDANÇA IMPORTANTE: SKU único em todo o sistema (não apenas por produto)
        constraints = [
            models.UniqueConstraint(
                fields=['sku'],
                name='unique_sku_global',
                violation_error_message='Este SKU já existe em outro produto. SKUs devem ser únicos em todo o sistema.'
            )
        ]
        indexes = [
            models.Index(fields=['sku']),
            models.Index(fields=['produto', 'ativo']),
        ]

    def clean(self):
        """Validação customizada para SKU único"""
        from django.core.exceptions import ValidationError

        if self.sku:
            # Verificar se existe outro SKU com o mesmo código
            existing_sku = ProdutoSKU.objects.filter(sku=self.sku).exclude(pk=self.pk).first()
            if existing_sku:
                raise ValidationError({
                    'sku': f'SKU "{self.sku}" já pertence ao produto "{existing_sku.produto.nome}". SKUs devem ser únicos em todo o sistema.'
                })

    def save(self, *args, **kwargs):
        """Override save para executar validação"""
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.sku} - {self.produto.nome}"


class ProdutoLoja(models.Model):
    """Modelo para relacionamento produto-loja com configurações específicas"""
    
    # Relacionamentos
    produto = models.ForeignKey(Produto, on_delete=models.CASCADE)
    loja = models.ForeignKey(ShopifyConfig, on_delete=models.CASCADE)
    
    # Configurações por loja
    shopify_product_id = models.BigIntegerField(help_text="ID do produto no Shopify", null=True, blank=True)
    shopify_variant_id = models.BigIntegerField(help_text="ID da variação no Shopify", null=True, blank=True)
    
    # Controle de sincronização
    sync_shopify_enabled = models.BooleanField(default=True, verbose_name="Sincronizar com Shopify")
    ultima_sincronizacao = models.DateTimeField(null=True, blank=True, verbose_name="Última sincronização")
    erro_sincronizacao = models.TextField(blank=True, verbose_name="Erro na sincronização")
    
    # Pricing por loja
    preco_venda = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name="Preço de venda")
    
    # Status
    ativo = models.BooleanField(default=True, verbose_name="Ativo nesta loja")
    
    # Metadados
    data_criacao = models.DateTimeField(auto_now_add=True)
    data_atualizacao = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Produto por Loja"
        verbose_name_plural = "Produtos por Loja"
        unique_together = ['produto', 'loja']
        indexes = [
            models.Index(fields=['produto', 'loja']),
            models.Index(fields=['shopify_product_id']),
            models.Index(fields=['shopify_variant_id']),
            models.Index(fields=['ativo']),
        ]
    
    def __str__(self):
        return f"{self.produto.nome} - {self.loja.nome_loja}"


class ProdutoEstoque(models.Model):
    """Modelo para controle de estoque de produtos por loja"""
    
    FORNECEDOR_CHOICES = [
        ('Dropi', 'Dropi'),
        ('PrimeCod', 'PrimeCod'),
        ('Ecomhub', 'Ecomhub'),
        ('N1', 'N1'),
        ('N1 Itália', 'N1 Itália'),
        ('N1 Romênia', 'N1 Romênia'),
        ('N1 Polônia', 'N1 Polônia'),
    ]
    
    # Relacionamentos
    user = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="Usuário")
    loja_config = models.ForeignKey(ShopifyConfig, on_delete=models.CASCADE, verbose_name="Loja")
    
    # Identificação do produto
    shopify_product_id = models.BigIntegerField(help_text="ID do produto no Shopify", null=True, blank=True)
    shopify_variant_id = models.BigIntegerField(help_text="ID da variação no Shopify", null=True, blank=True)
    sku = models.CharField(max_length=100, help_text="SKU único do produto")
    nome = models.CharField(max_length=255, verbose_name="Nome do produto")
    fornecedor = models.CharField(max_length=50, choices=FORNECEDOR_CHOICES, verbose_name="Fornecedor", default='N1')
    
    # Controle de estoque
    estoque_inicial = models.IntegerField(default=0, verbose_name="Estoque inicial")
    estoque_atual = models.IntegerField(default=0, verbose_name="Estoque atual")
    estoque_minimo = models.IntegerField(default=0, verbose_name="Estoque mínimo")
    estoque_maximo = models.IntegerField(default=0, verbose_name="Estoque máximo", null=True, blank=True)
    
    # Configurações de alerta
    alerta_estoque_baixo = models.BooleanField(default=True, verbose_name="Alertar estoque baixo")
    alerta_estoque_zero = models.BooleanField(default=True, verbose_name="Alertar estoque zerado")
    
    # Sincronização Shopify
    sync_shopify_enabled = models.BooleanField(default=True, verbose_name="Sincronizar com Shopify")
    ultima_sincronizacao = models.DateTimeField(null=True, blank=True, verbose_name="Última sincronização")
    erro_sincronizacao = models.TextField(blank=True, verbose_name="Erro na sincronização")
    
    # Status e controle
    ativo = models.BooleanField(default=True, verbose_name="Produto ativo")
    custo_unitario = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name="Custo unitário")
    preco_venda = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name="Preço de venda")
    
    # Metadados
    data_criacao = models.DateTimeField(auto_now_add=True)
    data_atualizacao = models.DateTimeField(auto_now=True)
    observacoes = models.TextField(blank=True, verbose_name="Observações")
    
    class Meta:
        verbose_name = "Produto em Estoque"
        verbose_name_plural = "Produtos em Estoque"
        ordering = ['-data_criacao']
        unique_together = ['loja_config', 'sku']  # SKU único por loja
        indexes = [
            models.Index(fields=['loja_config', 'sku']),
            models.Index(fields=['shopify_product_id']),
            models.Index(fields=['shopify_variant_id']),
            models.Index(fields=['estoque_atual']),
            models.Index(fields=['ativo']),
        ]
    
    def __str__(self):
        return f"{self.sku} - {self.nome} ({self.loja_config.nome_loja})"
    
    def save(self, *args, **kwargs):
        """Override do save para configurar estoque inicial"""
        is_new = not self.pk
        
        # Se é uma nova criação e estoque_atual não foi definido mas estoque_inicial sim
        if is_new and self.estoque_inicial > 0 and self.estoque_atual == 0:
            self.estoque_atual = self.estoque_inicial
        
        super().save(*args, **kwargs)
        
        # Criar movimentação inicial se é nova criação com estoque inicial
        # Mas só se não estamos numa migração ou se o contexto permite
        if (is_new and self.estoque_inicial > 0 and 
            not getattr(self, '_skip_initial_movement', False)):
            self._create_initial_movement()
    def _create_initial_movement(self):
        """Cria movimentação inicial de estoque"""
        try:
            # Evitar importação circular
            MovimentacaoEstoque.objects.create(
                produto=self,
                tipo_movimento='entrada',
                quantidade=self.estoque_inicial,
                estoque_anterior=0,
                estoque_posterior=self.estoque_atual,
                observacoes='Estoque inicial do produto',
                origem_sync='sistema'
            )
        except Exception:
            # Em caso de erro (ex: durante migrações), continuar sem bloquear
            pass
    @property
    def estoque_disponivel(self):
        """Retorna se há estoque disponível"""
        return self.estoque_atual > 0
    
    @property 
    def estoque_negativo(self):
        """Verifica se o estoque está negativo (pedidos pendentes)"""
        return self.estoque_atual < 0
    
    @property
    def pedidos_pendentes(self):
        """Retorna quantidade de pedidos pendentes (quando estoque negativo)"""
        return abs(self.estoque_atual) if self.estoque_atual < 0 else 0
    
    @property
    def estoque_baixo(self):
        """Verifica se o estoque está baixo"""
        return self.estoque_atual <= self.estoque_minimo
    
    @property
    def necessita_reposicao(self):
        """Verifica se precisa de reposição baseado no estoque mínimo"""
        return self.estoque_atual < self.estoque_minimo and self.ativo
    
    @property
    def valor_total_estoque(self):
        """Calcula o valor total do estoque baseado no custo unitário"""
        if self.custo_unitario:
            return self.estoque_atual * self.custo_unitario
        return 0
    
    def adicionar_estoque(self, quantidade, observacao="", pedido_shopify_id=None):
        """Adiciona estoque e registra a movimentação"""
        if quantidade <= 0:
            raise ValueError("Quantidade deve ser maior que zero")
        
        estoque_anterior = self.estoque_atual
        self.estoque_atual += quantidade
        self.save()
        
        # Registrar movimentação
        MovimentacaoEstoque.objects.create(
            produto=self,
            tipo_movimento='entrada',
            quantidade=quantidade,
            estoque_anterior=estoque_anterior,
            estoque_posterior=self.estoque_atual,
            observacoes=observacao,
            pedido_shopify_id=pedido_shopify_id
        )

        # Notificar atualização de estoque em tempo real
        self._notify_estoque_update(estoque_anterior, 'entrada', observacao)
    
    def remover_estoque(self, quantidade, observacao="", pedido_shopify_id=None):
        """Remove estoque e registra a movimentação - PERMITE ESTOQUE NEGATIVO"""
        if quantidade <= 0:
            raise ValueError("Quantidade deve ser maior que zero")
        
        # REMOVIDO: Validação que impedia estoque negativo
        # Agora permite valores negativos para visualizar pedidos pendentes
        
        estoque_anterior = self.estoque_atual
        self.estoque_atual -= quantidade
        self.save()
        
        # Registrar movimentação
        MovimentacaoEstoque.objects.create(
            produto=self,
            tipo_movimento='saida',
            quantidade=quantidade,
            estoque_anterior=estoque_anterior,
            estoque_posterior=self.estoque_atual,
            observacoes=observacao,
            pedido_shopify_id=pedido_shopify_id
        )
        
        # Notificar atualização de estoque em tempo real
        self._notify_estoque_update(estoque_anterior, 'saida', observacao)

    def _notify_estoque_update(self, quantidade_anterior: int, tipo_movimento: str, observacao: str = ""):
        """Notifica atualização de estoque via WebSocket"""
        try:
            from features.sync_realtime.services import notify_estoque_update
            notify_estoque_update(
                produto=self,
                quantidade_anterior=quantidade_anterior,
                tipo_movimento=tipo_movimento,
                observacao=observacao
            )
        except ImportError:
            # Notificações em tempo real não disponíveis
            pass
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Erro ao notificar atualização de estoque: {str(e)}")
class MovimentacaoEstoque(models.Model):
    """Registro de todas as movimentações de estoque"""
    
    TIPO_MOVIMENTO_CHOICES = [
        ('entrada', 'Entrada'),
        ('saida', 'Saída'),
        ('ajuste', 'Ajuste'),
        ('venda', 'Venda'),
        ('devolucao', 'Devolução'),
        ('perda', 'Perda'),
        ('transferencia', 'Transferência'),
        ('sync_shopify', 'Sincronização Shopify'),
    ]
    
    # Relacionamentos
    produto = models.ForeignKey(ProdutoEstoque, on_delete=models.CASCADE, related_name='movimentacoes')
    usuario = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, verbose_name="Usuário")
    
    # Dados da movimentação
    tipo_movimento = models.CharField(max_length=20, choices=TIPO_MOVIMENTO_CHOICES, verbose_name="Tipo")
    quantidade = models.IntegerField(verbose_name="Quantidade")
    estoque_anterior = models.IntegerField(verbose_name="Estoque anterior")
    estoque_posterior = models.IntegerField(verbose_name="Estoque posterior")
    
    # Informações adicionais
    observacoes = models.TextField(blank=True, verbose_name="Observações")
    pedido_shopify_id = models.BigIntegerField(null=True, blank=True, help_text="ID do pedido no Shopify")
    custo_unitario = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name="Custo unitário")
    valor_total = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, verbose_name="Valor total")
    
    # Dados da sincronização
    origem_sync = models.CharField(max_length=50, blank=True, help_text="Origem da sincronização (shopify, manual, api)")
    dados_sync = models.JSONField(default=dict, help_text="Dados adicionais da sincronização")
    
    # Metadados
    data_movimentacao = models.DateTimeField(auto_now_add=True)
    ip_origem = models.GenericIPAddressField(null=True, blank=True, help_text="IP de origem da operação")
    
    class Meta:
        verbose_name = "Movimentação de Estoque"
        verbose_name_plural = "Movimentações de Estoque"
        ordering = ['-data_movimentacao']
        indexes = [
            models.Index(fields=['produto', 'data_movimentacao']),
            models.Index(fields=['tipo_movimento']),
            models.Index(fields=['pedido_shopify_id']),
            models.Index(fields=['data_movimentacao']),
        ]
    
    def __str__(self):
        sinal = '+' if self.tipo_movimento in ['entrada', 'devolucao', 'ajuste'] else '-'
        return f"{self.produto.sku} - {sinal}{self.quantidade} ({self.get_tipo_movimento_display()}) - {self.data_movimentacao.strftime('%d/%m/%Y %H:%M')}"
    
    def save(self, *args, **kwargs):
        # Calcular valor total se custo unitário fornecido
        if self.custo_unitario and not self.valor_total:
            self.valor_total = self.quantidade * self.custo_unitario
        
        super().save(*args, **kwargs)


# Classe AlertaEstoque removida - Sistema de alertas desativado


class MovimentacaoEstoqueCompartilhado(models.Model):
    """Registro de todas as movimentações do estoque compartilhado"""
    
    TIPO_MOVIMENTO_CHOICES = [
        ('entrada', 'Entrada'),
        ('saida', 'Saída'),
        ('ajuste', 'Ajuste'),
        ('venda', 'Venda'),
        ('devolucao', 'Devolução'),
        ('perda', 'Perda'),
        ('transferencia', 'Transferência'),
        ('sync_shopify', 'Sincronização Shopify'),
    ]
    
    # Relacionamentos
    produto = models.ForeignKey(Produto, on_delete=models.CASCADE, related_name='movimentacoes')
    usuario = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, verbose_name="Usuário")
    loja_origem = models.ForeignKey(ShopifyConfig, on_delete=models.CASCADE, null=True, blank=True, verbose_name="Loja de origem")
    
    # Dados da movimentação
    tipo_movimento = models.CharField(max_length=20, choices=TIPO_MOVIMENTO_CHOICES, verbose_name="Tipo")
    quantidade = models.IntegerField(verbose_name="Quantidade")
    estoque_anterior = models.IntegerField(verbose_name="Estoque anterior")
    estoque_posterior = models.IntegerField(verbose_name="Estoque posterior")
    
    # Informações adicionais
    observacoes = models.TextField(blank=True, verbose_name="Observações")
    pedido_shopify_id = models.BigIntegerField(null=True, blank=True, help_text="ID do pedido no Shopify")
    custo_unitario = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name="Custo unitário")
    valor_total = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, verbose_name="Valor total")
    
    # Dados da sincronização
    origem_sync = models.CharField(max_length=50, blank=True, help_text="Origem da sincronização (shopify, manual, api)")
    dados_sync = models.JSONField(default=dict, help_text="Dados adicionais da sincronização")
    
    # Metadados
    data_movimentacao = models.DateTimeField(auto_now_add=True)
    ip_origem = models.GenericIPAddressField(null=True, blank=True, help_text="IP de origem da operação")
    
    class Meta:
        verbose_name = "Movimentação de Estoque Compartilhado"
        verbose_name_plural = "Movimentações de Estoque Compartilhado"
        ordering = ['-data_movimentacao']
        indexes = [
            models.Index(fields=['produto', 'data_movimentacao']),
            models.Index(fields=['tipo_movimento']),
            models.Index(fields=['loja_origem']),
            models.Index(fields=['pedido_shopify_id']),
            models.Index(fields=['data_movimentacao']),
        ]
    
    def __str__(self):
        sinal = '+' if self.tipo_movimento in ['entrada', 'devolucao', 'ajuste'] else '-'
        loja_info = f" ({self.loja_origem.nome_loja})" if self.loja_origem else ""
        return f"{self.produto.nome} - {sinal}{self.quantidade} ({self.get_tipo_movimento_display()}){loja_info} - {self.data_movimentacao.strftime('%d/%m/%Y %H:%M')}"
    
    def save(self, *args, **kwargs):
        # Calcular valor total se custo unitário fornecido
        if self.custo_unitario and not self.valor_total:
            self.valor_total = self.quantidade * self.custo_unitario
        
        super().save(*args, **kwargs)


# Classe AlertaEstoqueCompartilhado removida - Sistema de alertas desativado
