from rest_framework import serializers
from .models import Feedback


class FeedbackSerializer(serializers.ModelSerializer):
    usuario_nome = serializers.CharField(source='usuario.username', read_only=True)
    categoria_display = serializers.CharField(source='get_categoria_display', read_only=True)
    prioridade_display = serializers.CharField(source='get_prioridade_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Feedback
        fields = [
            'id', 'titulo', 'descricao', 'categoria', 'categoria_display',
            'prioridade', 'prioridade_display', 'status', 'status_display',
            'url_pagina', 'imagem', 'data_criacao', 'usuario', 'usuario_nome'
        ]
        read_only_fields = ['id', 'data_criacao', 'usuario']


class FeedbackCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Feedback
        fields = ['titulo', 'descricao', 'categoria', 'prioridade', 'url_pagina', 'imagem']
    
    def create(self, validated_data):
        validated_data['usuario'] = self.context['request'].user
        return super().create(validated_data)


class FeedbackUpdateStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Feedback
        fields = ['status']