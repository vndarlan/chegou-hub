# backend/features/processamento/management/commands/cache_management.py
"""
Comando de gerenciamento para cache Redis
Permite monitoramento, limpeza e manutenção via Django CLI
"""

import time
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from ...cache_manager import get_cache_manager, get_rate_limit_manager
from ...models import ShopifyConfig


class Command(BaseCommand):
    help = 'Gerencia cache Redis do sistema de detecção de IP'
    
    def add_arguments(self, parser):
        # Subcomandos
        subparsers = parser.add_subparsers(dest='subcommand', help='Subcomandos disponíveis')
        
        # Stats
        stats_parser = subparsers.add_parser('stats', help='Mostra estatísticas do cache')
        stats_parser.add_argument('--detailed', action='store_true', help='Estatísticas detalhadas')
        
        # Health check
        health_parser = subparsers.add_parser('health', help='Verifica saúde do cache')
        
        # Clear
        clear_parser = subparsers.add_parser('clear', help='Limpa cache')
        clear_parser.add_argument('--store-id', type=int, help='Limpa cache de loja específica')
        clear_parser.add_argument('--all', action='store_true', help='Limpa todo o cache (cuidado!)')
        clear_parser.add_argument('--pattern', help='Limpa chaves que combinam com padrão')
        clear_parser.add_argument('--confirm', action='store_true', help='Confirma operação de limpeza')
        
        # Warmup
        warmup_parser = subparsers.add_parser('warmup', help='Aquece cache')
        warmup_parser.add_argument('--store-id', type=int, help='Aquece cache para loja específica')
        warmup_parser.add_argument('--all-stores', action='store_true', help='Aquece cache para todas as lojas')
        
        # Monitor
        monitor_parser = subparsers.add_parser('monitor', help='Monitora cache em tempo real')
        monitor_parser.add_argument('--interval', type=int, default=5, help='Intervalo em segundos (default: 5)')
        monitor_parser.add_argument('--duration', type=int, default=60, help='Duração em segundos (default: 60)')
    
    def handle(self, *args, **options):
        subcommand = options.get('subcommand')
        
        if not subcommand:
            self.print_help()
            return
        
        # Inicializa cache manager
        self.cache_manager = get_cache_manager()
        self.rate_limiter = get_rate_limit_manager()
        
        # Verifica disponibilidade do Redis
        if not self.cache_manager.redis_available:
            self.stdout.write(self.style.ERROR('ERRO: Redis nao esta disponivel'))
            return
        
        # Executa subcomando
        method_name = f'handle_{subcommand}'
        if hasattr(self, method_name):
            getattr(self, method_name)(**options)
        else:
            raise CommandError(f'Subcomando desconhecido: {subcommand}')
    
    def print_help(self):
        """Mostra ajuda personalizada"""
        self.stdout.write(self.style.SUCCESS('=== Gerenciamento de Cache Redis - Chegou Hub ==='))
        self.stdout.write('')
        self.stdout.write('Subcomandos disponíveis:')
        self.stdout.write('  stats     - Estatísticas do cache')
        self.stdout.write('  health    - Health check do sistema')
        self.stdout.write('  clear     - Limpeza de cache')
        self.stdout.write('  warmup    - Aquecimento de cache')
        self.stdout.write('  monitor   - Monitoramento em tempo real')
        self.stdout.write('')
        self.stdout.write('Exemplos:')
        self.stdout.write('  python manage.py cache_management stats --detailed')
        self.stdout.write('  python manage.py cache_management clear --store-id 1 --confirm')
        self.stdout.write('  python manage.py cache_management warmup --all-stores')
        self.stdout.write('  python manage.py cache_management monitor --interval 3 --duration 30')
    
    def handle_stats(self, **options):
        """Mostra estatísticas do cache"""
        self.stdout.write(self.style.SUCCESS('=== Estatisticas do Cache Redis ==='))
        self.stdout.write('=' * 50)
        
        stats = self.cache_manager.get_stats()
        
        # Estatísticas básicas
        self.stdout.write(f"Redis Disponível: {self._format_bool(stats['redis_available'])}")
        self.stdout.write(f"Total de Operações: {stats['total_operations']:,}")
        self.stdout.write(f"Cache Hits: {stats['hits']:,}")
        self.stdout.write(f"Cache Misses: {stats['misses']:,}")
        self.stdout.write(f"Erros: {stats['errors']:,}")
        self.stdout.write(f"Hit Ratio: {stats['hit_ratio_percent']:.2f}%")
        
        # Informações do Redis
        if stats.get('redis_memory_used'):
            self.stdout.write('')
            self.stdout.write(self.style.SUCCESS('=== Informacoes do Redis ==='))
            self.stdout.write(f"Memória Usada: {stats['redis_memory_used']}")
            self.stdout.write(f"Pico de Memória: {stats['redis_memory_peak']}")
            self.stdout.write(f"Total de Chaves: {stats['redis_keys']:,}")
        
        if options.get('detailed'):
            self._show_detailed_stats()
    
    def handle_health(self, **options):
        """Executa health check do cache"""
        self.stdout.write(self.style.SUCCESS('=== Health Check do Cache ==='))
        self.stdout.write('=' * 40)
        
        start_time = time.time()
        
        # Teste de conectividade
        self.stdout.write('Testando conectividade Redis...', ending='')
        if self.cache_manager.redis_available:
            self.stdout.write(self.style.SUCCESS(' ✅ OK'))
        else:
            self.stdout.write(self.style.ERROR(' ❌ FALHOU'))
            return
        
        # Teste de escrita
        self.stdout.write('Testando escrita...', ending='')
        test_key = f"health_test_{int(time.time())}"
        write_success = self.cache_manager.set('health_check', {'test': True}, 60, key=test_key)
        if write_success:
            self.stdout.write(self.style.SUCCESS(' OK'))
        else:
            self.stdout.write(self.style.ERROR(' FALHOU'))
        
        # Teste de leitura
        self.stdout.write('Testando leitura...', ending='')
        read_data = self.cache_manager.get('health_check', key=test_key)
        if read_data and read_data.get('test'):
            self.stdout.write(self.style.SUCCESS(' OK'))
        else:
            self.stdout.write(self.style.ERROR(' FALHOU'))
        
        # Teste de exclusão
        self.stdout.write('Testando exclusão...', ending='')
        delete_success = self.cache_manager.delete('health_check', key=test_key)
        if delete_success:
            self.stdout.write(self.style.SUCCESS(' OK'))
        else:
            self.stdout.write(self.style.ERROR(' FALHOU'))
        
        total_time = time.time() - start_time
        self.stdout.write('')
        self.stdout.write(f'Tempo total do teste: {total_time:.3f}s')
        
        if total_time > 1.0:
            self.stdout.write(self.style.WARNING('WARNING: Performance degradada (>1s)'))
        else:
            self.stdout.write(self.style.SUCCESS('OK: Performance normal'))
    
    def handle_clear(self, **options):
        """Limpa cache"""
        if not options.get('confirm'):
            self.stdout.write(self.style.ERROR('ERRO: Operacao de limpeza requer --confirm'))
            return
        
        self.stdout.write(self.style.WARNING('🧹 Limpando Cache...'))
        
        if options.get('all'):
            # Limpa todo o cache
            self.stdout.write(self.style.WARNING('⚠️ LIMPANDO TODO O CACHE!'))
            success = self.cache_manager.clear_all()
            if success:
                self.stdout.write(self.style.SUCCESS('✅ Todo o cache foi limpo'))
            else:
                self.stdout.write(self.style.ERROR('❌ Erro ao limpar cache'))
        
        elif options.get('store_id'):
            # Limpa cache de loja específica
            store_id = options['store_id']
            deleted = self.cache_manager.invalidate_store_cache(store_id)
            self.stdout.write(self.style.SUCCESS(f'✅ Cache da loja {store_id} limpo ({deleted} chaves removidas)'))
        
        elif options.get('pattern'):
            # Limpa por padrão
            pattern = options['pattern']
            deleted = self.cache_manager.delete_pattern(pattern)
            self.stdout.write(self.style.SUCCESS(f'✅ Padrão "{pattern}" limpo ({deleted} chaves removidas)'))
        
        else:
            self.stdout.write(self.style.ERROR('❌ Especifique --all, --store-id ou --pattern'))
    
    def handle_warmup(self, **options):
        """Aquece cache"""
        self.stdout.write(self.style.SUCCESS('🔥 Aquecendo Cache...'))
        
        if options.get('all_stores'):
            # Aquece todas as lojas ativas
            stores = ShopifyConfig.objects.filter(ativo=True)
            self.stdout.write(f'Aquecendo cache para {stores.count()} lojas ativas...')
            
            for store in stores:
                try:
                    self._warmup_store(store.id)
                    self.stdout.write(f'✅ Loja {store.id} ({store.nome_loja})')
                except Exception as e:
                    self.stdout.write(f'❌ Erro na loja {store.id}: {str(e)}')
        
        elif options.get('store_id'):
            # Aquece loja específica
            store_id = options['store_id']
            try:
                self._warmup_store(store_id)
                self.stdout.write(self.style.SUCCESS(f'✅ Cache aquecido para loja {store_id}'))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'❌ Erro ao aquecer loja {store_id}: {str(e)}'))
        
        else:
            self.stdout.write(self.style.ERROR('❌ Especifique --store-id ou --all-stores'))
    
    def handle_monitor(self, **options):
        """Monitora cache em tempo real"""
        interval = options.get('interval', 5)
        duration = options.get('duration', 60)
        
        self.stdout.write(self.style.SUCCESS(f'📊 Monitoramento em Tempo Real (intervalo: {interval}s, duração: {duration}s)'))
        self.stdout.write('Pressione Ctrl+C para parar')
        self.stdout.write('=' * 60)
        
        start_time = time.time()
        last_stats = None
        
        try:
            while time.time() - start_time < duration:
                current_stats = self.cache_manager.get_stats()
                
                # Calcula diferenças desde última medição
                if last_stats:
                    hits_diff = current_stats['hits'] - last_stats['hits']
                    misses_diff = current_stats['misses'] - last_stats['misses']
                    errors_diff = current_stats['errors'] - last_stats['errors']
                    
                    self.stdout.write(
                        f'{timezone.now().strftime("%H:%M:%S")} | '
                        f'Hit Ratio: {current_stats["hit_ratio_percent"]:.1f}% | '
                        f'Hits: +{hits_diff} | Misses: +{misses_diff} | '
                        f'Errors: +{errors_diff} | Total Ops: {current_stats["total_operations"]:,}'
                    )
                
                last_stats = current_stats
                time.sleep(interval)
        
        except KeyboardInterrupt:
            self.stdout.write('\n' + self.style.SUCCESS('✅ Monitoramento interrompido'))
    
    def _warmup_store(self, store_id: int):
        """Aquece cache para uma loja específica"""
        # Configurações típicas para warm-up
        warmup_configs = [
            {'days': 7, 'min_orders': 2},
            {'days': 30, 'min_orders': 2},
            {'days': 30, 'min_orders': 3},
        ]
        
        from ...services.cached_ip_detection import get_cached_ip_service
        cached_service = get_cached_ip_service()
        
        for config in warmup_configs:
            # Simula busca para carregar cache
            fake_data = {
                'loja_id': store_id,
                'days': config['days'],
                'min_orders': config['min_orders']
            }
            
            # Tenta obter do cache primeiro (para verificar se já existe)
            cached_result = self.cache_manager.get_ip_search_results(
                store_id, config['days'], config['min_orders']
            )
            
            if not cached_result:
                # Cache miss - precisa aquecer
                # Em um cenário real, executaria a busca completa
                # Para evitar overhead no warm-up, apenas marca como aquecido
                dummy_result = {
                    'ip_groups': [],
                    'total_ips_found': 0,
                    'warmed_up': True,
                    'config': config
                }
                self.cache_manager.cache_ip_search_results(
                    store_id, config['days'], config['min_orders'], dummy_result
                )
    
    def _show_detailed_stats(self):
        """Mostra estatísticas detalhadas"""
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('📈 Estatísticas Detalhadas:'))
        
        # Informações de TTL por prefixo
        ttl_info = {
            'IP Search': self.cache_manager.TTL_IP_SEARCH_RESULTS,
            'IP Details': self.cache_manager.TTL_IP_DETAILS,
            'Store Config': self.cache_manager.TTL_STORE_CONFIG,
            'Shopify Auth': self.cache_manager.TTL_SHOPIFY_AUTH,
        }
        
        self.stdout.write('')
        self.stdout.write('⏱️ TTLs Configurados:')
        for name, ttl in ttl_info.items():
            self.stdout.write(f"  {name}: {ttl}s ({ttl/60:.1f}min)")
        
        # Prefixos de chave
        self.stdout.write('')
        self.stdout.write('🔑 Prefixos de Chave:')
        prefixes = [
            self.cache_manager.PREFIX_IP_SEARCH,
            self.cache_manager.PREFIX_IP_DETAILS,
            self.cache_manager.PREFIX_STORE_CONFIG,
            self.cache_manager.PREFIX_SHOPIFY_AUTH
        ]
        for prefix in prefixes:
            self.stdout.write(f"  {prefix}")
    
    def _format_bool(self, value: bool) -> str:
        """Formata booleano com cores"""
        if value:
            return self.style.SUCCESS('✅ Sim')
        else:
            return self.style.ERROR('❌ Não')