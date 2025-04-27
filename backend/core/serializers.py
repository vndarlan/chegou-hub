# backend/core/serializers.py
from rest_framework import serializers
# REMOVIDO: import de ImageStyle
from .models import ManagedCalendar # Mantido
from django.contrib.auth import get_user_model

User = get_user_model() # Mantido se usado em outros serializers (não neste arquivo)

# REMOVIDO: Toda a classe ImageStyleSerializer foi removida מכאן עד הסוף

class ManagedCalendarSerializer(serializers.ModelSerializer):
    class Meta:
        model = ManagedCalendar
        fields = ['id', 'name', 'iframe_code', 'added_at']
        read_only_fields = ['id', 'added_at']

    def validate_iframe_code(self, value):
        if not value or not value.strip():
             raise serializers.ValidationError("O código iframe não pode ser vazio.")
        value = value.strip()
        if not value.startswith('<iframe') or '</iframe>' not in value or 'src="https://calendar.google.com/calendar/embed?src=' not in value:
             raise serializers.ValidationError("O código fornecido não parece ser um iframe válido do Google Calendar.")
        return value

    def validate_name(self, value):
         if not value or not value.strip():
             raise serializers.ValidationError("O nome do calendário não pode ser vazio.")
         return value.strip()