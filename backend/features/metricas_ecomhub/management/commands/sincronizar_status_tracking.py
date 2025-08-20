# backend/features/metricas_ecomhub/management/commands/sincronizar_status_tracking.py
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from datetime import timedelta
from features.metricas_ecomhub.services import status_tracking_service
from features.metricas_ecomhub.models import ConfiguracaoStatusTracking
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Sincroniza dados de status tracking do EcomHub'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--data-inicio',
            type=str,
            help='Data início no formato YYYY-MM-DD (padrão: 30 dias atrás)'
        )
        
        parser.add_argument(
            '--data-fim', 
            type=str,
            help='Data fim no formato YYYY-MM-DD (padrão: hoje)'
        )
        
        parser.add_argument(
            '--pais-id',
            type=str,
            default='todos',
            help='ID do país ou "todos" (padrão: todos)'
        )
        
        parser.add_argument(
            '--forcar',
            action='store_true',
            help='Forçar sincronização mesmo se recente'
        )
        
        parser.add_argument(
            '--atualizar-tempos',
            action='store_true',
            help='Apenas atualizar tempos de status (sem sincronizar)'
        )
        
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Mostrar logs detalhados'
        )
    
    def handle(self, *args, **options):
        if options['verbose']:
            logging.basicConfig(level=logging.INFO)
        
        try:
            # Se apenas atualizar tempos
            if options['atualizar_tempos']:
                self.stdout.write('Atualizando tempos de status...')
                atualizados = status_tracking_service.atualizar_tempos_status()
                self.stdout.write(
                    self.style.SUCCESS(f'[OK] {atualizados} pedidos tiveram seus tempos atualizados')
                )
                return
            
            # Processar datas
            data_inicio = None
            data_fim = None
            
            if options['data_inicio']:
                try:
                    data_inicio = timezone.datetime.strptime(options['data_inicio'], '%Y-%m-%d').date()
                except ValueError:
                    raise CommandError('Formato de data inválido para --data-inicio. Use YYYY-MM-DD')
            
            if options['data_fim']:
                try:
                    data_fim = timezone.datetime.strptime(options['data_fim'], '%Y-%m-%d').date()
                except ValueError:
                    raise CommandError('Formato de data inválido para --data-fim. Use YYYY-MM-DD')
            
            # Exibir configuração
            self.stdout.write('[INFO] Iniciando sincronização de status tracking...')
            self.stdout.write(f'Período: {data_inicio or "30 dias atrás"} até {data_fim or "hoje"}')
            self.stdout.write(f'País: {options["pais_id"]}')
            self.stdout.write(f'Forçar: {"Sim" if options["forcar"] else "Não"}')
            self.stdout.write('')
            
            # Executar sincronização
            resultado = status_tracking_service.sincronizar_dados_pedidos(
                data_inicio=data_inicio,
                data_fim=data_fim,
                pais_id=options['pais_id'],
                forcar=options['forcar']
            )
            
            # Exibir resultado
            if resultado['status'] == 'success':
                self.stdout.write(self.style.SUCCESS('[OK] Sincronização concluída com sucesso!'))
                
                if 'dados_processados' in resultado:
                    stats = resultado['dados_processados']
                    self.stdout.write('')
                    self.stdout.write('Estatísticas:')
                    self.stdout.write(f'  - Novos pedidos: {stats.get("novos_pedidos", 0)}')
                    self.stdout.write(f'  - Pedidos atualizados: {stats.get("pedidos_atualizados", 0)}')
                    self.stdout.write(f'  - Mudanças de status: {stats.get("mudancas_status", 0)}')
                    self.stdout.write(f'  - Erros: {stats.get("erros", 0)}')
                    self.stdout.write(f'  - Total processados: {stats.get("total_processados", 0)}')
                
                if 'ultima_sincronizacao' in resultado:
                    self.stdout.write(f'Última sincronização: {resultado["ultima_sincronizacao"]}')
                    
            elif resultado['status'] == 'skipped':
                self.stdout.write(self.style.WARNING('[SKIP] Sincronização pulada (muito recente)'))
                self.stdout.write(f'Use --forcar para sincronizar novamente')
                if 'ultima_sincronizacao' in resultado:
                    self.stdout.write(f'Última sincronização: {resultado["ultima_sincronizacao"]}')
                    
            else:
                self.stdout.write(self.style.ERROR('[ERROR] Erro na sincronização:'))
                self.stdout.write(resultado.get('message', 'Erro desconhecido'))
                
                return
            
            # Exibir estatísticas gerais
            self.stdout.write('')
            self.stdout.write('Gerando estatísticas gerais...')
            
            try:
                metricas = status_tracking_service.gerar_metricas_dashboard()
                
                self.stdout.write('')
                self.stdout.write('Resumo Atual:')
                self.stdout.write(f'  - Total de pedidos: {metricas.get("total_pedidos", 0)}')
                self.stdout.write(f'  - Alertas críticos: {metricas.get("alertas_criticos", 0)}')
                self.stdout.write(f'  - Alertas vermelhos: {metricas.get("alertas_vermelhos", 0)}')
                self.stdout.write(f'  - Alertas amarelos: {metricas.get("alertas_amarelos", 0)}')
                self.stdout.write(f'  - Pedidos normais: {metricas.get("pedidos_normais", 0)}')
                
                # Top 5 status mais comuns
                dist_status = metricas.get('distribuicao_status', {})
                if dist_status:
                    self.stdout.write('')
                    self.stdout.write('Top 5 Status:')
                    top_status = sorted(dist_status.items(), key=lambda x: x[1], reverse=True)[:5]
                    for status_name, count in top_status:
                        self.stdout.write(f'  - {status_name}: {count} pedidos')
                
            except Exception as e:
                self.stdout.write(self.style.WARNING(f'[WARNING] Erro gerando estatísticas: {e}'))
            
            self.stdout.write('')
            self.stdout.write(self.style.SUCCESS('[SUCESSO] Comando executado com sucesso!'))
            
        except Exception as e:
            logger.error(f"Erro no comando de sincronização: {e}")
            raise CommandError(f'Erro inesperado: {e}')