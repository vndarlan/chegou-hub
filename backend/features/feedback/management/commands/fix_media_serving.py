import os
import shutil
from django.core.management.base import BaseCommand
from django.conf import settings
from features.feedback.models import Feedback


class Command(BaseCommand):
    help = 'Corrige serving de media files em producao'

    def handle(self, *args, **options):
        self.stdout.write("CORRECAO DE MEDIA FILES - FEEDBACK")
        self.stdout.write("=" * 50)
        
        # Verificar se estamos em produção
        if settings.DEBUG:
            self.stdout.write("Ambiente de desenvolvimento detectado.")
            self.stdout.write("Media files ja estao sendo servidos corretamente.")
            return
        
        # Em produção, garantir que pasta media dentro de staticfiles existe
        production_media_path = settings.MEDIA_ROOT
        self.stdout.write(f"Pasta de media em producao: {production_media_path}")
        
        # Criar pasta se não existir
        os.makedirs(production_media_path, exist_ok=True)
        
        # Criar subpasta feedback
        feedback_path = os.path.join(production_media_path, 'feedback')
        os.makedirs(feedback_path, exist_ok=True)
        
        self.stdout.write("Pastas de media criadas com sucesso.")
        
        # Verificar se há arquivos para migrar de uma pasta local media/
        local_media_path = settings.BASE_DIR / 'media'
        if os.path.exists(local_media_path):
            local_feedback_path = os.path.join(local_media_path, 'feedback')
            if os.path.exists(local_feedback_path):
                files = os.listdir(local_feedback_path)
                if files:
                    self.stdout.write(f"Migrando {len(files)} arquivos para pasta de producao...")
                    for file in files:
                        src = os.path.join(local_feedback_path, file)
                        dst = os.path.join(feedback_path, file)
                        shutil.copy2(src, dst)
                        self.stdout.write(f"  Migrado: {file}")
        
        # Verificar status final
        feedback_files = []
        if os.path.exists(feedback_path):
            feedback_files = os.listdir(feedback_path)
        
        self.stdout.write(f"Arquivos na pasta final: {len(feedback_files)}")
        for file in feedback_files:
            self.stdout.write(f"  - {file}")
        
        # Testar URLs geradas pelo Django
        feedbacks = Feedback.objects.filter(imagem__isnull=False).exclude(imagem='')
        self.stdout.write(f"Feedbacks com imagem no banco: {feedbacks.count()}")
        
        for feedback in feedbacks:
            try:
                url = feedback.imagem.url
                path = feedback.imagem.path
                exists = os.path.exists(path)
                self.stdout.write(f"ID {feedback.id}: {url} -> Existe: {exists}")
            except Exception as e:
                self.stdout.write(f"ID {feedback.id}: Erro -> {e}")
        
        self.stdout.write("=" * 50)
        self.stdout.write("Correcao concluida!")
        self.stdout.write("IMPORTANTE: Faca deploy para aplicar as mudancas em producao.")