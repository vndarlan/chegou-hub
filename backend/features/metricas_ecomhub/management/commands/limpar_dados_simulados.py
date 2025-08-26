# backend/features/metricas_ecomhub/management/commands/limpar_dados_simulados.py
from django.core.management.base import BaseCommand
from django.db import transaction
from features.metricas_ecomhub.models import PedidoStatusAtual, HistoricoStatus
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Remove todos os dados simulados/fictícios do sistema'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Apenas mostra o que seria removido, sem executar',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Executa a remoção sem confirmação',
        )

    def handle(self, *args, **options):
        """Remove dados simulados/fictícios do banco de dados"""
        
        # Buscar pedidos com dados simulados
        pedidos_exemplo = PedidoStatusAtual.objects.filter(
            customer_email__icontains='exemplo.com'
        )
        
        pedidos_simulados = PedidoStatusAtual.objects.filter(
            customer_name__icontains='Cliente Simulado'
        )
        
        pedidos_teste = PedidoStatusAtual.objects.filter(
            customer_name__icontains='Cliente Teste'  
        )
        
        # Contar total
        total_exemplo = pedidos_exemplo.count()
        total_simulados = pedidos_simulados.count() 
        total_teste = pedidos_teste.count()
        
        self.stdout.write(f"\n=== DADOS SIMULADOS ENCONTRADOS ===")
        self.stdout.write(f"Pedidos com @exemplo.com: {total_exemplo}")
        self.stdout.write(f"Pedidos com 'Cliente Simulado': {total_simulados}")
        self.stdout.write(f"Pedidos com 'Cliente Teste': {total_teste}")
        
        if total_exemplo == 0 and total_simulados == 0 and total_teste == 0:
            self.stdout.write(self.style.SUCCESS("\nNenhum dado simulado encontrado! Sistema limpo."))
            return
        
        # Mostrar exemplos
        if total_exemplo > 0:
            self.stdout.write(f"\nExemplos de pedidos @exemplo.com:")
            for p in pedidos_exemplo[:3]:
                self.stdout.write(f"  - ID: {p.pedido_id}, Nome: {p.customer_name}")
        
        if total_simulados > 0:
            self.stdout.write(f"\nExemplos de pedidos simulados:")
            for p in pedidos_simulados[:3]:
                self.stdout.write(f"  - ID: {p.pedido_id}, Email: {p.customer_email}")
        
        if total_teste > 0:
            self.stdout.write(f"\nExemplos de pedidos teste:")
            for p in pedidos_teste[:3]:
                self.stdout.write(f"  - ID: {p.pedido_id}, Email: {p.customer_email}")
        
        # Se é dry-run, apenas mostrar
        if options['dry_run']:
            self.stdout.write(self.style.WARNING(f"\n[DRY-RUN] Seriam removidos {total_exemplo + total_simulados + total_teste} pedidos simulados"))
            return
        
        # Confirmação
        if not options['force']:
            confirm = input(f"\nDeseja REMOVER PERMANENTEMENTE {total_exemplo + total_simulados + total_teste} pedidos simulados? (digite 'CONFIRMO' para prosseguir): ")
            if confirm != 'CONFIRMO':
                self.stdout.write(self.style.ERROR("Operação cancelada pelo usuário."))
                return
        
        # Executar remoção
        try:
            with transaction.atomic():
                # Remover histórico primeiro
                historico_removido = 0
                
                if total_exemplo > 0:
                    pedidos_ids = list(pedidos_exemplo.values_list('id', flat=True))
                    historico_removido += HistoricoStatus.objects.filter(pedido_id__in=pedidos_ids).delete()[0]
                    pedidos_exemplo.delete()
                
                if total_simulados > 0:
                    pedidos_ids = list(pedidos_simulados.values_list('id', flat=True))
                    historico_removido += HistoricoStatus.objects.filter(pedido_id__in=pedidos_ids).delete()[0]
                    pedidos_simulados.delete()
                
                if total_teste > 0:
                    pedidos_ids = list(pedidos_teste.values_list('id', flat=True))
                    historico_removido += HistoricoStatus.objects.filter(pedido_id__in=pedidos_ids).delete()[0]
                    pedidos_teste.delete()
                
                # Verificar limpeza
                restantes_exemplo = PedidoStatusAtual.objects.filter(customer_email__icontains='exemplo.com').count()
                restantes_simulados = PedidoStatusAtual.objects.filter(customer_name__icontains='Cliente Simulado').count()
                restantes_teste = PedidoStatusAtual.objects.filter(customer_name__icontains='Cliente Teste').count()
                
                total_restantes = restantes_exemplo + restantes_simulados + restantes_teste
                
                if total_restantes == 0:
                    self.stdout.write(self.style.SUCCESS(f"\nLIMPEZA CONCLUIDA COM SUCESSO!"))
                    self.stdout.write(f"  - {historico_removido} registros de histórico removidos")
                    self.stdout.write(f"  - {total_exemplo + total_simulados + total_teste} pedidos simulados removidos")
                    self.stdout.write(f"  - 0 pedidos simulados restantes")
                else:
                    self.stdout.write(self.style.ERROR(f"\nLIMPEZA PARCIAL: {total_restantes} pedidos simulados ainda restam"))
                
        except Exception as e:
            logger.error(f"Erro durante limpeza de dados simulados: {str(e)}")
            self.stdout.write(self.style.ERROR(f"\nERRO durante limpeza: {str(e)}"))
            raise