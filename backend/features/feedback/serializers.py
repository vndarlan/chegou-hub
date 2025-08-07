import os
from rest_framework import serializers
from django.conf import settings
from .models import Feedback
import logging

logger = logging.getLogger(__name__)


class FeedbackSerializer(serializers.ModelSerializer):
    """Serializer para listagem e detalhamento de feedbacks."""
    usuario_nome = serializers.CharField(source='usuario.username', read_only=True)
    imagem_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Feedback
        fields = '__all__'
    
    def get_imagem_url(self, obj):
        """Retorna URL completa da imagem se existir."""
        if obj.imagem and obj.imagem.name:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.imagem.url)
            # Fallback se não houver request no context
            return obj.imagem.url
        return None
        

class FeedbackNotificationSerializer(serializers.ModelSerializer):
    """Serializer específico para notificações de feedback pendente."""
    usuario_nome = serializers.CharField(source='usuario.username', read_only=True)
    
    class Meta:
        model = Feedback
        fields = ['id', 'titulo', 'data_criacao', 'usuario_nome', 'status', 'categoria', 'prioridade']


class FeedbackCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Feedback
        fields = ['titulo', 'descricao', 'categoria', 'prioridade', 'url_pagina', 'imagem']
    
    def validate_imagem(self, value):
        """Validação robusta de imagem com verificação de diretório."""
        if value:
            # Validar tamanho (máximo 5MB)
            if value.size > 5 * 1024 * 1024:
                raise serializers.ValidationError("A imagem deve ter no máximo 5MB")
            
            # Validar tipo de arquivo
            allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
            if value.content_type not in allowed_types:
                raise serializers.ValidationError("Formato de imagem não suportado. Use JPEG, PNG, GIF ou WebP")
            
            # Garantir que o diretório de upload existe
            try:
                feedback_dir = os.path.join(settings.MEDIA_ROOT, 'feedback')
                os.makedirs(feedback_dir, exist_ok=True)
                logger.info(f"Diretório de upload verificado: {feedback_dir}")
            except Exception as dir_error:
                logger.error(f"Erro ao criar diretório de upload: {dir_error}")
                raise serializers.ValidationError("Erro interno: não foi possível preparar diretório de upload")
                
            logger.info(f"Imagem validada com sucesso: {value.name}, {value.size} bytes, {value.content_type}")
        
        return value
    
    def create(self, validated_data):
        """Criação robusta sem mascarar erros importantes."""
        validated_data['usuario'] = self.context['request'].user
        
        has_image = 'imagem' in validated_data and validated_data['imagem']
        logger.info(f"Criando feedback para usuário {validated_data['usuario'].username}. Com imagem: {has_image}")
        
        try:
            # Tentar criar o feedback normalmente
            feedback = super().create(validated_data)
            
            if has_image:
                logger.info(f"Feedback com imagem criado com sucesso. ID: {feedback.id}, Imagem: {feedback.imagem.name}")
            else:
                logger.info(f"Feedback sem imagem criado com sucesso. ID: {feedback.id}")
            
            return feedback
            
        except Exception as e:
            logger.error(f"Erro ao criar feedback: {type(e).__name__}: {str(e)}")
            
            # Se o erro for relacionado ao upload da imagem, tentar salvar sem imagem
            if has_image and ('upload' in str(e).lower() or 'media' in str(e).lower() or 'file' in str(e).lower()):
                logger.warning("Erro relacionado ao upload de imagem detectado. Tentando salvar sem imagem...")
                validated_data_no_image = validated_data.copy()
                validated_data_no_image.pop('imagem', None)
                
                try:
                    feedback = super().create(validated_data_no_image)
                    logger.warning(f"Feedback salvo sem imagem devido a erro de upload. ID: {feedback.id}")
                    return feedback
                except Exception as fallback_error:
                    logger.error(f"Erro mesmo sem imagem: {fallback_error}")
                    raise serializers.ValidationError(f"Não foi possível salvar o feedback: {fallback_error}")
            else:
                # Para outros tipos de erro, não tentar fallback
                raise serializers.ValidationError(f"Erro ao criar feedback: {str(e)}")