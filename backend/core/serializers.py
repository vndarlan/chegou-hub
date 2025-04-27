# backend/core/serializers.py
from rest_framework import serializers
# REMOVIDO: import de ImageStyle
from .models import ManagedCalendar # Mantido
from django.contrib.auth import get_user_model
from .models import AIProject

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
    
class AIProjectSerializer(serializers.ModelSerializer):
    # Para exibir o nome do criador ao invés do ID (opcional, mas útil)
    creator_email = serializers.EmailField(source='creator.email', read_only=True)

    class Meta:
        model = AIProject
        fields = [
            'id',
            'name',
            'creation_date',
            'finalization_date',
            'description',
            'status',
            'project_link',
            'tools_used',
            'project_version',
            'creator', # ID do usuário que registrou (para escrita via API)
            'creator_email', # Email (para leitura)
            'creator_names', # Campo de texto com nomes
            'added_at',
        ]
        read_only_fields = ['id', 'added_at', 'creator_email']
        # O campo 'creator' será preenchido automaticamente na view ao criar

    def validate(self, data):
        """
        Validações cross-field.
        """
        creation_date = data.get('creation_date')
        finalization_date = data.get('finalization_date')

        if creation_date and finalization_date and finalization_date < creation_date:
            raise serializers.ValidationError({
                'finalization_date': 'A data de finalização não pode ser anterior à data de criação.'
            })
        return data