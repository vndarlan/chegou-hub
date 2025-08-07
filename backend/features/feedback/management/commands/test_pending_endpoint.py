"""
Comando para testar o endpoint de feedbacks pendentes
"""
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from features.feedback.models import Feedback
from features.feedback.views import FeedbackPendingView
from features.feedback.serializers import FeedbackSerializer
from django.test import RequestFactory
from django.contrib.auth import get_user_model

class Command(BaseCommand):
    help = 'Testa o endpoint de feedbacks pendentes'

    def handle(self, *args, **options):
        self.stdout.write('=== TESTE DO ENDPOINT /api/feedback/pending/ ===')
        self.stdout.write()
        
        # 1. Verificar dados no banco
        self.stdout.write('[1] DADOS NO BANCO:')
        total_feedbacks = Feedback.objects.count()
        pending_feedbacks = Feedback.objects.filter(status__in=['pendente', 'em_analise']).order_by('-data_criacao')
        resolved_feedbacks = Feedback.objects.filter(status='resolvido')
        
        self.stdout.write(f'    Total de feedbacks: {total_feedbacks}')
        self.stdout.write(f'    Feedbacks pendentes/em análise: {pending_feedbacks.count()}')
        self.stdout.write(f'    Feedbacks resolvidos: {resolved_feedbacks.count()}')
        self.stdout.write()
        
        # 2. Listar feedbacks por status
        self.stdout.write('[2] LISTA POR STATUS:')
        for feedback in Feedback.objects.all().order_by('-data_criacao'):
            self.stdout.write(f'    ID {feedback.id:2d}: [{feedback.status:12}] {feedback.titulo[:40]}')
        self.stdout.write()
        
        # 3. Simular requisição de admin
        self.stdout.write('[3] SIMULAÇÃO ENDPOINT (ADMIN):')
        factory = RequestFactory()
        request = factory.get('/api/feedback/pending/')
        
        # Simular usuário admin
        try:
            admin_user = User.objects.filter(is_staff=True, is_superuser=True).first()
            if not admin_user:
                self.stdout.write('    ERRO: Nenhum usuário admin encontrado')
                return
            
            request.user = admin_user
            
            view = FeedbackPendingView()
            view.request = request
            
            queryset = view.get_queryset()
            serializer = FeedbackSerializer(queryset, many=True)
            
            self.stdout.write(f'    Usuário: {admin_user.username} (staff: {admin_user.is_staff})')
            self.stdout.write(f'    Queryset retornado: {queryset.count()} feedbacks')
            self.stdout.write('    Feedbacks retornados:')
            
            for feedback in queryset:
                self.stdout.write(f'      ID {feedback.id}: [{feedback.status}] {feedback.titulo}')
            
        except Exception as e:
            self.stdout.write(f'    ERRO: {str(e)}')
        
        self.stdout.write()
        
        # 4. Simular requisição de usuário comum
        self.stdout.write('[4] SIMULAÇÃO ENDPOINT (USUÁRIO COMUM):')
        try:
            regular_user = User.objects.filter(is_staff=False).first()
            if not regular_user:
                self.stdout.write('    ERRO: Nenhum usuário comum encontrado')
                return
            
            request.user = regular_user
            
            view = FeedbackPendingView()
            view.request = request
            
            queryset = view.get_queryset()
            
            self.stdout.write(f'    Usuário: {regular_user.username} (staff: {regular_user.is_staff})')
            self.stdout.write(f'    Queryset retornado: {queryset.count()} feedbacks')
            
        except Exception as e:
            self.stdout.write(f'    ERRO: {str(e)}')
        
        self.stdout.write()
        
        # 5. Teste de mudança de status
        self.stdout.write('[5] TESTE DE MUDANÇA DE STATUS:')
        
        # Pegar um feedback pendente
        test_feedback = Feedback.objects.filter(status='pendente').first()
        if test_feedback:
            original_status = test_feedback.status
            self.stdout.write(f'    Feedback de teste: ID {test_feedback.id} (status: {original_status})')
            
            # Mudar para resolvido
            test_feedback.status = 'resolvido'
            test_feedback.save()
            
            self.stdout.write('    Status alterado para: resolvido')
            
            # Verificar se ainda aparece no endpoint
            admin_user = User.objects.filter(is_staff=True, is_superuser=True).first()
            request.user = admin_user
            view = FeedbackPendingView()
            view.request = request
            queryset = view.get_queryset()
            
            if test_feedback in queryset:
                self.stdout.write('    ❌ ERRO: Feedback resolvido ainda aparece no endpoint!')
            else:
                self.stdout.write('    ✅ OK: Feedback resolvido não aparece mais no endpoint')
            
            # Restaurar status original
            test_feedback.status = original_status
            test_feedback.save()
            self.stdout.write(f'    Status restaurado para: {original_status}')
        else:
            self.stdout.write('    Nenhum feedback pendente para teste')
        
        self.stdout.write()
        self.stdout.write('=== FIM DO TESTE ===')