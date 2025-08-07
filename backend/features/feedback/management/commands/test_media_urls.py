import os
import requests
from django.core.management.base import BaseCommand
from django.conf import settings
from features.feedback.models import Feedback


class Command(BaseCommand):
    help = 'Testa se as URLs de mídia estão acessíveis via HTTP'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('=== TESTE DE URLs DE MÍDIA ==='))
        
        # URL base do servidor local
        base_url = 'http://127.0.0.1:8000'
        
        # Testar URL direta do arquivo que existe fisicamente
        test_url = f"{base_url}/media/feedback/test_feedback.png"
        self.stdout.write(f"Testando URL: {test_url}")
        
        try:
            response = requests.get(test_url, timeout=5)
            if response.status_code == 200:
                self.stdout.write(self.style.SUCCESS(f"OK - Status: {response.status_code}, Tipo: {response.headers.get('content-type', 'N/A')}"))
            else:
                self.stdout.write(self.style.ERROR(f"ERRO - Status: {response.status_code}"))
        except requests.exceptions.ConnectionError:
            self.stdout.write(self.style.WARNING("ERRO - Servidor Django não está rodando em http://127.0.0.1:8000"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"ERRO - Exceção: {e}"))
            
        # Testar URLs dos feedbacks no banco
        feedbacks_com_imagem = Feedback.objects.filter(imagem__isnull=False, imagem__gt='')
        
        for feedback in feedbacks_com_imagem:
            if feedback.imagem and feedback.imagem.name:
                try:
                    url = f"{base_url}{feedback.imagem.url}"
                    self.stdout.write(f"\nTestando feedback '{feedback.titulo}': {url}")
                    
                    response = requests.get(url, timeout=5)
                    if response.status_code == 200:
                        self.stdout.write(self.style.SUCCESS(f"OK - Status: {response.status_code}"))
                    else:
                        self.stdout.write(self.style.ERROR(f"ERRO - Status: {response.status_code}"))
                        
                except requests.exceptions.ConnectionError:
                    self.stdout.write(self.style.WARNING("ERRO - Servidor Django não está rodando"))
                    break
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"ERRO - Exceção: {e}"))
                    
        self.stdout.write(self.style.SUCCESS('\n=== TESTE CONCLUÍDO ==='))