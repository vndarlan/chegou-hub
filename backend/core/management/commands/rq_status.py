"""
from django.core.management.base import BaseCommand
import django_rq
from rq import Queue
import redis

class Command(BaseCommand):
    help = 'Mostra status das filas RQ'
    
    def handle(self, *args, **options):
        try:
            # Conectar ao Redis
            connection = django_rq.get_connection('default')
            queue = django_rq.get_queue('default')
            
            self.stdout.write(self.style.SUCCESS('📊 Status das Filas RQ'))
            self.stdout.write('=' * 50)
            
            # Status da fila
            self.stdout.write(f'📋 Fila: default')
            self.stdout.write(f'📦 Jobs pendentes: {len(queue)}')
            self.stdout.write(f'🔄 Jobs executando: {queue.started_job_registry.count}')
            self.stdout.write(f'✅ Jobs concluídos: {queue.finished_job_registry.count}')
            self.stdout.write(f'❌ Jobs falharam: {queue.failed_job_registry.count}')
            
            # Workers ativos
            workers = django_rq.get_workers('default')
            self.stdout.write(f'👷 Workers ativos: {len(workers)}')
            
            for worker in workers:
                status = 'ocupado' if worker.get_current_job() else 'livre'
                self.stdout.write(f'  - {worker.name}: {status}')
            
            # Jobs em execução
            if queue.started_job_registry.count > 0:
                self.stdout.write('\\n🔄 Jobs em execução:')
                for job_id in queue.started_job_registry.get_job_ids():
                    try:
                        job = queue.job_class.fetch(job_id, connection=connection)
                        self.stdout.write(f'  - {job.func_name}: {job.id}')
                    except:
                        pass
            
            # Jobs falharam (últimos 5)
            if queue.failed_job_registry.count > 0:
                self.stdout.write('\\n❌ Jobs que falharam (últimos 5):')
                failed_jobs = queue.failed_job_registry.get_job_ids()[:5]
                for job_id in failed_jobs:
                    try:
                        job = queue.job_class.fetch(job_id, connection=connection)
                        self.stdout.write(f'  - {job.func_name}: {job.exc_info}')
                    except:
                        pass
        
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Erro ao obter status: {e}')
            )
"""