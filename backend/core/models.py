from django.db import models
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.utils.text import slugify
import secrets


class Organization(models.Model):
    """Organização - workspace compartilhado entre membros"""

    nome = models.CharField(max_length=200, verbose_name="Nome da Organização")
    slug = models.SlugField(max_length=200, unique=True, verbose_name="Slug")
    descricao = models.TextField(blank=True, verbose_name="Descrição")

    # Planos e limites
    PLANO_CHOICES = [
        ('free', 'Gratuito'),
        ('starter', 'Starter'),
        ('business', 'Business'),
        ('enterprise', 'Enterprise'),
    ]
    plano = models.CharField(max_length=20, choices=PLANO_CHOICES, default='free')
    limite_membros = models.IntegerField(default=5, verbose_name="Limite de Membros")

    # Metadados
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)
    ativo = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Organização"
        verbose_name_plural = "Organizações"
        ordering = ['nome']
        indexes = [
            models.Index(fields=['slug']),
            models.Index(fields=['ativo']),
        ]

    def save(self, *args, **kwargs):
        """Gera slug automaticamente a partir do nome"""
        if not self.slug:
            self.slug = slugify(self.nome)
            # Garantir unicidade do slug
            original_slug = self.slug
            counter = 1
            while Organization.objects.filter(slug=self.slug).exclude(pk=self.pk).exists():
                self.slug = f"{original_slug}-{counter}"
                counter += 1
        super().save(*args, **kwargs)

    def __str__(self):
        return self.nome

    @property
    def total_membros(self):
        """Retorna total de membros ativos"""
        return self.membros.filter(ativo=True).count()

    @property
    def limite_atingido(self):
        """Verifica se atingiu limite de membros"""
        return self.total_membros >= self.limite_membros


class OrganizationMember(models.Model):
    """Membros da organização com hierarquia de roles"""

    ROLE_CHOICES = [
        ('owner', 'Owner (Dono)'),
        ('admin', 'Admin (Administrador)'),
        ('member', 'Member (Membro)'),
    ]

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='membros',
        verbose_name="Organização"
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='organizacoes',
        verbose_name="Usuário"
    )
    role = models.CharField(
        max_length=10,
        choices=ROLE_CHOICES,
        default='member',
        verbose_name="Função"
    )

    # Controle
    convidado_por = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='convites_enviados',
        verbose_name="Convidado por"
    )
    joined_at = models.DateTimeField(auto_now_add=True, verbose_name="Data de entrada")
    ativo = models.BooleanField(default=True, verbose_name="Ativo")

    class Meta:
        verbose_name = "Membro da Organização"
        verbose_name_plural = "Membros das Organizações"
        unique_together = ['organization', 'user']
        ordering = ['-joined_at']
        indexes = [
            models.Index(fields=['organization', 'user']),
            models.Index(fields=['role']),
            models.Index(fields=['ativo']),
        ]

    def __str__(self):
        return f"{self.user.get_full_name() or self.user.username} - {self.get_role_display()} ({self.organization.nome})"

    def clean(self):
        """Validação: Owner único por organização"""
        if self.role == 'owner':
            existing_owner = OrganizationMember.objects.filter(
                organization=self.organization,
                role='owner',
                ativo=True
            ).exclude(pk=self.pk).exists()

            if existing_owner:
                raise ValidationError("Já existe um Owner nesta organização.")


class OrganizationInvite(models.Model):
    """Convites para novos membros da organização"""

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='convites',
        verbose_name="Organização"
    )
    email = models.EmailField(verbose_name="Email do Convidado")
    role = models.CharField(
        max_length=10,
        choices=OrganizationMember.ROLE_CHOICES,
        default='member',
        verbose_name="Função"
    )
    modulos_permitidos = models.JSONField(
        default=list,
        blank=True,
        verbose_name="Módulos Permitidos",
        help_text="Lista de module_keys que serão atribuídos ao aceitar o convite"
    )

    # Token e controle
    codigo = models.CharField(max_length=64, unique=True, editable=False, verbose_name="Código")
    convidado_por = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='convites_criados',
        verbose_name="Convidado por"
    )

    # Datas
    criado_em = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    expira_em = models.DateTimeField(verbose_name="Expira em")
    aceito_em = models.DateTimeField(null=True, blank=True, verbose_name="Aceito em")
    aceito_por = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='convites_aceitos',
        verbose_name="Aceito por"
    )

    # Status
    STATUS_CHOICES = [
        ('pending', 'Pendente'),
        ('accepted', 'Aceito'),
        ('expired', 'Expirado'),
        ('cancelled', 'Cancelado'),
    ]
    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default='pending',
        verbose_name="Status"
    )

    class Meta:
        verbose_name = "Convite de Organização"
        verbose_name_plural = "Convites de Organização"
        ordering = ['-criado_em']
        indexes = [
            models.Index(fields=['codigo']),
            models.Index(fields=['email', 'status']),
            models.Index(fields=['organization', 'status']),
        ]

    def save(self, *args, **kwargs):
        """Gera código único e data de expiração"""
        if not self.codigo:
            self.codigo = secrets.token_urlsafe(48)
        if not self.expira_em:
            self.expira_em = timezone.now() + timezone.timedelta(days=7)
        super().save(*args, **kwargs)

    @property
    def expirado(self):
        """Verifica se o convite expirou"""
        return timezone.now() > self.expira_em and self.status == 'pending'

    def __str__(self):
        return f"{self.email} - {self.organization.nome} ({self.get_status_display()})"


# Lista de módulos disponíveis no sistema
# Cada módulo representa uma página/funcionalidade que pode ser liberada para membros
MODULES = [
    # GESTÃO EMPRESARIAL
    {'key': 'agenda', 'name': 'Agenda da Empresa', 'group': 'GESTÃO EMPRESARIAL'},
    {'key': 'mapa', 'name': 'Mapa de Atuação', 'group': 'GESTÃO EMPRESARIAL'},
    {'key': 'ia_projetos', 'name': 'IA - Projetos', 'group': 'GESTÃO EMPRESARIAL'},
    {'key': 'ia_logs', 'name': 'IA - Logs de Erros', 'group': 'GESTÃO EMPRESARIAL'},
    {'key': 'ia_openai', 'name': 'IA - OpenAI Analytics', 'group': 'GESTÃO EMPRESARIAL'},

    # FORNECEDORES - EUROPA
    {'key': 'ecomhub_efetividade', 'name': 'ECOMHUB - Análise de Efetividade', 'group': 'FORNECEDORES > EUROPA'},
    {'key': 'ecomhub_efetividade_v2', 'name': 'ECOMHUB - Análise Avançada V2', 'group': 'FORNECEDORES > EUROPA'},
    {'key': 'ecomhub_status', 'name': 'ECOMHUB - Status Tracking', 'group': 'FORNECEDORES > EUROPA'},
    {'key': 'ecomhub_config', 'name': 'ECOMHUB - Configurações', 'group': 'FORNECEDORES > EUROPA'},
    {'key': 'n1_efetividade', 'name': 'N1 - Efetividade', 'group': 'FORNECEDORES > EUROPA'},
    {'key': 'primecod_efetividade', 'name': 'PRIMECOD - Efetividade', 'group': 'FORNECEDORES > EUROPA'},

    # FORNECEDORES - LATAM
    {'key': 'dropi_efetividade', 'name': 'DROPI - Efetividade', 'group': 'FORNECEDORES > LATAM'},
    {'key': 'dropi_novelties', 'name': 'DROPI - Novelties', 'group': 'FORNECEDORES > LATAM'},

    # SHOPIFY
    {'key': 'shopify_estoque', 'name': 'Controle de Estoque', 'group': 'SHOPIFY'},
    {'key': 'shopify_processamento', 'name': 'Pedidos Duplicados', 'group': 'SHOPIFY'},
    {'key': 'shopify_detector_ip', 'name': 'Detector de IP', 'group': 'SHOPIFY'},

    # PLATAFORMAS DE ANÚNCIO
    {'key': 'facebook_engajamento', 'name': 'Facebook - Engajamento', 'group': 'PLATAFORMAS DE ANÚNCIO'},

    # IA & CHATBOTS
    {'key': 'nicochat', 'name': 'Nicochat', 'group': 'IA & CHATBOTS'},
]


class UserModulePermission(models.Model):
    """Permissões de acesso aos módulos por membro da organização"""

    member = models.ForeignKey(
        OrganizationMember,
        on_delete=models.CASCADE,
        related_name='permissoes_modulos',
        verbose_name="Membro"
    )
    module_key = models.CharField(
        max_length=50,
        choices=[(m['key'], m['name']) for m in MODULES],
        verbose_name="Módulo"
    )

    # Controle
    concedido_por = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='permissoes_concedidas',
        verbose_name="Concedido por"
    )
    concedido_em = models.DateTimeField(auto_now_add=True, verbose_name="Concedido em")
    ativo = models.BooleanField(default=True, verbose_name="Ativo")

    class Meta:
        verbose_name = "Permissão de Módulo"
        verbose_name_plural = "Permissões de Módulos"
        unique_together = ['member', 'module_key']
        ordering = ['member', 'module_key']
        indexes = [
            models.Index(fields=['member', 'module_key']),
            models.Index(fields=['ativo']),
        ]

    def __str__(self):
        return f"{self.member.user.get_full_name()} - {self.get_module_key_display()}"
