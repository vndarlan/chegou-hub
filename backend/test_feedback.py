#!/usr/bin/env python
import os
import sys
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from features.feedback.models import Feedback

# Testar dados de feedback
print("=== INVESTIGAÇÃO SISTEMA DE FEEDBACK ===")
print(f"Total de feedbacks: {Feedback.objects.count()}")
print(f"Feedbacks pendentes: {Feedback.objects.filter(status__in=['pendente', 'em_analise']).count()}")

print("\n--- STATUS DOS FEEDBACKS ---")
for feedback in Feedback.objects.all()[:10]:
    print(f"{feedback.id}: {feedback.titulo[:50]} - {feedback.status} - {feedback.data_criacao}")

print("\n--- CONTAGEM POR STATUS ---")
from django.db.models import Count
status_counts = Feedback.objects.values('status').annotate(count=Count('status')).order_by('-count')
for item in status_counts:
    print(f"{item['status']}: {item['count']} feedbacks")