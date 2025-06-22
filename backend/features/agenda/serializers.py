from rest_framework import serializers
from .models import ManagedCalendar

class ManagedCalendarSerializer(serializers.ModelSerializer):
    class Meta:
        model = ManagedCalendar
        fields = ['id', 'name', 'iframe_code', 'added_at']
        read_only_fields = ['id', 'added_at']

    def validate_iframe_code(self, value):
        if not value or not value.strip():
             raise serializers.ValidationError("O código iframe não pode ser vazio.")
        value = value.strip()
        if not value.startswith('<iframe') or '</iframe>' not in value or 'src="' not in value:
             raise serializers.ValidationError("O código fornecido não parece ser um iframe válido.")
        return value

    def validate_name(self, value):
         if not value or not value.strip():
             raise serializers.ValidationError("O nome do calendário não pode ser vazio.")
         return value.strip()
