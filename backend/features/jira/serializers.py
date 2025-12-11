# backend/features/jira/serializers.py
from rest_framework import serializers
from .models import JiraConfig


class JiraConfigSerializer(serializers.ModelSerializer):
    """Serializer para configuração Jira"""

    # Campo write-only para receber token em texto plano
    api_token = serializers.CharField(
        write_only=True,
        required=False,
        help_text="API Token em texto plano (será criptografado automaticamente)"
    )

    class Meta:
        model = JiraConfig
        fields = [
            'id',
            'jira_url',
            'jira_email',
            'jira_project_key',
            'api_token',  # write-only
            'ativo',
            'ultima_sincronizacao',
            'criado_em',
            'atualizado_em',
        ]
        read_only_fields = ['id', 'criado_em', 'atualizado_em', 'ultima_sincronizacao']

    def create(self, validated_data):
        """Cria configuração criptografando o token"""
        api_token = validated_data.pop('api_token', None)

        if not api_token:
            raise serializers.ValidationError({
                'api_token': 'API Token é obrigatório'
            })

        # Criptografar token
        encrypted_token = JiraConfig.encrypt_token(api_token)
        validated_data['api_token_encrypted'] = encrypted_token

        return super().create(validated_data)

    def update(self, instance, validated_data):
        """Atualiza configuração, criptografando token se fornecido"""
        api_token = validated_data.pop('api_token', None)

        if api_token:
            # Criptografar novo token
            encrypted_token = JiraConfig.encrypt_token(api_token)
            validated_data['api_token_encrypted'] = encrypted_token

        return super().update(instance, validated_data)


class JiraConfigStatusSerializer(serializers.Serializer):
    """Serializer para status da configuração"""
    configurado = serializers.BooleanField()
    jira_url = serializers.URLField(required=False)
    jira_email = serializers.EmailField(required=False)
    jira_project_key = serializers.CharField(required=False)
    ativo = serializers.BooleanField(required=False)
    ultima_sincronizacao = serializers.DateTimeField(required=False, allow_null=True)


class JiraUserSerializer(serializers.Serializer):
    """Serializer para usuários Jira"""
    account_id = serializers.CharField()
    display_name = serializers.CharField()
    email = serializers.EmailField(allow_null=True, required=False)
    avatar_url = serializers.URLField(allow_null=True, required=False)
    active = serializers.BooleanField()


class JiraBoardSerializer(serializers.Serializer):
    """Serializer para boards Jira"""
    id = serializers.IntegerField()
    name = serializers.CharField()
    type = serializers.CharField()


class JiraIssueSerializer(serializers.Serializer):
    """Serializer para issues Jira"""
    key = serializers.CharField()
    summary = serializers.CharField()
    status = serializers.CharField()
    assignee = serializers.CharField(allow_null=True)
    created = serializers.DateTimeField()
    updated = serializers.DateTimeField()
    resolved = serializers.DateTimeField(allow_null=True, required=False)


class JiraMetricsByAssigneeSerializer(serializers.Serializer):
    """Serializer para métricas por assignee"""
    assignee = serializers.CharField()
    count = serializers.IntegerField()


class JiraCreatedVsResolvedSerializer(serializers.Serializer):
    """Serializer para criado vs resolvido"""
    week = serializers.CharField()
    created = serializers.IntegerField()
    resolved = serializers.IntegerField()
    delta = serializers.IntegerField()


class JiraByStatusSerializer(serializers.Serializer):
    """Serializer para contagem por status"""
    status = serializers.CharField()
    count = serializers.IntegerField()


class JiraWorklogSerializer(serializers.Serializer):
    """Serializer para worklog"""
    issue_key = serializers.CharField()
    time_spent_seconds = serializers.IntegerField()
    time_spent_hours = serializers.FloatField()
    started = serializers.DateTimeField()
    comment = serializers.CharField(allow_null=True, required=False)


class JiraTimesheetSerializer(serializers.Serializer):
    """Serializer para timesheet"""
    total_seconds = serializers.IntegerField()
    total_hours = serializers.FloatField()
    worklogs = JiraWorklogSerializer(many=True)


class JiraLeadTimeBreakdownSerializer(serializers.Serializer):
    """Serializer para breakdown de lead time"""
    issue_key = serializers.CharField()
    summary = serializers.CharField()
    created = serializers.DateTimeField()
    resolved = serializers.DateTimeField()
    total_days = serializers.FloatField()
    breakdown = serializers.DictField(child=serializers.FloatField())


class JiraLeadTimeSerializer(serializers.Serializer):
    """Serializer para lead time"""
    average_total_days = serializers.FloatField()
    average_by_column = serializers.DictField(child=serializers.FloatField())
    issues_analyzed = serializers.IntegerField()
    details = JiraLeadTimeBreakdownSerializer(many=True)
