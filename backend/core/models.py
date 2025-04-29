# backend/core/models.py
from django.db import models
from django.conf import settings
from django.utils import timezone

class ManagedCalendar(models.Model):
    name = models.CharField(
        max_length=100,
        verbose_name="Nome do Calendário",
        help_text="Um nome descritivo para o calendário (Ex: Marketing, Feriados)."
    )
    iframe_code = models.TextField(
        verbose_name="Código Iframe do Google Calendar",
        help_text="Cole aqui o código iframe completo obtido do Google Calendar.",
        unique=True,
        null=True,   # <--- CERTIFIQUE-SE QUE ESTÁ AQUI
        blank=True   # <--- E QUE ESTÁ AQUI TAMBÉM
    )
    added_at = models.DateTimeField(auto_now_add=True, verbose_name="Adicionado em")

    class Meta:
        verbose_name = "Calendário Gerenciado (Iframe)"
        verbose_name_plural = "Calendários Gerenciados (Iframe)"
        ordering = ['name']

    def __str__(self):
        src_start = self.iframe_code.find('src="') if self.iframe_code else -1 # Adicionado check se iframe_code existe
        src_end = self.iframe_code.find('"', src_start + 5) if src_start != -1 else -1
        if src_start != -1 and src_end != -1:
            src_preview = self.iframe_code[src_start+5:src_end]
            return f"{self.name} ({src_preview[:50]}...)"
        else:
            return f"{self.name} (iframe inválido ou vazio)" # Melhor retorno se não encontrar src
        
class AIProject(models.Model):
    STATUS_CHOICES = [
        ('Ativo', 'Ativo'),
        ('Em Manutenção', 'Em Manutenção'),
        ('Arquivado', 'Arquivado'),
        ('Backlog', 'Backlog'),
        ('Em Construção', 'Em Construção'),
        ('Período de Validação', 'Período de Validação'),
    ]

    name = models.CharField(
        max_length=200,
        verbose_name="Nome do Projeto"
    )
    creation_date = models.DateField(
        verbose_name="Data de Criação",
        default=timezone.now # Preenche com a data atual por padrão
    )
    finalization_date = models.DateField(
        verbose_name="Data de Finalização",
        null=True,
        blank=True
    )
    description = models.TextField(
        verbose_name="Descrição Curta",
        blank=True
    )
    status = models.CharField(
        max_length=50,
        choices=STATUS_CHOICES,
        verbose_name="Status",
        default='Em Construção' # Um valor padrão razoável
    )
    project_link = models.URLField(
        max_length=500,
        verbose_name="Link do Projeto",
        blank=True
    )
    tools_used = models.CharField(
        max_length=300,
        verbose_name="Ferramentas Utilizadas",
        blank=True
    )
    project_version = models.CharField(
        max_length=20,
        verbose_name="Versão do Projeto",
        default='v1',
        blank=True
    )
    # Simplificado: associa ao usuário que cadastrou via API
    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True, # Permite criar via admin sem associar a um usuário específico
        related_name='created_ai_projects',
        verbose_name="Criador (Registrado por)"
    )
    # Campo para o nome dos criadores como texto (como na imagem da tabela)
    # Se precisar de relação muitos-para-muitos com User, mude depois.
    creator_names = models.CharField(
        max_length=255,
        verbose_name="Criador(es) do Projeto (Nomes)",
        blank=True,
        help_text="Nomes dos responsáveis pelo projeto, separados por vírgula."
    )
    added_at = models.DateTimeField(auto_now_add=True, verbose_name="Adicionado em")

    class Meta:
        verbose_name = "Projeto de IA"
        verbose_name_plural = "Projetos de IA"
        ordering = ['-creation_date', 'name'] # Mais recentes primeiro

    def __str__(self):
        return self.name

class ImageStyle(models.Model):
    """
    Representa um estilo de imagem predefinido para ser usado com a API OpenAI.
    """
    name = models.CharField(
        max_length=100,
        verbose_name="Nome do Estilo",
        help_text="Um nome curto e descritivo para o estilo (Ex: Anúncio Luxo, Desenho Animado).",
        unique=True # Garante que não haja nomes duplicados
    )
    instructions = models.TextField(
        verbose_name="Instruções do Estilo",
        help_text="Instruções detalhadas que serão pré-anexadas ao prompt do usuário para guiar a IA."
    )
    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL, # Mantém o estilo se o usuário for deletado
        null=True,
        blank=True, # Permite criar via admin sem associar ou se o criador for deletado
        related_name='created_image_styles',
        verbose_name="Criador (Registrado por)"
    )
    added_at = models.DateTimeField(auto_now_add=True, verbose_name="Adicionado em")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")

    class Meta:
        verbose_name = "Estilo de Imagem"
        verbose_name_plural = "Estilos de Imagem"
        ordering = ['name'] # Ordenar por nome por padrão

    def __str__(self):
        return self.name

class PrimeCODProduct(models.Model):
    """Modelo para armazenar informações de produtos da Prime COD."""
    sku = models.CharField(max_length=100, unique=True, verbose_name="SKU do Produto")
    name = models.CharField(max_length=255, verbose_name="Nome do Produto") 
    country_code = models.CharField(max_length=2, verbose_name="Código do País")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Produto Prime COD"
        verbose_name_plural = "Produtos Prime COD"
        unique_together = ('sku', 'country_code')

    def __str__(self):
        return f"{self.name} ({self.sku}) - {self.country_code}"

class PrimeCODOrder(models.Model):
    """Modelo para armazenar pedidos da Prime COD."""
    STATUS_CHOICES = [
        ('new', 'Novo'),
        ('pending', 'Pendente'),
        ('shipped', 'Enviado'),
        ('delivered', 'Entregue'),
        ('returned', 'Devolvido'),
        ('wrong', 'Incorreto'),
        ('no_answer', 'Sem Resposta'),
        ('packed', 'Embalado'),
        ('confirmed', 'Confirmado'),
        ('duplicate', 'Duplicado'),
    ]
    
    reference = models.CharField(max_length=100, unique=True, verbose_name="Referência")
    product = models.ForeignKey(PrimeCODProduct, on_delete=models.CASCADE, related_name='orders')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    country_code = models.CharField(max_length=2)
    order_date = models.DateTimeField()
    shipping_fees = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    
    class Meta:
        verbose_name = "Pedido Prime COD"
        verbose_name_plural = "Pedidos Prime COD"
        
    def __str__(self):
        return f"Pedido {self.reference} - {self.product.name} ({self.status})"

class PrimeCODApiConfig(models.Model):
    """Configurações da API Prime COD."""
    api_key = models.CharField(max_length=255, verbose_name="Token da API")
    base_url = models.URLField(default="https://api.primecod.app/api", verbose_name="URL Base")
    is_active = models.BooleanField(default=True)
    last_sync = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        verbose_name = "Configuração da API Prime COD"
        verbose_name_plural = "Configurações da API Prime COD"
        
    def __str__(self):
        return f"Configuração Prime COD ({self.is_active})"