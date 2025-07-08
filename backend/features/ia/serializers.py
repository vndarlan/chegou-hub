# backend/features/ia/serializers.py - VERSÃO CORRIGIDA
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    LogEntry, TipoFerramenta, NivelLog, PaisNicochat,
    ProjetoIA, VersaoProjeto, StatusProjeto, TipoProjeto,
    DepartamentoChoices, PrioridadeChoices, ComplexidadeChoices,
    FrequenciaUsoChoices, NivelAutonomiaChoices
)

# ===== SERIALIZERS DE LOGS (MANTIDOS) =====
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
    resolvido = serializers.BooleanField()
    observacoes = serializers.CharField(
        required=False, 
        allow_blank=True,
        help_text="Observações sobre a resolução"
    )

# ===== SERIALIZERS DE PROJETOS DE IA - CORRIGIDOS =====

class UserBasicoSerializer(serializers.ModelSerializer):
    nome_completo = serializers.CharField(source='get_full_name', read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'nome_completo']

class VersaoProjetoSerializer(serializers.ModelSerializer):
    responsavel_nome = serializers.CharField(source='responsavel.get_full_name', read_only=True)
    
    class Meta:
        model = VersaoProjeto
        fields = [
            'id', 'versao', 'versao_anterior', 'motivo_mudanca',
            'responsavel', 'responsavel_nome', 'data_lancamento'
        ]
        read_only_fields = ['data_lancamento', 'responsavel_nome']

class ProjetoIAListSerializer(serializers.ModelSerializer):
    criadores_nomes = serializers.SerializerMethodField()
    criado_por_nome = serializers.SerializerMethodField()
    metricas_financeiras = serializers.SerializerMethodField()
    dias_sem_atualizacao = serializers.SerializerMethodField()
    departamentos_display = serializers.SerializerMethodField()
    
    class Meta:
        model = ProjetoIA
        fields = [
            'id', 'nome', 'data_criacao', 'descricao', 'status',
            'tipo_projeto', 'departamentos_atendidos', 'departamentos_display',
            'prioridade', 'complexidade', 'versao_atual', 'criadores_nomes', 'criado_por_nome',
            'horas_totais', 'usuarios_impactados', 'frequencia_uso',
            'metricas_financeiras', 'criado_em', 'atualizado_em',
            'dias_sem_atualizacao', 'ativo'
        ]
    
    def get_criadores_nomes(self, obj):
        try:
            return [criador.get_full_name() or criador.username for criador in obj.criadores.all()]
        except:
            return []
    
    def get_criado_por_nome(self, obj):
        try:
            return obj.criado_por.get_full_name() or obj.criado_por.username
        except:
            return "N/A"
    
    def get_departamentos_display(self, obj):
        try:
            return obj.get_departamentos_display()
        except:
            return []
    
    def get_metricas_financeiras(self, obj):
        try:
            request = self.context.get('request')
            if request and hasattr(request, 'user') and request.user.is_authenticated:
                user = request.user
                if user.is_superuser or user.groups.filter(name__in=['Diretoria', 'Gestão']).exists():
                    usar_novos = bool(obj.custo_hora_empresa and obj.custo_hora_empresa > 0)
                    return obj.calcular_metricas_financeiras(usar_novos_campos=usar_novos)
            
            return {
                'horas_totais': float(obj.horas_totais),
                'economia_mensal_horas': float(obj.horas_economizadas_mes or obj.economia_horas_mensais),
                'roi': 'Sem permissão',
                'acesso_restrito': True
            }
        except:
            return {'horas_totais': float(obj.horas_totais or 0), 'roi': 'Erro', 'acesso_restrito': True}
    
    def get_dias_sem_atualizacao(self, obj):
        try:
            from django.utils import timezone
            delta = timezone.now().date() - obj.atualizado_em.date()
            return delta.days
        except:
            return 0

# ===== SERIALIZER UNIFICADO PARA CRIAÇÃO E EDIÇÃO =====
class ProjetoIASerializer(serializers.ModelSerializer):
    """Serializer unificado para criação e edição de projetos"""
    
    # Campos relacionados
    criadores = UserBasicoSerializer(many=True, read_only=True)
    criadores_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=User.objects.all(),
        write_only=True,
        source='criadores',
        required=False
    )
    dependencias = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=ProjetoIA.objects.all(),
        required=False
    )
    
    # Campos calculados (só para leitura)
    dependencias_nomes = serializers.SerializerMethodField(read_only=True)
    projetos_dependentes = serializers.SerializerMethodField(read_only=True)
    departamentos_display = serializers.SerializerMethodField(read_only=True)
    criado_por_nome = serializers.SerializerMethodField(read_only=True)
    versoes = VersaoProjetoSerializer(many=True, read_only=True)
    
    # Campos financeiros calculados
    custo_desenvolvimento = serializers.SerializerMethodField(read_only=True)
    custos_recorrentes_mensais_novo = serializers.SerializerMethodField(read_only=True)
    custos_unicos_totais_novo = serializers.SerializerMethodField(read_only=True)
    economia_mensal_total_novo = serializers.SerializerMethodField(read_only=True)
    metricas_financeiras = serializers.SerializerMethodField(read_only=True)
    
    # Campos legados (compatibilidade)
    custos_recorrentes_mensais = serializers.SerializerMethodField(read_only=True)
    custos_unicos_totais = serializers.SerializerMethodField(read_only=True)
    economia_mensal_total = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = ProjetoIA
        fields = [
            # Campos básicos
            'id', 'nome', 'data_criacao', 'descricao', 'status', 'link_projeto',
            'ferramentas_tecnologias', 'versao_atual', 'tipo_projeto',
            
            # CORREÇÃO: Incluir ambos os campos de departamento
            'departamentos_atendidos', 'departamento_atendido', 'departamentos_display',
            
            # Campos estratégicos
            'prioridade', 'complexidade', 'usuarios_impactados', 'frequencia_uso',
            
            # Relacionamentos
            'criadores', 'criadores_ids', 'dependencias', 'dependencias_nomes',
            'projetos_dependentes', 'criado_por', 'criado_por_nome', 'versoes',
            
            # Investimento de tempo
            'horas_totais', 'horas_desenvolvimento', 'horas_testes', 
            'horas_documentacao', 'horas_deploy',
            
            # CORREÇÃO: Incluir TODOS os campos financeiros novos
            'custo_hora_empresa', 'custo_apis_mensal', 'lista_ferramentas',
            'custo_treinamentos', 'custo_setup_inicial', 'custo_consultoria',
            'horas_economizadas_mes', 'valor_monetario_economizado_mes',
            'data_break_even', 'nivel_autonomia',
            
            # Campos legados (compatibilidade)
            'valor_hora', 'custo_ferramentas_mensais', 'custo_apis_mensais',
            'custo_infraestrutura_mensais', 'custo_manutencao_mensais',
            'economia_horas_mensais', 'valor_hora_economizada',
            'reducao_erros_mensais', 'economia_outros_mensais',
            
            # CORREÇÃO: Incluir TODOS os campos de documentação
            'documentacao_tecnica', 'licoes_aprendidas', 'proximos_passos', 'data_revisao',
            
            # Campos calculados
            'custo_desenvolvimento', 'custos_recorrentes_mensais_novo',
            'custos_unicos_totais_novo', 'economia_mensal_total_novo',
            'custos_recorrentes_mensais', 'custos_unicos_totais', 'economia_mensal_total',
            'metricas_financeiras',
            
            # Campos de controle
            'criado_em', 'atualizado_em', 'ativo'
        ]
        read_only_fields = ['criado_por', 'criado_em', 'atualizado_em']
    
    # Métodos para campos calculados (mantidos)
    def get_criado_por_nome(self, obj):
        try:
            return obj.criado_por.get_full_name() or obj.criado_por.username
        except:
            return "N/A"
    
    def get_dependencias_nomes(self, obj):
        try:
            return [{'id': dep.id, 'nome': dep.nome} for dep in obj.dependencias.all()]
        except:
            return []
    
    def get_projetos_dependentes(self, obj):
        try:
            return [{'id': dep.id, 'nome': dep.nome} for dep in obj.projetos_dependentes.all()]
        except:
            return []
    
    def get_departamentos_display(self, obj):
        try:
            return obj.get_departamentos_display()
        except:
            return []
    
    def get_custo_desenvolvimento(self, obj):
        try:
            return float(obj.custo_desenvolvimento)
        except:
            return 0.0
    
    def get_custos_recorrentes_mensais_novo(self, obj):
        try:
            return float(obj.custos_recorrentes_mensais_novo)
        except:
            return 0.0
    
    def get_custos_unicos_totais_novo(self, obj):
        try:
            return float(obj.custos_unicos_totais_novo)
        except:
            return 0.0
    
    def get_economia_mensal_total_novo(self, obj):
        try:
            return float(obj.economia_mensal_total_novo)
        except:
            return 0.0
    
    def get_custos_recorrentes_mensais(self, obj):
        try:
            return float(obj.custos_recorrentes_mensais)
        except:
            return 0.0
    
    def get_custos_unicos_totais(self, obj):
        try:
            return float(obj.custos_unicos_totais)
        except:
            return 0.0
    
    def get_economia_mensal_total(self, obj):
        try:
            return float(obj.economia_mensal_total)
        except:
            return 0.0
    
    def get_metricas_financeiras(self, obj):
        try:
            request = self.context.get('request')
            if request and hasattr(request, 'user') and request.user.is_authenticated:
                user = request.user
                if user.is_superuser or user.groups.filter(name__in=['Diretoria', 'Gestão']).exists():
                    usar_novos = bool(obj.custo_hora_empresa and obj.custo_hora_empresa > 0)
                    return obj.calcular_metricas_financeiras(usar_novos_campos=usar_novos)
            
            return {'acesso_restrito': True, 'message': 'Sem permissão para dados financeiros'}
        except:
            return {'acesso_restrito': True, 'error': 'Erro no cálculo'}
    
    def validate(self, data):
        """CORREÇÃO: Validação mais robusta"""
        print(f"🔍 Validando dados: {list(data.keys())}")
        
        # Validar campos obrigatórios
        if not data.get('nome', '').strip():
            raise serializers.ValidationError({'nome': 'Nome é obrigatório'})
        
        if not data.get('descricao', '').strip():
            raise serializers.ValidationError({'descricao': 'Descrição é obrigatória'})
        
        if not data.get('tipo_projeto'):
            raise serializers.ValidationError({'tipo_projeto': 'Tipo de projeto é obrigatório'})
        
        # CORREÇÃO: Validar departamentos_atendidos
        departamentos = data.get('departamentos_atendidos', [])
        if not departamentos:
            raise serializers.ValidationError({
                'departamentos_atendidos': 'Pelo menos um departamento deve ser selecionado'
            })
        
        # Validar se os departamentos são válidos
        choices_validas = [choice[0] for choice in DepartamentoChoices.choices]
        for dept in departamentos:
            if dept not in choices_validas:
                raise serializers.ValidationError({
                    'departamentos_atendidos': f'Departamento inválido: {dept}'
                })
        
        # Validar horas totais
        horas_totais = data.get('horas_totais', 0)
        if horas_totais <= 0:
            raise serializers.ValidationError({'horas_totais': 'Horas totais deve ser maior que 0'})
        
        # Validar breakdown de horas
        horas_dev = data.get('horas_desenvolvimento', 0)
        horas_test = data.get('horas_testes', 0)
        horas_doc = data.get('horas_documentacao', 0)
        horas_deploy = data.get('horas_deploy', 0)
        
        total_breakdown = horas_dev + horas_test + horas_doc + horas_deploy
        if total_breakdown > horas_totais:
            raise serializers.ValidationError({
                'horas_totais': f'O breakdown de horas ({total_breakdown}h) não pode exceder o total ({horas_totais}h)'
            })
        
        # Validar lista de ferramentas
        lista_ferramentas = data.get('lista_ferramentas', [])
        if lista_ferramentas:
            for ferramenta in lista_ferramentas:
                if not isinstance(ferramenta, dict) or 'nome' not in ferramenta or 'valor' not in ferramenta:
                    raise serializers.ValidationError({
                        'lista_ferramentas': 'Cada ferramenta deve ter "nome" e "valor"'
                    })
        
        print(f"✅ Validação concluída com sucesso")
        return data
    
    def create(self, validated_data):
        """CORREÇÃO: Método create mais robusto"""
        print(f"➕ Criando novo projeto com dados: {list(validated_data.keys())}")
        
        # Extrair relacionamentos ManyToMany
        criadores_data = validated_data.pop('criadores', [])
        dependencias_data = validated_data.pop('dependencias', [])
        
        # Definir criado_por
        validated_data['criado_por'] = self.context['request'].user
        
        # Criar projeto
        projeto = ProjetoIA.objects.create(**validated_data)
        print(f"✅ Projeto criado com ID: {projeto.id}")
        
        # Adicionar relacionamentos
        if criadores_data:
            projeto.criadores.set(criadores_data)
            print(f"✅ Criadores adicionados: {len(criadores_data)}")
        
        if dependencias_data:
            projeto.dependencias.set(dependencias_data)
            print(f"✅ Dependências adicionadas: {len(dependencias_data)}")
        
        return projeto
    
    def update(self, instance, validated_data):
        """CORREÇÃO: Método update completamente reescrito"""
        print(f"📝 Atualizando projeto {instance.id}")
        print(f"📋 Dados recebidos: {list(validated_data.keys())}")
        
        # Extrair relacionamentos ManyToMany
        criadores_data = validated_data.pop('criadores', None)
        dependencias_data = validated_data.pop('dependencias', None)
        
        # CORREÇÃO: Atualizar TODOS os campos recebidos
        campos_atualizados = []
        for campo, valor in validated_data.items():
            if hasattr(instance, campo):
                valor_anterior = getattr(instance, campo)
                setattr(instance, campo, valor)
                campos_atualizados.append(campo)
                print(f"  ✏️ {campo}: {valor_anterior} → {valor}")
        
        # Salvar instância
        instance.save()
        print(f"✅ Campos atualizados: {campos_atualizados}")
        
        # Atualizar relacionamentos se fornecidos
        if criadores_data is not None:
            instance.criadores.set(criadores_data)
            print(f"✅ Criadores atualizados: {len(criadores_data)}")
        
        if dependencias_data is not None:
            instance.dependencias.set(dependencias_data)
            print(f"✅ Dependências atualizadas: {len(dependencias_data)}")
        
        # Recarregar da base de dados
        instance.refresh_from_db()
        print(f"✅ Projeto {instance.id} atualizado com sucesso")
        
        return instance

# ===== SERIALIZERS ESPECÍFICOS =====

# Alias para compatibilidade
ProjetoIADetailSerializer = ProjetoIASerializer
ProjetoIACreateSerializer = ProjetoIASerializer

class NovaVersaoSerializer(serializers.ModelSerializer):
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
        
        versao = VersaoProjeto.objects.create(**validated_data)
        
        projeto.versao_atual = validated_data['versao']
        projeto.save()
        
        return versao

class DashboardStatsSerializer(serializers.Serializer):
    total_projetos = serializers.IntegerField()
    projetos_ativos = serializers.IntegerField()
    projetos_arquivados = serializers.IntegerField()
    projetos_manutencao = serializers.IntegerField()
    horas_totais_investidas = serializers.DecimalField(max_digits=10, decimal_places=2)
    
    economia_mensal_total = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    roi_medio = serializers.DecimalField(max_digits=8, decimal_places=2, required=False)
    economia_acumulada_total = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    
    projetos_por_tipo = serializers.DictField()
    projetos_por_departamento = serializers.DictField()
    projetos_por_complexidade = serializers.DictField()
    
    top_projetos_roi = serializers.ListField(required=False)
    projetos_recentes = serializers.ListField()

class FiltrosProjetosSerializer(serializers.Serializer):
    status = serializers.MultipleChoiceField(choices=StatusProjeto.choices, required=False)
    tipo_projeto = serializers.MultipleChoiceField(choices=TipoProjeto.choices, required=False)
    departamento = serializers.MultipleChoiceField(choices=DepartamentoChoices.choices, required=False)
    prioridade = serializers.MultipleChoiceField(choices=PrioridadeChoices.choices, required=False)
    complexidade = serializers.MultipleChoiceField(choices=ComplexidadeChoices.choices, required=False)
    criadores = serializers.PrimaryKeyRelatedField(many=True, queryset=User.objects.all(), required=False)
    data_criacao_inicio = serializers.DateField(required=False)
    data_criacao_fim = serializers.DateField(required=False)
    horas_min = serializers.DecimalField(max_digits=8, decimal_places=2, required=False)
    horas_max = serializers.DecimalField(max_digits=8, decimal_places=2, required=False)
    usuarios_impactados_min = serializers.IntegerField(required=False)
    busca = serializers.CharField(max_length=200, required=False)
    roi_min = serializers.DecimalField(max_digits=8, decimal_places=2, required=False)
    roi_max = serializers.DecimalField(max_digits=8, decimal_places=2, required=False)
    economia_mensal_min = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)