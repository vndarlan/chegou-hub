# backend/features/ia/models.py - VERSÃO ATUALIZADA COM PROJETOS
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
    ARQUIVADO = 'arquivado', 'Arquivado'
    MANUTENCAO = 'manutencao', 'Em Manutenção'

class TipoProjeto(models.TextChoices):
    AUTOMACAO = 'automacao', 'Automação'
    CHATBOT = 'chatbot', 'Chatbot'
    ANALISE_PREDITIVA = 'analise_preditiva', 'Análise Preditiva'
    VISAO_COMPUTACIONAL = 'visao_computacional', 'Visão Computacional'
    PROCESSAMENTO_NLP = 'processamento_nlp', 'Processamento de Linguagem Natural'
    INTEGRACAO_API = 'integracao_api', 'Integração de APIs'
    DASHBOARD_BI = 'dashboard_bi', 'Dashboard BI'
    OUTROS = 'outros', 'Outros'

class DepartamentoChoices(models.TextChoices):
    TI = 'ti', 'TI'
    MARKETING = 'marketing', 'Marketing'
    VENDAS = 'vendas', 'Vendas'
    OPERACIONAL = 'operacional', 'Operacional'
    FINANCEIRO = 'financeiro', 'Financeiro'
    RH = 'rh', 'Recursos Humanos'
    ATENDIMENTO = 'atendimento', 'Atendimento ao Cliente'
    DIRETORIA = 'diretoria', 'Diretoria'

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
        ]
    
    def __str__(self):
        pais_info = f" ({self.pais})" if self.pais else ""
        return f"[{self.ferramenta}]{pais_info} {self.nivel.upper()}: {self.mensagem[:50]}..."

# ===== NOVOS MODELOS PARA PROJETOS DE IA =====

class ProjetoIA(models.Model):
    """Modelo principal para projetos de IA e automação"""
    
    # ===== CAMPOS BÁSICOS =====
    nome = models.CharField(
        max_length=200,
        verbose_name="Nome do Projeto",
        help_text="Nome descritivo do projeto"
    )
    data_criacao = models.DateField(
        default=date.today,  # CORREÇÃO: Usar date.today em vez de timezone.now
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
    departamento_atendido = models.CharField(
        max_length=20,
        choices=DepartamentoChoices.choices,
        verbose_name="Departamento Atendido"
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
    horas_totais = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        verbose_name="Horas Totais de Desenvolvimento",
        help_text="Total de horas investidas no desenvolvimento"
    )
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
    valor_hora = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=150.00,
        verbose_name="Valor por Hora (R$)",
        help_text="Valor cobrado por hora de desenvolvimento"
    )
    
    # ===== MÓDULO FINANCEIRO =====
    # Custos Recorrentes (mensais)
    custo_ferramentas_mensais = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        verbose_name="Custos de Ferramentas/Licenças (Mensal)",
        help_text="Custo mensal com ferramentas e licenças"
    )
    custo_apis_mensais = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        verbose_name="Custos de APIs (Mensal)",
        help_text="Custo mensal com APIs e serviços externos"
    )
    custo_infraestrutura_mensais = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        verbose_name="Custos de Infraestrutura (Mensal)",
        help_text="Custo mensal com servidores, cloud, hosting"
    )
    custo_manutencao_mensais = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        verbose_name="Custos de Manutenção (Mensal)",
        help_text="Custo mensal com manutenção e suporte"
    )
    
    # Custos Únicos
    custo_treinamentos = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        verbose_name="Custos de Treinamentos",
        help_text="Custo único com treinamentos"
    )
    custo_consultoria = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        verbose_name="Custos de Consultoria Externa",
        help_text="Custo único com consultoria externa"
    )
    custo_setup_inicial = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        verbose_name="Custos de Setup Inicial",
        help_text="Custo único com configuração inicial"
    )
    
    # Retornos/Economias
    economia_horas_mensais = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        verbose_name="Horas Economizadas por Mês",
        help_text="Quantidade de horas economizadas mensalmente"
    )
    valor_hora_economizada = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=50.00,
        verbose_name="Valor da Hora Economizada (R$)",
        help_text="Valor estimado da hora economizada"
    )
    reducao_erros_mensais = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        verbose_name="Economia com Redução de Erros (Mensal)",
        help_text="Valor mensal economizado com redução de erros"
    )
    economia_outros_mensais = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        verbose_name="Outras Economias (Mensal)",
        help_text="Outras economias mensais (produtividade, etc.)"
    )
    
    # ===== CAMPOS DE DOCUMENTAÇÃO =====
    documentacao_tecnica = models.URLField(
        blank=True,
        null=True,
        verbose_name="Link da Documentação Técnica"
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
            models.Index(fields=['tipo_projeto', 'departamento_atendido']),
            models.Index(fields=['prioridade', 'complexidade']),
            models.Index(fields=['criado_em']),
        ]
    
    def __str__(self):
        return f"{self.nome} ({self.get_status_display()})"
    
    # ===== PROPRIEDADES CALCULADAS =====
    @property
    def custo_desenvolvimento(self):
        """Calcula o custo total de desenvolvimento"""
        return self.horas_totais * self.valor_hora
    
    @property
    def custos_recorrentes_mensais(self):
        """Calcula total de custos recorrentes mensais"""
        return (
            self.custo_ferramentas_mensais +
            self.custo_apis_mensais +
            self.custo_infraestrutura_mensais +
            self.custo_manutencao_mensais
        )
    
    @property
    def custos_unicos_totais(self):
        """Calcula total de custos únicos"""
        return (
            self.custo_desenvolvimento +
            self.custo_treinamentos +
            self.custo_consultoria +
            self.custo_setup_inicial
        )
    
    @property
    def economia_mensal_total(self):
        """Calcula economia mensal total"""
        economia_horas = self.economia_horas_mensais * self.valor_hora_economizada
        return economia_horas + self.reducao_erros_mensais + self.economia_outros_mensais
    
    def calcular_metricas_financeiras(self, meses_operacao=None):
        """
        Calcula métricas financeiras do projeto
        Args:
            meses_operacao: Quantos meses o projeto está operando (default: calcular desde criação)
        """
        if meses_operacao is None:
            # Calcular meses desde a criação
            from datetime import date
            delta = date.today() - self.data_criacao
            meses_operacao = max(1, delta.days / 30.44)  # Média de dias por mês
        
        # Custos
        custo_total = self.custos_unicos_totais + (self.custos_recorrentes_mensais * meses_operacao)
        
        # Economias
        economia_acumulada = self.economia_mensal_total * meses_operacao
        
        # ROI = ((Ganhos - Custos) / Custos) × 100
        roi = 0
        if custo_total > 0:
            roi = ((economia_acumulada - custo_total) / custo_total) * 100
        
        # Payback em meses = Investimento Inicial / Economia Mensal
        payback_meses = 0
        if self.economia_mensal_total > 0:
            payback_meses = self.custos_unicos_totais / self.economia_mensal_total
        
        # ROI por hora investida
        roi_por_hora = 0
        if self.horas_totais > 0:
            roi_por_hora = economia_acumulada / float(self.horas_totais)
        
        return {
            'custo_desenvolvimento': float(self.custo_desenvolvimento),
            'custos_unicos_totais': float(self.custos_unicos_totais),
            'custos_recorrentes_mensais': float(self.custos_recorrentes_mensais),
            'custo_total': float(custo_total),
            'economia_mensal': float(self.economia_mensal_total),
            'economia_acumulada': float(economia_acumulada),
            'roi': round(roi, 2),
            'payback_meses': round(payback_meses, 2),
            'roi_por_hora': round(roi_por_hora, 2),
            'meses_operacao': round(meses_operacao, 1)
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