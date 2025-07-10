# backend/features/ia/serializers.py - VERSÃO CORRIGIDA COMPLETA
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    LogEntry, TipoFerramenta, NivelLog, PaisNicochat,
    ProjetoIA, VersaoProjeto, StatusProjeto, TipoProjeto,
    DepartamentoChoices, PrioridadeChoices, ComplexidadeChoices,
    FrequenciaUsoChoices, NivelAutonomiaChoices
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
            'dias_sem_atualizacao', 'ativo',
            # CORREÇÃO: Adicionar campo legado para compatibilidade
            'departamento_atendido'
        ]
    
    def get_criadores_nomes(self, obj):
        try:
            return [criador.get_full_name() or criador.username for criador in obj.criadores.all()]
        except Exception as e:
            print(f"Erro get_criadores_nomes: {e}")
            return []
    
    def get_criado_por_nome(self, obj):
        try:
            return obj.criado_por.get_full_name() or obj.criado_por.username
        except Exception as e:
            print(f"Erro get_criado_por_nome: {e}")
            return "N/A"
    
    def get_departamentos_display(self, obj):
        try:
            return obj.get_departamentos_display()
        except Exception as e:
            print(f"Erro get_departamentos_display: {e}")
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
        except Exception as e:
            print(f"Erro get_metricas_financeiras: {e}")
            return {
                'horas_totais': float(obj.horas_totais or 0),
                'roi': 'Erro no cálculo',
                'acesso_restrito': True
            }
    
    def get_dias_sem_atualizacao(self, obj):
        try:
            from django.utils import timezone
            delta = timezone.now().date() - obj.atualizado_em.date()
            return delta.days
        except Exception as e:
            print(f"Erro get_dias_sem_atualizacao: {e}")
            return 0

class ProjetoIADetailSerializer(serializers.ModelSerializer):
    """Serializer completo para detalhes do projeto - TODOS OS CAMPOS EXPLÍCITOS"""
    
    # === RELACIONAMENTOS READ-ONLY ===
    criadores = UserBasicoSerializer(many=True, read_only=True)
    dependencias_nomes = serializers.SerializerMethodField(read_only=True)
    projetos_dependentes = serializers.SerializerMethodField(read_only=True)
    departamentos_display = serializers.SerializerMethodField(read_only=True)
    criado_por_nome = serializers.SerializerMethodField(read_only=True)
    versoes = VersaoProjetoSerializer(many=True, read_only=True)
    
    # === RELACIONAMENTOS WRITE-ONLY ===
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
    
    # === CAMPOS CALCULADOS READ-ONLY ===
    custo_desenvolvimento = serializers.SerializerMethodField(read_only=True)
    custos_recorrentes_mensais_novo = serializers.SerializerMethodField(read_only=True)
    custos_unicos_totais_novo = serializers.SerializerMethodField(read_only=True)
    economia_mensal_total_novo = serializers.SerializerMethodField(read_only=True)
    metricas_financeiras = serializers.SerializerMethodField(read_only=True)
    
    # === CAMPOS CALCULADOS LEGADOS ===
    custos_recorrentes_mensais = serializers.SerializerMethodField(read_only=True)
    custos_unicos_totais = serializers.SerializerMethodField(read_only=True)
    economia_mensal_total = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = ProjetoIA
        fields = [
            # === CAMPOS BÁSICOS (READ/WRITE) ===
            'id', 'nome', 'data_criacao', 'descricao', 'status', 'link_projeto',
            'ferramentas_tecnologias', 'versao_atual', 'ativo',
            
            # === CAMPOS ESTRATÉGICOS (READ/WRITE) ===
            'tipo_projeto', 'departamentos_atendidos', 'departamento_atendido',
            'prioridade', 'complexidade', 'usuarios_impactados', 'frequencia_uso',
            
            # === INVESTIMENTO DE TEMPO (READ/WRITE) ===
            'horas_totais', 'horas_desenvolvimento', 'horas_testes', 
            'horas_documentacao', 'horas_deploy',
            
            # === NOVOS CAMPOS FINANCEIROS (READ/WRITE) ===
            'custo_hora_empresa', 'custo_apis_mensal', 'lista_ferramentas',
            'custo_treinamentos', 'custo_setup_inicial', 'custo_consultoria',
            'horas_economizadas_mes', 'valor_monetario_economizado_mes',
            'data_break_even', 'nivel_autonomia',
            
            # === CAMPOS LEGADOS (READ/WRITE) ===
            'valor_hora', 'custo_ferramentas_mensais', 'custo_apis_mensais',
            'custo_infraestrutura_mensais', 'custo_manutencao_mensais',
            'economia_horas_mensais', 'valor_hora_economizada',
            'reducao_erros_mensais', 'economia_outros_mensais',
            
            # === DOCUMENTAÇÃO (READ/WRITE) ===
            'documentacao_tecnica', 'licoes_aprendidas', 'proximos_passos', 'data_revisao',
            
            # === RELACIONAMENTOS ===
            'criadores', 'criadores_ids', 'dependencias', 'dependencias_nomes',
            'projetos_dependentes', 'criado_por', 'criado_por_nome', 'versoes',
            'departamentos_display',
            
            # === CAMPOS CALCULADOS (READ-ONLY) ===
            'custo_desenvolvimento', 'custos_recorrentes_mensais_novo',
            'custos_unicos_totais_novo', 'economia_mensal_total_novo',
            'custos_recorrentes_mensais', 'custos_unicos_totais', 'economia_mensal_total',
            'metricas_financeiras',
            
            # === CAMPOS DE CONTROLE (READ-ONLY) ===
            'criado_em', 'atualizado_em'
        ]
        
        read_only_fields = [
            'id', 'criado_por', 'criado_em', 'atualizado_em',
            # Campos calculados são read-only
            'custo_desenvolvimento', 'custos_recorrentes_mensais_novo',
            'custos_unicos_totais_novo', 'economia_mensal_total_novo',
            'custos_recorrentes_mensais', 'custos_unicos_totais', 'economia_mensal_total',
            'metricas_financeiras', 'departamentos_display', 'criado_por_nome',
            'dependencias_nomes', 'projetos_dependentes', 'versoes',
            # Relacionamentos read-only
            'criadores'
        ]
    
    # === MÉTODOS DE SERIALIZAÇÃO ===
    def get_criado_por_nome(self, obj):
        try:
            return obj.criado_por.get_full_name() or obj.criado_por.username
        except Exception:
            return "N/A"
    
    def get_dependencias_nomes(self, obj):
        try:
            return [{'id': dep.id, 'nome': dep.nome} for dep in obj.dependencias.all()]
        except Exception:
            return []
    
    def get_projetos_dependentes(self, obj):
        try:
            return [{'id': dep.id, 'nome': dep.nome} for dep in obj.projetos_dependentes.all()]
        except Exception:
            return []
    
    def get_departamentos_display(self, obj):
        try:
            return obj.get_departamentos_display()
        except Exception:
            return []
    
    # === CAMPOS CALCULADOS NOVOS ===
    def get_custo_desenvolvimento(self, obj):
        try:
            return float(obj.custo_desenvolvimento)
        except Exception:
            return 0.0
    
    def get_custos_recorrentes_mensais_novo(self, obj):
        try:
            return float(obj.custos_recorrentes_mensais_novo)
        except Exception:
            return 0.0
    
    def get_custos_unicos_totais_novo(self, obj):
        try:
            return float(obj.custos_unicos_totais_novo)
        except Exception:
            return 0.0
    
    def get_economia_mensal_total_novo(self, obj):
        try:
            return float(obj.economia_mensal_total_novo)
        except Exception:
            return 0.0
    
    # === CAMPOS CALCULADOS LEGADOS ===
    def get_custos_recorrentes_mensais(self, obj):
        try:
            return float(obj.custos_recorrentes_mensais)
        except Exception:
            return 0.0
    
    def get_custos_unicos_totais(self, obj):
        try:
            return float(obj.custos_unicos_totais)
        except Exception:
            return 0.0
    
    def get_economia_mensal_total(self, obj):
        try:
            return float(obj.economia_mensal_total)
        except Exception:
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
        except Exception as e:
            return {'acesso_restrito': True, 'error': str(e)}
    
    # === VALIDAÇÃO ===
    def validate(self, data):
        print(f"🔍 VALIDAÇÃO - dados recebidos: {list(data.keys())}")
        
        # Validar departamentos se fornecido
        if 'departamentos_atendidos' in data:
            departamentos = data.get('departamentos_atendidos', [])
            if not departamentos:
                raise serializers.ValidationError({
                    'departamentos_atendidos': 'Pelo menos um departamento deve ser selecionado'
                })
        
        print(f"✅ VALIDAÇÃO OK")
        return data
    
    # === CREATE ===
    def create(self, validated_data):
        try:
            print(f"➕ CREATE - campos recebidos: {list(validated_data.keys())}")
            
            # Extrair relacionamentos ManyToMany
            criadores_data = validated_data.pop('criadores', [])
            dependencias_data = validated_data.pop('dependencias', [])
            
            # Definir criado_por
            validated_data['criado_por'] = self.context['request'].user
            
            # Criar projeto com todos os campos
            projeto = ProjetoIA.objects.create(**validated_data)
            print(f"✅ CREATE - projeto {projeto.id} criado com {len(validated_data)} campos")
            
            # Definir relacionamentos
            if criadores_data:
                projeto.criadores.set(criadores_data)
                print(f"✅ CREATE - {len(criadores_data)} criadores definidos")
            if dependencias_data:
                projeto.dependencias.set(dependencias_data)
                print(f"✅ CREATE - {len(dependencias_data)} dependências definidas")
            
            return projeto
            
        except Exception as e:
            print(f"❌ CREATE - erro: {e}")
            raise
    
    # === UPDATE ===
    def update(self, instance, validated_data):
        try:
            print(f"📝 UPDATE projeto {instance.id} - campos recebidos: {list(validated_data.keys())}")
            
            # Extrair relacionamentos ManyToMany
            criadores_data = validated_data.pop('criadores', None)
            dependencias_data = validated_data.pop('dependencias', None)
            
            # === ATUALIZAR TODOS OS CAMPOS EXPLICITAMENTE ===
            
            # CAMPOS BÁSICOS
            if 'nome' in validated_data:
                instance.nome = validated_data['nome']
                print(f"  📝 nome: {instance.nome}")
            
            if 'descricao' in validated_data:
                instance.descricao = validated_data['descricao']
                print(f"  📝 descricao: {len(instance.descricao)} chars")
            
            if 'status' in validated_data:
                instance.status = validated_data['status']
                print(f"  📝 status: {instance.status}")
            
            if 'link_projeto' in validated_data:
                instance.link_projeto = validated_data['link_projeto']
                print(f"  📝 link_projeto: {instance.link_projeto}")
            
            if 'ferramentas_tecnologias' in validated_data:
                instance.ferramentas_tecnologias = validated_data['ferramentas_tecnologias']
                print(f"  📝 ferramentas_tecnologias: {len(instance.ferramentas_tecnologias)} itens")
            
            if 'versao_atual' in validated_data:
                instance.versao_atual = validated_data['versao_atual']
                print(f"  📝 versao_atual: {instance.versao_atual}")
            
            # CAMPOS ESTRATÉGICOS
            if 'tipo_projeto' in validated_data:
                instance.tipo_projeto = validated_data['tipo_projeto']
                print(f"  📝 tipo_projeto: {instance.tipo_projeto}")
            
            if 'departamentos_atendidos' in validated_data:
                instance.departamentos_atendidos = validated_data['departamentos_atendidos']
                print(f"  📝 departamentos_atendidos: {instance.departamentos_atendidos}")
            
            if 'prioridade' in validated_data:
                instance.prioridade = validated_data['prioridade']
                print(f"  📝 prioridade: {instance.prioridade}")
            
            if 'complexidade' in validated_data:
                instance.complexidade = validated_data['complexidade']
                print(f"  📝 complexidade: {instance.complexidade}")
            
            if 'usuarios_impactados' in validated_data:
                instance.usuarios_impactados = validated_data['usuarios_impactados']
                print(f"  📝 usuarios_impactados: {instance.usuarios_impactados}")
            
            if 'frequencia_uso' in validated_data:
                instance.frequencia_uso = validated_data['frequencia_uso']
                print(f"  📝 frequencia_uso: {instance.frequencia_uso}")
            
            # CAMPOS DE TEMPO
            if 'horas_totais' in validated_data:
                instance.horas_totais = validated_data['horas_totais']
                print(f"  📝 horas_totais: {instance.horas_totais}")
            
            if 'horas_desenvolvimento' in validated_data:
                instance.horas_desenvolvimento = validated_data['horas_desenvolvimento']
                print(f"  📝 horas_desenvolvimento: {instance.horas_desenvolvimento}")
            
            if 'horas_testes' in validated_data:
                instance.horas_testes = validated_data['horas_testes']
                print(f"  📝 horas_testes: {instance.horas_testes}")
            
            if 'horas_documentacao' in validated_data:
                instance.horas_documentacao = validated_data['horas_documentacao']
                print(f"  📝 horas_documentacao: {instance.horas_documentacao}")
            
            if 'horas_deploy' in validated_data:
                instance.horas_deploy = validated_data['horas_deploy']
                print(f"  📝 horas_deploy: {instance.horas_deploy}")
            
            # CAMPOS FINANCEIROS NOVOS
            if 'custo_hora_empresa' in validated_data:
                instance.custo_hora_empresa = validated_data['custo_hora_empresa']
                print(f"  📝 custo_hora_empresa: {instance.custo_hora_empresa}")
            
            if 'custo_apis_mensal' in validated_data:
                instance.custo_apis_mensal = validated_data['custo_apis_mensal']
                print(f"  📝 custo_apis_mensal: {instance.custo_apis_mensal}")
            
            if 'lista_ferramentas' in validated_data:
                instance.lista_ferramentas = validated_data['lista_ferramentas']
                print(f"  📝 lista_ferramentas: {len(instance.lista_ferramentas)} ferramentas")
            
            if 'custo_treinamentos' in validated_data:
                instance.custo_treinamentos = validated_data['custo_treinamentos']
                print(f"  📝 custo_treinamentos: {instance.custo_treinamentos}")
            
            if 'custo_setup_inicial' in validated_data:
                instance.custo_setup_inicial = validated_data['custo_setup_inicial']
                print(f"  📝 custo_setup_inicial: {instance.custo_setup_inicial}")
            
            if 'custo_consultoria' in validated_data:
                instance.custo_consultoria = validated_data['custo_consultoria']
                print(f"  📝 custo_consultoria: {instance.custo_consultoria}")
            
            if 'horas_economizadas_mes' in validated_data:
                instance.horas_economizadas_mes = validated_data['horas_economizadas_mes']
                print(f"  📝 horas_economizadas_mes: {instance.horas_economizadas_mes}")
            
            if 'valor_monetario_economizado_mes' in validated_data:
                instance.valor_monetario_economizado_mes = validated_data['valor_monetario_economizado_mes']
                print(f"  📝 valor_monetario_economizado_mes: {instance.valor_monetario_economizado_mes}")
            
            if 'data_break_even' in validated_data:
                instance.data_break_even = validated_data['data_break_even']
                print(f"  📝 data_break_even: {instance.data_break_even}")
            
            if 'nivel_autonomia' in validated_data:
                instance.nivel_autonomia = validated_data['nivel_autonomia']
                print(f"  📝 nivel_autonomia: {instance.nivel_autonomia}")
            
            # CAMPOS DE DOCUMENTAÇÃO
            if 'documentacao_tecnica' in validated_data:
                instance.documentacao_tecnica = validated_data['documentacao_tecnica']
                print(f"  📝 documentacao_tecnica: {len(instance.documentacao_tecnica or '')} chars")
            
            if 'licoes_aprendidas' in validated_data:
                instance.licoes_aprendidas = validated_data['licoes_aprendidas']
                print(f"  📝 licoes_aprendidas: {len(instance.licoes_aprendidas or '')} chars")
            
            if 'proximos_passos' in validated_data:
                instance.proximos_passos = validated_data['proximos_passos']
                print(f"  📝 proximos_passos: {len(instance.proximos_passos or '')} chars")
            
            if 'data_revisao' in validated_data:
                instance.data_revisao = validated_data['data_revisao']
                print(f"  📝 data_revisao: {instance.data_revisao}")
            
            # CAMPOS LEGADOS (para compatibilidade)
            if 'valor_hora' in validated_data:
                instance.valor_hora = validated_data['valor_hora']
            if 'custo_ferramentas_mensais' in validated_data:
                instance.custo_ferramentas_mensais = validated_data['custo_ferramentas_mensais']
            if 'custo_apis_mensais' in validated_data:
                instance.custo_apis_mensais = validated_data['custo_apis_mensais']
            if 'custo_infraestrutura_mensais' in validated_data:
                instance.custo_infraestrutura_mensais = validated_data['custo_infraestrutura_mensais']
            if 'custo_manutencao_mensais' in validated_data:
                instance.custo_manutencao_mensais = validated_data['custo_manutencao_mensais']
            if 'economia_horas_mensais' in validated_data:
                instance.economia_horas_mensais = validated_data['economia_horas_mensais']
            if 'valor_hora_economizada' in validated_data:
                instance.valor_hora_economizada = validated_data['valor_hora_economizada']
            if 'reducao_erros_mensais' in validated_data:
                instance.reducao_erros_mensais = validated_data['reducao_erros_mensais']
            if 'economia_outros_mensais' in validated_data:
                instance.economia_outros_mensais = validated_data['economia_outros_mensais']
            
            if 'ativo' in validated_data:
                instance.ativo = validated_data['ativo']
            
            # SALVAR TODAS AS ALTERAÇÕES
            instance.save()
            print(f"✅ UPDATE - todos os campos salvos no banco")
            
            # ATUALIZAR RELACIONAMENTOS
            if criadores_data is not None:
                instance.criadores.set(criadores_data)
                print(f"✅ UPDATE - {len(criadores_data)} criadores atualizados")
            
            if dependencias_data is not None:
                instance.dependencias.set(dependencias_data)
                print(f"✅ UPDATE - {len(dependencias_data)} dependências atualizadas")
            
            # VERIFICAR SE REALMENTE FOI SALVO
            instance.refresh_from_db()
            print(f"✅ UPDATE - projeto {instance.id} totalmente atualizado")
            
            return instance
            
        except Exception as e:
            print(f"❌ UPDATE - erro: {e}")
            import traceback
            traceback.print_exc()
            raise

class ProjetoIACreateSerializer(serializers.ModelSerializer):
    """Serializer para criação rápida de projetos"""
    criadores_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=User.objects.all(),
        write_only=True,
        source='criadores',
        required=False
    )
    
    class Meta:
        model = ProjetoIA
        fields = [
            # Campos básicos
            'nome', 'descricao', 'tipo_projeto', 'departamentos_atendidos',
            'prioridade', 'complexidade', 'horas_totais', 'criadores_ids',
            'ferramentas_tecnologias', 'link_projeto', 'usuarios_impactados',
            'frequencia_uso',
            
            # Campos de breakdown de horas
            'horas_desenvolvimento', 'horas_testes', 'horas_documentacao', 'horas_deploy',
            
            # Novos campos financeiros
            'custo_hora_empresa', 'custo_apis_mensal', 'lista_ferramentas',
            'custo_treinamentos', 'custo_setup_inicial', 'custo_consultoria',
            'horas_economizadas_mes', 'valor_monetario_economizado_mes',
            'data_break_even', 'nivel_autonomia',
            
            # Campos legados (compatibilidade)
            'valor_hora', 'custo_ferramentas_mensais', 'custo_apis_mensais',
            'custo_infraestrutura_mensais', 'custo_manutencao_mensais',
            'economia_horas_mensais', 'valor_hora_economizada',
            'reducao_erros_mensais', 'economia_outros_mensais',
            
            # Documentação
            'documentacao_tecnica', 'licoes_aprendidas', 'proximos_passos', 'data_revisao'
        ]
    
    def create(self, validated_data):
        try:
            criadores_data = validated_data.pop('criadores', [])
            validated_data['criado_por'] = self.context['request'].user
            
            projeto = ProjetoIA.objects.create(**validated_data)
            if criadores_data:
                projeto.criadores.set(criadores_data)
            
            return projeto
        except Exception as e:
            print(f"Erro no create: {e}")
            raise

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