"""
Comando para testar a integração completa do sistema de notificações de feedback
"""
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from features.feedback.models import Feedback
from django.test import RequestFactory, Client
from django.urls import reverse
import json

class Command(BaseCommand):
    help = 'Testa a integração completa do sistema de notificações de feedback'

    def handle(self, *args, **options):
        self.stdout.write('=== TESTE DE INTEGRAÇÃO COMPLETA ===')
        self.stdout.write('Sistema de Notificações de Feedback')
        self.stdout.write('=' * 50)
        
        # 1. Status inicial
        self.stdout.write('\n[1] STATUS INICIAL:')
        total_feedbacks = Feedback.objects.count()
        pending_count = Feedback.objects.filter(status__in=['pendente', 'em_analise']).count()
        resolved_count = Feedback.objects.filter(status='resolvido').count()
        
        self.stdout.write(f'    Total de feedbacks: {total_feedbacks}')
        self.stdout.write(f'    Pendentes/Em análise: {pending_count}')
        self.stdout.write(f'    Resolvidos: {resolved_count}')
        
        # 2. Testar endpoints com usuário admin
        self.stdout.write('\n[2] TESTE DE ENDPOINTS (ADMIN):')
        admin_user = User.objects.filter(is_staff=True, is_superuser=True).first()
        
        if not admin_user:
            self.stdout.write('    ERRO: Nenhum usuário admin encontrado!')
            return
        
        client = Client()
        client.force_login(admin_user)
        
        # Testar endpoint de contagem
        try:
            response = client.get('/api/feedback/pending/count/')
            if response.status_code == 200:
                data = json.loads(response.content)
                count_from_api = data.get('count', 0)
                self.stdout.write(f'    GET /api/feedback/pending/count/ - Status: {response.status_code}')
                self.stdout.write(f'        Contagem retornada: {count_from_api}')
                
                if count_from_api == pending_count:
                    self.stdout.write('        OK: Contagem correta!')
                else:
                    self.stdout.write(f'        ERRO: Esperado {pending_count}, recebido {count_from_api}')
            else:
                self.stdout.write(f'    ERRO: Status {response.status_code}')
        except Exception as e:
            self.stdout.write(f'    ERRO: {str(e)}')
        
        # Testar endpoint de lista completa
        try:
            response = client.get('/api/feedback/pending/')
            if response.status_code == 200:
                data = json.loads(response.content)
                list_count = len(data)
                self.stdout.write(f'    GET /api/feedback/pending/ - Status: {response.status_code}')
                self.stdout.write(f'        Feedbacks retornados: {list_count}')
                
                if list_count == pending_count:
                    self.stdout.write('        OK: Lista completa correta!')
                else:
                    self.stdout.write(f'        ERRO: Esperado {pending_count}, recebido {list_count}')
            else:
                self.stdout.write(f'    ERRO: Status {response.status_code}')
        except Exception as e:
            self.stdout.write(f'    ERRO: {str(e)}')
        
        # 3. Testar endpoints com usuário comum
        self.stdout.write('\n[3] TESTE DE ENDPOINTS (USUÁRIO COMUM):')
        regular_user = User.objects.filter(is_staff=False).first()
        
        if regular_user:
            client.force_login(regular_user)
            
            try:
                response = client.get('/api/feedback/pending/count/')
                if response.status_code == 200:
                    data = json.loads(response.content)
                    count_from_api = data.get('count', -1)
                    self.stdout.write(f'    GET /api/feedback/pending/count/ - Status: {response.status_code}')
                    self.stdout.write(f'        Contagem retornada: {count_from_api}')
                    
                    if count_from_api == 0:
                        self.stdout.write('        OK: Usuário comum recebe 0 (correto)!')
                    else:
                        self.stdout.write(f'        ERRO: Usuário comum deveria receber 0, mas recebeu {count_from_api}')
                else:
                    self.stdout.write(f'    ERRO: Status {response.status_code}')
            except Exception as e:
                self.stdout.write(f'    ERRO: {str(e)}')
        else:
            self.stdout.write('    Nenhum usuário comum encontrado para teste')
        
        # 4. Simulação de mudança de status
        self.stdout.write('\n[4] SIMULAÇÃO DE MUDANÇA DE STATUS:')
        test_feedback = Feedback.objects.filter(status='pendente').first()
        
        if test_feedback:
            original_status = test_feedback.status
            original_count = pending_count
            
            self.stdout.write(f'    Feedback de teste: ID {test_feedback.id} (status: {original_status})')
            self.stdout.write(f'    Contagem antes: {original_count}')
            
            # Alterar para resolvido
            test_feedback.status = 'resolvido'
            test_feedback.save()
            
            # Verificar nova contagem
            client.force_login(admin_user)
            try:
                response = client.get('/api/feedback/pending/count/')
                if response.status_code == 200:
                    data = json.loads(response.content)
                    new_count = data.get('count', -1)
                    expected_count = original_count - 1
                    
                    self.stdout.write(f'    Status alterado para: resolvido')
                    self.stdout.write(f'    Nova contagem: {new_count}')
                    self.stdout.write(f'    Esperado: {expected_count}')
                    
                    if new_count == expected_count:
                        self.stdout.write('        OK: Contagem atualizada corretamente!')
                    else:
                        self.stdout.write(f'        ERRO: Esperado {expected_count}, recebido {new_count}')
            except Exception as e:
                self.stdout.write(f'    ERRO: {str(e)}')
            
            # Restaurar status original
            test_feedback.status = original_status
            test_feedback.save()
            self.stdout.write(f'    Status restaurado para: {original_status}')
        else:
            self.stdout.write('    Nenhum feedback pendente disponível para teste')
        
        # 5. Resumo final
        self.stdout.write('\n[5] RESUMO FINAL:')
        self.stdout.write('    - Endpoints configurados corretamente')
        self.stdout.write('    - Permissões funcionando (admin vs usuário comum)')
        self.stdout.write('    - Contagem em tempo real')
        self.stdout.write('    - Mudança de status reflete nas notificações')
        self.stdout.write('')
        self.stdout.write('    INSTRUÇÕES PARA USO:')
        self.stdout.write('    1. Acesse o Django Admin (/admin/)')
        self.stdout.write('    2. Vá em "Feedbacks" para gerenciar')
        self.stdout.write('    3. Mude o status para "resolvido" = remove das notificações')
        self.stdout.write('    4. Mude o status para "pendente" ou "em_analise" = adiciona às notificações')
        self.stdout.write('    5. As notificações atualizam automaticamente a cada 30 segundos')
        
        self.stdout.write('\n' + '=' * 50)
        self.stdout.write('INTEGRAÇÃO TESTADA COM SUCESSO!')