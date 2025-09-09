# backend/features/estoque/management/commands/gerar_alertas_produtos_existentes.py
from django.core.management.base import BaseCommand
from django.db.models import Q, F
from django.db import models
from features.estoque.models import ProdutoEstoque, AlertaEstoque


class Command(BaseCommand):
    help = 'Gera alertas automáticos para produtos existentes que deveriam ter alertas mas não têm'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Executa sem fazer mudanças, apenas mostra o que seria feito',
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
        user_id = options.get('user_id')
        loja_id = options.get('loja_id')
        
        self.stdout.write(
            self.style.SUCCESS('=== GERADOR DE ALERTAS PARA PRODUTOS EXISTENTES ===')
        )
        
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
        
        # Buscar produtos que precisam de alertas
        self.stdout.write('\n1. Buscando produtos com estoque zerado sem alertas...')
        produtos_estoque_zero = ProdutoEstoque.objects.filter(
            **filtros,
            estoque_atual=0,
            alerta_estoque_zero=True
        ).exclude(
            alertas__tipo_alerta='estoque_zero',
            alertas__status='ativo'
        )
        
        self.stdout.write('\n2. Buscando produtos com estoque baixo sem alertas...')
        produtos_estoque_baixo = ProdutoEstoque.objects.filter(
            **filtros,
            estoque_atual__gt=0,
            alerta_estoque_baixo=True
        ).exclude(
            alertas__tipo_alerta='estoque_baixo',
            alertas__status='ativo'
        ).filter(
            Q(estoque_atual__lte=F('estoque_minimo'))
        )
        
        # Estatísticas
        total_zero = produtos_estoque_zero.count()
        total_baixo = produtos_estoque_baixo.count()
        total_produtos = total_zero + total_baixo
        
        self.stdout.write(f'\n=== ESTATÍSTICAS ===')
        self.stdout.write(f'Produtos com estoque zerado sem alertas: {total_zero}')
        self.stdout.write(f'Produtos com estoque baixo sem alertas: {total_baixo}')
        self.stdout.write(f'Total de produtos para processar: {total_produtos}')
        
        if total_produtos == 0:
            self.stdout.write(
                self.style.SUCCESS('\nTodos os produtos ja tem os alertas corretos!')
            )
            return
        
        if dry_run:
            self.stdout.write('\n=== PRODUTOS QUE RECEBERIAM ALERTAS (DRY-RUN) ===')
            
            if total_zero > 0:
                self.stdout.write('\n[ESTOQUE ZERADO]:')
                for produto in produtos_estoque_zero[:10]:  # Limitar exibição
                    self.stdout.write(
                        f'  - {produto.sku} | {produto.nome} | '
                        f'Loja: {produto.loja_config.nome_loja} | '
                        f'Estoque: {produto.estoque_atual}'
                    )
                if total_zero > 10:
                    self.stdout.write(f'  ... e mais {total_zero - 10} produtos')
            
            if total_baixo > 0:
                self.stdout.write('\n[ESTOQUE BAIXO]:')
                for produto in produtos_estoque_baixo[:10]:  # Limitar exibição
                    self.stdout.write(
                        f'  - {produto.sku} | {produto.nome} | '
                        f'Loja: {produto.loja_config.nome_loja} | '
                        f'Estoque: {produto.estoque_atual}/{produto.estoque_minimo}'
                    )
                if total_baixo > 10:
                    self.stdout.write(f'  ... e mais {total_baixo - 10} produtos')
            
            self.stdout.write(
                self.style.WARNING('\nExecute novamente sem --dry-run para criar os alertas')
            )
            return
        
        # Processar criação de alertas
        alertas_criados = 0
        erros = 0
        
        self.stdout.write(f'\n=== CRIANDO ALERTAS ===')
        
        # Alertas de estoque zerado
        if total_zero > 0:
            self.stdout.write(f'\n[CRIANDO] Alertas de ESTOQUE ZERADO ({total_zero} produtos)...')
            for produto in produtos_estoque_zero:
                try:
                    alerta = AlertaEstoque.gerar_alerta_estoque_zero(produto)
                    if alerta:
                        alertas_criados += 1
                        self.stdout.write(
                            f'  OK {produto.sku} - Alerta criado (ID: {alerta.id})'
                        )
                    else:
                        self.stdout.write(
                            f'  SKIP {produto.sku} - Alerta ja existe'
                        )
                except Exception as e:
                    erros += 1
                    self.stdout.write(
                        self.style.ERROR(f'  ERRO {produto.sku} - Erro: {str(e)}')
                    )
        
        # Alertas de estoque baixo
        if total_baixo > 0:
            self.stdout.write(f'\n[CRIANDO] Alertas de ESTOQUE BAIXO ({total_baixo} produtos)...')
            for produto in produtos_estoque_baixo:
                try:
                    alerta = AlertaEstoque.gerar_alerta_estoque_baixo(produto)
                    if alerta:
                        alertas_criados += 1
                        self.stdout.write(
                            f'  OK {produto.sku} - Alerta criado (ID: {alerta.id})'
                        )
                    else:
                        self.stdout.write(
                            f'  SKIP {produto.sku} - Alerta ja existe'
                        )
                except Exception as e:
                    erros += 1
                    self.stdout.write(
                        self.style.ERROR(f'  ERRO {produto.sku} - Erro: {str(e)}')
                    )
        
        # Resumo final
        self.stdout.write(f'\n=== RESUMO FINAL ===')
        self.stdout.write(f'Alertas criados: {alertas_criados}')
        if erros > 0:
            self.stdout.write(
                self.style.ERROR(f'Erros: {erros}')
            )
        
        if alertas_criados > 0:
            self.stdout.write(
                self.style.SUCCESS(f'\nProcesso concluido! {alertas_criados} alertas criados com sucesso.')
            )
        else:
            self.stdout.write(
                self.style.WARNING('\nNenhum alerta foi criado.')
            )