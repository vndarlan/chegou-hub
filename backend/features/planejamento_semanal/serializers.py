# backend/features/planejamento_semanal/serializers.py
from rest_framework import serializers
from .models import SemanaReferencia, PlanejamentoSemanal, ItemPlanejamento


class SemanaReferenciaSerializer(serializers.ModelSerializer):
    """Serializer para semana de referencia"""
    is_current_week = serializers.BooleanField(read_only=True)
    label = serializers.SerializerMethodField()

    class Meta:
        model = SemanaReferencia
        fields = [
            'id',
            'data_inicio',
            'data_fim',
            'is_current_week',
            'label',
            'criado_em'
        ]
        read_only_fields = ['id', 'criado_em']

    def get_label(self, obj):
        """Retorna label formatado da semana"""
        return f"{obj.data_inicio.strftime('%d/%m')} - {obj.data_fim.strftime('%d/%m/%Y')}"


class ItemPlanejamentoSerializer(serializers.ModelSerializer):
    """Serializer para item de planejamento"""
    prioridade_display = serializers.CharField(
        source='get_prioridade_display',
        read_only=True
    )

    class Meta:
        model = ItemPlanejamento
        fields = [
            'id',
            'issue_key',
            'issue_summary',
            'issue_status',
            'prioridade',
            'prioridade_display',
            'concluido',
            'ordem',
            'criado_em',
            'atualizado_em'
        ]
        read_only_fields = ['id', 'criado_em', 'atualizado_em']


class PlanejamentoSemanalSerializer(serializers.ModelSerializer):
    """Serializer completo para planejamento semanal com itens nested"""
    semana = SemanaReferenciaSerializer(read_only=True)
    itens = ItemPlanejamentoSerializer(many=True, read_only=True)
    total_itens = serializers.IntegerField(read_only=True)
    itens_concluidos = serializers.IntegerField(read_only=True)
    percentual_conclusao = serializers.FloatField(read_only=True)

    class Meta:
        model = PlanejamentoSemanal
        fields = [
            'id',
            'usuario',
            'semana',
            'jira_account_id',
            'jira_display_name',
            'itens',
            'total_itens',
            'itens_concluidos',
            'percentual_conclusao',
            'criado_em',
            'atualizado_em'
        ]
        read_only_fields = ['id', 'usuario', 'criado_em', 'atualizado_em']


class ItemPlanejamentoCreateSerializer(serializers.Serializer):
    """Serializer para criacao de item de planejamento"""
    issue_key = serializers.CharField(max_length=50)
    issue_summary = serializers.CharField(max_length=500)
    issue_status = serializers.CharField(max_length=100)
    prioridade = serializers.ChoiceField(
        choices=ItemPlanejamento.Prioridade.choices,
        default=ItemPlanejamento.Prioridade.MEDIA
    )
    concluido = serializers.BooleanField(default=False)
    ordem = serializers.IntegerField(default=0, required=False)


class PlanejamentoSemanalCreateSerializer(serializers.Serializer):
    """Serializer para criacao/atualizacao de planejamento semanal"""
    jira_account_id = serializers.CharField(max_length=100)
    jira_display_name = serializers.CharField(max_length=200)
    itens = ItemPlanejamentoCreateSerializer(many=True)
    semana_id = serializers.IntegerField(required=False, allow_null=True)

    def validate_itens(self, value):
        """Valida que ha pelo menos um item ou lista vazia"""
        # Permitir lista vazia para limpar planejamento
        return value


class DashboardSemanalSerializer(serializers.Serializer):
    """Serializer para dashboard semanal com todos os planejamentos"""
    semana = SemanaReferenciaSerializer()
    planejamentos = PlanejamentoSemanalSerializer(many=True)
    total_usuarios = serializers.IntegerField()
    total_itens = serializers.IntegerField()
    total_concluidos = serializers.IntegerField()
    percentual_geral = serializers.FloatField()


class IssueJiraSerializer(serializers.Serializer):
    """Serializer para issue do Jira"""
    key = serializers.CharField()
    summary = serializers.CharField()
    status = serializers.CharField()
    assignee_id = serializers.CharField(allow_null=True)
    assignee_name = serializers.CharField(allow_null=True)
    priority = serializers.CharField(allow_null=True)
    issue_type = serializers.CharField(allow_null=True)
