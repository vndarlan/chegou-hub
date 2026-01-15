# backend/features/planejamento_semanal/models.py
from django.db import models
from django.contrib.auth.models import User
from datetime import date, timedelta


class SemanaReferencia(models.Model):
    """
    Representa uma semana de referencia para planejamento.
    Sempre comeca na segunda-feira e termina no domingo.
    """
    data_inicio = models.DateField(
        verbose_name="Data Inicio (Segunda)",
        help_text="Primeiro dia da semana (segunda-feira)"
    )
    data_fim = models.DateField(
        verbose_name="Data Fim (Domingo)",
        help_text="Ultimo dia da semana (domingo)"
    )
    criado_em = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Criado em"
    )

    class Meta:
        verbose_name = "Semana de Referencia"
        verbose_name_plural = "Semanas de Referencia"
        ordering = ['-data_inicio']
        unique_together = ['data_inicio', 'data_fim']

    def __str__(self):
        return f"Semana {self.data_inicio.strftime('%d/%m/%Y')} - {self.data_fim.strftime('%d/%m/%Y')}"

    @classmethod
    def get_or_create_current_week(cls):
        """
        Retorna a semana atual ou cria se nao existir.
        A semana sempre comeca na segunda-feira.
        """
        today = date.today()
        # Calcular a segunda-feira da semana atual
        days_since_monday = today.weekday()  # 0 = segunda, 6 = domingo
        monday = today - timedelta(days=days_since_monday)
        sunday = monday + timedelta(days=6)

        semana, created = cls.objects.get_or_create(
            data_inicio=monday,
            data_fim=sunday
        )
        return semana

    @classmethod
    def get_week_for_date(cls, target_date: date):
        """
        Retorna a semana para uma data especifica ou cria se nao existir.
        """
        days_since_monday = target_date.weekday()
        monday = target_date - timedelta(days=days_since_monday)
        sunday = monday + timedelta(days=6)

        semana, created = cls.objects.get_or_create(
            data_inicio=monday,
            data_fim=sunday
        )
        return semana

    @property
    def is_current_week(self):
        """Verifica se esta e a semana atual"""
        today = date.today()
        return self.data_inicio <= today <= self.data_fim


class PlanejamentoSemanal(models.Model):
    """
    Planejamento semanal de um usuario para uma semana especifica.
    Associa um usuario do sistema a um usuario do Jira.
    """
    usuario = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='planejamentos_semanais',
        verbose_name="Usuario"
    )
    semana = models.ForeignKey(
        SemanaReferencia,
        on_delete=models.CASCADE,
        related_name='planejamentos',
        verbose_name="Semana"
    )
    jira_account_id = models.CharField(
        max_length=100,
        verbose_name="Account ID Jira",
        help_text="ID da conta do usuario no Jira"
    )
    jira_display_name = models.CharField(
        max_length=200,
        verbose_name="Nome Jira",
        help_text="Nome de exibicao do usuario no Jira"
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
        verbose_name = "Planejamento Semanal"
        verbose_name_plural = "Planejamentos Semanais"
        ordering = ['-semana__data_inicio', 'jira_display_name']
        unique_together = ['usuario', 'semana', 'jira_account_id']

    def __str__(self):
        return f"{self.jira_display_name} - {self.semana}"

    @property
    def total_itens(self):
        """Total de itens no planejamento"""
        return self.itens.count()

    @property
    def itens_concluidos(self):
        """Total de itens concluidos"""
        return self.itens.filter(concluido=True).count()

    @property
    def percentual_conclusao(self):
        """Percentual de conclusao do planejamento"""
        total = self.total_itens
        if total == 0:
            return 0
        return round((self.itens_concluidos / total) * 100, 1)


class ItemPlanejamento(models.Model):
    """
    Item individual de um planejamento semanal (issue do Jira).
    """
    class Prioridade(models.TextChoices):
        ALTA = 'alta', 'Alta'
        MEDIA = 'media', 'Media'
        BAIXA = 'baixa', 'Baixa'

    planejamento = models.ForeignKey(
        PlanejamentoSemanal,
        on_delete=models.CASCADE,
        related_name='itens',
        verbose_name="Planejamento"
    )
    issue_key = models.CharField(
        max_length=50,
        verbose_name="Chave da Issue",
        help_text="Chave da issue no Jira (ex: CHEGOU-123)"
    )
    issue_summary = models.CharField(
        max_length=500,
        verbose_name="Resumo",
        help_text="Resumo/titulo da issue"
    )
    issue_status = models.CharField(
        max_length=100,
        verbose_name="Status",
        help_text="Status atual da issue no Jira"
    )
    prioridade = models.CharField(
        max_length=10,
        choices=Prioridade.choices,
        default=Prioridade.MEDIA,
        verbose_name="Prioridade"
    )
    concluido = models.BooleanField(
        default=False,
        verbose_name="Concluido",
        help_text="Se o item foi concluido nesta semana"
    )
    ordem = models.PositiveIntegerField(
        default=0,
        verbose_name="Ordem",
        help_text="Ordem de exibicao do item"
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
        verbose_name = "Item de Planejamento"
        verbose_name_plural = "Itens de Planejamento"
        ordering = ['ordem', '-prioridade', 'issue_key']
        unique_together = ['planejamento', 'issue_key']

    def __str__(self):
        status = "Concluido" if self.concluido else "Pendente"
        return f"{self.issue_key} - {status}"
