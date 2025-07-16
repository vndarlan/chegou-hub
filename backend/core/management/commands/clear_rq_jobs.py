"""
from django.core.management.base import BaseCommand
import django_rq

class Command(BaseCommand):
    help = 'Limpa jobs das filas RQ'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--all',
            action='store_true',
            help='Limpa todos os jobs (pendentes, concluídos, falharam)'
        )
        parser.add_argument(
            '--failed',
            action='store_true',
            help='Limpa apenas jobs que falharam'
        )
        parser.add_argument(
            '--completed',
            action='store_true',
            help='Limpa apenas jobs concluídos'
        )
    
    def handle(self, *args, **options):
        queue = django_rq.get_queue('default')
        
        if options['all']:
            # Limpar tudo
            queue.empty()
            queue.failed_job_registry.clear()
            queue.finished_job_registry.clear()
            queue.started_job_registry.clear()
            queue.deferred_job_registry.clear()
            self.stdout.write(self.style.SUCCESS('🧹 Todas as filas foram limpas'))
            
        elif options['failed']:
            # Limpar apenas falharam
            count = queue.failed_job_registry.count
            queue.failed_job_registry.clear()
            self.stdout.write(self.style.SUCCESS(f'🧹 {count} jobs falhados foram removidos'))
            
        elif options['completed']:
            # Limpar apenas concluídos
            count = queue.finished_job_registry.count
            queue.finished_job_registry.clear()
            self.stdout.write(self.style.SUCCESS(f'🧹 {count} jobs concluídos foram removidos'))
            
        else:
            # Limpar apenas pendentes
            count = len(queue)
            queue.empty()
            self.stdout.write(self.style.SUCCESS(f'🧹 {count} jobs pendentes foram removidos'))
"""