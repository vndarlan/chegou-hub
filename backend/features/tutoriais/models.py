# backend/features/tutoriais/models.py
from django.db import models
from django.utils.text import slugify


class CategoriaAula(models.Model):
    """Modelo para categorias de aulas (ex: INTRODUÇÃO, GESTÃO DE CUSTOS)"""

    nome = models.CharField(
        max_length=100,
        verbose_name="Nome da Categoria",
        help_text="Ex: INTRODUÇÃO, GESTÃO DE CUSTOS"
    )
    slug = models.SlugField(
        unique=True,
        verbose_name="Slug",
        help_text="Gerado automaticamente a partir do nome"
    )
    ordem = models.IntegerField(
        default=0,
        verbose_name="Ordem de Exibição",
        help_text="Categorias com menor número aparecem primeiro"
    )
    icone = models.CharField(
        max_length=50,
        blank=True,
        verbose_name="Ícone",
        help_text="Classe do ícone (opcional, ex: fa-book, lucide-play-circle)"
    )
    ativo = models.BooleanField(
        default=True,
        verbose_name="Categoria Ativa",
        help_text="Categorias inativas não aparecem no site"
    )
    criado_em = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Criado em"
    )
    atualizado_em = models.DateTimeField(
        auto_now=True,
        verbose_name="Atualizado em"
    )

    class Meta:
        verbose_name = "Categoria de Aula"
        verbose_name_plural = "Categorias de Aulas"
        ordering = ['ordem', 'nome']
        indexes = [
            models.Index(fields=['ordem']),
            models.Index(fields=['ativo']),
        ]

    def __str__(self):
        return self.nome

    def save(self, *args, **kwargs):
        """Gera slug automaticamente a partir do nome"""
        if not self.slug:
            self.slug = slugify(self.nome)
        super().save(*args, **kwargs)

    @property
    def total_aulas(self):
        """Retorna o total de aulas ativas nesta categoria"""
        return self.aulas.filter(ativo=True).count()


class Aula(models.Model):
    """Modelo para aulas individuais com vídeos e descrições"""

    titulo = models.CharField(
        max_length=200,
        verbose_name="Título da Aula",
        help_text="Ex: Aula 1: Configurações Iniciais"
    )
    slug = models.SlugField(
        unique=True,
        verbose_name="Slug",
        help_text="Gerado automaticamente a partir do título"
    )
    descricao = models.TextField(
        verbose_name="Descrição",
        help_text="Texto explicativo que aparece abaixo do vídeo"
    )
    video_url = models.URLField(
        verbose_name="URL do Vídeo",
        help_text="URL do YouTube no formato embed (ex: https://www.youtube.com/embed/VIDEO_ID)"
    )
    categoria = models.ForeignKey(
        CategoriaAula,
        on_delete=models.CASCADE,
        related_name='aulas',
        verbose_name="Categoria"
    )
    ordem = models.IntegerField(
        default=0,
        verbose_name="Ordem na Categoria",
        help_text="Aulas com menor número aparecem primeiro dentro da categoria"
    )
    duracao = models.CharField(
        max_length=20,
        blank=True,
        verbose_name="Duração",
        help_text="Ex: 10:30 (opcional)"
    )
    ativo = models.BooleanField(
        default=True,
        verbose_name="Aula Ativa",
        help_text="Aulas inativas não aparecem no site"
    )
    criado_em = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Criado em"
    )
    atualizado_em = models.DateTimeField(
        auto_now=True,
        verbose_name="Atualizado em"
    )

    class Meta:
        verbose_name = "Aula"
        verbose_name_plural = "Aulas"
        ordering = ['categoria__ordem', 'ordem', 'titulo']
        indexes = [
            models.Index(fields=['categoria', 'ordem']),
            models.Index(fields=['ativo']),
            models.Index(fields=['slug']),
        ]

    def __str__(self):
        return f"{self.categoria.nome} - {self.titulo}"

    def save(self, *args, **kwargs):
        """Gera slug automaticamente a partir do título"""
        if not self.slug:
            self.slug = slugify(self.titulo)
        super().save(*args, **kwargs)

    @property
    def video_id(self):
        """Extrai o ID do vídeo do YouTube da URL"""
        if 'youtube.com/embed/' in self.video_url:
            return self.video_url.split('embed/')[-1].split('?')[0]
        elif 'youtu.be/' in self.video_url:
            return self.video_url.split('youtu.be/')[-1].split('?')[0]
        elif 'youtube.com/watch?v=' in self.video_url:
            return self.video_url.split('watch?v=')[-1].split('&')[0]
        return None

    @property
    def embed_url(self):
        """Retorna a URL no formato embed correto"""
        video_id = self.video_id
        if video_id:
            return f"https://www.youtube.com/embed/{video_id}"
        return self.video_url
