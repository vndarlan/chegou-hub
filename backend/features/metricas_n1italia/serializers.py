# backend/features/metricas_n1italia/serializers.py
from rest_framework import serializers
from .models import AnaliseN1Italia

class AnaliseN1ItaliaSerializer(serializers.ModelSerializer):
    criado_por_nome = serializers.CharField(source='criado_por.get_full_name', read_only=True)
    total_pedidos = serializers.ReadOnlyField()
    efetividade_parcial = serializers.ReadOnlyField()
    efetividade_total = serializers.ReadOnlyField()

    class Meta:
        model = AnaliseN1Italia
        fields = [
            'id', 'nome', 'descricao', 'dados_processados',
            'criado_por', 'criado_por_nome', 'criado_em', 'atualizado_em',
            'total_pedidos', 'efetividade_parcial', 'efetividade_total'
        ]
        read_only_fields = ['criado_por', 'criado_em', 'atualizado_em']

    def create(self, validated_data):
        validated_data['criado_por'] = self.context['request'].user
        return super().create(validated_data)


class ExcelUploadSerializer(serializers.Serializer):
    """Serializer para upload de arquivos Excel"""
    arquivo = serializers.FileField(required=True, help_text="Arquivo Excel com dados N1 Itália")
    nome_analise = serializers.CharField(max_length=255, required=True, help_text="Nome para esta análise")
    descricao = serializers.CharField(required=False, allow_blank=True, help_text="Descrição opcional da análise")

    def validate_arquivo(self, value):
        """Valida se o arquivo é Excel"""
        extensoes_validas = ['.xlsx', '.xls']
        nome_arquivo = value.name.lower()

        if not any(nome_arquivo.endswith(ext) for ext in extensoes_validas):
            raise serializers.ValidationError("Arquivo deve ser Excel (.xlsx ou .xls)")

        # Verificar tamanho do arquivo (max 10MB)
        if value.size > 10 * 1024 * 1024:
            raise serializers.ValidationError("Arquivo muito grande. Máximo 10MB.")

        return value


class ProcessarAnaliseSerializer(serializers.Serializer):
    """Serializer para processar análise de dados N1"""
    nome_analise = serializers.CharField(max_length=255, required=True)
    descricao = serializers.CharField(required=False, allow_blank=True)
    dados_excel = serializers.JSONField(required=True, help_text="Dados extraídos do Excel")

    def validate_dados_excel(self, value):
        """Valida estrutura dos dados Excel"""
        if not isinstance(value, list):
            raise serializers.ValidationError("Dados Excel devem ser uma lista de registros")

        if not value:
            raise serializers.ValidationError("Dados Excel não podem estar vazios")

        # Verificar se há campos obrigatórios no primeiro registro
        if value:
            primeiro = value[0]
            campos_obrigatorios = ['order_number', 'status']
            campos_faltando = [campo for campo in campos_obrigatorios if campo not in primeiro]

            if campos_faltando:
                raise serializers.ValidationError(f"Campos obrigatórios faltando: {', '.join(campos_faltando)}")

        return value


class ResultadoAnaliseSerializer(serializers.Serializer):
    """Serializer para resultado da análise processada"""
    status = serializers.CharField()
    message = serializers.CharField()
    analise_id = serializers.IntegerField(required=False)
    dados_processados = serializers.DictField(required=False)
    estatisticas = serializers.DictField(required=False)
    tempo_processamento = serializers.FloatField(required=False)