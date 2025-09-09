# backend/features/estoque/management/commands/resolver_alertas_automaticos.py
from django.core.management.base import BaseCommand
from django.utils import timezone
from features.estoque.models import ProdutoEstoque, AlertaEstoque


class Command(BaseCommand):
    help = 'Verifica e resolve automaticamente alertas de estoque desatualizados'

    def add_arguments(self, parser):
        parser.add_argument(
            '--user_id',
            type=int,
            help='ID do usuário para filtrar produtos (opcional)'
        )
        parser.add_argument(
            '--loja_id', 
            type=int,
            help='ID da loja para filtrar produtos (opcional)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Executa sem fazer alterações (apenas mostra o que seria resolvido)'
        )

    def handle(self, *args, **options):
        user_id = options.get('user_id')
        loja_id = options.get('loja_id')
        dry_run = options.get('dry_run', False)
        
        self.stdout.write(
            self.style.SUCCESS('=== RESOLUÇÃO AUTOMÁTICA DE ALERTAS DE ESTOQUE ===')
        )
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING('MODO DRY-RUN: Nenhuma alteração será feita')
            )
        
        # Filtrar produtos
        produtos_query = ProdutoEstoque.objects.filter(ativo=True)
        
        if user_id:
            produtos_query = produtos_query.filter(user_id=user_id)
            self.stdout.write(f"Filtrando por usuário ID: {user_id}")
        
        if loja_id:
            produtos_query = produtos_query.filter(loja_config_id=loja_id)
            self.stdout.write(f"Filtrando por loja ID: {loja_id}")
        
        produtos = produtos_query.select_related('loja_config', 'user')
        total_produtos = produtos.count()
        
        self.stdout.write(f"Total de produtos a processar: {total_produtos}")
        self.stdout.write("=" * 60)
        
        # Contadores
        total_alertas_resolvidos = 0
        produtos_processados = 0
        alertas_por_tipo = {
            'estoque_zero': 0,
            'estoque_baixo': 0,
            'estoque_negativo': 0
        }
        
        for produto in produtos:
            produtos_processados += 1
            
            # Buscar alertas ativos para este produto
            alertas_ativos = AlertaEstoque.objects.filter(
                produto=produto,
                status='ativo'
            )
            
            if not alertas_ativos.exists():
                continue
            
            self.stdout.write(f"\nProcessando produto: {produto.sku} - {produto.nome}")
            self.stdout.write(f"Loja: {produto.loja_config.nome_loja}")
            self.stdout.write(f"Estoque atual: {produto.estoque_atual} | Mínimo: {produto.estoque_minimo}")
            self.stdout.write(f"Alertas ativos: {alertas_ativos.count()}")
            
            alertas_resolvidos_produto = 0
            
            for alerta in alertas_ativos:
                deve_resolver = False
                motivo_resolucao = ""
                
                # Verificar se alerta de estoque zero deve ser resolvido
                if alerta.tipo_alerta == 'estoque_zero' and produto.estoque_atual > 0:
                    deve_resolver = True
                    motivo_resolucao = f"Estoque atual: {produto.estoque_atual} unidades"
                    alertas_por_tipo['estoque_zero'] += 1
                
                # Verificar se alerta de estoque baixo deve ser resolvido
                elif alerta.tipo_alerta == 'estoque_baixo' and produto.estoque_atual > produto.estoque_minimo:
                    deve_resolver = True
                    motivo_resolucao = f"Estoque atual: {produto.estoque_atual} > mínimo: {produto.estoque_minimo}"
                    alertas_por_tipo['estoque_baixo'] += 1
                
                # Verificar se alerta de estoque negativo deve ser resolvido
                elif alerta.tipo_alerta == 'estoque_negativo' and produto.estoque_atual >= 0:
                    deve_resolver = True
                    motivo_resolucao = f"Estoque corrigido: {produto.estoque_atual}"
                    alertas_por_tipo['estoque_negativo'] += 1
                
                if deve_resolver:
                    self.stdout.write(
                        f"  ✓ Resolvendo alerta {alerta.tipo_alerta}: {motivo_resolucao}"
                    )
                    
                    if not dry_run:
                        alerta.resolver(
                            observacao=f"Resolvido automaticamente pelo comando: {motivo_resolucao}"
                        )
                    
                    alertas_resolvidos_produto += 1
                else:
                    self.stdout.write(
                        f"  - Mantendo alerta {alerta.tipo_alerta}: ainda necessário"
                    )
            
            if alertas_resolvidos_produto > 0:
                total_alertas_resolvidos += alertas_resolvidos_produto
                if not dry_run:
                    # Executar a verificação automática do modelo para garantir consistência
                    produto._check_and_resolve_alerts_after_adjustment()
            
            # Mostrar progresso a cada 10 produtos
            if produtos_processados % 10 == 0:
                self.stdout.write(
                    f"Progresso: {produtos_processados}/{total_produtos} produtos processados"
                )
        
        # Relatório final
        self.stdout.write("\n" + "=" * 60)
        self.stdout.write(self.style.SUCCESS("RELATÓRIO FINAL"))
        self.stdout.write(f"Produtos processados: {produtos_processados}")
        self.stdout.write(f"Total de alertas resolvidos: {total_alertas_resolvidos}")
        
        if total_alertas_resolvidos > 0:
            self.stdout.write("\nAlertas resolvidos por tipo:")
            for tipo, quantidade in alertas_por_tipo.items():
                if quantidade > 0:
                    self.stdout.write(f"  - {tipo}: {quantidade}")
        
        # Estatísticas finais
        if not dry_run and total_alertas_resolvidos > 0:
            alertas_ativos_restantes = AlertaEstoque.objects.filter(
                status='ativo'
            ).count()
            
            self.stdout.write(f"\nAlertas ativos restantes no sistema: {alertas_ativos_restantes}")
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING("\nEste foi um DRY-RUN. Nenhuma alteração foi feita.")
            )
            self.stdout.write("Para aplicar as alterações, execute o comando sem --dry-run")
        else:
            self.stdout.write(
                self.style.SUCCESS(f"\n✓ Comando executado com sucesso! {total_alertas_resolvidos} alertas resolvidos.")
            )
        
        self.stdout.write("=" * 60)