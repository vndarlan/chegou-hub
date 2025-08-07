#!/usr/bin/env python
import os
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from features.feedback.models import Feedback

print("=== ANÁLISE DE FEEDBACKS POR STATUS ===")
print()

# Verificar todos os feedbacks
feedbacks = Feedback.objects.all().order_by('-data_criacao')
print(f"Total de feedbacks: {feedbacks.count()}")
print()

# Agrupar por status
from django.db.models import Count
status_counts = Feedback.objects.values('status').annotate(count=Count('status')).order_by('status')

print("DISTRIBUIÇÃO POR STATUS:")
for item in status_counts:
    print(f"  {item['status']}: {item['count']} feedbacks")
print()

print("DETALHES DE TODOS OS FEEDBACKS:")
print("-" * 80)
for feedback in feedbacks:
    print(f"ID: {feedback.id:2d} | Status: {feedback.status:12} | Título: {feedback.titulo[:50]}")
    print(f"        | Usuário: {feedback.usuario.username:15} | Data: {feedback.data_criacao.strftime('%d/%m/%Y %H:%M')}")
    print(f"        | Categoria: {feedback.categoria:10} | Prioridade: {feedback.prioridade}")
    print()

print("=== FEEDBACKS QUE DEVEM APARECER NAS NOTIFICAÇÕES ===")
print("(status='pendente' ou status='em_analise')")
print()

pending_feedbacks = Feedback.objects.filter(status__in=['pendente', 'em_analise']).order_by('-data_criacao')
print(f"Total de feedbacks pendentes: {pending_feedbacks.count()}")

for feedback in pending_feedbacks:
    print(f"ID: {feedback.id} | Status: {feedback.status} | Título: {feedback.titulo}")
    print(f"  Usuário: {feedback.usuario.username} | Data: {feedback.data_criacao.strftime('%d/%m/%Y %H:%M')}")