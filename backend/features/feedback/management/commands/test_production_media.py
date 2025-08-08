import os
import tempfile
from django.core.management.base import BaseCommand
from django.conf import settings
from django.test import RequestFactory
from django.views.static import serve


class Command(BaseCommand):
    help = 'Testa serving de media files simulando producao'

    def handle(self, *args, **options):
        self.stdout.write("TESTE DE MEDIA FILES - SIMULACAO PRODUCAO")
        self.stdout.write("=" * 50)
        
        # Simular configuração de produção
        original_debug = settings.DEBUG
        try:
            # Temporariamente definir como produção
            settings.DEBUG = False
            
            # Verificar MEDIA_ROOT de produção
            production_media_root = settings.BASE_DIR / 'staticfiles' / 'media'
            self.stdout.write(f"MEDIA_ROOT em producao: {production_media_root}")
            
            # Verificar se pasta existe
            if not os.path.exists(production_media_root):
                self.stdout.write("Criando pasta de media em producao...")
                os.makedirs(production_media_root, exist_ok=True)
            
            # Criar pasta feedback
            feedback_prod_path = production_media_root / 'feedback'
            if not os.path.exists(feedback_prod_path):
                os.makedirs(feedback_prod_path, exist_ok=True)
            
            # Copiar arquivo de teste se existir
            test_file = settings.BASE_DIR / 'media' / 'feedback' / 'test_feedback_PIgYi8s.png'
            if os.path.exists(test_file):
                import shutil
                dest_file = feedback_prod_path / 'test_feedback_PIgYi8s.png'
                shutil.copy2(test_file, dest_file)
                self.stdout.write(f"Arquivo copiado para: {dest_file}")
            
            # Testar a view de serving
            factory = RequestFactory()
            request = factory.get('/media/feedback/test_feedback_PIgYi8s.png')
            
            try:
                response = serve(request, 'feedback/test_feedback_PIgYi8s.png', 
                               document_root=production_media_root)
                self.stdout.write(f"Resposta da view serve: {response.status_code}")
                self.stdout.write(f"Content-Type: {response.get('Content-Type', 'N/A')}")
                self.stdout.write(f"Content-Length: {response.get('Content-Length', 'N/A')}")
            except Exception as e:
                self.stdout.write(f"ERRO na view serve: {e}")
            
            # Listar arquivos finais
            if os.path.exists(feedback_prod_path):
                files = list(os.listdir(feedback_prod_path))
                self.stdout.write(f"Arquivos em {feedback_prod_path}: {len(files)}")
                for file in files:
                    full_path = feedback_prod_path / file
                    size = os.path.getsize(full_path) if os.path.exists(full_path) else 0
                    self.stdout.write(f"  - {file} ({size} bytes)")
        
        finally:
            # Restaurar configuração original
            settings.DEBUG = original_debug
        
        self.stdout.write("=" * 50)
        self.stdout.write("RECOMENDACOES:")
        self.stdout.write("1. Execute: python manage.py collectstatic --noinput")
        self.stdout.write("2. Certifique-se que pasta staticfiles/media existe")
        self.stdout.write("3. Faca deploy das mudancas no urls.py")
        self.stdout.write("=" * 50)
        self.stdout.write("Teste concluido!")