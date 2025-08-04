from rest_framework import serializers
from .models import Feedback
import logging

logger = logging.getLogger(__name__)


class FeedbackCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Feedback
        fields = ['titulo', 'descricao', 'categoria', 'prioridade', 'url_pagina', 'imagem']
    
    def validate_imagem(self, value):
        if value:
            # Validar tamanho (máximo 5MB)
            if value.size > 5 * 1024 * 1024:
                raise serializers.ValidationError("A imagem deve ter no máximo 5MB")
            
            # Validar tipo de arquivo
            allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
            if value.content_type not in allowed_types:
                raise serializers.ValidationError("Formato de imagem não suportado. Use JPEG, PNG, GIF ou WebP")
                
            logger.info(f"Imagem validada: {value.name}, {value.size} bytes, {value.content_type}")
        
        return value
    
    def create(self, validated_data):
        try:
            validated_data['usuario'] = self.context['request'].user
            logger.info(f"Criando feedback para usuário: {validated_data['usuario'].username}")
            
            # Se há imagem, tentar salvar
            if 'imagem' in validated_data and validated_data['imagem']:
                logger.info("Tentando salvar feedback com imagem...")
                feedback = super().create(validated_data)
                logger.info(f"Feedback com imagem salvo: ID {feedback.id}")
            else:
                logger.info("Salvando feedback sem imagem...")
                feedback = super().create(validated_data)
                logger.info(f"Feedback sem imagem salvo: ID {feedback.id}")
                
            return feedback
            
        except Exception as e:
            logger.error(f"Erro ao criar feedback: {str(e)}")
            # Se falhar com imagem, tentar sem imagem
            if 'imagem' in validated_data and validated_data['imagem']:
                logger.warning("Tentando salvar feedback sem imagem devido ao erro...")
                validated_data.pop('imagem', None)
                return super().create(validated_data)
            else:
                raise