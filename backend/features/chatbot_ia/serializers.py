from rest_framework import serializers
from .models import ChatMessage


class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = ['id', 'message', 'response', 'created_at', 'response_time_ms']
        read_only_fields = ['id', 'created_at', 'response_time_ms']


class ChatRequestSerializer(serializers.Serializer):
    message = serializers.CharField(max_length=2000)
    
    def validate_message(self, value):
        if not value.strip():
            raise serializers.ValidationError("Mensagem não pode estar vazia.")
        return value.strip()


class ChatResponseSerializer(serializers.Serializer):
    response = serializers.CharField()
    response_time_ms = serializers.IntegerField()
    message_id = serializers.IntegerField()