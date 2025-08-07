#!/usr/bin/env python
"""
Teste simples e direto para verificar configuração de mídia.
Execute com: python test_simple_media.py
"""

import os
import sys
import django
from pathlib import Path

# Configurar Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.conf import settings
from features.feedback.models import Feedback

print("=== TESTE SIMPLES DE MÍDIA ===")
print(f"DEBUG: {settings.DEBUG}")
print(f"MEDIA_URL: {settings.MEDIA_URL}")
print(f"MEDIA_ROOT: {settings.MEDIA_ROOT}")

# Verificar se diretórios existem
media_root_exists = os.path.exists(settings.MEDIA_ROOT)
print(f"MEDIA_ROOT existe: {'SIM' if media_root_exists else 'NÃO'}")

feedback_dir = os.path.join(settings.MEDIA_ROOT, 'feedback')
feedback_dir_exists = os.path.exists(feedback_dir)
print(f"Diretório feedback existe: {'SIM' if feedback_dir_exists else 'NÃO'}")

if feedback_dir_exists:
    files = os.listdir(feedback_dir)
    print(f"Arquivos no diretório feedback: {files}")

# Testar modelo
print("\n=== FEEDBACKS COM IMAGEM ===")
feedbacks = Feedback.objects.filter(imagem__isnull=False, imagem__gt='')
print(f"Total de feedbacks com imagem: {feedbacks.count()}")

for feedback in feedbacks:
    if feedback.imagem and feedback.imagem.name:
        print(f"\n- {feedback.titulo}")
        print(f"  Nome do arquivo: {feedback.imagem.name}")
        
        try:
            url = feedback.imagem.url
            print(f"  URL: {url}")
            
            path = feedback.imagem.path
            print(f"  Caminho físico: {path}")
            print(f"  Arquivo existe fisicamente: {'SIM' if os.path.exists(path) else 'NÃO'}")
            
        except Exception as e:
            print(f"  ERRO: {e}")

print("\n=== CONCLUSÃO ===")
print("Se você ver uma URL como '/media/feedback/test_feedback.png'")
print("E o arquivo existe fisicamente, então:")
print("1. A configuração está correta")
print("2. O Django Admin deve conseguir acessar a imagem")
print("3. Se não conseguir, pode ser problema de permissões ou configuração de URLs")