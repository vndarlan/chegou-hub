import os
from django.core.management.base import BaseCommand
from django.conf import settings
from features.feedback.models import Feedback


class Command(BaseCommand):
    help = 'Testa a configuração de arquivos media do sistema de feedback'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('=== TESTE DE ARQUIVOS MEDIA ==='))
        
        # 1. Verificar configurações
        self.stdout.write(f"DEBUG: {settings.DEBUG}")
        self.stdout.write(f"MEDIA_URL: {settings.MEDIA_URL}")
        self.stdout.write(f"MEDIA_ROOT: {settings.MEDIA_ROOT}")
        
        # 2. Verificar se diretório media existe
        if os.path.exists(settings.MEDIA_ROOT):
            self.stdout.write(self.style.SUCCESS(f"OK Diretório MEDIA_ROOT existe: {settings.MEDIA_ROOT}"))
        else:
            self.stdout.write(self.style.ERROR(f"ERRO Diretório MEDIA_ROOT não existe: {settings.MEDIA_ROOT}"))
            
        # 3. Verificar diretório de feedback
        feedback_dir = os.path.join(settings.MEDIA_ROOT, 'feedback')
        if os.path.exists(feedback_dir):
            self.stdout.write(self.style.SUCCESS(f"OK Diretório feedback existe: {feedback_dir}"))
            
            # Listar arquivos
            files = os.listdir(feedback_dir)
            if files:
                self.stdout.write(f"Arquivos encontrados: {files}")
            else:
                self.stdout.write("Nenhum arquivo no diretório feedback")
        else:
            self.stdout.write(self.style.WARNING(f"AVISO Diretório feedback não existe: {feedback_dir}"))
            
        # 4. Verificar feedbacks no banco
        feedbacks_com_imagem = Feedback.objects.filter(imagem__isnull=False, imagem__gt='')
        self.stdout.write(f"Feedbacks com imagem no banco: {feedbacks_com_imagem.count()}")
        
        for feedback in feedbacks_com_imagem:
            self.stdout.write(f"- {feedback.titulo}")
            
            if feedback.imagem and feedback.imagem.name:
                self.stdout.write(f"  Arquivo: {feedback.imagem.name}")
                
                try:
                    url = feedback.imagem.url
                    self.stdout.write(f"  URL: {url}")
                    
                    # Verificar se arquivo físico existe
                    full_path = feedback.imagem.path
                    if os.path.exists(full_path):
                        self.stdout.write(self.style.SUCCESS(f"  OK Arquivo físico existe: {full_path}"))
                    else:
                        self.stdout.write(self.style.ERROR(f"  ERRO Arquivo físico não existe: {full_path}"))
                except ValueError as e:
                    self.stdout.write(self.style.ERROR(f"  ERRO: {e}"))
            else:
                self.stdout.write("  ERRO: Campo imagem vazio")
                
        self.stdout.write(self.style.SUCCESS('=== TESTE CONCLUÍDO ==='))