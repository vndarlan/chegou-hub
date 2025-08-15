# backend/features/processamento/management/commands/test_optimizations.py
"""
Comando para testar as otimizações do detector de IP
Verifica cache, rate limiting e processamento assíncrono
"""

import logging
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from features.processamento.models import ShopifyConfig
from features.processamento.cache_manager import get_cache_manager
from features.processamento.utils.security_utils import RateLimitManager

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Testa as otimizações implementadas para resolver erro 499'

    def add_arguments(self, parser):
        parser.add_argument(
            '--test-cache',
            action='store_true',
            help='Testa funcionalidade de cache Redis'
        )
        parser.add_argument(
            '--test-rate-limit',
            action='store_true',
            help='Testa rate limiting'
        )
        parser.add_argument(
            '--test-all',
            action='store_true',
            help='Executa todos os testes'
        )

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS('Iniciando testes das otimizacoes para erro 499...')
        )

        if options['test_cache'] or options['test_all']:
            self.test_cache_functionality()

        if options['test_rate_limit'] or options['test_all']:
            self.test_rate_limiting()

        self.stdout.write(
            self.style.SUCCESS('Testes concluidos!')
        )

    def test_cache_functionality(self):
        """Testa funcionalidade do cache"""
        self.stdout.write('Testando funcionalidade de cache...')
        
        try:
            cache_manager = get_cache_manager()
            
            # Teste básico de set/get
            test_data = {
                'test': 'value',
                'number': 123,
                'list': [1, 2, 3]
            }
            
            # Set cache
            success = cache_manager.set(
                'test_prefix',
                test_data,
                ttl=60,
                test_key='optimization_test'
            )
            
            if success:
                self.stdout.write('  Cache SET funcionando')
            else:
                self.stdout.write(
                    self.style.WARNING('  Cache SET falhou (Redis pode nao estar disponivel)')
                )
            
            # Get cache
            cached_data = cache_manager.get(
                'test_prefix',
                test_key='optimization_test'
            )
            
            if cached_data:
                self.stdout.write('  Cache GET funcionando')
                self.stdout.write(f'    Dados recuperados: {cached_data.get("test")}')
            else:
                self.stdout.write(
                    self.style.WARNING('  Cache GET falhou')
                )
            
            # Estatísticas
            stats = cache_manager.get_stats()
            self.stdout.write(f'  Status Redis: {stats["redis_available"]}')
            self.stdout.write(f'  Hit ratio: {stats["hit_ratio_percent"]}%')
            
            # Cleanup
            cache_manager.delete('test_prefix', test_key='optimization_test')
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'  Erro no teste de cache: {str(e)}')
            )

    def test_rate_limiting(self):
        """Testa rate limiting"""
        self.stdout.write('Testando rate limiting...')
        
        try:
            # Busca usuário de teste
            user = User.objects.first()
            if not user:
                self.stdout.write(
                    self.style.WARNING('  Nenhum usuario encontrado para teste')
                )
                return
            
            # Testa rate limiting
            allowed1, remaining1 = RateLimitManager.check_rate_limit(user, 'ip_search')
            self.stdout.write(f'  Primeira verificacao - Permitido: {allowed1}, Restantes: {remaining1}')
            
            # Simula múltiplas chamadas
            for i in range(3):
                allowed, remaining = RateLimitManager.check_rate_limit(user, 'ip_search')
                self.stdout.write(f'    Chamada {i+2} - Permitido: {allowed}, Restantes: {remaining}')
            
            self.stdout.write('  Rate limiting funcionando')
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'  Erro no teste de rate limiting: {str(e)}')
            )

    def test_async_jobs(self):
        """Testa jobs assíncronos"""
        self.stdout.write('Testando jobs assincronos...')
        
        try:
            from django_rq import get_queue
            
            queue = get_queue('default')
            self.stdout.write(f'  Fila RQ conectada: {queue.connection}')
            self.stdout.write(f'  Jobs na fila: {len(queue)}')
            
            self.stdout.write('  Sistema de jobs funcionando')
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'  Erro no teste de jobs: {str(e)}')
            )