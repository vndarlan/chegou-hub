# backend/features/estoque/management/commands/verificar_alertas_automaticos.py
from django.core.management.base import BaseCommand
from django.db.models import Q, F
from django.utils import timezone
from datetime import timedelta
from features.estoque.models import ProdutoEstoque, AlertaEstoque


class Command(BaseCommand):
    help = 'Verifica e cria alertas automáticos para produtos que precisam de alerta'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Executa sem fazer mudanças, apenas mostra o que seria feito',
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Mostra mais detalhes durante a execução',
        )
        parser.add_argument(
            '--user-id',
            type=int,
            help='Processar apenas produtos de um usuário específico',
        )
        parser.add_argument(
            '--loja-id',
            type=int,
            help='Processar apenas produtos de uma loja específica',
        )
    
    def handle(self, *args, **options):
        dry_run = options['dry_run']
        verbose = options['verbose']
        user_id = options.get('user_id')
        loja_id = options.get('loja_id')
        
        self.stdout.write(
            self.style.SUCCESS('=== VERIFICADOR AUTOMÁTICO DE ALERTAS DE ESTOQUE ===')
        )
        self.stdout.write(f'Executado em: {timezone.now().strftime("%Y-%m-%d %H:%M:%S")}')
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING('MODO DRY-RUN: Nenhuma mudança será feita')
            )
        
        # Filtros base
        filtros = {
            'ativo': True  # Apenas produtos ativos
        }
        
        if user_id:
            filtros['user_id'] = user_id
            self.stdout.write(f'Processando apenas usuário ID: {user_id}')
        
        if loja_id:
            filtros['loja_config_id'] = loja_id
            self.stdout.write(f'Processando apenas loja ID: {loja_id}')
        
        # 1. Verificar produtos com estoque zerado sem alertas ativos
        produtos_estoque_zero = ProdutoEstoque.objects.filter(
            **filtros,
            estoque_atual=0,
            alerta_estoque_zero=True
        ).exclude(
            alertas__tipo_alerta='estoque_zero',
            alertas__status='ativo'
        )
        
        # 2. Verificar produtos com estoque baixo sem alertas ativos
        produtos_estoque_baixo = ProdutoEstoque.objects.filter(
            **filtros,
            estoque_atual__gt=0,
            estoque_atual__lte=F('estoque_minimo'),
            alerta_estoque_baixo=True
        ).exclude(
            alertas__tipo_alerta='estoque_baixo',
            alertas__status='ativo'
        )
        
        # 3. Verificar produtos com estoque negativo (situação crítica)
        produtos_estoque_negativo = ProdutoEstoque.objects.filter(
            **filtros,
            estoque_atual__lt=0
        ).exclude(
            alertas__tipo_alerta='estoque_negativo',
            alertas__status='ativo'
        )
        
        # 4. Resolver alertas que não se aplicam mais
        # Alertas de estoque zerado para produtos que não estão mais zerados
        alertas_zero_obsoletos = AlertaEstoque.objects.filter(
            produto__ativo=True,
            tipo_alerta='estoque_zero',
            status='ativo',
            produto__estoque_atual__gt=0
        )
        
        # Alertas de estoque baixo para produtos que não estão mais com estoque baixo
        alertas_baixo_obsoletos = AlertaEstoque.objects.filter(
            produto__ativo=True,
            tipo_alerta='estoque_baixo',
            status='ativo',
            produto__estoque_atual__gt=F('produto__estoque_minimo')
        )
        
        if user_id:
            alertas_zero_obsoletos = alertas_zero_obsoletos.filter(produto__user_id=user_id)
            alertas_baixo_obsoletos = alertas_baixo_obsoletos.filter(produto__user_id=user_id)
        
        if loja_id:
            alertas_zero_obsoletos = alertas_zero_obsoletos.filter(produto__loja_config_id=loja_id)
            alertas_baixo_obsoletos = alertas_baixo_obsoletos.filter(produto__loja_config_id=loja_id)
        
        # Estatísticas
        total_zero = produtos_estoque_zero.count()
        total_baixo = produtos_estoque_baixo.count()
        total_negativo = produtos_estoque_negativo.count()
        total_criar = total_zero + total_baixo + total_negativo
        
        total_zero_obsoletos = alertas_zero_obsoletos.count()
        total_baixo_obsoletos = alertas_baixo_obsoletos.count()
        total_resolver = total_zero_obsoletos + total_baixo_obsoletos
        
        self.stdout.write(f'\n=== ANÁLISE COMPLETA ===')
        self.stdout.write(f'Produtos com estoque zerado sem alertas: {total_zero}')
        self.stdout.write(f'Produtos com estoque baixo sem alertas: {total_baixo}')
        self.stdout.write(f'Produtos com estoque negativo sem alertas: {total_negativo}')
        self.stdout.write(f'Total de alertas para CRIAR: {total_criar}')
        self.stdout.write(f'')
        self.stdout.write(f'Alertas de estoque zero obsoletos: {total_zero_obsoletos}')
        self.stdout.write(f'Alertas de estoque baixo obsoletos: {total_baixo_obsoletos}')
        self.stdout.write(f'Total de alertas para RESOLVER: {total_resolver}')
        
        if total_criar == 0 and total_resolver == 0:
            self.stdout.write(
                self.style.SUCCESS('\nOK Sistema de alertas está em ordem! Nada para processar.')
            )
            return
        
        if dry_run:
            self.stdout.write('\n=== SIMULAÇÃO (DRY-RUN) ===')
            
            if total_zero > 0:
                self.stdout.write('\n[CRIAR] Alertas de ESTOQUE ZERADO:')
                for produto in produtos_estoque_zero[:5]:
                    self.stdout.write(
                        f'  ZERO {produto.sku} | {produto.nome[:30]} | '
                        f'Loja: {produto.loja_config.nome_loja} | '
                        f'Estoque: {produto.estoque_atual}'
                    )
                if total_zero > 5:
                    self.stdout.write(f'  ... e mais {total_zero - 5} produtos')
            
            if total_baixo > 0:
                self.stdout.write('\n[CRIAR] Alertas de ESTOQUE BAIXO:')
                for produto in produtos_estoque_baixo[:5]:
                    self.stdout.write(
                        f'  BAIXO {produto.sku} | {produto.nome[:30]} | '
                        f'Loja: {produto.loja_config.nome_loja} | '
                        f'Estoque: {produto.estoque_atual}/{produto.estoque_minimo}'
                    )
                if total_baixo > 5:
                    self.stdout.write(f'  ... e mais {total_baixo - 5} produtos')
            
            if total_negativo > 0:
                self.stdout.write('\n[CRIAR] Alertas de ESTOQUE NEGATIVO:')
                for produto in produtos_estoque_negativo[:5]:
                    self.stdout.write(
                        f'  NEGATIVO {produto.sku} | {produto.nome[:30]} | '
                        f'Loja: {produto.loja_config.nome_loja} | '
                        f'Estoque: {produto.estoque_atual} (NEGATIVO)'
                    )
                if total_negativo > 5:
                    self.stdout.write(f'  ... e mais {total_negativo - 5} produtos')
            
            if total_zero_obsoletos > 0:
                self.stdout.write('\n[RESOLVER] Alertas de estoque zero obsoletos:')
                for alerta in alertas_zero_obsoletos[:5]:
                    self.stdout.write(
                        f'  OK {alerta.produto.sku} | Estoque atual: {alerta.produto.estoque_atual} (não mais zerado)'
                    )
                if total_zero_obsoletos > 5:
                    self.stdout.write(f'  ... e mais {total_zero_obsoletos - 5} alertas')
            
            if total_baixo_obsoletos > 0:
                self.stdout.write('\n[RESOLVER] Alertas de estoque baixo obsoletos:')
                for alerta in alertas_baixo_obsoletos[:5]:
                    self.stdout.write(
                        f'  OK {alerta.produto.sku} | Estoque: {alerta.produto.estoque_atual}/{alerta.produto.estoque_minimo} (não mais baixo)'
                    )
                if total_baixo_obsoletos > 5:
                    self.stdout.write(f'  ... e mais {total_baixo_obsoletos - 5} alertas')
            
            self.stdout.write(
                self.style.WARNING('\nExecute novamente sem --dry-run para aplicar as mudanças')
            )
            return
        
        # Processar criação e resolução de alertas
        alertas_criados = 0
        alertas_resolvidos = 0
        erros = 0
        
        self.stdout.write(f'\n=== EXECUTANDO MUDANÇAS ===')
        
        # 1. Criar alertas de estoque zerado
        if total_zero > 0:
            self.stdout.write(f'\n[CRIANDO] Alertas de ESTOQUE ZERADO ({total_zero} produtos)...')
            for produto in produtos_estoque_zero:
                try:
                    alerta = AlertaEstoque.gerar_alerta_estoque_zero(produto)
                    if alerta:
                        alertas_criados += 1
                        if verbose:
                            self.stdout.write(f'  OK {produto.sku} - Alerta criado (ID: {alerta.id})')
                    else:
                        if verbose:
                            self.stdout.write(f'  SKIP {produto.sku} - Alerta já existe')
                except Exception as e:
                    erros += 1
                    self.stdout.write(
                        self.style.ERROR(f'  ERRO {produto.sku} - Erro: {str(e)}')
                    )
        
        # 2. Criar alertas de estoque baixo
        if total_baixo > 0:
            self.stdout.write(f'\n[CRIANDO] Alertas de ESTOQUE BAIXO ({total_baixo} produtos)...')
            for produto in produtos_estoque_baixo:
                try:
                    alerta = AlertaEstoque.gerar_alerta_estoque_baixo(produto)
                    if alerta:
                        alertas_criados += 1
                        if verbose:
                            self.stdout.write(f'  OK {produto.sku} - Alerta criado (ID: {alerta.id})')
                    else:
                        if verbose:
                            self.stdout.write(f'  SKIP {produto.sku} - Alerta já existe')
                except Exception as e:
                    erros += 1
                    self.stdout.write(
                        self.style.ERROR(f'  ERRO {produto.sku} - Erro: {str(e)}')
                    )
        
        # 3. Criar alertas de estoque negativo
        if total_negativo > 0:
            self.stdout.write(f'\n[CRIANDO] Alertas de ESTOQUE NEGATIVO ({total_negativo} produtos)...')
            for produto in produtos_estoque_negativo:
                try:
                    alerta = AlertaEstoque.objects.create(
                        produto=produto,
                        usuario_responsavel=produto.user,
                        tipo_alerta='estoque_negativo',
                        prioridade='critica',
                        titulo=f"CRÍTICO: Estoque negativo - {produto.sku}",
                        descricao=f"O produto {produto.nome} está com estoque NEGATIVO: {produto.estoque_atual}. "
                                 f"Isso indica um problema no controle de estoque que precisa ser resolvido imediatamente.",
                        valor_atual=produto.estoque_atual,
                        valor_limite=0,
                        acao_sugerida="URGENTE: Verificar movimentações recentes e corrigir estoque manualmente.",
                        dados_contexto={
                            'sku': produto.sku,
                            'nome_produto': produto.nome,
                            'loja': produto.loja_config.nome_loja,
                            'situacao': 'estoque_negativo_critico',
                            'detectado_em': timezone.now().isoformat()
                        }
                    )
                    alertas_criados += 1
                    if verbose:
                        self.stdout.write(f'  CRITICO {produto.sku} - Alerta CRÍTICO criado (ID: {alerta.id})')
                except Exception as e:
                    erros += 1
                    self.stdout.write(
                        self.style.ERROR(f'  ERRO {produto.sku} - Erro: {str(e)}')
                    )
        
        # 4. Resolver alertas obsoletos
        if total_zero_obsoletos > 0:
            self.stdout.write(f'\n[RESOLVENDO] Alertas de estoque zero obsoletos ({total_zero_obsoletos})...')
            for alerta in alertas_zero_obsoletos:
                try:
                    alerta.resolver(
                        observacao=f"Resolvido automaticamente: produto não está mais com estoque zerado (atual: {alerta.produto.estoque_atual})"
                    )
                    alertas_resolvidos += 1
                    if verbose:
                        self.stdout.write(f'  OK {alerta.produto.sku} - Alerta resolvido')
                except Exception as e:
                    erros += 1
                    self.stdout.write(
                        self.style.ERROR(f'  ERRO {alerta.produto.sku} - Erro: {str(e)}')
                    )
        
        if total_baixo_obsoletos > 0:
            self.stdout.write(f'\n[RESOLVENDO] Alertas de estoque baixo obsoletos ({total_baixo_obsoletos})...')
            for alerta in alertas_baixo_obsoletos:
                try:
                    alerta.resolver(
                        observacao=f"Resolvido automaticamente: produto não está mais com estoque baixo (atual: {alerta.produto.estoque_atual}, mínimo: {alerta.produto.estoque_minimo})"
                    )
                    alertas_resolvidos += 1
                    if verbose:
                        self.stdout.write(f'  OK {alerta.produto.sku} - Alerta resolvido')
                except Exception as e:
                    erros += 1
                    self.stdout.write(
                        self.style.ERROR(f'  ERRO {alerta.produto.sku} - Erro: {str(e)}')
                    )
        
        # Resumo final
        self.stdout.write(f'\n=== RESUMO FINAL ===')
        self.stdout.write(f'OK Alertas criados: {alertas_criados}')
        self.stdout.write(f'OK Alertas resolvidos: {alertas_resolvidos}')
        
        if erros > 0:
            self.stdout.write(
                self.style.ERROR(f'ERRO Erros: {erros}')
            )
        
        total_processado = alertas_criados + alertas_resolvidos
        if total_processado > 0:
            self.stdout.write(
                self.style.SUCCESS(
                    f'\nOK Processo concluído! {total_processado} alertas processados com sucesso.'
                )
            )
        else:
            self.stdout.write(
                self.style.WARNING('\nWARN Nenhum alerta foi processado.')
            )
        
        self.stdout.write(f'Finalizado em: {timezone.now().strftime("%Y-%m-%d %H:%M:%S")}')