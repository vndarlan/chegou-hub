import os
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.core.files import File
from features.feedback.models import Feedback
from django.conf import settings


class Command(BaseCommand):
    help = 'Cria um feedback completo de teste com imagem válida'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('=== CRIANDO FEEDBACK DE TESTE COMPLETO ==='))
        
        # 1. Garantir que existe um usuário para o teste
        user, created = User.objects.get_or_create(
            username='admin',
            defaults={
                'email': 'admin@chegouhub.com.br',
                'first_name': 'Admin',
                'last_name': 'ChegouHub',
                'is_staff': True,
                'is_superuser': True
            }
        )
        
        if created:
            user.set_password('admin123')
            user.save()
            self.stdout.write(self.style.SUCCESS(f'Usuário admin criado'))
        else:
            self.stdout.write(f'Usuário admin já existe')
            
        # 2. Verificar se arquivo de imagem de teste existe
        image_path = os.path.join(settings.MEDIA_ROOT, 'feedback', 'test_feedback.png')
        if not os.path.exists(image_path):
            self.stdout.write(self.style.ERROR(f'Arquivo de teste não encontrado: {image_path}'))
            return
            
        # 3. Criar ou atualizar feedback de teste
        feedback, created = Feedback.objects.get_or_create(
            titulo='Feedback com Imagem - Teste Completo',
            defaults={
                'descricao': '''Este é um feedback de teste criado automaticamente para verificar o funcionamento do sistema de upload de imagens.

Recursos testados:
- Upload de imagem via ImageField
- Armazenamento correto no diretório media/feedback/
- Preview da imagem no Django Admin
- URLs de mídia configuradas corretamente
- Validação de arquivos

Detalhes técnicos:
- Arquivo: test_feedback.png
- Localização: {media_root}/feedback/
- URL: /media/feedback/test_feedback.png

Este feedback pode ser usado para testar todas as funcionalidades relacionadas a imagens no sistema.'''.format(media_root=settings.MEDIA_ROOT),
                'categoria': 'melhoria',
                'prioridade': 'alta',
                'status': 'em_analise',
                'url_pagina': 'https://chegouhub.com.br/admin/',
                'usuario': user
            }
        )
        
        # 4. Associar imagem se não tiver
        if not feedback.imagem:
            with open(image_path, 'rb') as img_file:
                feedback.imagem.save('test_feedback.png', File(img_file), save=True)
                
        action = 'criado' if created else 'atualizado'
        self.stdout.write(self.style.SUCCESS(f'Feedback {action} com ID: {feedback.id}'))
        
        # 5. Verificar se tudo está funcionando
        self.stdout.write('\n=== VERIFICAÇÃO ===')
        self.stdout.write(f'Título: {feedback.titulo}')
        self.stdout.write(f'Imagem: {feedback.imagem.name if feedback.imagem else "Nenhuma"}')
        if feedback.imagem:
            self.stdout.write(f'URL da imagem: {feedback.imagem.url}')
            self.stdout.write(f'Caminho físico: {feedback.imagem.path}')
            self.stdout.write(f'Arquivo existe: {"SIM" if os.path.exists(feedback.imagem.path) else "NÃO"}')
            
        self.stdout.write('\n=== INSTRUÇÕES ===')
        self.stdout.write('1. Inicie o servidor: python manage.py runserver')
        self.stdout.write('2. Acesse: http://127.0.0.1:8000/admin/')
        self.stdout.write('3. Login: admin / admin123')
        self.stdout.write('4. Vá em: Feedback > Feedbacks')
        self.stdout.write('5. Clique no feedback de teste')
        self.stdout.write('6. Na seção "Imagem", você deve ver o preview da imagem')
        self.stdout.write('7. Clique no botão "Abrir imagem" para testar a URL')
        
        self.stdout.write(self.style.SUCCESS('\n=== TESTE CRIADO COM SUCESSO ==='))