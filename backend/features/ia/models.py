# backend/features/ia/models.py - VERSÃO CORRIGIDA COMPLETA
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from decimal import Decimal
from datetime import date

# ===== CLASSES DE ESCOLHAS =====
class TipoFerramenta(models.TextChoices):
    NICOCHAT = 'Nicochat', 'Nicochat'
    N8N = 'N8N', 'N8N'

class NivelLog(models.TextChoices):
    INFO = 'info', 'Info'
    WARNING = 'warning', 'Warning'
    ERROR = 'error', 'Error'
    CRITICAL = 'critical', 'Critical'

class PaisNicochat(models.TextChoices):
    COLOMBIA = 'colombia', 'Colômbia'
    CHILE = 'chile', 'Chile'
    MEXICO = 'mexico', 'México'
    POLONIA = 'polonia', 'Polônia'
    ROMENIA = 'romenia', 'Romênia'
    ESPANHA = 'espanha', 'Espanha'
    ITALIA = 'italia', 'Itália'

class StatusProjeto(models.TextChoices):
    ATIVO = 'ativo', 'Ativo'
    EM_CONSTRUCAO = 'em_construcao', 'Em Construção'
    MANUTENCAO = 'manutencao', 'Em Manutenção'
    ARQUIVADO = 'arquivado', 'Arquivado'

class TipoProjeto(models.TextChoices):
    AUTOMACAO = 'automacao', 'Automação'
    CHATBOT = 'chatbot', 'ChatBot'
    AGENTE = 'agente', 'Agente'
    OUTROS = 'outros', 'Outros'

class DepartamentoChoices(models.TextChoices):
    DIRETORIA = 'diretoria', 'Diretoria'
    GESTAO = 'gestao', 'Gestão'
    OPERACIONAL = 'operacional', 'Operacional'
    IA_AUTOMACOES = 'ia_automacoes', 'IA & Automações'
    SUPORTE = 'suporte', 'Suporte'
    TRAFEGO_PAGO = 'trafego_pago', 'Tráfego Pago'

class PrioridadeChoices(models.TextChoices):
    BAIXA = 'baixa', 'Baixa'
    MEDIA = 'media', 'Média'
    ALTA = 'alta', 'Alta'

class ComplexidadeChoices(models.TextChoices):
    BAIXA = 'baixa', 'Baixa'
    MEDIA = 'media', 'Média'
    ALTA = 'alta', 'Alta'

class FrequenciaUsoChoices(models.TextChoices):
    DIARIO = 'diario', 'Diário'
    SEMANAL = 'semanal', 'Semanal'
    MENSAL = 'mensal', 'Mensal'
    TRIMESTRAL = 'trimestral', 'Trimestral'
    EVENTUAL = 'eventual', 'Eventual'

class NivelAutonomiaChoices(models.TextChoices):
    TOTAL = 'total', 'Totalmente Autônomo'
    PARCIAL = 'parcial', 'Requer Supervisão'
    MANUAL = 'manual', 'Processo Manual'

# ===== MODELO DE LOGS (EXISTENTE) =====
class LogEntry(models.Model):
    ferramenta = models.CharField(
        max_length=20, 
        choices=TipoFerramenta.choices,
        verbose_name="Ferramenta"
    )
    nivel = models.CharField(
        max_length=20, 
        choices=NivelLog.choices, 
        default=NivelLog.INFO,
        verbose_name="Nível"
    )
    mensagem = models.TextField(verbose_name="Mensagem")
    detalhes = models.JSONField(
        null=True, 
        blank=True, 
        default=dict,
        verbose_name="Detalhes Técnicos"
    )
    
    # Campos específicos para Nicochat
    pais = models.CharField(
        max_length=20, 
        choices=PaisNicochat.choices,
        null=True, 
        blank=True,
        verbose_name="País (Nicochat)"
    )
    usuario_conversa = models.CharField(
        max_length=100, 
        null=True, 
        blank=True,
        verbose_name="Usuário da Conversa"
    )
    id_conversa = models.CharField(
        max_length=100, 
        null=True, 
        blank=True,
        verbose_name="ID da Conversa"
    )
    
    # Campos gerais
    ip_origem = models.GenericIPAddressField(
        null=True, 
        blank=True,
        verbose_name="IP de Origem"
    )
    user_agent = models.TextField(
        null=True, 
        blank=True,
        verbose_name="User Agent"
    )
    timestamp = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Data/Hora"
    )
    resolvido = models.BooleanField(
        default=False,
        verbose_name="Resolvido"
    )
    resolvido_por = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        verbose_name="Resolvido por",
        related_name='ia_logs_resolvidos'
    )
    data_resolucao = models.DateTimeField(
        null=True, 
        blank=True,
        verbose_name="Data de Resolução"
    )
    
    class Meta:
        verbose_name = "Log de IA"
        verbose_name_plural = "Logs de IA"
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['ferramenta', 'timestamp']),
            models.Index(fields=['nivel', 'timestamp']),
            models.Index(fields=['pais', 'timestamp']),
            models.Index(fields=['resolvido']),
            # CORREÇÃO: Não incluir detalhes (JSONField) em índice simples
            models.Index(fields=['timestamp']),
        ]
    
    def __str__(self):
        pais_info = f" ({self.pais})" if self.pais else ""
        return f"[{self.ferramenta}]{pais_info} {self.nivel.upper()}: {self.mensagem[:50]}..."

# ===== NOVOS MODELOS PARA PROJETOS DE IA =====

class ProjetoIA(models.Model):
    """Modelo principal para projetos de IA e automação - CORRIGIDO"""
    
    # ===== CAMPOS BÁSICOS =====
    nome = models.CharField(
        max_length=200,
        verbose_name="Nome do Projeto",
        help_text="Nome descritivo do projeto"
    )
    data_criacao = models.DateField(
        default=date.today,
        verbose_name="Data de Criação",
        help_text="Data de início do projeto"
    )
    descricao = models.TextField(
        verbose_name="Descrição Detalhada",
        help_text="Descrição completa do que o projeto faz"
    )
    status = models.CharField(
        max_length=20,
        choices=StatusProjeto.choices,
        default=StatusProjeto.ATIVO,
        verbose_name="Status do Projeto"
    )
    link_projeto = models.URLField(
        blank=True,
        null=True,
        verbose_name="Link do Projeto",
        help_text="URL de acesso ao projeto"
    )
    ferramentas_tecnologias = models.JSONField(
        default=list,
        verbose_name="Ferramentas/Tecnologias",
        help_text="Lista de ferramentas e tecnologias utilizadas"
    )
    versao_atual = models.CharField(
        max_length=20,
        default="1.0.0",
        verbose_name="Versão Atual",
        help_text="Versão atual do projeto (ex: 1.2.0)"
    )
    criadores = models.ManyToManyField(
        User,
        related_name='projetos_criados',
        verbose_name="Criadores/Responsáveis",
        help_text="Usuários responsáveis pelo projeto"
    )
    
    # ===== CAMPOS ESTRATÉGICOS =====
    tipo_projeto = models.CharField(
        max_length=30,
        choices=TipoProjeto.choices,
        verbose_name="Tipo de Projeto"
    )
    
    # NOVO: Campo departamentos múltiplos
    departamentos_atendidos = models.JSONField(
        default=list,
        verbose_name="Departamentos Atendidos",
        help_text="Lista de departamentos que o projeto atende"
    )
    
    # Manter o campo antigo por compatibilidade (será removido após migração)
    departamento_atendido = models.CharField(
        max_length=20,
        choices=DepartamentoChoices.choices,
        verbose_name="Departamento Atendido (LEGADO)",
        blank=True,
        null=True
    )
    
    prioridade = models.CharField(
        max_length=10,
        choices=PrioridadeChoices.choices,
        default=PrioridadeChoices.MEDIA,
        verbose_name="Prioridade"
    )
    complexidade = models.CharField(
        max_length=10,
        choices=ComplexidadeChoices.choices,
        default=ComplexidadeChoices.MEDIA,
        verbose_name="Complexidade"
    )
    usuarios_impactados = models.PositiveIntegerField(
        default=0,
        verbose_name="Usuários Impactados",
        help_text="Quantidade estimada de usuários que usam o projeto"
    )
    frequencia_uso = models.CharField(
        max_length=15,
        choices=FrequenciaUsoChoices.choices,
        default=FrequenciaUsoChoices.DIARIO,
        verbose_name="Frequência de Uso"
    )
    dependencias = models.ManyToManyField(
        'self',
        blank=True,
        symmetrical=False,
        related_name='projetos_dependentes',
        verbose_name="Dependências",
        help_text="Outros projetos dos quais este depende"
    )
    
    # ===== INVESTIMENTO DE TEMPO =====
    # Campo horas_totais foi removido - usar breakdown específico de horas
    horas_desenvolvimento = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=0,
        verbose_name="Horas de Desenvolvimento",
        blank=True
    )
    horas_testes = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=0,
        verbose_name="Horas de Testes",
        blank=True
    )
    horas_documentacao = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=0,
        verbose_name="Horas de Documentação",
        blank=True
    )
    horas_deploy = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=0,
        verbose_name="Horas de Deploy/Configuração",
        blank=True
    )
    
    # ===== NOVOS CAMPOS FINANCEIROS =====
    # Custos
    custo_hora_empresa = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=80.00,
        verbose_name="Custo/Hora da Empresa (R$)",
        help_text="Quanto custa cada hora de trabalho na empresa"
    )
    custo_apis_mensal = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        verbose_name="Custo APIs/Mês (R$)",
        help_text="Custo mensal com APIs (ChatGPT, Claude, etc.)"
    )
    lista_ferramentas = models.JSONField(
        default=list,
        verbose_name="Lista de Ferramentas",
        help_text="Lista de ferramentas com seus custos mensais [{nome, valor}]"
    )
    custo_treinamentos = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        verbose_name="Custos de Treinamentos (R$)",
        help_text="Custo único com treinamentos"
    )
    custo_setup_inicial = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        verbose_name="Custos de Setup Inicial (R$)",
        help_text="Custo único com configuração inicial"
    )
    custo_consultoria = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        verbose_name="Custos de Consultoria (R$)",
        help_text="Custo único com consultoria externa"
    )
    
    # Retornos/Economias
    horas_economizadas_mes = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        verbose_name="Horas Economizadas por Mês",
        help_text="Quantidade de horas economizadas mensalmente"
    )
    valor_monetario_economizado_mes = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        verbose_name="Valor Monetário Economizado/Mês (R$)",
        help_text="Outros ganhos em reais por mês"
    )
    
    # Controle
    nivel_autonomia = models.CharField(
        max_length=10,
        choices=NivelAutonomiaChoices.choices,
        default=NivelAutonomiaChoices.TOTAL,
        verbose_name="Nível de Autonomia"
    )
    data_break_even = models.DateField(
        blank=True,
        null=True,
        verbose_name="Data de Break-Even",
        help_text="Quando o projeto começou a dar retorno"
    )
    
    # ===== CAMPOS LEGADOS (manter compatibilidade) =====
    valor_hora = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=150.00,
        verbose_name="Valor por Hora (R$) [LEGADO]",
        help_text="Campo legado - usar custo_hora_empresa"
    )
    custo_ferramentas_mensais = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        verbose_name="Custos de Ferramentas/Licenças (Mensal) [LEGADO]"
    )
    custo_apis_mensais = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        verbose_name="Custos de APIs (Mensal) [LEGADO]"
    )
    custo_infraestrutura_mensais = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        verbose_name="Custos de Infraestrutura (Mensal) [LEGADO]"
    )
    custo_manutencao_mensais = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        verbose_name="Custos de Manutenção (Mensal) [LEGADO]"
    )
    economia_horas_mensais = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        verbose_name="Horas Economizadas por Mês [LEGADO]"
    )
    valor_hora_economizada = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=50.00,
        verbose_name="Valor da Hora Economizada (R$) [LEGADO]"
    )
    reducao_erros_mensais = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        verbose_name="Economia com Redução de Erros (Mensal) [LEGADO]"
    )
    economia_outros_mensais = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        verbose_name="Outras Economias (Mensal) [LEGADO]"
    )
    
    # ===== CAMPOS DE DOCUMENTAÇÃO =====
    documentacao_tecnica = models.URLField(
        blank=True,
        null=True,
        verbose_name="Link da Documentação Técnica"
    )
    documentacao_apoio = models.TextField(
        blank=True,
        null=True,
        verbose_name="Documentação de Apoio",
        help_text="Links para documentação adicional que serve como apoio (separados por linha)"
    )
    licoes_aprendidas = models.TextField(
        blank=True,
        verbose_name="Lições Aprendidas",
        help_text="O que funcionou bem e quais foram os desafios"
    )
    proximos_passos = models.TextField(
        blank=True,
        verbose_name="Próximos Passos",
        help_text="Melhorias e funcionalidades planejadas"
    )
    data_revisao = models.DateField(
        blank=True,
        null=True,
        verbose_name="Data de Próxima Revisão",
        help_text="Quando o projeto será reavaliado"
    )
    
    # ===== CAMPOS DE CONTROLE =====
    criado_por = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='projetos_ia_criados',
        verbose_name="Criado por"
    )
    criado_em = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Criado em"
    )
    atualizado_em = models.DateTimeField(
        auto_now=True,
        verbose_name="Última atualização"
    )
    ativo = models.BooleanField(
        default=True,
        verbose_name="Ativo",
        help_text="Se o projeto está ativo no sistema"
    )
    
    class Meta:
        verbose_name = "Projeto de IA"
        verbose_name_plural = "Projetos de IA"
        ordering = ['-criado_em']
        indexes = [
            models.Index(fields=['status', 'ativo']),
            models.Index(fields=['tipo_projeto']),
            # CORREÇÃO: Não indexar JSONField diretamente
            # models.Index(fields=['tipo_projeto', 'departamentos_atendidos']),
            models.Index(fields=['prioridade', 'complexidade']),
            models.Index(fields=['criado_em']),
            models.Index(fields=['departamento_atendido']),  # Campo legado
        ]
    
    def __str__(self):
        return f"{self.nome} ({self.get_status_display()})"
    
    # CORREÇÃO: Método para exibir departamentos
    def get_departamentos_display(self):
        """Retorna os nomes dos departamentos selecionados"""
        try:
            if not self.departamentos_atendidos:
                # Fallback para campo legado
                if self.departamento_atendido:
                    choices_dict = dict(DepartamentoChoices.choices)
                    return [choices_dict.get(self.departamento_atendido, self.departamento_atendido)]
                return []
            
            choices_dict = dict(DepartamentoChoices.choices)
            return [choices_dict.get(dept, dept) for dept in self.departamentos_atendidos]
        except Exception as e:
            print(f"Erro em get_departamentos_display: {e}")
            return []
    
    # ===== PROPRIEDADES CALCULADAS ATUALIZADAS =====
    
    @property
    def horas_totais(self):
        """Calcula horas totais dinamicamente a partir do breakdown"""
        try:
            desenvolvimento = Decimal(str(self.horas_desenvolvimento or 0))
            testes = Decimal(str(self.horas_testes or 0))
            documentacao = Decimal(str(self.horas_documentacao or 0))
            deploy = Decimal(str(self.horas_deploy or 0))
            return desenvolvimento + testes + documentacao + deploy
        except Exception as e:
            print(f"Erro em horas_totais: {e}")
            return Decimal('0')
    
    @property
    def custo_desenvolvimento(self):
        """Calcula o custo total de desenvolvimento usando o novo campo"""
        try:
            horas = self.horas_totais
            custo_hora = Decimal(str(self.custo_hora_empresa or 80))
            return horas * custo_hora
        except Exception as e:
            print(f"Erro em custo_desenvolvimento: {e}")
            return Decimal('0')
    
    @property
    def custos_ferramentas_total_mensal(self):
        """Calcula o custo total mensal das ferramentas da lista"""
        try:
            if not self.lista_ferramentas:
                return Decimal('0')
            total = Decimal('0')
            for item in self.lista_ferramentas:
                if isinstance(item, dict) and 'valor' in item:
                    valor = item.get('valor', 0)
                    total += Decimal(str(valor or 0))
            return total
        except Exception as e:
            print(f"Erro em custos_ferramentas_total_mensal: {e}")
            return Decimal('0')
    
    @property
    def custos_recorrentes_mensais_novo(self):
        """Calcula total de custos recorrentes mensais com novos campos"""
        try:
            custo_apis = Decimal(str(self.custo_apis_mensal or 0))
            custo_ferramentas = self.custos_ferramentas_total_mensal
            return custo_apis + custo_ferramentas
        except Exception as e:
            print(f"Erro em custos_recorrentes_mensais_novo: {e}")
            return Decimal('0')
    
    @property
    def custos_unicos_totais_novo(self):
        """Calcula total de custos únicos com novos campos"""
        try:
            custo_dev = self.custo_desenvolvimento
            custo_trein = Decimal(str(self.custo_treinamentos or 0))
            custo_consul = Decimal(str(self.custo_consultoria or 0))
            custo_setup = Decimal(str(self.custo_setup_inicial or 0))
            return custo_dev + custo_trein + custo_consul + custo_setup
        except Exception as e:
            print(f"Erro em custos_unicos_totais_novo: {e}")
            return Decimal('0')
    
    @property
    def economia_mensal_total_novo(self):
        """Calcula economia mensal total com novos campos"""
        try:
            horas_econ = Decimal(str(self.horas_economizadas_mes or 0))
            custo_hora = Decimal(str(self.custo_hora_empresa or 80))
            economia_horas = horas_econ * custo_hora
            
            valor_monetario = Decimal(str(self.valor_monetario_economizado_mes or 0))
            return economia_horas + valor_monetario
        except Exception as e:
            print(f"Erro em economia_mensal_total_novo: {e}")
            return Decimal('0')
    
    # ===== PROPRIEDADES LEGADAS (compatibilidade) =====
    @property
    def custos_recorrentes_mensais(self):
        """Calcula total de custos recorrentes mensais (compatibilidade)"""
        try:
            ferramentas = Decimal(str(self.custo_ferramentas_mensais or 0))
            apis = Decimal(str(self.custo_apis_mensais or 0))
            infra = Decimal(str(self.custo_infraestrutura_mensais or 0))
            manut = Decimal(str(self.custo_manutencao_mensais or 0))
            return ferramentas + apis + infra + manut
        except Exception as e:
            print(f"Erro em custos_recorrentes_mensais: {e}")
            return Decimal('0')
    
    @property
    def custos_unicos_totais(self):
        """Calcula total de custos únicos (compatibilidade)"""
        try:
            horas = self.horas_totais  # Usar a property
            valor_hora = Decimal(str(self.valor_hora or 150))
            custo_dev_legado = horas * valor_hora
            
            custo_trein = Decimal(str(self.custo_treinamentos or 0))
            custo_consul = Decimal(str(self.custo_consultoria or 0))
            custo_setup = Decimal(str(self.custo_setup_inicial or 0))
            
            return custo_dev_legado + custo_trein + custo_consul + custo_setup
        except Exception as e:
            print(f"Erro em custos_unicos_totais: {e}")
            return Decimal('0')
    
    @property
    def economia_mensal_total(self):
        """Calcula economia mensal total (compatibilidade)"""
        try:
            horas_econ = Decimal(str(self.economia_horas_mensais or 0))
            valor_hora_econ = Decimal(str(self.valor_hora_economizada or 50))
            economia_horas = horas_econ * valor_hora_econ
            
            reducao_erros = Decimal(str(self.reducao_erros_mensais or 0))
            economia_outros = Decimal(str(self.economia_outros_mensais or 0))
            
            return economia_horas + reducao_erros + economia_outros
        except Exception as e:
            print(f"Erro em economia_mensal_total: {e}")
            return Decimal('0')
    
    def calcular_metricas_financeiras(self, meses_operacao=None, usar_novos_campos=True):
        """
        Calcula métricas financeiras do projeto - CORRIGIDO
        """
        try:
            print(f"Calculando métricas para projeto {self.id} - usar_novos_campos: {usar_novos_campos}")
            
            if meses_operacao is None:
                delta = date.today() - self.data_criacao
                meses_operacao = max(1, float(delta.days) / 30.44)
            
            if usar_novos_campos:
                custos_unicos = float(self.custos_unicos_totais_novo)
                custos_recorrentes_mensais = float(self.custos_recorrentes_mensais_novo)
                economia_mensal = float(self.economia_mensal_total_novo)
                custo_desenvolvimento = float(self.custo_desenvolvimento)
                print(f"Usando NOVOS campos - economia_mensal: {economia_mensal}")
            else:
                custos_unicos = float(self.custos_unicos_totais)
                custos_recorrentes_mensais = float(self.custos_recorrentes_mensais)
                economia_mensal = float(self.economia_mensal_total)
                custo_desenvolvimento = float(self.horas_totais * self.valor_hora)
                print(f"Usando campos LEGADOS - economia_mensal: {economia_mensal}")
            
            # Converter para float
            meses_operacao = float(meses_operacao)
            
            # Custos
            custo_total = custos_unicos + (custos_recorrentes_mensais * meses_operacao)
            
            # Economias
            economia_acumulada = economia_mensal * meses_operacao
            
            # ROI = ((Ganhos - Custos) / Custos) × 100
            roi = 0
            if custo_total > 0:
                roi = ((economia_acumulada - custo_total) / custo_total) * 100
            
            # Payback em meses = Investimento Inicial / Economia Mensal
            payback_meses = 0
            if economia_mensal > 0:
                payback_meses = custos_unicos / economia_mensal
            
            # ROI por hora investida
            roi_por_hora = 0
            if float(self.horas_totais) > 0:
                roi_por_hora = economia_acumulada / float(self.horas_totais)
            
            resultado = {
                'custo_desenvolvimento': custo_desenvolvimento,
                'custos_unicos_totais': custos_unicos,
                'custos_recorrentes_mensais': custos_recorrentes_mensais,
                'custo_total': custo_total,
                'economia_mensal': economia_mensal,
                'economia_acumulada': economia_acumulada,
                'roi': round(roi, 2),
                'payback_meses': round(payback_meses, 2),
                'roi_por_hora': round(roi_por_hora, 2),
                'meses_operacao': round(meses_operacao, 1),
                'usando_novos_campos': usar_novos_campos
            }
            
            print(f"Métricas calculadas: ROI={resultado['roi']}%, economia_mensal={resultado['economia_mensal']}")
            return resultado
            
        except Exception as e:
            print(f"Erro ao calcular métricas: {e}")
            import traceback
            traceback.print_exc()
            return {
                'erro': str(e),
                'custo_total': 0,
                'economia_mensal': 0,
                'roi': 0,
                'acesso_restrito': True
            }

class VersaoProjeto(models.Model):
    """Histórico de versões dos projetos"""
    
    projeto = models.ForeignKey(
        ProjetoIA,
        on_delete=models.CASCADE,
        related_name='versoes',
        verbose_name="Projeto"
    )
    versao = models.CharField(
        max_length=20,
        verbose_name="Versão",
        help_text="Número da versão (ex: 1.2.0)"
    )
    versao_anterior = models.CharField(
        max_length=20,
        blank=True,
        verbose_name="Versão Anterior"
    )
    motivo_mudanca = models.TextField(
        verbose_name="Motivo da Mudança",
        help_text="Descrição das alterações realizadas"
    )
    responsavel = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        verbose_name="Responsável pela Alteração"
    )
    data_lancamento = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Data de Lançamento"
    )
    
    class Meta:
        verbose_name = "Versão do Projeto"
        verbose_name_plural = "Versões dos Projetos"
        ordering = ['-data_lancamento']
        unique_together = ['projeto', 'versao']
    
    def __str__(self):
        return f"{self.projeto.nome} v{self.versao}"


# ===== CLASSES DE ESCOLHAS PARA WHATSAPP BUSINESS =====

class QualityRatingChoices(models.TextChoices):
    """Qualidade do número WhatsApp"""
    GREEN = 'GREEN', 'Verde (Boa)'
    YELLOW = 'YELLOW', 'Amarela (Atenção)'
    RED = 'RED', 'Vermelha (Baixa)'
    NA = 'NA', 'Não Disponível'

class MessagingLimitTierChoices(models.TextChoices):
    """Limite de mensagens por dia"""
    TIER_50 = 'TIER_50', '50 mensagens/dia'
    TIER_250 = 'TIER_250', '250 mensagens/dia'
    TIER_1000 = 'TIER_1000', '1.000 mensagens/dia'
    TIER_UNLIMITED = 'TIER_UNLIMITED', 'Ilimitado'

class PhoneNumberStatusChoices(models.TextChoices):
    """Status do número WhatsApp"""
    CONNECTED = 'CONNECTED', 'Conectado'
    DISCONNECTED = 'DISCONNECTED', 'Desconectado'
    FLAGGED = 'FLAGGED', 'Sinalizado'
    RESTRICTED = 'RESTRICTED', 'Restrito'

class AlertTypeChoices(models.TextChoices):
    """Tipos de alertas"""
    QUALITY_DEGRADED = 'quality_degraded', 'Qualidade Degradada'
    LIMIT_REDUCED = 'limit_reduced', 'Limite Reduzido'
    STATUS_CHANGED = 'status_changed', 'Status Alterado'
    DISCONNECTED = 'disconnected', 'Desconectado'
    RESTRICTED = 'restricted', 'Restrito'

class AlertPriorityChoices(models.TextChoices):
    """Prioridade dos alertas"""
    LOW = 'low', 'Baixa'
    MEDIUM = 'medium', 'Média'
    HIGH = 'high', 'Alta'
    CRITICAL = 'critical', 'Crítica'


# ===== MODELS PARA WHATSAPP BUSINESS MONITORING =====

class WhatsAppBusinessAccount(models.Model):
    """Gerenciar múltiplas WhatsApp Business Accounts (WABA)"""
    
    nome = models.CharField(
        max_length=200,
        verbose_name="Nome da WhatsApp Business Account",
        help_text="Nome identificador da WhatsApp Business Account"
    )
    whatsapp_business_account_id = models.CharField(
        max_length=50,
        unique=True,
        verbose_name="WhatsApp Business Account ID (WABA ID)",
        help_text="ID único da WhatsApp Business Account (WABA ID)"
    )
    access_token_encrypted = models.TextField(
        verbose_name="Token de Acesso (Criptografado)",
        help_text="Token de acesso criptografado para API do WhatsApp"
    )
    webhook_verify_token = models.CharField(
        max_length=200,
        blank=True,
        verbose_name="Token de Verificação do Webhook",
        help_text="Token para verificação do webhook"
    )
    ativo = models.BooleanField(
        default=True,
        verbose_name="Ativo",
        help_text="Se esta WhatsApp Business Account está ativa para monitoramento"
    )
    ultima_sincronizacao = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Última Sincronização",
        help_text="Data/hora da última sincronização com a API"
    )
    erro_ultima_sincronizacao = models.TextField(
        blank=True,
        verbose_name="Erro na Última Sincronização",
        help_text="Detalhes do erro caso a última sincronização tenha falhado"
    )
    responsavel = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='whatsapp_business_accounts',
        verbose_name="Responsável",
        help_text="Usuário responsável por esta WhatsApp Business Account"
    )
    
    # Campos de auditoria
    criado_em = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Criado em"
    )
    atualizado_em = models.DateTimeField(
        auto_now=True,
        verbose_name="Atualizado em"
    )
    
    class Meta:
        verbose_name = "WhatsApp Business Account"
        verbose_name_plural = "WhatsApp Business Accounts"
        ordering = ['nome']
        indexes = [
            models.Index(fields=['ativo', 'ultima_sincronizacao']),
            models.Index(fields=['whatsapp_business_account_id']),
        ]
    
    def __str__(self):
        status = "🟢" if self.ativo else "🔴"
        return f"{status} {self.nome}"


# Manter compatibilidade temporária
BusinessManager = WhatsAppBusinessAccount


class WhatsAppPhoneNumber(models.Model):
    """Armazenar dados dos números WhatsApp Business"""
    
    whatsapp_business_account = models.ForeignKey(
        WhatsAppBusinessAccount,
        on_delete=models.CASCADE,
        related_name='phone_numbers',
        verbose_name="WhatsApp Business Account"
    )
    
    # Manter compatibilidade temporária
    @property
    def business_manager(self):
        return self.whatsapp_business_account
    phone_number_id = models.CharField(
        max_length=50,
        unique=True,
        verbose_name="ID do Número",
        help_text="ID único do número na API do WhatsApp"
    )
    display_phone_number = models.CharField(
        max_length=20,
        verbose_name="Número de Telefone",
        help_text="Número formatado para exibição"
    )
    verified_name = models.CharField(
        max_length=200,
        blank=True,
        verbose_name="Nome Verificado",
        help_text="Nome verificado na conta WhatsApp Business"
    )
    
    # Status atual
    quality_rating = models.CharField(
        max_length=10,
        choices=QualityRatingChoices.choices,
        default=QualityRatingChoices.NA,
        verbose_name="Classificação de Qualidade"
    )
    messaging_limit_tier = models.CharField(
        max_length=20,
        choices=MessagingLimitTierChoices.choices,
        default=MessagingLimitTierChoices.TIER_50,
        verbose_name="Limite de Mensagens"
    )
    status = models.CharField(
        max_length=15,
        choices=PhoneNumberStatusChoices.choices,
        default=PhoneNumberStatusChoices.CONNECTED,
        verbose_name="Status"
    )
    
    # Controle de monitoramento
    monitoramento_ativo = models.BooleanField(
        default=True,
        verbose_name="Monitoramento Ativo",
        help_text="Se este número deve ser monitorado automaticamente"
    )
    frequencia_verificacao_minutos = models.PositiveIntegerField(
        default=60,
        verbose_name="Frequência de Verificação (minutos)",
        help_text="Intervalo em minutos para verificar este número"
    )
    
    # Dados adicionais
    detalhes_api = models.JSONField(
        default=dict,
        verbose_name="Detalhes da API",
        help_text="Dados completos retornados pela API do WhatsApp"
    )
    
    # Campos customizados pelo usuário
    bm_nome_customizado = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        verbose_name="Nome Customizado da Business Manager",
        help_text="Nome personalizado para identificar a Business Manager"
    )
    pais_nome_customizado = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name="Nome Customizado do País",
        help_text="Nome personalizado para identificar o país"
    )
    perfil = models.TextField(
        blank=True,
        null=True,
        verbose_name="Perfil",
        help_text="Descrição livre do perfil do número WhatsApp"
    )
    token_expira_em = models.DateField(
        blank=True,
        null=True,
        verbose_name="Data de Expiração do Token",
        help_text="Data em que o token de acesso expira"
    )
    
    # Campos de auditoria
    criado_em = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Criado em"
    )
    atualizado_em = models.DateTimeField(
        auto_now=True,
        verbose_name="Atualizado em"
    )
    ultima_verificacao = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Última Verificação",
        help_text="Data/hora da última verificação na API"
    )
    
    class Meta:
        verbose_name = "Número WhatsApp Business"
        verbose_name_plural = "Números WhatsApp Business"
        ordering = ['display_phone_number']
        indexes = [
            models.Index(fields=['quality_rating', 'monitoramento_ativo']),
            models.Index(fields=['status', 'monitoramento_ativo']),
            models.Index(fields=['ultima_verificacao']),
            models.Index(fields=['phone_number_id']),
        ]
    
    def __str__(self):
        quality_icon = {
            'GREEN': '🟢',
            'YELLOW': '🟡',
            'RED': '🔴',
            'NA': '⚫'
        }.get(self.quality_rating, '⚫')
        
        return f"{quality_icon} {self.display_phone_number} ({self.get_quality_rating_display()})"


class QualityHistory(models.Model):
    """Histórico de qualidade dos números WhatsApp"""
    
    phone_number = models.ForeignKey(
        WhatsAppPhoneNumber,
        on_delete=models.CASCADE,
        related_name='quality_history',
        verbose_name="Número WhatsApp"
    )
    
    # Dados capturados
    quality_rating = models.CharField(
        max_length=10,
        choices=QualityRatingChoices.choices,
        verbose_name="Classificação de Qualidade"
    )
    messaging_limit_tier = models.CharField(
        max_length=20,
        choices=MessagingLimitTierChoices.choices,
        verbose_name="Limite de Mensagens"
    )
    status = models.CharField(
        max_length=15,
        choices=PhoneNumberStatusChoices.choices,
        verbose_name="Status"
    )
    
    # Dados anteriores (para comparação)
    quality_rating_anterior = models.CharField(
        max_length=10,
        choices=QualityRatingChoices.choices,
        null=True,
        blank=True,
        verbose_name="Qualidade Anterior"
    )
    messaging_limit_tier_anterior = models.CharField(
        max_length=20,
        choices=MessagingLimitTierChoices.choices,
        null=True,
        blank=True,
        verbose_name="Limite Anterior"
    )
    status_anterior = models.CharField(
        max_length=15,
        choices=PhoneNumberStatusChoices.choices,
        null=True,
        blank=True,
        verbose_name="Status Anterior"
    )
    
    # Indicadores de mudança
    houve_mudanca_qualidade = models.BooleanField(
        default=False,
        verbose_name="Mudança na Qualidade"
    )
    houve_mudanca_limite = models.BooleanField(
        default=False,
        verbose_name="Mudança no Limite"
    )
    houve_mudanca_status = models.BooleanField(
        default=False,
        verbose_name="Mudança no Status"
    )
    
    # Dados completos da API
    dados_api_completos = models.JSONField(
        default=dict,
        verbose_name="Dados Completos da API",
        help_text="Resposta completa da API no momento da captura"
    )
    
    # Timestamp
    capturado_em = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Capturado em"
    )
    
    class Meta:
        verbose_name = "Histórico de Qualidade"
        verbose_name_plural = "Histórico de Qualidade"
        ordering = ['-capturado_em']
        indexes = [
            models.Index(fields=['phone_number', '-capturado_em']),
            models.Index(fields=['quality_rating', '-capturado_em']),
            models.Index(fields=['houve_mudanca_qualidade', '-capturado_em']),
            models.Index(fields=['houve_mudanca_limite', '-capturado_em']),
            models.Index(fields=['houve_mudanca_status', '-capturado_em']),
        ]
    
    def __str__(self):
        mudancas = []
        if self.houve_mudanca_qualidade:
            mudancas.append("📊")
        if self.houve_mudanca_limite:
            mudancas.append("📈")
        if self.houve_mudanca_status:
            mudancas.append("🔄")
        
        mudanca_icons = "".join(mudancas) if mudancas else "📝"
        
        return f"{mudanca_icons} {self.phone_number.display_phone_number} - {self.capturado_em.strftime('%d/%m %H:%M')}"


class QualityAlert(models.Model):
    """Alertas de mudanças importantes na qualidade"""
    
    phone_number = models.ForeignKey(
        WhatsAppPhoneNumber,
        on_delete=models.CASCADE,
        related_name='alerts',
        verbose_name="Número WhatsApp"
    )
    quality_history = models.ForeignKey(
        QualityHistory,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        verbose_name="Histórico Relacionado",
        help_text="Registro do histórico que gerou este alerta"
    )
    
    # Tipo e prioridade do alerta
    alert_type = models.CharField(
        max_length=30,
        choices=AlertTypeChoices.choices,
        verbose_name="Tipo de Alerta"
    )
    priority = models.CharField(
        max_length=10,
        choices=AlertPriorityChoices.choices,
        default=AlertPriorityChoices.MEDIUM,
        verbose_name="Prioridade"
    )
    
    # Conteúdo do alerta
    titulo = models.CharField(
        max_length=200,
        verbose_name="Título do Alerta"
    )
    descricao = models.TextField(
        verbose_name="Descrição",
        help_text="Descrição detalhada do que aconteceu"
    )
    
    # Dados da mudança
    valor_anterior = models.CharField(
        max_length=50,
        blank=True,
        verbose_name="Valor Anterior"
    )
    valor_atual = models.CharField(
        max_length=50,
        blank=True,
        verbose_name="Valor Atual"
    )
    
    # Status do alerta
    visualizado = models.BooleanField(
        default=False,
        verbose_name="Visualizado",
        help_text="Se o alerta foi visualizado pelo usuário"
    )
    resolvido = models.BooleanField(
        default=False,
        verbose_name="Resolvido",
        help_text="Se o alerta foi marcado como resolvido"
    )
    
    # Ações tomadas
    usuario_que_visualizou = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='alerts_visualizados',
        verbose_name="Visualizado por"
    )
    data_visualizacao = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Data de Visualização"
    )
    usuario_que_resolveu = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='alerts_resolvidos',
        verbose_name="Resolvido por"
    )
    data_resolucao = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Data de Resolução"
    )
    comentario_resolucao = models.TextField(
        blank=True,
        verbose_name="Comentário da Resolução",
        help_text="Comentário sobre como o alerta foi resolvido"
    )
    
    # Notificação
    notificacao_enviada = models.BooleanField(
        default=False,
        verbose_name="Notificação Enviada",
        help_text="Se a notificação foi enviada via email/webhook"
    )
    
    # Timestamp
    criado_em = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Criado em"
    )
    
    class Meta:
        verbose_name = "Alerta de Qualidade"
        verbose_name_plural = "Alertas de Qualidade"
        ordering = ['-criado_em']
        indexes = [
            models.Index(fields=['phone_number', '-criado_em']),
            models.Index(fields=['alert_type', 'priority', '-criado_em']),
            models.Index(fields=['visualizado', 'resolvido', '-criado_em']),
            models.Index(fields=['priority', 'visualizado', '-criado_em']),
        ]
    
    def __str__(self):
        priority_icon = {
            'low': '🟢',
            'medium': '🟡',
            'high': '🟠',
            'critical': '🔴'
        }.get(self.priority, '⚫')
        
        status_icon = "✅" if self.resolvido else ("👀" if self.visualizado else "🆕")
        
        return f"{priority_icon}{status_icon} {self.titulo} - {self.phone_number.display_phone_number}"


# ===== MODELO PARA CONFIGURAÇÕES NICOCHAT =====

class NicochatConfig(models.Model):
    """Configurações do NicoChat para integração com fluxos"""

    nome = models.CharField(
        max_length=200,
        verbose_name="Nome da Configuração",
        help_text="Nome identificador desta configuração NicoChat"
    )
    api_key_encrypted = models.TextField(
        verbose_name="API Key Criptografada",
        help_text="API Key do NicoChat armazenada de forma segura"
    )
    usuario = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='nicochat_configs',
        verbose_name="Usuário",
        help_text="Usuário responsável por esta configuração"
    )
    ativo = models.BooleanField(
        default=True,
        verbose_name="Ativo",
        help_text="Se esta configuração está ativa"
    )

    # Metadados
    criado_em = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Criado em"
    )
    atualizado_em = models.DateTimeField(
        auto_now=True,
        verbose_name="Atualizado em"
    )

    class Meta:
        verbose_name = "Configuração NicoChat"
        verbose_name_plural = "Configurações NicoChat"
        ordering = ['-criado_em']
        indexes = [
            models.Index(fields=['usuario', 'ativo']),
            models.Index(fields=['criado_em']),
        ]

    def __str__(self):
        status = "Ativa" if self.ativo else "Inativa"
        return f"{self.nome} ({status})"