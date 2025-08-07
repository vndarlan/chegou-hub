"""
Comando para testar o sistema de upload de imagens do feedback
"""
import os
from django.core.management.base import BaseCommand
from django.conf import settings
from django.contrib.auth.models import User
from features.feedback.models import Feedback


class Command(BaseCommand):
    help = 'Testa o sistema de upload de imagens do feedback'

    def handle(self, *args, **options):
        self.stdout.write('[TESTE] Testando sistema de upload do feedback...')
        
        # 1. Verificar configurações de media
        self.stdout.write(f'[CONFIG] MEDIA_ROOT: {settings.MEDIA_ROOT}')
        self.stdout.write(f'[CONFIG] MEDIA_URL: {settings.MEDIA_URL}')
        
        # 2. Verificar se diretório media existe
        if os.path.exists(settings.MEDIA_ROOT):
            self.stdout.write(self.style.SUCCESS(f'[OK] Diretório media existe: {settings.MEDIA_ROOT}'))
        else:
            self.stdout.write(self.style.WARNING(f'[AVISO] Diretório media não existe: {settings.MEDIA_ROOT}'))
            
        # 3. Verificar diretório feedback
        feedback_dir = os.path.join(settings.MEDIA_ROOT, 'feedback')
        if os.path.exists(feedback_dir):
            self.stdout.write(self.style.SUCCESS(f'[OK] Diretório feedback existe: {feedback_dir}'))
        else:
            self.stdout.write(self.style.WARNING(f'[AVISO] Diretório feedback não existe: {feedback_dir}'))
            
        # 4. Tentar criar diretório feedback se não existir
        try:
            os.makedirs(feedback_dir, exist_ok=True)
            self.stdout.write(self.style.SUCCESS(f'[OK] Diretório feedback criado/verificado: {feedback_dir}'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'[ERRO] Erro ao criar diretório feedback: {e}'))
            
        # 5. Verificar permissões
        try:
            test_file = os.path.join(feedback_dir, 'test_permissions.txt')
            with open(test_file, 'w') as f:
                f.write('teste de permissões')
            os.remove(test_file)
            self.stdout.write(self.style.SUCCESS('[OK] Permissões de escrita OK'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'[ERRO] Erro de permissões: {e}'))
            
        # 6. Listar feedbacks existentes com imagem
        feedbacks_with_image = Feedback.objects.exclude(imagem='').exclude(imagem=None)
        self.stdout.write(f'[DADOS] Feedbacks com imagem no banco: {feedbacks_with_image.count()}')
        
        for feedback in feedbacks_with_image[:5]:  # Mostrar apenas os primeiros 5
            image_path = feedback.imagem.name if feedback.imagem else 'N/A'
            full_path = os.path.join(settings.MEDIA_ROOT, image_path) if image_path != 'N/A' else 'N/A'
            exists = os.path.exists(full_path) if full_path != 'N/A' else False
            
            status = "OK" if exists else "FALTA"
            self.stdout.write(f'  - ID {feedback.id}: {image_path} (Arquivo: {status})')
            
        self.stdout.write(self.style.SUCCESS('[SUCESSO] Teste de upload do feedback concluído!'))