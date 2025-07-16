"""
from django.core.management.base import BaseCommand
import django_rq
import sys
import os
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Inicia worker RQ para processamento background do ECOMHUB'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--queue',
            default='default',
            help='Nome da fila (default: default)'
        )
        parser.add_argument(
            '--verbosity',
            type=int,
            default=1,
            help='Nível de verbosidade (0, 1, 2)'
        )
        parser.add_argument(
            '--burst',
            action='store_true',
            help='Executa em modo burst (processa jobs e sai)'
        )
    
    def handle(self, *args, **options):
        queue_name = options['queue']
        verbosity = options['verbosity']
        burst_mode = options['burst']
        
        if verbosity >= 1:
            self.stdout.write(
                self.style.SUCCESS(f'🚀 Iniciando worker RQ para fila: {queue_name}')
            )
            
            if burst_mode:
                self.stdout.write('⚡ Modo burst ativado (processa e sai)')
        
        try:
            # Verificar se Redis está disponível
            worker = django_rq.get_worker(queue_name)
            
            if verbosity >= 1:
                self.stdout.write('✅ Worker conectado ao Redis')
                self.stdout.write(f'📋 Processando jobs da fila: {queue_name}')
                
                if not burst_mode:
                    self.stdout.write('⏹️  Pressione Ctrl+C para parar')
                
                # Informações do ambiente
                env_info = []
                if os.getenv('RAILWAY_ENVIRONMENT_NAME'):
                    env_info.append(f"Railway ({os.getenv('RAILWAY_ENVIRONMENT_NAME')})")
                if os.getenv('REDIS_URL'):
                    env_info.append("Redis configurado")
                
                if env_info:
                    self.stdout.write(f'🔧 Ambiente: {", ".join(env_info)}')
            
            # Iniciar worker
            if burst_mode:
                # Modo burst: processa jobs pendentes e sai
                worker.work(burst=True)
                if verbosity >= 1:
                    self.stdout.write(self.style.SUCCESS('✅ Modo burst concluído'))
            else:
                # Modo contínuo: fica rodando
                worker.work()
            
        except KeyboardInterrupt:
            if verbosity >= 1:
                self.stdout.write(
                    self.style.WARNING('\\n⚠️  Worker interrompido pelo usuário')
                )
            sys.exit(0)
            
        except ConnectionError as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Erro de conexão com Redis: {e}')
            )
            self.stdout.write(
                self.style.WARNING('💡 Verifique se o Redis está rodando e a configuração REDIS_URL')
            )
            sys.exit(1)
            
        except ImportError as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Erro de importação: {e}')
            )
            self.stdout.write(
                self.style.WARNING('💡 Instale as dependências: pip install django-rq redis rq')
            )
            sys.exit(1)
            
        except Exception as e:
            logger.error(f"Erro inesperado no worker: {e}")
            self.stdout.write(
                self.style.ERROR(f'❌ Erro inesperado no worker: {e}')
            )
            sys.exit(1)
"""