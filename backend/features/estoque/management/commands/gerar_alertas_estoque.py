# backend/features/estoque/management/commands/gerar_alertas_estoque.py
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.db.models import F
from features.estoque.models import ProdutoEstoque, AlertaEstoque


class Command(BaseCommand):
    help = 'Gera alertas retroativos para produtos com estoque zero ou baixo'

    def add_arguments(self, parser):
        parser.add_argument(
            '--usuario',
            type=str,
            help='Username específico para processar (opcional)',
        )
        parser.add_argument(
            '--tipo',
            type=str,
            choices=['zero', 'baixo', 'ambos'],
            default='ambos',
            help='Tipo de alertas a gerar: zero, baixo ou ambos (default: ambos)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Apenas simula a execução sem criar alertas',
        )

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS('=== COMANDO GERAR ALERTAS DE ESTOQUE ===')
        )
        
        # Filtrar por usuário se especificado
        usuarios_filter = {}
        if options['usuario']:
            try:
                usuario = User.objects.get(username=options['usuario'])
                usuarios_filter['user'] = usuario
                self.stdout.write(f"Processando apenas usuário: {usuario.username}")
            except User.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f"Usuário '{options['usuario']}' não encontrado")
                )
                return
        else:
            self.stdout.write("Processando todos os usuários")
        
        dry_run = options['dry_run']
        if dry_run:
            self.stdout.write(
                self.style.WARNING("MODO SIMULAÇÃO - Nenhum alerta será criado")
            )
        
        alertas_criados_zero = 0
        alertas_criados_baixo = 0
        
        # ===== ALERTAS DE ESTOQUE ZERO =====
        if options['tipo'] in ['zero', 'ambos']:
            self.stdout.write("\n--- Processando alertas de ESTOQUE ZERO ---")
            
            produtos_zero = ProdutoEstoque.objects.filter(
                estoque_atual=0,
                alerta_estoque_zero=True,
                ativo=True,
                **usuarios_filter
            ).exclude(
                alertas__tipo_alerta='estoque_zero',
                alertas__status='ativo'
            ).select_related('user', 'loja_config')
            
            self.stdout.write(f"Produtos com estoque zero sem alerta: {produtos_zero.count()}")
            
            for produto in produtos_zero:
                self.stdout.write(
                    f"  • {produto.sku} - {produto.nome} (Loja: {produto.loja_config.nome_loja})"
                )
                
                if not dry_run:
                    alerta = AlertaEstoque.gerar_alerta_estoque_zero(produto)
                    if alerta:
                        alertas_criados_zero += 1
        
        # ===== ALERTAS DE ESTOQUE BAIXO =====
        if options['tipo'] in ['baixo', 'ambos']:
            self.stdout.write("\n--- Processando alertas de ESTOQUE BAIXO ---")
            
            produtos_baixo = ProdutoEstoque.objects.filter(
                estoque_atual__lte=F('estoque_minimo'),
                estoque_atual__gt=0,  # Baixo mas não zero
                alerta_estoque_baixo=True,
                ativo=True,
                **usuarios_filter
            ).exclude(
                alertas__tipo_alerta='estoque_baixo',
                alertas__status='ativo'
            ).select_related('user', 'loja_config')
            
            self.stdout.write(f"Produtos com estoque baixo sem alerta: {produtos_baixo.count()}")
            
            for produto in produtos_baixo:
                self.stdout.write(
                    f"  • {produto.sku} - {produto.nome} "
                    f"(Atual: {produto.estoque_atual}, Mín: {produto.estoque_minimo}) "
                    f"(Loja: {produto.loja_config.nome_loja})"
                )
                
                if not dry_run:
                    alerta = AlertaEstoque.gerar_alerta_estoque_baixo(produto)
                    if alerta:
                        alertas_criados_baixo += 1
        
        # ===== RESUMO FINAL =====
        self.stdout.write("\n" + "="*50)
        if dry_run:
            self.stdout.write(
                self.style.WARNING("SIMULAÇÃO CONCLUÍDA - Nenhum alerta foi criado")
            )
            self.stdout.write(f"Alertas de estoque zero que seriam criados: {produtos_zero.count() if options['tipo'] in ['zero', 'ambos'] else 0}")
            self.stdout.write(f"Alertas de estoque baixo que seriam criados: {produtos_baixo.count() if options['tipo'] in ['baixo', 'ambos'] else 0}")
        else:
            total_alertas = alertas_criados_zero + alertas_criados_baixo
            self.stdout.write(
                self.style.SUCCESS(f"COMANDO CONCLUÍDO - {total_alertas} alertas criados")
            )
            if options['tipo'] in ['zero', 'ambos']:
                self.stdout.write(f"  • Alertas de estoque zero: {alertas_criados_zero}")
            if options['tipo'] in ['baixo', 'ambos']:
                self.stdout.write(f"  • Alertas de estoque baixo: {alertas_criados_baixo}")
        
        self.stdout.write("="*50)