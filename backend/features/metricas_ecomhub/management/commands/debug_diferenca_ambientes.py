# backend/features/metricas_ecomhub/management/commands/debug_diferenca_ambientes.py
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import date, timedelta
from features.metricas_ecomhub.services import status_tracking_service
from core.middleware.ultra_logging import ultra_logging

class Command(BaseCommand):
    help = 'Debug ultra-detalhado para identificar diferenças entre ambiente local e produção'

    def add_arguments(self, parser):
        parser.add_argument(
            '--data-inicio',
            type=str,
            help='Data de início no formato YYYY-MM-DD (padrão: 7 dias atrás)'
        )
        parser.add_argument(
            '--data-fim',
            type=str,
            help='Data de fim no formato YYYY-MM-DD (padrão: hoje)'
        )
        parser.add_argument(
            '--pais-id',
            type=str,
            default='todos',
            help='ID do país (padrão: todos)'
        )

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS('🔍 INICIANDO DEBUG ULTRA-DETALHADO - DIFERENÇAS ENTRE AMBIENTES')
        )
        self.stdout.write('='*100)
        
        # Definir período padrão
        data_fim = date.today()
        data_inicio = data_fim - timedelta(days=7)
        
        # Usar datas fornecidas se disponíveis
        if options['data_inicio']:
            try:
                data_inicio = date.fromisoformat(options['data_inicio'])
            except ValueError:
                self.stdout.write(
                    self.style.ERROR(f'Data início inválida: {options["data_inicio"]}')
                )
                return
        
        if options['data_fim']:
            try:
                data_fim = date.fromisoformat(options['data_fim'])
            except ValueError:
                self.stdout.write(
                    self.style.ERROR(f'Data fim inválida: {options["data_fim"]}')
                )
                return
        
        pais_id = options['pais_id']
        
        self.stdout.write(f'📅 Período: {data_inicio} a {data_fim}')
        self.stdout.write(f'🌍 País: {pais_id}')
        self.stdout.write(f'🏷️ Ambiente: {ultra_logging.ambiente}')
        self.stdout.write('='*100)
        
        try:
            # Log inicial
            ultra_logging.logger.info("🚀 COMANDO DEBUG EXECUTADO MANUALMENTE")
            ultra_logging.logger.info(f"📋 Parâmetros: {data_inicio} a {data_fim}, país {pais_id}")
            
            # Executar sincronização com ultra logging
            resultado = status_tracking_service.sincronizar_dados_pedidos(
                data_inicio=data_inicio,
                data_fim=data_fim,
                pais_id=pais_id,
                forcar=True  # Sempre forçar para debug
            )
            
            # Relatório final
            self.stdout.write('='*100)
            self.stdout.write(self.style.SUCCESS('✅ DEBUG COMPLETO'))
            self.stdout.write('='*100)
            
            if resultado['status'] == 'success':
                self.stdout.write(self.style.SUCCESS(f'✅ {resultado["message"]}'))
                
                dados_proc = resultado.get('dados_processados', {})
                if dados_proc:
                    total = dados_proc.get('total_processados', 0)
                    novos = dados_proc.get('novos_pedidos', 0)
                    atualizados = dados_proc.get('pedidos_atualizados', 0)
                    
                    self.stdout.write(f'📊 Total processados: {total}')
                    self.stdout.write(f'🆕 Novos pedidos: {novos}')
                    self.stdout.write(f'🔄 Pedidos atualizados: {atualizados}')
            else:
                self.stdout.write(self.style.ERROR(f'❌ {resultado["message"]}'))
            
            self.stdout.write('='*100)
            self.stdout.write('🔍 ANÁLISE COMPLETA DISPONÍVEL NOS LOGS DO SISTEMA')
            self.stdout.write('📋 Procure por logs com prefixos:')
            self.stdout.write(f'   - [{ultra_logging.ambiente}]')
            self.stdout.write('   - 🚀 REQUISIÇÃO ULTRA-DETALHADA')
            self.stdout.write('   - 📡 RESPOSTA ULTRA-DETALHADA')
            self.stdout.write('   - 🎯 INVESTIGAÇÃO CRÍTICA')
            self.stdout.write('='*100)
            
        except Exception as e:
            ultra_logging.log_erro_detalhado(e, "Comando debug_diferenca_ambientes")
            self.stdout.write(
                self.style.ERROR(f'❌ Erro durante debug: {str(e)}')
            )
        
        self.stdout.write(
            self.style.SUCCESS('🏁 DEBUG ULTRA-DETALHADO FINALIZADO')
        )