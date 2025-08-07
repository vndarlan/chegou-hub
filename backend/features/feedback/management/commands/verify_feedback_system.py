"""
Comando para verificação completa do sistema de feedback
"""
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from features.feedback.models import Feedback
from features.feedback.serializers import FeedbackCreateSerializer, FeedbackSerializer
from django.conf import settings
import os


class Command(BaseCommand):
    help = 'Verifica completamente o sistema de feedback'

    def handle(self, *args, **options):
        self.stdout.write('[VERIFICAÇÃO COMPLETA] Sistema de Feedback')
        self.stdout.write('=' * 50)
        
        # 1. Verificar configurações
        self.stdout.write('\n[1] CONFIGURAÇÕES:')
        self.stdout.write(f'    MEDIA_ROOT: {settings.MEDIA_ROOT}')
        self.stdout.write(f'    MEDIA_URL: {settings.MEDIA_URL}')
        
        # Verificar STORAGES
        if hasattr(settings, 'STORAGES'):
            default_storage = settings.STORAGES.get('default', {})
            self.stdout.write(f'    STORAGES[default]: {default_storage.get("BACKEND", "NÃO CONFIGURADO")}')
        else:
            self.stdout.write('    STORAGES: NÃO CONFIGURADO')
        
        # 2. Verificar diretórios
        self.stdout.write('\n[2] ESTRUTURA DE DIRETÓRIOS:')
        media_exists = os.path.exists(settings.MEDIA_ROOT)
        feedback_dir = os.path.join(settings.MEDIA_ROOT, 'feedback')
        feedback_exists = os.path.exists(feedback_dir)
        
        self.stdout.write(f'    Media dir: {settings.MEDIA_ROOT} - {"OK" if media_exists else "FALTA"}')
        self.stdout.write(f'    Feedback dir: {feedback_dir} - {"OK" if feedback_exists else "FALTA"}')
        
        # 3. Verificar dados no banco
        self.stdout.write('\n[3] DADOS NO BANCO:')
        total_feedbacks = Feedback.objects.count()
        feedbacks_with_image = Feedback.objects.exclude(imagem='').exclude(imagem=None)
        
        self.stdout.write(f'    Total de feedbacks: {total_feedbacks}')
        self.stdout.write(f'    Feedbacks com imagem: {feedbacks_with_image.count()}')
        
        # 4. Verificar arquivos físicos
        self.stdout.write('\n[4] ARQUIVOS FÍSICOS:')
        for feedback in feedbacks_with_image:
            if feedback.imagem:
                file_path = feedback.imagem.path
                exists = os.path.exists(file_path)
                size = os.path.getsize(file_path) if exists else 0
                self.stdout.write(f'    ID {feedback.id}: {feedback.imagem.name}')
                self.stdout.write(f'       Arquivo: {"OK" if exists else "FALTA"} ({size} bytes)')
        
        # 5. Testar serializers
        self.stdout.write('\n[5] TESTE DE SERIALIZERS:')
        try:
            # Teste do serializer de listagem
            if feedbacks_with_image.exists():
                feedback = feedbacks_with_image.first()
                serializer = FeedbackSerializer(feedback)
                data = serializer.data
                
                self.stdout.write('    FeedbackSerializer: OK')
                self.stdout.write(f'       Campos: {list(data.keys())}')
                self.stdout.write(f'       Imagem URL: {data.get("imagem", "N/A")}')
            else:
                self.stdout.write('    FeedbackSerializer: SEM DADOS PARA TESTE')
            
        except Exception as e:
            self.stdout.write(f'    FeedbackSerializer: ERRO - {e}')
        
        # 6. Resumo final
        self.stdout.write('\n[6] RESUMO FINAL:')
        issues = []
        
        if not media_exists:
            issues.append('Diretório media não existe')
        if not feedback_exists:
            issues.append('Diretório feedback não existe')
        if not hasattr(settings, 'STORAGES') or 'default' not in settings.STORAGES:
            issues.append('STORAGES[default] não configurado')
        if total_feedbacks == 0:
            issues.append('Nenhum feedback no banco de dados')
            
        if issues:
            for issue in issues:
                self.stdout.write(f'    PROBLEMA: {issue}')
        else:
            self.stdout.write(self.style.SUCCESS('    SISTEMA FUNCIONANDO CORRETAMENTE!'))
            
        self.stdout.write('\n' + '=' * 50)
        self.stdout.write('[FIM DA VERIFICAÇÃO]')