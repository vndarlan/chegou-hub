import os
from django.core.management.base import BaseCommand
from django.conf import settings
from features.feedback.models import Feedback


class Command(BaseCommand):
    help = 'Faz teste final do sistema de mídia e mostra instruções'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('=== TESTE FINAL DO SISTEMA DE MÍDIA ==='))
        
        # 1. Verificar configurações
        self.stdout.write(f'MEDIA_URL: {settings.MEDIA_URL}')
        self.stdout.write(f'MEDIA_ROOT: {settings.MEDIA_ROOT}')
        self.stdout.write(f'DEBUG: {settings.DEBUG}')
        
        # 2. Verificar diretórios
        media_ok = os.path.exists(settings.MEDIA_ROOT)
        feedback_dir = os.path.join(settings.MEDIA_ROOT, 'feedback')
        feedback_ok = os.path.exists(feedback_dir)
        
        self.stdout.write(f'Diretório MEDIA_ROOT: {"OK" if media_ok else "ERRO"}')
        self.stdout.write(f'Diretório feedback: {"OK" if feedback_ok else "ERRO"}')
        
        # 3. Verificar feedbacks válidos
        feedbacks_validos = 0
        feedbacks_total = Feedback.objects.filter(imagem__isnull=False, imagem__gt='').count()
        
        for feedback in Feedback.objects.filter(imagem__isnull=False, imagem__gt=''):
            if feedback.imagem and feedback.imagem.name:
                try:
                    if os.path.exists(feedback.imagem.path):
                        feedbacks_validos += 1
                except:
                    pass
                    
        self.stdout.write(f'Feedbacks com imagem válida: {feedbacks_validos}/{feedbacks_total}')
        
        # 4. Verificar se tem pelo menos um válido
        if feedbacks_validos > 0:
            self.stdout.write(self.style.SUCCESS('SISTEMA DE MÍDIA: FUNCIONANDO'))
            
            # Mostrar exemplo de feedback válido
            for feedback in Feedback.objects.filter(imagem__isnull=False, imagem__gt=''):
                if feedback.imagem and feedback.imagem.name:
                    try:
                        if os.path.exists(feedback.imagem.path):
                            self.stdout.write('\nExemplo válido:')
                            self.stdout.write(f'- Título: {feedback.titulo}')
                            self.stdout.write(f'- URL: {feedback.imagem.url}')
                            self.stdout.write(f'- Arquivo: {feedback.imagem.path}')
                            break
                    except:
                        pass
        else:
            self.stdout.write(self.style.ERROR('SISTEMA DE MÍDIA: PROBLEMA'))
            
        self.stdout.write('\n=== COMO TESTAR MANUALMENTE ===')
        self.stdout.write('1. Execute: python manage.py runserver')
        self.stdout.write('2. Abra: http://127.0.0.1:8000/admin/')
        self.stdout.write('3. Login: admin / admin123')
        self.stdout.write('4. Vá para: Feedbacks')
        self.stdout.write('5. Procure por "Status da Imagem" na lista')
        self.stdout.write('6. Clique em um feedback com "OK" verde')
        self.stdout.write('7. Na seção Imagem, veja o preview')
        self.stdout.write('8. Clique "Abrir imagem" para testar URL')
        
        self.stdout.write('\n=== URLs PARA TESTAR DIRETAMENTE ===')
        self.stdout.write('Com servidor rodando, teste estas URLs no navegador:')
        
        for feedback in Feedback.objects.filter(imagem__isnull=False, imagem__gt=''):
            if feedback.imagem and feedback.imagem.name:
                try:
                    if os.path.exists(feedback.imagem.path):
                        self.stdout.write(f'http://127.0.0.1:8000{feedback.imagem.url}')
                        break
                except:
                    pass
                    
        self.stdout.write(self.style.SUCCESS('\n=== TESTE CONCLUÍDO ==='))