# backend/features/ia/serializers.py - VERSÃO ATUALIZADA COM PROJETOS
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    LogEntry, TipoFerramenta, NivelLog, PaisNicochat,
    ProjetoIA, VersaoProjeto, StatusProjeto, TipoProjeto,
    DepartamentoChoices, PrioridadeChoices, ComplexidadeChoices,
    FrequenciaUsoChoices
)

# ===== SERIALIZERS DE LOGS (EXISTENTES) =====
class LogEntrySerializer(serializers.ModelSerializer):
    resolvido_por_nome = serializers.CharField(
        source='resolvido_por.get_full_name', 
        read_only=True
    )
    tempo_relativo = serializers.SerializerMethodField()
    
    class Meta:
        model = LogEntry
        fields = [
            'id', 'ferramenta', 'nivel', 'mensagem', 'detalhes',
            'pais', 'usuario_conversa', 'id_conversa', 
            'ip_origem', 'user_agent', 'timestamp', 'tempo_relativo',
            'resolvido', 'resolvido_por', 'resolvido_por_nome', 'data_resolucao'
        ]
        read_only_fields = ['timestamp', 'resolvido_por_nome', 'tempo_relativo']
    
    def get_tempo_relativo(self, obj):
        from django.utils import timezone
        from datetime import timedelta
        
        now = timezone.now()
        diff = now - obj.timestamp
        
        if diff < timedelta(minutes=1):
            return "Agora há pouco"
        elif diff < timedelta(hours=1):
            return f"{diff.seconds // 60} min atrás"
        elif diff < timedelta(days=1):
            return f"{diff.seconds // 3600} h atrás"
        elif diff < timedelta(days=7):
            return f"{diff.days} dia(s) atrás"
        else:
            return obj.timestamp.strftime("%d/%m/%Y %H:%M")

class CriarLogSerializer(serializers.ModelSerializer):
    """Serializer simplificado para criação de logs via API"""
    
    class Meta:
        model = LogEntry
        fields = [
            'ferramenta', 'nivel', 'mensagem', 'detalhes',
            'pais', 'usuario_conversa', 'id_conversa', 
            'ip_origem', 'user_agent'
        ]
    
    def validate_ferramenta(self, value):
        if value not in [choice[0] for choice in TipoFerramenta.choices]:
            raise serializers.ValidationError("Ferramenta inválida")
        return value
    
    def validate_nivel(self, value):
        if value not in [choice[0] for choice in NivelLog.choices]:
            raise serializers.ValidationError("Nível de log inválido")
        return value
    
    def validate(self, data):
        # Se for Nicochat, país é obrigatório
        if data.get('ferramenta') == TipoFerramenta.NICOCHAT:
            if not data.get('pais'):
                raise serializers.ValidationError({
                    'pais': 'País é obrigatório para logs do Nicochat'
                })
            if data.get('pais') not in [choice[0] for choice in PaisNicochat.choices]:
                raise serializers.ValidationError({
                    'pais': 'País inválido para Nicochat'
                })
        return data

class MarcarResolvidoSerializer(serializers.Serializer):
    """Serializer para marcar/desmarcar logs como resolvidos"""
    resolvido = serializers.BooleanField()
    observacoes = serializers.CharField(
        required=False, 
        allow_blank=True,
        help_text="Observações sobre a resolução"
    )

# ===== SERIALIZERS DE PROJETOS DE IA =====

class UserBasicoSerializer(serializers.ModelSerializer):
    """Serializer básico para usuários"""
    nome_completo = serializers.CharField(source='get_full_name', read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'nome_completo']

class VersaoProjetoSerializer(serializers.ModelSerializer):
    """Serializer para versões dos projetos"""
    responsavel_nome = serializers.CharField(source='responsavel.get_full_name', read_only=True)
    
    class Meta:
        model = VersaoProjeto
        fields = [
            'id', 'versao', 'versao_anterior', 'motivo_mudanca',
            'responsavel', 'responsavel_nome', 'data_lancamento'
        ]
        read_only_fields = ['data_lancamento', 'responsavel_nome']

class ProjetoIAListSerializer(serializers.ModelSerializer):
    """Serializer para listagem de projetos (campos essenciais)"""
    criadores_nomes = serializers.SerializerMethodField()
    criado_por_nome = serializers.CharField(source='criado_por.get_full_name', read_only=True)
    metricas_financeiras = serializers.SerializerMethodField()
    dias_sem_atualizacao = serializers.SerializerMethodField()
    
    class Meta:
        model = ProjetoIA
        fields = [
            'id', 'nome', 'data_criacao', 'descricao', 'status',
            'tipo_projeto', 'departamento_atendido', 'prioridade', 'complexidade',
            'versao_atual', 'criadores_nomes', 'criado_por_nome',
            'horas_totais', 'usuarios_impactados', 'frequencia_uso',
            'metricas_financeiras', 'criado_em', 'atualizado_em',
            'dias_sem_atualizacao', 'ativo'
        ]
    
    def get_criadores_nomes(self, obj):
        return [criador.get_full_name() or criador.username for criador in obj.criadores.all()]
    
    def get_metricas_financeiras(self, obj):
        # Só calcular se o usuário tem permissão para ver dados financeiros
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            user = request.user
            # Verificar se é admin ou tem permissão para financeiro
            if user.is_superuser or user.groups.filter(name__in=['Diretoria', 'Gestão']).exists():
                return obj.calcular_metricas_financeiras()
        
        # Retornar apenas métricas básicas sem valores financeiros
        return {
            'horas_totais': float(obj.horas_totais),
            'economia_mensal_horas': float(obj.economia_horas_mensais),
            'roi': 'Sem permissão',
            'acesso_restrito': True
        }
    
    def get_dias_sem_atualizacao(self, obj):
        from django.utils import timezone
        delta = timezone.now().date() - obj.atualizado_em.date()
        return delta.days

class ProjetoIADetailSerializer(serializers.ModelSerializer):
    """Serializer completo para detalhes do projeto"""
    criadores = UserBasicoSerializer(many=True, read_only=True)
    criadores_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=User.objects.all(),
        write_only=True,
        source='criadores'
    )
    dependencias = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=ProjetoIA.objects.all(),
        required=False
    )
    dependencias_nomes = serializers.SerializerMethodField(read_only=True)
    projetos_dependentes = serializers.SerializerMethodField(read_only=True)
    
    criado_por_nome = serializers.CharField(source='criado_por.get_full_name', read_only=True)
    versoes = VersaoProjetoSerializer(many=True, read_only=True)
    
    # Campos calculados
    custo_desenvolvimento = serializers.ReadOnlyField()
    custos_recorrentes_mensais = serializers.ReadOnlyField()
    custos_unicos_totais = serializers.ReadOnlyField()
    economia_mensal_total = serializers.ReadOnlyField()
    metricas_financeiras = serializers.SerializerMethodField()
    
    # Campos para validação de breakdown de horas
    total_horas_breakdown = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = ProjetoIA
        fields = '__all__'
        read_only_fields = [
            'criado_por', 'criado_em', 'atualizado_em',
            'custo_desenvolvimento', 'custos_recorrentes_mensais',
            'custos_unicos_totais', 'economia_mensal_total'
        ]
    
    def get_dependencias_nomes(self, obj):
        return [{'id': dep.id, 'nome': dep.nome} for dep in obj.dependencias.all()]
    
    def get_projetos_dependentes(self, obj):
        return [{'id': dep.id, 'nome': dep.nome} for dep in obj.projetos_dependentes.all()]
    
    def get_metricas_financeiras(self, obj):
        # Verificar permissões financeiras
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            user = request.user
            if user.is_superuser or user.groups.filter(name__in=['Diretoria', 'Gestão']).exists():
                return obj.calcular_metricas_financeiras()
        
        return {'acesso_restrito': True, 'message': 'Sem permissão para dados financeiros'}
    
    def get_total_horas_breakdown(self, obj):
        return float(
            obj.horas_desenvolvimento + 
            obj.horas_testes + 
            obj.horas_documentacao + 
            obj.horas_deploy
        )
    
    def validate(self, data):
        # Validar se o breakdown de horas não excede o total
        horas_totais = data.get('horas_totais', 0)
        horas_dev = data.get('horas_desenvolvimento', 0)
        horas_test = data.get('horas_testes', 0)
        horas_doc = data.get('horas_documentacao', 0)
        horas_deploy = data.get('horas_deploy', 0)
        
        total_breakdown = horas_dev + horas_test + horas_doc + horas_deploy
        
        if total_breakdown > horas_totais:
            raise serializers.ValidationError({
                'horas_totais': f'O breakdown de horas ({total_breakdown}h) não pode exceder o total ({horas_totais}h)'
            })
        
        return data
    
    def create(self, validated_data):
        criadores_data = validated_data.pop('criadores', [])
        dependencias_data = validated_data.pop('dependencias', [])
        
        # Definir criado_por como o usuário atual
        validated_data['criado_por'] = self.context['request'].user
        
        projeto = ProjetoIA.objects.create(**validated_data)
        
        # Adicionar criadores e dependências
        projeto.criadores.set(criadores_data)
        projeto.dependencias.set(dependencias_data)
        
        return projeto
    
    def update(self, instance, validated_data):
        criadores_data = validated_data.pop('criadores', None)
        dependencias_data = validated_data.pop('dependencias', None)
        
        # Atualizar campos normais
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Atualizar relacionamentos se fornecidos
        if criadores_data is not None:
            instance.criadores.set(criadores_data)
        if dependencias_data is not None:
            instance.dependencias.set(dependencias_data)
        
        return instance

class ProjetoIACreateSerializer(serializers.ModelSerializer):
    """Serializer para criação rápida de projetos"""
    criadores_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=User.objects.all(),
        write_only=True,
        source='criadores'
    )
    
    class Meta:
        model = ProjetoIA
        fields = [
            'nome', 'descricao', 'tipo_projeto', 'departamento_atendido',
            'prioridade', 'complexidade', 'horas_totais', 'criadores_ids',
            'ferramentas_tecnologias', 'link_projeto', 'usuarios_impactados',
            'frequencia_uso'
        ]
    
    def create(self, validated_data):
        criadores_data = validated_data.pop('criadores', [])
        validated_data['criado_por'] = self.context['request'].user
        
        projeto = ProjetoIA.objects.create(**validated_data)
        projeto.criadores.set(criadores_data)
        
        return projeto

class NovaVersaoSerializer(serializers.ModelSerializer):
    """Serializer para registrar nova versão"""
    
    class Meta:
        model = VersaoProjeto
        fields = ['versao', 'motivo_mudanca']
    
    def validate_versao(self, value):
        projeto = self.context['projeto']
        if VersaoProjeto.objects.filter(projeto=projeto, versao=value).exists():
            raise serializers.ValidationError("Esta versão já existe para o projeto")
        return value
    
    def create(self, validated_data):
        projeto = self.context['projeto']
        validated_data['projeto'] = projeto
        validated_data['responsavel'] = self.context['request'].user
        validated_data['versao_anterior'] = projeto.versao_atual
        
        # Criar nova versão
        versao = VersaoProjeto.objects.create(**validated_data)
        
        # Atualizar versão atual do projeto
        projeto.versao_atual = validated_data['versao']
        projeto.save()
        
        return versao

class DashboardStatsSerializer(serializers.Serializer):
    """Serializer para estatísticas do dashboard"""
    total_projetos = serializers.IntegerField()
    projetos_ativos = serializers.IntegerField()
    projetos_arquivados = serializers.IntegerField()
    projetos_manutencao = serializers.IntegerField()
    horas_totais_investidas = serializers.DecimalField(max_digits=10, decimal_places=2)
    
    # Estatísticas financeiras (só aparecem se tiver permissão)
    economia_mensal_total = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    roi_medio = serializers.DecimalField(max_digits=8, decimal_places=2, required=False)
    economia_acumulada_total = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    
    # Distribuições
    projetos_por_tipo = serializers.DictField()
    projetos_por_departamento = serializers.DictField()
    projetos_por_complexidade = serializers.DictField()
    
    # Top projetos
    top_projetos_roi = serializers.ListField(required=False)
    projetos_recentes = serializers.ListField()

class FiltrosProjetosSerializer(serializers.Serializer):
    """Serializer para filtros de projetos"""
    status = serializers.MultipleChoiceField(
        choices=StatusProjeto.choices,
        required=False
    )
    tipo_projeto = serializers.MultipleChoiceField(
        choices=TipoProjeto.choices,
        required=False
    )
    departamento = serializers.MultipleChoiceField(
        choices=DepartamentoChoices.choices,
        required=False
    )
    prioridade = serializers.MultipleChoiceField(
        choices=PrioridadeChoices.choices,
        required=False
    )
    complexidade = serializers.MultipleChoiceField(
        choices=ComplexidadeChoices.choices,
        required=False
    )
    criadores = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=User.objects.all(),
        required=False
    )
    data_criacao_inicio = serializers.DateField(required=False)
    data_criacao_fim = serializers.DateField(required=False)
    horas_min = serializers.DecimalField(max_digits=8, decimal_places=2, required=False)
    horas_max = serializers.DecimalField(max_digits=8, decimal_places=2, required=False)
    usuarios_impactados_min = serializers.IntegerField(required=False)
    busca = serializers.CharField(max_length=200, required=False)
    
    # Filtros financeiros (só aplicados se tiver permissão)
    roi_min = serializers.DecimalField(max_digits=8, decimal_places=2, required=False)
    roi_max = serializers.DecimalField(max_digits=8, decimal_places=2, required=False)
    economia_mensal_min = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)