# backend/features/ia/serializers.py - VERSO CORRIGIDA COMPLETA
from rest_framework import serializers
from django.contrib.auth.models import User
from django.utils import timezone
import logging
from .models import (
    LogEntry, TipoFerramenta, NivelLog, PaisNicochat,
    ProjetoIA, VersaoProjeto, StatusProjeto, TipoProjeto,
    DepartamentoChoices, PrioridadeChoices, ComplexidadeChoices,
    FrequenciaUsoChoices, NivelAutonomiaChoices,
    # WhatsApp Business models
    WhatsAppBusinessAccount, BusinessManager, WhatsAppPhoneNumber, QualityHistory, QualityAlert,
    QualityRatingChoices, MessagingLimitTierChoices, PhoneNumberStatusChoices,
    AlertTypeChoices, AlertPriorityChoices,
    # NicoChat models
    NicochatWorkspace, NicochatConfig
)

# Configurar logger
logger = logging.getLogger(__name__)

# ===== CAMPOS CUSTOMIZADOS =====
class FlexibleDateField(serializers.DateField):
    """Campo de data que aceita strings vazias e converte para None"""
    
    def to_internal_value(self, value):
        if value == '' or value == 'null' or not value:
            return None
        return super().to_internal_value(value)

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
    """Serializer simplificado para criao de logs via API"""
    
    class Meta:
        model = LogEntry
        fields = [
            'ferramenta', 'nivel', 'mensagem', 'detalhes',
            'pais', 'usuario_conversa', 'id_conversa', 
            'ip_origem', 'user_agent'
        ]
    
    def validate_ferramenta(self, value):
        if value not in [choice[0] for choice in TipoFerramenta.choices]:
            raise serializers.ValidationError("Ferramenta invlida")
        return value
    
    def validate_nivel(self, value):
        if value not in [choice[0] for choice in NivelLog.choices]:
            raise serializers.ValidationError("Nvel de log invlido")
        return value
    
    def validate(self, data):
        # Se for Nicochat, pas  obrigatrio
        if data.get('ferramenta') == TipoFerramenta.NICOCHAT:
            if not data.get('pais'):
                raise serializers.ValidationError({
                    'pais': 'Pas  obrigatrio para logs do Nicochat'
                })
            if data.get('pais') not in [choice[0] for choice in PaisNicochat.choices]:
                raise serializers.ValidationError({
                    'pais': 'Pas invlido para Nicochat'
                })
        return data

class MarcarResolvidoSerializer(serializers.Serializer):
    """Serializer para marcar/desmarcar logs como resolvidos"""
    resolvido = serializers.BooleanField()
    observacoes = serializers.CharField(
        required=False, 
        allow_blank=True,
        help_text="Observaes sobre a resoluo"
    )

# ===== SERIALIZERS DE PROJETOS DE IA =====

class UserBasicoSerializer(serializers.ModelSerializer):
    """Serializer bsico para usurios"""
    nome_completo = serializers.CharField(source='get_full_name', read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'nome_completo']

class VersaoProjetoSerializer(serializers.ModelSerializer):
    """Serializer para verses dos projetos"""
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
            # CORREO: Adicionar campo legado para compatibilidade
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
                if user.is_superuser or user.groups.filter(name__in=['Diretoria', 'Gesto']).exists():
                    usar_novos = bool(obj.custo_hora_empresa and obj.custo_hora_empresa > 0)
                    return obj.calcular_metricas_financeiras(usar_novos_campos=usar_novos)
            
            return {
                'horas_totais': float(obj.horas_totais),
                'economia_mensal_horas': float(obj.horas_economizadas_mes or obj.economia_horas_mensais),
                'roi': 'Sem permisso',
                'acesso_restrito': True
            }
        except Exception as e:
            print(f"Erro get_metricas_financeiras: {e}")
            return {
                'horas_totais': float(obj.horas_totais or 0),
                'roi': 'Erro no clculo',
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
    """Serializer completo para detalhes do projeto - TODOS OS CAMPOS EXPLCITOS"""
    
    # === RELACIONAMENTOS READ-ONLY ===
    criadores = UserBasicoSerializer(many=True, read_only=True)
    dependencias_nomes = serializers.SerializerMethodField(read_only=True)
    projetos_dependentes = serializers.SerializerMethodField(read_only=True)
    departamentos_display = serializers.SerializerMethodField(read_only=True)
    criado_por_nome = serializers.SerializerMethodField(read_only=True)
    versoes = VersaoProjetoSerializer(many=True, read_only=True)
    
    # === CAMPOS PERSONALIZADOS ===
    data_revisao = FlexibleDateField(required=False, allow_null=True)
    data_break_even = FlexibleDateField(required=False, allow_null=True)
    
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
    horas_totais = serializers.SerializerMethodField(read_only=True)
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
            # === CAMPOS BSICOS (READ/WRITE) ===
            'id', 'nome', 'data_criacao', 'descricao', 'status', 'link_projeto',
            'ferramentas_tecnologias', 'versao_atual', 'ativo',
            
            # === CAMPOS ESTRATGICOS (READ/WRITE) ===
            'tipo_projeto', 'departamentos_atendidos', 'departamento_atendido',
            'prioridade', 'complexidade', 'usuarios_impactados', 'frequencia_uso',
            
            # === INVESTIMENTO DE TEMPO (READ/WRITE) ===
            # CORREÇÃO: horas_totais é calculado, não editável diretamente
            'horas_desenvolvimento', 'horas_testes', 
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
            
            # === DOCUMENTAO (READ/WRITE) ===
            'documentacao_tecnica', 'documentacao_apoio', 'licoes_aprendidas', 'proximos_passos', 'data_revisao',
            
            # === RELACIONAMENTOS ===
            'criadores', 'criadores_ids', 'dependencias', 'dependencias_nomes',
            'projetos_dependentes', 'criado_por', 'criado_por_nome', 'versoes',
            'departamentos_display',
            
            # === CAMPOS CALCULADOS (READ-ONLY) ===
            'horas_totais', 'custo_desenvolvimento', 'custos_recorrentes_mensais_novo',
            'custos_unicos_totais_novo', 'economia_mensal_total_novo',
            'custos_recorrentes_mensais', 'custos_unicos_totais', 'economia_mensal_total',
            'metricas_financeiras',
            
            # === CAMPOS DE CONTROLE (READ-ONLY) ===
            'criado_em', 'atualizado_em'
        ]
        
        read_only_fields = [
            'id', 'criado_por', 'criado_em', 'atualizado_em',
            # Campos calculados so read-only
            'horas_totais', 'custo_desenvolvimento', 'custos_recorrentes_mensais_novo',
            'custos_unicos_totais_novo', 'economia_mensal_total_novo',
            'custos_recorrentes_mensais', 'custos_unicos_totais', 'economia_mensal_total',
            'metricas_financeiras', 'departamentos_display', 'criado_por_nome',
            'dependencias_nomes', 'projetos_dependentes', 'versoes',
            # Relacionamentos read-only
            'criadores'
        ]
    
    # === MTODOS DE SERIALIZAO ===
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
    def get_horas_totais(self, obj):
        try:
            return float(obj.horas_totais)
        except Exception:
            return 0.0
    
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
                if user.is_superuser or user.groups.filter(name__in=['Diretoria', 'Gesto']).exists():
                    usar_novos = bool(obj.custo_hora_empresa and obj.custo_hora_empresa > 0)
                    return obj.calcular_metricas_financeiras(usar_novos_campos=usar_novos)
            
            return {'acesso_restrito': True, 'message': 'Sem permisso para dados financeiros'}
        except Exception as e:
            return {'acesso_restrito': True, 'error': str(e)}
    
    # === VALIDAO ===
    def validate(self, data):
        print(f"VALIDACAO - dados recebidos: {list(data.keys())}")
        
        # CORREÇÃO: Sanitizar campos de array problemáticos
        
        # 1. Limpar ferramentas_tecnologias - remover strings vazias
        if 'ferramentas_tecnologias' in data:
            ferramentas = data.get('ferramentas_tecnologias', [])
            if isinstance(ferramentas, list):
                ferramentas_limpas = [f.strip() for f in ferramentas if f and str(f).strip()]
                data['ferramentas_tecnologias'] = ferramentas_limpas
                print(f"VALIDACAO - ferramentas_tecnologias sanitizadas: {ferramentas_limpas}")
            else:
                data['ferramentas_tecnologias'] = []
        
        # 2. Sanitizar lista_ferramentas - remover objetos vazios ou malformados
        if 'lista_ferramentas' in data:
            lista = data.get('lista_ferramentas', [])
            if isinstance(lista, list):
                lista_limpa = []
                for item in lista:
                    if isinstance(item, dict):
                        nome = str(item.get('nome', '')).strip()
                        valor = item.get('valor', 0)
                        # Só incluir se tiver nome válido
                        if nome:
                            try:
                                valor = float(valor) if valor else 0
                                lista_limpa.append({'nome': nome, 'valor': valor})
                            except (ValueError, TypeError):
                                lista_limpa.append({'nome': nome, 'valor': 0})
                data['lista_ferramentas'] = lista_limpa
                print(f"VALIDACAO - lista_ferramentas sanitizada: {lista_limpa}")
            else:
                data['lista_ferramentas'] = []
        
        # 3. Validar campos numéricos
        campos_numericos = [
            'custo_apis_mensal', 'custo_hora_empresa', 'horas_desenvolvimento',
            'horas_testes', 'horas_documentacao', 'horas_deploy',
            'custo_treinamentos', 'custo_setup_inicial', 'custo_consultoria',
            'horas_economizadas_mes', 'valor_monetario_economizado_mes'
        ]
        
        for campo in campos_numericos:
            if campo in data:
                try:
                    valor = data[campo]
                    if valor is None or valor == '':
                        data[campo] = 0
                    else:
                        data[campo] = float(valor) if valor else 0
                except (ValueError, TypeError) as e:
                    print(f"ERRO campo numerico {campo}: {e}")
                    data[campo] = 0
        
        # 4. Validar campo de data
        if 'data_revisao' in data:
            data_revisao = data.get('data_revisao')
            if data_revisao == '' or data_revisao == 'null' or not data_revisao:
                data['data_revisao'] = None
        
        # Validar encoding de campos de texto
        for field_name, value in data.items():
            if isinstance(value, str):
                try:
                    # Testar se o valor pode ser encodado/decodificado corretamente
                    value.encode('utf-8').decode('utf-8')
                except UnicodeError as e:
                    print(f"ERRO ENCODING no campo {field_name}: {e}")
                    raise serializers.ValidationError({
                        field_name: f'Caracteres inválidos detectados: {str(e)}'
                    })
        
        # Validar departamentos se fornecido
        if 'departamentos_atendidos' in data:
            departamentos = data.get('departamentos_atendidos', [])
            if not departamentos:
                raise serializers.ValidationError({
                    'departamentos_atendidos': 'Pelo menos um departamento deve ser selecionado'
                })
        
        print(f"VALIDACAO OK - dados sanitizados")
        return data
    
    # === CREATE ===
    def create(self, validated_data):
        try:
            print(f"CREATE - campos recebidos: {list(validated_data.keys())}")
            
            # Extrair relacionamentos ManyToMany
            criadores_data = validated_data.pop('criadores', [])
            dependencias_data = validated_data.pop('dependencias', [])
            
            # Definir criado_por
            validated_data['criado_por'] = self.context['request'].user
            
            # Criar projeto com todos os campos
            projeto = ProjetoIA.objects.create(**validated_data)
            print(f"CREATE - projeto {projeto.id} criado com {len(validated_data)} campos")
            
            # Definir relacionamentos
            if criadores_data:
                projeto.criadores.set(criadores_data)
                print(f"CREATE - {len(criadores_data)} criadores definidos")
            if dependencias_data:
                projeto.dependencias.set(dependencias_data)
                print(f"CREATE - {len(dependencias_data)} dependncias definidas")
            
            return projeto
            
        except Exception as e:
            print(f"CREATE - erro detalhado: {e}")
            print(f"CREATE - tipo do erro: {type(e)}")
            if hasattr(e, '__traceback__'):
                import traceback
                traceback.print_exc()
            
            # Verificar se é um erro de encoding
            if 'encoding' in str(e).lower() or 'unicode' in str(e).lower():
                raise serializers.ValidationError({
                    'encoding_error': 'Erro de codificação de caracteres. Verifique se não há caracteres especiais inválidos.'
                })
            
            raise
    
    # === UPDATE ===
    def update(self, instance, validated_data):
        try:
            print(f" UPDATE projeto {instance.id} - campos recebidos: {list(validated_data.keys())}")
            
            # Extrair relacionamentos ManyToMany
            criadores_data = validated_data.pop('criadores', None)
            dependencias_data = validated_data.pop('dependencias', None)
            
            # === ATUALIZAR TODOS OS CAMPOS EXPLICITAMENTE ===
            
            # CAMPOS BSICOS
            if 'nome' in validated_data:
                instance.nome = validated_data['nome']
                print(f"   nome: {instance.nome}")
            
            if 'descricao' in validated_data:
                instance.descricao = validated_data['descricao']
                print(f"   descricao: {len(instance.descricao)} chars")
            
            if 'status' in validated_data:
                instance.status = validated_data['status']
                print(f"   status: {instance.status}")
            
            if 'link_projeto' in validated_data:
                instance.link_projeto = validated_data['link_projeto']
                print(f"   link_projeto: {instance.link_projeto}")
            
            if 'ferramentas_tecnologias' in validated_data:
                instance.ferramentas_tecnologias = validated_data['ferramentas_tecnologias']
                print(f"   ferramentas_tecnologias: {len(instance.ferramentas_tecnologias)} itens")
            
            if 'versao_atual' in validated_data:
                instance.versao_atual = validated_data['versao_atual']
                print(f"   versao_atual: {instance.versao_atual}")
            
            # CAMPOS ESTRATGICOS
            if 'tipo_projeto' in validated_data:
                instance.tipo_projeto = validated_data['tipo_projeto']
                print(f"   tipo_projeto: {instance.tipo_projeto}")
            
            if 'departamentos_atendidos' in validated_data:
                instance.departamentos_atendidos = validated_data['departamentos_atendidos']
                print(f"   departamentos_atendidos: {instance.departamentos_atendidos}")
            
            if 'prioridade' in validated_data:
                instance.prioridade = validated_data['prioridade']
                print(f"   prioridade: {instance.prioridade}")
            
            if 'complexidade' in validated_data:
                instance.complexidade = validated_data['complexidade']
                print(f"   complexidade: {instance.complexidade}")
            
            if 'usuarios_impactados' in validated_data:
                instance.usuarios_impactados = validated_data['usuarios_impactados']
                print(f"   usuarios_impactados: {instance.usuarios_impactados}")
            
            if 'frequencia_uso' in validated_data:
                instance.frequencia_uso = validated_data['frequencia_uso']
                print(f"   frequencia_uso: {instance.frequencia_uso}")
            
            # CAMPOS DE TEMPO
            # horas_totais  calculado automaticamente a partir do breakdown
            
            if 'horas_desenvolvimento' in validated_data:
                instance.horas_desenvolvimento = validated_data['horas_desenvolvimento']
                print(f"   horas_desenvolvimento: {instance.horas_desenvolvimento}")
            
            if 'horas_testes' in validated_data:
                instance.horas_testes = validated_data['horas_testes']
                print(f"   horas_testes: {instance.horas_testes}")
            
            if 'horas_documentacao' in validated_data:
                instance.horas_documentacao = validated_data['horas_documentacao']
                print(f"   horas_documentacao: {instance.horas_documentacao}")
            
            if 'horas_deploy' in validated_data:
                instance.horas_deploy = validated_data['horas_deploy']
                print(f"   horas_deploy: {instance.horas_deploy}")
            
            # CAMPOS FINANCEIROS NOVOS
            if 'custo_hora_empresa' in validated_data:
                instance.custo_hora_empresa = validated_data['custo_hora_empresa']
                print(f"   custo_hora_empresa: {instance.custo_hora_empresa}")
            
            if 'custo_apis_mensal' in validated_data:
                instance.custo_apis_mensal = validated_data['custo_apis_mensal']
                print(f"   custo_apis_mensal: {instance.custo_apis_mensal}")
            
            if 'lista_ferramentas' in validated_data:
                instance.lista_ferramentas = validated_data['lista_ferramentas']
                print(f"   lista_ferramentas: {len(instance.lista_ferramentas)} ferramentas")
            
            if 'custo_treinamentos' in validated_data:
                instance.custo_treinamentos = validated_data['custo_treinamentos']
                print(f"   custo_treinamentos: {instance.custo_treinamentos}")
            
            if 'custo_setup_inicial' in validated_data:
                instance.custo_setup_inicial = validated_data['custo_setup_inicial']
                print(f"   custo_setup_inicial: {instance.custo_setup_inicial}")
            
            if 'custo_consultoria' in validated_data:
                instance.custo_consultoria = validated_data['custo_consultoria']
                print(f"   custo_consultoria: {instance.custo_consultoria}")
            
            if 'horas_economizadas_mes' in validated_data:
                instance.horas_economizadas_mes = validated_data['horas_economizadas_mes']
                print(f"   horas_economizadas_mes: {instance.horas_economizadas_mes}")
            
            if 'valor_monetario_economizado_mes' in validated_data:
                instance.valor_monetario_economizado_mes = validated_data['valor_monetario_economizado_mes']
                print(f"   valor_monetario_economizado_mes: {instance.valor_monetario_economizado_mes}")
            
            if 'data_break_even' in validated_data:
                instance.data_break_even = validated_data['data_break_even']
                print(f"   data_break_even: {instance.data_break_even}")
            
            if 'nivel_autonomia' in validated_data:
                instance.nivel_autonomia = validated_data['nivel_autonomia']
                print(f"   nivel_autonomia: {instance.nivel_autonomia}")
            
            # CAMPOS DE DOCUMENTAO
            if 'documentacao_tecnica' in validated_data:
                instance.documentacao_tecnica = validated_data['documentacao_tecnica']
                print(f"   documentacao_tecnica: {len(instance.documentacao_tecnica or '')} chars")
            
            if 'licoes_aprendidas' in validated_data:
                instance.licoes_aprendidas = validated_data['licoes_aprendidas']
                print(f"   licoes_aprendidas: {len(instance.licoes_aprendidas or '')} chars")
            
            if 'proximos_passos' in validated_data:
                instance.proximos_passos = validated_data['proximos_passos']
                print(f"   proximos_passos: {len(instance.proximos_passos or '')} chars")
            
            if 'data_revisao' in validated_data:
                instance.data_revisao = validated_data['data_revisao']
                print(f"   data_revisao: {instance.data_revisao}")
            
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
            
            # SALVAR TODAS AS ALTERAES
            instance.save()
            print(f" UPDATE - todos os campos salvos no banco")
            
            # ATUALIZAR RELACIONAMENTOS
            if criadores_data is not None:
                instance.criadores.set(criadores_data)
                print(f" UPDATE - {len(criadores_data)} criadores atualizados")
            
            if dependencias_data is not None:
                instance.dependencias.set(dependencias_data)
                print(f" UPDATE - {len(dependencias_data)} dependncias atualizadas")
            
            # VERIFICAR SE REALMENTE FOI SALVO
            instance.refresh_from_db()
            print(f" UPDATE - projeto {instance.id} totalmente atualizado")
            
            return instance
            
        except Exception as e:
            print(f" UPDATE - erro detalhado: {e}")
            print(f" UPDATE - tipo do erro: {type(e)}")
            import traceback
            traceback.print_exc()
            
            # Verificar se é um erro de encoding
            if 'encoding' in str(e).lower() or 'unicode' in str(e).lower():
                raise serializers.ValidationError({
                    'encoding_error': 'Erro de codificação de caracteres. Verifique se não há caracteres especiais inválidos.'
                })
            
            # Verificar se é um erro de campo específico
            if 'IntegrityError' in str(type(e)):
                raise serializers.ValidationError({
                    'database_error': 'Erro de integridade no banco de dados. Verifique se todos os campos obrigatórios estão preenchidos.'
                })
            
            raise

class ProjetoIACreateSerializer(serializers.ModelSerializer):
    """Serializer para criao rpida de projetos"""
    criadores_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=User.objects.all(),
        write_only=True,
        source='criadores',
        required=False
    )
    
    # === CAMPOS PERSONALIZADOS ===
    data_revisao = FlexibleDateField(required=False, allow_null=True)
    data_break_even = FlexibleDateField(required=False, allow_null=True)
    
    class Meta:
        model = ProjetoIA
        fields = [
            # Campos bsicos
            'nome', 'descricao', 'tipo_projeto', 'departamentos_atendidos',
            'prioridade', 'complexidade', 'criadores_ids',
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
            
            # Documentao
            'documentacao_tecnica', 'documentacao_apoio', 'licoes_aprendidas', 'proximos_passos', 'data_revisao'
        ]
    
    def validate(self, data):
        """Aplicar as mesmas validações do DetailSerializer"""
        print(f"CREATE VALIDACAO - dados recebidos: {list(data.keys())}")
        
        # CORREÇÃO: Aplicar as mesmas sanitizações
        
        # 1. Limpar ferramentas_tecnologias
        if 'ferramentas_tecnologias' in data:
            ferramentas = data.get('ferramentas_tecnologias', [])
            if isinstance(ferramentas, list):
                ferramentas_limpas = [f.strip() for f in ferramentas if f and str(f).strip()]
                data['ferramentas_tecnologias'] = ferramentas_limpas
                print(f"CREATE - ferramentas_tecnologias sanitizadas: {ferramentas_limpas}")
            else:
                data['ferramentas_tecnologias'] = []
        
        # 2. Sanitizar lista_ferramentas
        if 'lista_ferramentas' in data:
            lista = data.get('lista_ferramentas', [])
            if isinstance(lista, list):
                lista_limpa = []
                for item in lista:
                    if isinstance(item, dict):
                        nome = str(item.get('nome', '')).strip()
                        valor = item.get('valor', 0)
                        if nome:
                            try:
                                valor = float(valor) if valor else 0
                                lista_limpa.append({'nome': nome, 'valor': valor})
                            except (ValueError, TypeError):
                                lista_limpa.append({'nome': nome, 'valor': 0})
                data['lista_ferramentas'] = lista_limpa
                print(f"CREATE - lista_ferramentas sanitizada: {lista_limpa}")
            else:
                data['lista_ferramentas'] = []
        
        # 3. Validar campos numéricos
        campos_numericos = [
            'custo_apis_mensal', 'custo_hora_empresa', 'horas_desenvolvimento',
            'horas_testes', 'horas_documentacao', 'horas_deploy',
            'custo_treinamentos', 'custo_setup_inicial', 'custo_consultoria',
            'horas_economizadas_mes', 'valor_monetario_economizado_mes'
        ]
        
        for campo in campos_numericos:
            if campo in data:
                try:
                    valor = data[campo]
                    if valor is None or valor == '':
                        data[campo] = 0
                    else:
                        data[campo] = float(valor) if valor else 0
                except (ValueError, TypeError) as e:
                    print(f"CREATE ERRO campo numerico {campo}: {e}")
                    data[campo] = 0
        
        # 4. Validar campo de data
        if 'data_revisao' in data:
            data_revisao = data.get('data_revisao')
            if data_revisao == '' or data_revisao == 'null' or not data_revisao:
                data['data_revisao'] = None
        
        print(f"CREATE VALIDACAO OK - dados sanitizados")
        return data
    
    def create(self, validated_data):
        try:
            print(f"CREATE SERIALIZER - campos recebidos: {list(validated_data.keys())}")
            
            criadores_data = validated_data.pop('criadores', [])
            validated_data['criado_por'] = self.context['request'].user
            
            # Criar projeto com dados sanitizados
            projeto = ProjetoIA.objects.create(**validated_data)
            print(f"CREATE SERIALIZER - projeto {projeto.id} criado com sucesso")
            
            if criadores_data:
                projeto.criadores.set(criadores_data)
                print(f"CREATE SERIALIZER - {len(criadores_data)} criadores definidos")
            
            return projeto
        except Exception as e:
            print(f"CREATE SERIALIZER - erro: {e}")
            import traceback
            traceback.print_exc()
            raise

class NovaVersaoSerializer(serializers.ModelSerializer):
    """Serializer para registrar nova verso"""
    
    class Meta:
        model = VersaoProjeto
        fields = ['versao', 'motivo_mudanca']
    
    def validate_versao(self, value):
        projeto = self.context['projeto']
        if VersaoProjeto.objects.filter(projeto=projeto, versao=value).exists():
            raise serializers.ValidationError("Esta verso j existe para o projeto")
        return value
    
    def create(self, validated_data):
        projeto = self.context['projeto']
        validated_data['projeto'] = projeto
        validated_data['responsavel'] = self.context['request'].user
        validated_data['versao_anterior'] = projeto.versao_atual
        
        # Criar nova verso
        versao = VersaoProjeto.objects.create(**validated_data)
        
        # Atualizar verso atual do projeto
        projeto.versao_atual = validated_data['versao']
        projeto.save()
        
        return versao

class DashboardStatsSerializer(serializers.Serializer):
    """Serializer para estatsticas do dashboard"""
    total_projetos = serializers.IntegerField()
    projetos_ativos = serializers.IntegerField()
    projetos_arquivados = serializers.IntegerField()
    projetos_manutencao = serializers.IntegerField()
    horas_totais_investidas = serializers.DecimalField(max_digits=10, decimal_places=2)
    
    # Estatsticas financeiras (s aparecem se tiver permisso)
    economia_mensal_total = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    roi_medio = serializers.DecimalField(max_digits=8, decimal_places=2, required=False)
    economia_acumulada_total = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    
    # Distribuies
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
    
    # Filtros financeiros (s aplicados se tiver permisso)
    roi_min = serializers.DecimalField(max_digits=8, decimal_places=2, required=False)
    roi_max = serializers.DecimalField(max_digits=8, decimal_places=2, required=False)
    economia_mensal_min = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)


# ===== SERIALIZERS PARA WHATSAPP BUSINESS =====

class WhatsAppBusinessAccountSerializer(serializers.ModelSerializer):
    """Serializer para WhatsApp Business Account (WABA) - VERSÃO SEGURA"""
    responsavel_nome = serializers.CharField(source='responsavel.get_full_name', read_only=True)
    total_numeros = serializers.SerializerMethodField()
    numeros_monitorados = serializers.SerializerMethodField()
    status_sincronizacao = serializers.SerializerMethodField()
    
    # Campo especial para receber access_token não criptografado
    access_token = serializers.CharField(write_only=True, required=True, help_text="Token original da Meta API")
    
    class Meta:
        model = WhatsAppBusinessAccount
        fields = [
            'id', 'nome', 'whatsapp_business_account_id', 'access_token_encrypted', 'access_token',
            'webhook_verify_token', 'ativo', 'ultima_sincronizacao',
            'erro_ultima_sincronizacao', 'responsavel', 'responsavel_nome',
            'criado_em', 'atualizado_em', 'total_numeros', 'numeros_monitorados',
            'status_sincronizacao'
        ]
        read_only_fields = ['criado_em', 'atualizado_em', 'ultima_sincronizacao', 
                           'erro_ultima_sincronizacao', 'responsavel_nome', 'responsavel']
        extra_kwargs = {
            'access_token_encrypted': {'write_only': True, 'required': False}
        }
    
    def validate_nome(self, value):
        """Validar nome da WhatsApp Business Account"""
        if not value or not value.strip():
            raise serializers.ValidationError("Nome é obrigatório")
        if len(value.strip()) < 3:
            raise serializers.ValidationError("Nome deve ter pelo menos 3 caracteres")
        # Sanitizar HTML e caracteres especiais
        import html
        return html.escape(value.strip())
    
    def validate_whatsapp_business_account_id(self, value):
        """Validar WABA ID"""
        if not value or not value.strip():
            raise serializers.ValidationError("WhatsApp Business Account ID (WABA ID) é obrigatório")
        
        # Validar formato (apenas números e tamanho esperado)
        import re
        if not re.match(r'^\d{15,20}$', value.strip()):
            raise serializers.ValidationError(
                "WABA ID deve conter apenas números e ter entre 15-20 dígitos"
            )
        return value.strip()
    
    def validate_access_token(self, value):
        """Validar Access Token da Meta API"""
        if not value or not value.strip():
            raise serializers.ValidationError("Access Token é obrigatório")
        
        # Validar formato básico do token Meta
        import re
        # Tokens Meta geralmente seguem padrões específicos
        if not re.match(r'^[A-Za-z0-9_\-|]+$', value.strip()):
            raise serializers.ValidationError(
                "Formato de Access Token inválido - deve conter apenas letras, números, _ - |"
            )
        
        if len(value.strip()) < 50:
            raise serializers.ValidationError("Access Token muito curto - verifique se está completo")
        
        return value.strip()
    
    def validate_webhook_verify_token(self, value):
        """Validar token de webhook"""
        if value and len(value.strip()) > 0:
            # Sanitizar e validar se fornecido
            import html
            return html.escape(value.strip())
        return value
    
    def create(self, validated_data):
        """Criar WhatsApp Business Account com criptografia de token"""
        access_token = validated_data.pop('access_token', None)
        
        if access_token:
            try:
                from .services import WhatsAppMetaAPIService
                service = WhatsAppMetaAPIService()
                validated_data['access_token_encrypted'] = service._encrypt_token(access_token)
            except ImportError as e:
                raise serializers.ValidationError(f"Erro na configuração de segurança: {str(e)}")
        
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        """Atualizar WhatsApp Business Account com recriptografia se necessário"""
        access_token = validated_data.pop('access_token', None)
        
        if access_token:
            try:
                from .services import WhatsAppMetaAPIService
                service = WhatsAppMetaAPIService()
                validated_data['access_token_encrypted'] = service._encrypt_token(access_token)
            except ImportError as e:
                raise serializers.ValidationError(f"Erro na configuração de segurança: {str(e)}")
        
        return super().update(instance, validated_data)
    
    def get_total_numeros(self, obj):
        """Conta total de números cadastrados"""
        return obj.phone_numbers.count()
    
    def get_numeros_monitorados(self, obj):
        """Conta números com monitoramento ativo"""
        return obj.phone_numbers.filter(monitoramento_ativo=True).count()
    
    def get_status_sincronizacao(self, obj):
        """Retorna status da sincronização"""
        if not obj.ultima_sincronizacao:
            return 'nunca_sincronizado'
        elif obj.erro_ultima_sincronizacao:
            return 'erro'
        else:
            from django.utils import timezone
            from datetime import timedelta
            if timezone.now() - obj.ultima_sincronizacao > timedelta(hours=2):
                return 'desatualizado'
            return 'ok'


# Compatibilidade temporária
BusinessManagerSerializer = WhatsAppBusinessAccountSerializer


class WhatsAppPhoneNumberCreateSerializer(serializers.ModelSerializer):
    """Serializer para criação de números WhatsApp - CORRIGIDO PARA O FRONTEND"""
    
    # Campo para access_token (será usado para criar/buscar WABA)
    access_token = serializers.CharField(write_only=True, help_text="Token de acesso da Meta API")
    
    # Campo para converter datetime-local para date
    token_expira_em = serializers.CharField(
        required=False, 
        allow_blank=True, 
        help_text="Data de expiração do token no formato datetime-local ou YYYY-MM-DD"
    )
    
    class Meta:
        model = WhatsAppPhoneNumber
        fields = [
            # Campos que o frontend realmente envia
            'phone_number_id', 'access_token', 'bm_nome_customizado', 
            'pais_nome_customizado', 'perfil', 'token_expira_em'
        ]
    
    def validate_phone_number_id(self, value):
        """Validar phone_number_id"""
        if not value or not value.strip():
            raise serializers.ValidationError("Phone Number ID é obrigatório")
        
        # Verificar se já existe
        if WhatsAppPhoneNumber.objects.filter(phone_number_id=value.strip()).exists():
            raise serializers.ValidationError("Este Phone Number ID já está cadastrado")
        
        return value.strip()
    
    def validate_access_token(self, value):
        """Validar access token"""
        if not value or not value.strip():
            raise serializers.ValidationError("Access Token é obrigatório")
        
        if len(value.strip()) < 10:  # Mais flexível para desenvolvimento
            raise serializers.ValidationError("Access Token muito curto - verifique se está completo")
        
        return value.strip()
    
    def validate_token_expira_em(self, value):
        """Converter datetime-local para date"""
        if not value or value.strip() == '':
            return None
        
        from datetime import datetime, date
        
        try:
            # Tentar formato datetime-local primeiro (2025-09-11T21:55)
            if 'T' in value:
                datetime_obj = datetime.fromisoformat(value.replace('T', ' '))
                return datetime_obj.date()
            # Tentar formato date (2025-09-11)
            else:
                return datetime.strptime(value, '%Y-%m-%d').date()
        except ValueError as e:
            raise serializers.ValidationError(
                f"Formato de data inválido. Use YYYY-MM-DD ou YYYY-MM-DDTHH:MM. Erro: {str(e)}"
            )
    
    def create(self, validated_data):
        """Criar número WhatsApp - BUSCA DADOS REAIS DA API"""
        access_token = validated_data.pop('access_token')
        phone_number_id = validated_data.get('phone_number_id')
        
        try:
            from .models import WhatsAppBusinessAccount
            from .services import WhatsAppMetaAPIService
            api_service = WhatsAppMetaAPIService()
            
            logger.info(f"🚀 CRIANDO NÚMERO: {phone_number_id}")
            
            # ===== 1. BUSCAR DADOS REAIS DA API PRIMEIRO =====
            logger.info(f"📡 Buscando dados reais da WhatsApp API para {phone_number_id}...")
            
            sucesso, dados_api = api_service.obter_detalhes_numero(phone_number_id, access_token)
            
            if not sucesso:
                error_msg = dados_api.get('error', 'Erro desconhecido ao buscar dados da API')
                logger.error(f"❌ Erro na API: {error_msg}")
                raise serializers.ValidationError({
                    'phone_number_id': f'Erro ao buscar dados do WhatsApp: {error_msg}',
                    'api_error': dados_api
                })
            
            logger.info(f"✅ Dados obtidos da API: {dados_api}")
            
            # ===== 2. EXTRAIR DADOS REAIS DA API =====
            display_phone_number = dados_api.get('display_phone_number', phone_number_id)
            verified_name = dados_api.get('verified_name', '')
            quality_rating = api_service._mapear_quality_rating(dados_api.get('quality_rating'))
            messaging_limit_tier = api_service._mapear_messaging_limit(dados_api.get('messaging_limit_tier'))
            status_numero = api_service._mapear_status(dados_api.get('status'))
            
            logger.info(f"📋 Dados processados:")
            logger.info(f"   - Número formatado: {display_phone_number}")
            logger.info(f"   - Nome verificado: {verified_name}")
            logger.info(f"   - Qualidade: {quality_rating}")
            logger.info(f"   - Limite: {messaging_limit_tier}")
            logger.info(f"   - Status: {status_numero}")
            
            # ===== 3. BUSCAR OU OBTER WABA ID REAL DA API =====
            # Primeiro vamos tentar obter o WABA ID real da API
            waba_id_real = None
            
            # Se a API retornou um WABA ID, usá-lo
            if 'whatsapp_business_account_id' in dados_api:
                waba_id_real = dados_api['whatsapp_business_account_id']
                logger.info(f"🏢 WABA ID obtido da API: {waba_id_real}")
            else:
                # Tentar obter WABA ID através de uma segunda chamada à API (listar WAbAs do token)
                try:
                    url_wabas = f"{api_service.base_url}/me/businesses"
                    response_wabas = api_service._make_request(url_wabas, access_token)
                    
                    if 'data' in response_wabas and len(response_wabas['data']) > 0:
                        # Pegar o primeiro business account
                        primeiro_business = response_wabas['data'][0]
                        if 'whatsapp_business_accounts' in primeiro_business:
                            wabas = primeiro_business['whatsapp_business_accounts'].get('data', [])
                            if wabas:
                                waba_id_real = wabas[0]['id']
                                logger.info(f"🏢 WABA ID obtido via businesses: {waba_id_real}")
                except Exception as waba_error:
                    logger.warning(f"⚠️ Não foi possível obter WABA ID: {waba_error}")
            
            # Se ainda não temos WABA ID, usar um temporário
            if not waba_id_real:
                waba_id_real = f'temp_{phone_number_id}'
                logger.info(f"🔄 Usando WABA ID temporário: {waba_id_real}")
            
            # ===== 4. CRIAR OU BUSCAR WHATSAPP BUSINESS ACCOUNT =====
            nome_waba = validated_data.get('bm_nome_customizado', f'WABA para {display_phone_number}')
            
            # Tentar buscar por WABA ID real primeiro
            waba = None
            if waba_id_real and not waba_id_real.startswith('temp_'):
                try:
                    waba = WhatsAppBusinessAccount.objects.get(
                        whatsapp_business_account_id=waba_id_real
                    )
                    logger.info(f"🔍 WABA encontrada existente: {waba.nome}")
                except WhatsAppBusinessAccount.DoesNotExist:
                    pass
            
            # Se não encontrou, criar nova
            if not waba:
                waba, created = WhatsAppBusinessAccount.objects.get_or_create(
                    nome=nome_waba,
                    defaults={
                        'whatsapp_business_account_id': waba_id_real,
                        'access_token_encrypted': api_service._encrypt_token(access_token),
                        'responsavel': self.context['request'].user,
                        'ativo': True
                    }
                )
                logger.info(f"🆕 WABA {'criada' if created else 'reutilizada'}: {waba.nome}")
            
            # ===== 5. PREPARAR DADOS COMPLETOS COM INFORMAÇÕES REAIS DA API =====
            validated_data['whatsapp_business_account'] = waba
            validated_data['display_phone_number'] = display_phone_number  # ✅ NÚMERO REAL
            validated_data['verified_name'] = verified_name  # ✅ NOME REAL
            validated_data['quality_rating'] = quality_rating  # ✅ QUALIDADE REAL
            validated_data['messaging_limit_tier'] = messaging_limit_tier  # ✅ LIMITE REAL
            validated_data['status'] = status_numero  # ✅ STATUS REAL
            validated_data['detalhes_api'] = dados_api  # ✅ DADOS COMPLETOS DA API
            validated_data['ultima_verificacao'] = timezone.now()  # ✅ TIMESTAMP ATUAL
            
            # Campos de configuração
            validated_data.setdefault('monitoramento_ativo', True)
            validated_data.setdefault('frequencia_verificacao_minutos', 60)
            
            logger.info(f"💾 Criando número com dados reais da API...")
            
            # ===== 6. CRIAR O NÚMERO COM DADOS REAIS =====
            numero = super().create(validated_data)
            
            logger.info(f"✅ NÚMERO CRIADO COM SUCESSO:")
            logger.info(f"   - ID: {numero.id}")
            logger.info(f"   - Phone Number ID: {numero.phone_number_id}")
            logger.info(f"   - Número formatado: {numero.display_phone_number}")
            logger.info(f"   - Nome verificado: {numero.verified_name}")
            logger.info(f"   - Qualidade: {numero.get_quality_rating_display()}")
            logger.info(f"   - Limite: {numero.get_messaging_limit_tier_display()}")
            logger.info(f"   - Status: {numero.get_status_display()}")
            
            return numero
            
        except serializers.ValidationError:
            # Re-raise validation errors
            raise
            
        except Exception as e:
            # Log detalhado do erro
            import traceback
            error_trace = traceback.format_exc()
            logger.error(f"❌ ERRO AO CRIAR NÚMERO WHATSAPP:")
            logger.error(f"   - Phone Number ID: {phone_number_id}")
            logger.error(f"   - Erro: {str(e)}")
            logger.error(f"   - Stack trace: {error_trace}")
            
            raise serializers.ValidationError({
                'non_field_errors': f'Erro ao criar número WhatsApp: {str(e)}',
                'phone_number_id': phone_number_id,
                'error_details': str(e)
            })


class WhatsAppPhoneNumberSerializer(serializers.ModelSerializer):
    """Serializer para números WhatsApp - VERSÃO CORRIGIDA PARA COMPATIBILIDADE FRONTEND"""
    whatsapp_business_account_id = serializers.IntegerField(source='whatsapp_business_account.id', read_only=True)
    whatsapp_business_account_nome = serializers.CharField(source='whatsapp_business_account.nome', read_only=True)
    business_manager_nome = serializers.CharField(source='business_manager.nome', read_only=True)  # Compatibilidade
    quality_rating_display = serializers.CharField(source='get_quality_rating_display', read_only=True)
    messaging_limit_display = serializers.CharField(source='get_messaging_limit_tier_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    tempo_sem_verificacao = serializers.SerializerMethodField()
    alertas_pendentes = serializers.SerializerMethodField()
    
    # ===== CAMPOS ADICIONAIS PARA COMPATIBILIDADE COM FRONTEND =====
    country_flag = serializers.SerializerMethodField()
    country_name = serializers.SerializerMethodField()  
    messaging_limit = serializers.CharField(source='messaging_limit_tier', read_only=True)
    business_manager = serializers.SerializerMethodField()
    
    class Meta:
        model = WhatsAppPhoneNumber
        fields = [
            'id', 'whatsapp_business_account_id', 'whatsapp_business_account_nome', 
            'business_manager_nome',  # Compatibilidade
            'phone_number_id', 'display_phone_number', 'verified_name', 'quality_rating',
            'quality_rating_display', 'messaging_limit_tier', 'messaging_limit_display',
            'status', 'status_display', 'monitoramento_ativo', 
            'frequencia_verificacao_minutos', 'detalhes_api', 
            # Campos customizados
            'bm_nome_customizado', 'pais_nome_customizado', 'perfil', 'token_expira_em',
            'criado_em', 'atualizado_em', 'ultima_verificacao', 'tempo_sem_verificacao',
            'alertas_pendentes',
            # NOVOS CAMPOS PARA COMPATIBILIDADE COM FRONTEND
            'country_flag', 'country_name', 'messaging_limit', 'business_manager'
        ]
        read_only_fields = ['criado_em', 'atualizado_em', 'ultima_verificacao',
                           'whatsapp_business_account_id', 'whatsapp_business_account_nome', 'business_manager_nome',
                           'quality_rating_display', 'messaging_limit_display', 'status_display',
                           'tempo_sem_verificacao', 'alertas_pendentes', 'country_flag', 'country_name', 
                           'messaging_limit', 'business_manager']
    
    def get_tempo_sem_verificacao(self, obj):
        """Calcula tempo desde última verificação em minutos"""
        if not obj.ultima_verificacao:
            return None
        from django.utils import timezone
        delta = timezone.now() - obj.ultima_verificacao
        return int(delta.total_seconds() / 60)
    
    def get_alertas_pendentes(self, obj):
        """Conta alertas não resolvidos"""
        return obj.alerts.filter(resolvido=False).count()
    
    # ===== MÉTODOS PARA COMPATIBILIDADE COM FRONTEND =====
    
    def get_country_flag(self, obj):
        """Retorna emoji da bandeira do país baseado no nome customizado ou número"""
        try:
            # Mapeamento de países para emojis de bandeira
            pais_flags = {
                'colombia': '🇨🇴',
                'colômbia': '🇨🇴',
                'chile': '🇨🇱',
                'mexico': '🇲🇽',
                'méxico': '🇲🇽',
                'polonia': '🇵🇱',
                'polônia': '🇵🇱',
                'romenia': '🇷🇴',
                'romênia': '🇷🇴',
                'espanha': '🇪🇸',
                'italia': '🇮🇹',
                'itália': '🇮🇹',
                'brasil': '🇧🇷',
                'argentina': '🇦🇷',
                'peru': '🇵🇪',
                'equador': '🇪🇨',
                'uruguai': '🇺🇾',
                'paraguai': '🇵🇾',
                'bolivia': '🇧🇴',
                'bolívia': '🇧🇴',
                'venezuela': '🇻🇪'
            }
            
            # Se tiver nome customizado, usar primeiro
            if obj.pais_nome_customizado:
                nome_lower = obj.pais_nome_customizado.lower().strip()
                flag = pais_flags.get(nome_lower)
                if flag:
                    return flag
            
            # Fallback: tentar detectar pelo código do país no número
            numero = obj.display_phone_number.replace('+', '').replace('-', '').replace(' ', '').replace('(', '').replace(')', '')
            
            # Códigos de país comuns
            if numero.startswith('57'):  # Colombia
                return '🇨🇴'
            elif numero.startswith('56'):  # Chile
                return '🇨🇱'
            elif numero.startswith('52'):  # Mexico
                return '🇲🇽'
            elif numero.startswith('48'):  # Polonia
                return '🇵🇱'
            elif numero.startswith('40'):  # Romenia
                return '🇷🇴'
            elif numero.startswith('34'):  # Espanha
                return '🇪🇸'
            elif numero.startswith('39'):  # Italia
                return '🇮🇹'
            elif numero.startswith('55'):  # Brasil
                return '🇧🇷'
            elif numero.startswith('54'):  # Argentina
                return '🇦🇷'
            elif numero.startswith('51'):  # Peru
                return '🇵🇪'
            elif numero.startswith('593'):  # Equador
                return '🇪🇨'
            elif numero.startswith('598'):  # Uruguai
                return '🇺🇾'
            elif numero.startswith('595'):  # Paraguai
                return '🇵🇾'
            elif numero.startswith('591'):  # Bolivia
                return '🇧🇴'
            elif numero.startswith('58'):  # Venezuela
                return '🇻🇪'
            else:
                return '🌍'  # Emoji genérico para países não identificados
                
        except Exception as e:
            print(f"Erro em get_country_flag para numero {obj.id}: {e}")
            return '🌍'
    
    def get_country_name(self, obj):
        """Retorna nome do país (usa customizado se disponível)"""
        try:
            # Se tiver nome customizado, usar primeiro
            if obj.pais_nome_customizado and obj.pais_nome_customizado.strip():
                return obj.pais_nome_customizado.strip()
            
            # Fallback: detectar pelo código do país no número
            numero = obj.display_phone_number.replace('+', '').replace('-', '').replace(' ', '').replace('(', '').replace(')', '')
            
            # Códigos de país comuns para nomes
            if numero.startswith('57'):
                return 'Colômbia'
            elif numero.startswith('56'):
                return 'Chile'
            elif numero.startswith('52'):
                return 'México'
            elif numero.startswith('48'):
                return 'Polônia'
            elif numero.startswith('40'):
                return 'Romênia'
            elif numero.startswith('34'):
                return 'Espanha'
            elif numero.startswith('39'):
                return 'Itália'
            elif numero.startswith('55'):
                return 'Brasil'
            elif numero.startswith('54'):
                return 'Argentina'
            elif numero.startswith('51'):
                return 'Peru'
            elif numero.startswith('593'):
                return 'Equador'
            elif numero.startswith('598'):
                return 'Uruguai'
            elif numero.startswith('595'):
                return 'Paraguai'
            elif numero.startswith('591'):
                return 'Bolívia'
            elif numero.startswith('58'):
                return 'Venezuela'
            else:
                return 'País não identificado'
                
        except Exception as e:
            print(f"Erro em get_country_name para numero {obj.id}: {e}")
            return 'País não identificado'
    
    def get_business_manager(self, obj):
        """Retorna dados da business manager para compatibilidade"""
        try:
            waba = obj.whatsapp_business_account
            
            # Se tiver nome customizado, usar ele para bm_nome_customizado
            bm_nome_customizado = obj.bm_nome_customizado if obj.bm_nome_customizado else waba.nome
            
            return {
                'id': waba.id,
                'nome': waba.nome,
                'bm_nome_customizado': bm_nome_customizado,
                'whatsapp_business_account_id': waba.whatsapp_business_account_id,
                'ativo': waba.ativo,
                'ultima_sincronizacao': waba.ultima_sincronizacao.isoformat() if waba.ultima_sincronizacao else None
            }
        except Exception as e:
            print(f"Erro em get_business_manager para numero {obj.id}: {e}")
            return {
                'id': None,
                'nome': 'Erro ao carregar',
                'bm_nome_customizado': 'Erro ao carregar',
                'whatsapp_business_account_id': None,
                'ativo': False,
                'ultima_sincronizacao': None
            }


class QualityHistorySerializer(serializers.ModelSerializer):
    """Serializer para histórico de qualidade"""
    phone_number_display = serializers.CharField(source='phone_number.display_phone_number', read_only=True)
    quality_rating_display = serializers.CharField(source='get_quality_rating_display', read_only=True)
    messaging_limit_display = serializers.CharField(source='get_messaging_limit_tier_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = QualityHistory
        fields = [
            'id', 'phone_number', 'phone_number_display', 'quality_rating',
            'quality_rating_display', 'messaging_limit_tier', 'messaging_limit_display',
            'status', 'status_display', 'quality_rating_anterior',
            'messaging_limit_tier_anterior', 'status_anterior',
            'houve_mudanca_qualidade', 'houve_mudanca_limite',
            'houve_mudanca_status', 'dados_api_completos', 'capturado_em'
        ]
        read_only_fields = ['capturado_em', 'phone_number_display',
                           'quality_rating_display', 'messaging_limit_display',
                           'status_display']


class QualityAlertSerializer(serializers.ModelSerializer):
    """Serializer para alertas de qualidade"""
    phone_number_display = serializers.CharField(source='phone_number.display_phone_number', read_only=True)
    alert_type_display = serializers.CharField(source='get_alert_type_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    usuario_que_visualizou_nome = serializers.CharField(source='usuario_que_visualizou.get_full_name', read_only=True)
    usuario_que_resolveu_nome = serializers.CharField(source='usuario_que_resolveu.get_full_name', read_only=True)
    tempo_desde_criacao = serializers.SerializerMethodField()
    
    class Meta:
        model = QualityAlert
        fields = [
            'id', 'phone_number', 'phone_number_display', 'quality_history',
            'alert_type', 'alert_type_display', 'priority', 'priority_display',
            'titulo', 'descricao', 'valor_anterior', 'valor_atual',
            'visualizado', 'resolvido', 'usuario_que_visualizou',
            'usuario_que_visualizou_nome', 'data_visualizacao',
            'usuario_que_resolveu', 'usuario_que_resolveu_nome',
            'data_resolucao', 'comentario_resolucao', 'notificacao_enviada',
            'criado_em', 'tempo_desde_criacao'
        ]
        read_only_fields = ['criado_em', 'phone_number_display', 'alert_type_display',
                           'priority_display', 'usuario_que_visualizou_nome',
                           'usuario_que_resolveu_nome', 'tempo_desde_criacao']
    
    def get_tempo_desde_criacao(self, obj):
        """Calcula tempo desde criação do alerta"""
        from django.utils import timezone
        delta = timezone.now() - obj.criado_em
        horas = int(delta.total_seconds() / 3600)
        if horas < 1:
            minutos = int(delta.total_seconds() / 60)
            return f"{minutos} min atrás"
        elif horas < 24:
            return f"{horas}h atrás"
        else:
            dias = delta.days
            return f"{dias} dia(s) atrás"


class MarcarAlertaResolvidoSerializer(serializers.Serializer):
    """Serializer para marcar alerta como resolvido"""
    comentario_resolucao = serializers.CharField(
        required=False, 
        allow_blank=True,
        help_text="Comentário sobre como o alerta foi resolvido"
    )


class SincronizarMetaAPISerializer(serializers.Serializer):
    """Serializer para sincronização com Meta API"""
    whatsapp_business_account_id = serializers.IntegerField(
        required=False,
        help_text="ID da WhatsApp Business Account específica. Se não fornecido, sincroniza todas ativas"
    )
    # Mantém compatibilidade
    business_manager_id = serializers.IntegerField(
        required=False,
        help_text="(LEGADO) ID da Business Manager específica. Use whatsapp_business_account_id"
    )
    force_update = serializers.BooleanField(
        default=False,
        help_text="Força atualização mesmo que tenha sido sincronizada recentemente"
    )
    
    def validate(self, data):
        # Se business_manager_id for fornecido mas whatsapp_business_account_id não, usar o primeiro
        if data.get('business_manager_id') and not data.get('whatsapp_business_account_id'):
            data['whatsapp_business_account_id'] = data['business_manager_id']
        return data


# ===== SERIALIZERS PARA NICOCHAT =====

class NicochatWorkspaceSerializer(serializers.ModelSerializer):
    """Serializer para Workspaces NicoChat - SEGURO COM CONTROLE DE LIMITES"""

    # Campo write-only para receber API key não criptografada
    api_key = serializers.CharField(
        write_only=True,
        required=False,
        help_text="API Key do NicoChat em texto plano (apenas para criação/atualização)"
    )

    # Informações do usuário (read-only)
    usuario_nome = serializers.CharField(
        source='usuario.get_full_name',
        read_only=True
    )

    # Campos calculados
    contatos_atuais = serializers.SerializerMethodField()
    percentual_utilizado = serializers.SerializerMethodField()
    limite_atingido = serializers.SerializerMethodField()

    class Meta:
        model = NicochatWorkspace
        fields = [
            'id', 'nome', 'api_key', 'api_key_encrypted', 'limite_contatos',
            'usuario', 'usuario_nome', 'ativo',
            'criado_em', 'atualizado_em',
            'contatos_atuais', 'percentual_utilizado', 'limite_atingido'
        ]
        read_only_fields = ['id', 'usuario', 'usuario_nome', 'criado_em', 'atualizado_em']
        extra_kwargs = {
            # API key criptografada nunca deve ser retornada
            'api_key_encrypted': {'write_only': True, 'required': False}
        }

    def validate_nome(self, value):
        """Validar nome do workspace"""
        if not value or not value.strip():
            raise serializers.ValidationError("Nome é obrigatório")
        if len(value.strip()) < 3:
            raise serializers.ValidationError("Nome deve ter pelo menos 3 caracteres")

        # Sanitizar HTML
        import html
        return html.escape(value.strip())

    def validate_api_key(self, value):
        """Validar API key - APENAS se fornecida"""
        # Se não foi fornecida, permitir (para updates parciais como toggle ativo)
        if not value:
            return value

        # Se foi fornecida, validar
        if not value.strip():
            raise serializers.ValidationError("API Key não pode ser vazia")

        if len(value.strip()) < 10:
            raise serializers.ValidationError("API Key muito curta - verifique se está completa")

        return value.strip()

    def validate_limite_contatos(self, value):
        """Validar limite de contatos"""
        if value <= 0:
            raise serializers.ValidationError("Limite deve ser maior que zero")
        if value > 100000:
            raise serializers.ValidationError("Limite máximo é 100.000 contatos")
        return value

    def create(self, validated_data):
        """Criar workspace com criptografia da API key"""
        api_key = validated_data.pop('api_key', None)

        # Na criação, API key é obrigatória
        if not api_key:
            raise serializers.ValidationError({
                'api_key': 'API Key é obrigatória ao criar um novo workspace'
            })

        try:
            from .nicochat_service import encrypt_api_key
            validated_data['api_key_encrypted'] = encrypt_api_key(api_key)
        except ImportError as e:
            raise serializers.ValidationError(f"Erro na configuração de segurança: {str(e)}")

        return super().create(validated_data)

    def update(self, instance, validated_data):
        """Atualizar workspace com recriptografia se API key mudou"""
        api_key = validated_data.pop('api_key', None)

        # Apenas re-criptografar se uma nova API key foi fornecida
        if api_key:
            try:
                from .nicochat_service import encrypt_api_key
                validated_data['api_key_encrypted'] = encrypt_api_key(api_key)
            except ImportError as e:
                raise serializers.ValidationError(f"Erro na configuração de segurança: {str(e)}")

        return super().update(instance, validated_data)

    def get_contatos_atuais(self, obj):
        """Busca contatos atuais da API"""
        try:
            logger.info(f"🔍 get_contatos_atuais - Workspace {obj.id} ({obj.nome})")

            from .nicochat_service import decrypt_api_key
            logger.info(f"   - Descriptografando API key...")
            api_key = decrypt_api_key(obj.api_key_encrypted)
            logger.info(f"   - API key descriptografada com sucesso")

            logger.info(f"   - Chamando obj.get_contatos_atuais()...")
            contatos = obj.get_contatos_atuais(api_key)
            logger.info(f"   ✅ Contatos obtidos: {contatos}")

            return contatos
        except Exception as e:
            logger.error(f"❌ Erro ao buscar contatos atuais do workspace {obj.id}: {e}")
            import traceback
            logger.error(f"   Stack trace: {traceback.format_exc()}")
            return 0

    def get_percentual_utilizado(self, obj):
        """Calcula percentual"""
        contatos = self.get_contatos_atuais(obj)
        if obj.limite_contatos > 0:
            return round((contatos / obj.limite_contatos) * 100, 2)
        return 0

    def get_limite_atingido(self, obj):
        """Verifica se limite foi atingido"""
        contatos = self.get_contatos_atuais(obj)
        return contatos >= obj.limite_contatos


# Alias de compatibilidade
NicochatConfigSerializer = NicochatWorkspaceSerializer