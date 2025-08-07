"""
Comando para criar feedback de teste
"""
import os
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image
import io
from features.feedback.models import Feedback


class Command(BaseCommand):
    help = 'Cria feedback de teste para verificar funcionamento do sistema'

    def handle(self, *args, **options):
        self.stdout.write('[TESTE] Criando feedback de teste...')
        
        # 1. Verificar se há usuário para teste
        try:
            user = User.objects.first()
            if not user:
                self.stdout.write(self.style.ERROR('[ERRO] Nenhum usuário encontrado. Crie um usuário primeiro.'))
                return
            self.stdout.write(f'[OK] Usuário para teste: {user.username}')
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'[ERRO] Erro ao buscar usuário: {e}'))
            return
            
        # 2. Criar imagem de teste
        try:
            # Criar uma imagem simples de teste
            image = Image.new('RGB', (100, 100), color='red')
            image_io = io.BytesIO()
            image.save(image_io, format='PNG')
            image_io.seek(0)
            
            # Criar arquivo simulado
            test_image = SimpleUploadedFile(
                "test_feedback.png",
                image_io.getvalue(),
                content_type="image/png"
            )
            
            self.stdout.write('[OK] Imagem de teste criada')
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'[ERRO] Erro ao criar imagem de teste: {e}'))
            test_image = None
            
        # 3. Criar feedback de teste
        try:
            feedback_data = {
                'titulo': 'Feedback de Teste - Sistema de Upload',
                'descricao': 'Este é um feedback criado automaticamente para testar o sistema de upload de imagens.',
                'categoria': 'bug',
                'prioridade': 'media',
                'url_pagina': 'https://chegouhub.com.br/test',
                'usuario': user,
            }
            
            if test_image:
                feedback_data['imagem'] = test_image
                
            feedback = Feedback.objects.create(**feedback_data)
            
            self.stdout.write(self.style.SUCCESS(f'[SUCESSO] Feedback de teste criado com ID: {feedback.id}'))
            
            if feedback.imagem:
                self.stdout.write(f'[INFO] Imagem salva em: {feedback.imagem.name}')
                # Verificar se arquivo existe fisicamente
                image_path = feedback.imagem.path
                if os.path.exists(image_path):
                    self.stdout.write(self.style.SUCCESS(f'[OK] Arquivo de imagem existe: {image_path}'))
                else:
                    self.stdout.write(self.style.ERROR(f'[ERRO] Arquivo de imagem não existe: {image_path}'))
            else:
                self.stdout.write('[INFO] Feedback criado sem imagem')
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'[ERRO] Erro ao criar feedback: {e}'))
            import traceback
            self.stdout.write(f'[DEBUG] Traceback: {traceback.format_exc()}')