from django.core.management.base import BaseCommand
from django.conf import settings
from features.feedback.models import Feedback
import os


class Command(BaseCommand):
    help = 'Testa URLs de media files do feedback'

    def handle(self, *args, **options):
        self.stdout.write("DIAGNOSTICO DE MEDIA FILES - FEEDBACK")
        self.stdout.write("=" * 50)
        
        # 1. Configurações atuais
        self.stdout.write(f"DEBUG: {settings.DEBUG}")
        self.stdout.write(f"MEDIA_URL: {settings.MEDIA_URL}")
        self.stdout.write(f"MEDIA_ROOT: {settings.MEDIA_ROOT}")
        self.stdout.write(f"STATIC_ROOT: {settings.STATIC_ROOT}")
        
        # 2. Verificar se diretórios existem
        media_root_exists = os.path.exists(settings.MEDIA_ROOT)
        self.stdout.write(f"MEDIA_ROOT existe: {media_root_exists}")
        
        if media_root_exists:
            feedback_dir = os.path.join(settings.MEDIA_ROOT, 'feedback')
            feedback_dir_exists = os.path.exists(feedback_dir)
            self.stdout.write(f"Pasta feedback/ existe: {feedback_dir_exists}")
            
            if feedback_dir_exists:
                files = os.listdir(feedback_dir)
                self.stdout.write(f"Arquivos na pasta feedback/: {len(files)}")
                for file in files:
                    file_path = os.path.join(feedback_dir, file)
                    file_size = os.path.getsize(file_path)
                    self.stdout.write(f"  - {file} ({file_size} bytes)")
        
        # 3. Verificar feedbacks no banco
        feedbacks_with_image = Feedback.objects.filter(imagem__isnull=False).exclude(imagem='')
        self.stdout.write(f"Feedbacks com imagem no banco: {feedbacks_with_image.count()}")
        
        for feedback in feedbacks_with_image[:3]:  # Primeiros 3
            self.stdout.write(f"ID {feedback.id}:")
            self.stdout.write(f"  - Caminho no banco: {feedback.imagem}")
            self.stdout.write(f"  - URL gerada: {feedback.imagem.url}")
            
            # Verificar se arquivo físico existe
            try:
                full_path = feedback.imagem.path
                exists = os.path.exists(full_path)
                self.stdout.write(f"  - Arquivo físico existe: {exists}")
                if exists:
                    size = os.path.getsize(full_path)
                    self.stdout.write(f"  - Tamanho: {size} bytes")
            except Exception as e:
                self.stdout.write(f"  - Erro ao verificar arquivo: {e}")
        
        self.stdout.write("=" * 50)
        self.stdout.write("Diagnostico concluido")