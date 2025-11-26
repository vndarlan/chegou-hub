from django.db import models
from django.contrib.auth.models import User


class PrimeCODCatalogProduct(models.Model):
    """
    Produto do catálogo PrimeCOD.
    Armazena informações completas do produto da API.
    """
    # Identificação
    primecod_id = models.IntegerField(unique=True, verbose_name="ID PrimeCOD")
    sku = models.CharField(max_length=50, verbose_name="SKU")
    name = models.CharField(max_length=255, verbose_name="Nome do Produto")
    description = models.TextField(blank=True, verbose_name="Descrição")

    # Estoque e Vendas
    quantity = models.IntegerField(default=0, verbose_name="Quantidade em Estoque")
    stock_label = models.CharField(
        max_length=20,
        blank=True,
        verbose_name="Nível de Estoque",
        help_text="High/Medium/Low"
    )
    total_units_sold = models.IntegerField(default=0, verbose_name="Total de Unidades Vendidas")
    total_orders = models.IntegerField(default=0, verbose_name="Total de Pedidos")

    # Preços
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name="Preço de Venda"
    )
    cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name="Custo"
    )

    # Dados Complementares (JSON)
    countries = models.JSONField(
        default=list,
        verbose_name="Países Disponíveis",
        help_text="Lista de países onde o produto está disponível"
    )
    images = models.JSONField(
        default=list,
        verbose_name="Imagens",
        help_text="URLs das imagens do produto"
    )

    # Controles
    is_new = models.BooleanField(
        default=True,
        verbose_name="Produto Novo",
        help_text="Produto visto pela primeira vez nas últimas 24h"
    )
    first_seen_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Primeira Vez Visto"
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")

    class Meta:
        verbose_name = "Produto Catálogo PrimeCOD"
        verbose_name_plural = "Produtos Catálogo PrimeCOD"
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['primecod_id']),
            models.Index(fields=['sku']),
            models.Index(fields=['is_new', '-first_seen_at']),
        ]

    def __str__(self):
        return f"[{self.sku}] {self.name}"

    @property
    def profit_margin(self):
        """Calcula margem de lucro"""
        if self.cost > 0:
            return ((self.price - self.cost) / self.cost) * 100
        return 0

    @property
    def profit_per_unit(self):
        """Lucro por unidade"""
        return self.price - self.cost


class PrimeCODCatalogSnapshot(models.Model):
    """
    Snapshot diário de produto do catálogo PrimeCOD.
    Usado para calcular variações de estoque e vendas ao longo do tempo.
    """
    product = models.ForeignKey(
        PrimeCODCatalogProduct,
        on_delete=models.CASCADE,
        related_name='snapshots',
        verbose_name="Produto"
    )

    # Dados do Snapshot
    quantity = models.IntegerField(verbose_name="Quantidade em Estoque")
    total_units_sold = models.IntegerField(verbose_name="Total de Unidades Vendidas")

    # Data do Snapshot
    snapshot_date = models.DateField(verbose_name="Data do Snapshot")

    # Timestamp
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")

    class Meta:
        verbose_name = "Snapshot Catálogo PrimeCOD"
        verbose_name_plural = "Snapshots Catálogo PrimeCOD"
        unique_together = [['product', 'snapshot_date']]
        ordering = ['-snapshot_date']
        indexes = [
            models.Index(fields=['snapshot_date']),
            models.Index(fields=['product', '-snapshot_date']),
        ]

    def __str__(self):
        return f"{self.product.sku} - {self.snapshot_date}"

    @property
    def units_sold_delta(self):
        """
        Calcula variação de vendas desde o snapshot anterior.
        """
        previous = PrimeCODCatalogSnapshot.objects.filter(
            product=self.product,
            snapshot_date__lt=self.snapshot_date
        ).order_by('-snapshot_date').first()

        if previous:
            return self.total_units_sold - previous.total_units_sold
        return 0

    @property
    def quantity_delta(self):
        """
        Calcula variação de estoque desde o snapshot anterior.
        """
        previous = PrimeCODCatalogSnapshot.objects.filter(
            product=self.product,
            snapshot_date__lt=self.snapshot_date
        ).order_by('-snapshot_date').first()

        if previous:
            return self.quantity - previous.quantity
        return 0


class AnalisePrimeCOD(models.Model):
    nome = models.CharField(max_length=255, verbose_name="Nome da Análise")
    descricao = models.TextField(blank=True, null=True, verbose_name="Descrição")
    
    # Campo tipo para compatibilidade frontend
    tipo = models.CharField(max_length=20, default='PRIMECOD', verbose_name="Tipo de Análise")
    
    # Dados salvos como JSON
    dados_leads = models.JSONField(null=True, blank=True, verbose_name="Dados de Leads")
    dados_orders = models.JSONField(null=True, blank=True, verbose_name="Dados de Orders")
    dados_efetividade = models.JSONField(null=True, blank=True, verbose_name="Dados de Efetividade")
    
    # Campo unificado para compatibilidade frontend
    dados_processados = models.JSONField(null=True, blank=True, verbose_name="Dados Processados (Frontend)")
    
    # Metadados
    criado_por = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="Criado por")
    criado_em = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    atualizado_em = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")
    
    class Meta:
        verbose_name = "Análise Prime COD"
        verbose_name_plural = "Análises Prime COD"
        ordering = ['-atualizado_em']
        unique_together = ['nome', 'criado_por']
    
    def __str__(self):
        return f"[PRIMECOD] {self.nome}"

class StatusMappingPrimeCOD(models.Model):
    """Mapeamento de status para Prime COD"""
    CATEGORIA_CHOICES = [
        ('LEADS', 'Status de Leads'),
        ('ORDERS', 'Status de Orders'),
    ]
    
    categoria = models.CharField(max_length=10, choices=CATEGORIA_CHOICES)
    status_original = models.CharField(max_length=100, verbose_name="Status Original")
    status_mapeado = models.CharField(max_length=50, verbose_name="Status Mapeado")
    ativo = models.BooleanField(default=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Mapeamento de Status Prime COD"
        verbose_name_plural = "Mapeamentos de Status Prime COD"
        unique_together = ['categoria', 'status_original']
    
    def __str__(self):
        return f"PrimeCOD {self.categoria}: {self.status_original} → {self.status_mapeado}"


class PrimeCODConfig(models.Model):
    """Configuração global única da API PrimeCOD (Singleton)"""
    api_token = models.TextField(verbose_name="Token da API")
    is_active = models.BooleanField(default=True, verbose_name="Ativo")
    updated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="Atualizado por"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")

    class Meta:
        verbose_name = "Configuração PrimeCOD"
        verbose_name_plural = "Configuração PrimeCOD"

    def save(self, *args, **kwargs):
        # Singleton - força sempre pk=1
        self.pk = 1
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        # Impede deleção do singleton
        pass

    @classmethod
    def get_config(cls):
        """Retorna a configuração única ou None se não existir"""
        return cls.objects.filter(pk=1).first()

    @classmethod
    def get_token(cls):
        """Retorna o token ativo ou None"""
        config = cls.get_config()
        if config and config.is_active:
            return config.api_token
        return None

    def __str__(self):
        return "Configuração API PrimeCOD"