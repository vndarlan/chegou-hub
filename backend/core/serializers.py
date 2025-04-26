# backend/core/serializers.py
from rest_framework import serializers
from .models import ImageStyle, ManagedCalendar
from django.contrib.auth import get_user_model

User = get_user_model()

class ImageStyleSerializer(serializers.ModelSerializer):
    """
    Serializer para o modelo ImageStyle.
    Define quais campos serão expostos na API.
    """
    # Opcional: Exibir o nome do usuário em vez do ID (read-only)
    # user_username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = ImageStyle
        fields = [
            'id',
            'user', # Envia o ID do usuário
            # 'user_username', # Descomente se quiser enviar o username
            'name',
            'instructions',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['user', 'created_at', 'updated_at'] # Usuário será definido automaticamente pela view

    def validate_name(self, value):
        """ Garante que o nome não seja vazio. """
        if not value or not value.strip():
            raise serializers.ValidationError("O nome do estilo não pode ser vazio.")
        return value

    def validate_instructions(self, value):
        """ Garante que as instruções não sejam vazias. """
        if not value or not value.strip():
            raise serializers.ValidationError("As instruções do estilo não podem ser vazias.")
        return value

    # Adicional: Validar unicidade (user, name) a nível de serializer, embora o BD já garanta
    def validate(self, data):
        request = self.context.get('request')
        user = request.user if request else None
        name = data.get('name')

        if user and name:
            # Verifica se já existe um estilo com esse nome para este usuário
            # Exclui o próprio objeto se for uma atualização (instance existe)
            queryset = ImageStyle.objects.filter(user=user, name=name)
            if self.instance:
                queryset = queryset.exclude(pk=self.instance.pk)
            if queryset.exists():
                raise serializers.ValidationError(
                    {'name': f'Você já possui um estilo chamado "{name}".'}
                )
        return data
    
class ManagedCalendarSerializer(serializers.ModelSerializer):
    """ Serializer para o modelo ManagedCalendar. """
    class Meta:
        model = ManagedCalendar
        fields = ['id', 'name', 'google_calendar_id', 'added_at']
        # O ID (pk) é importante para o frontend poder deletar
        read_only_fields = ['id', 'added_at']

    def validate_google_calendar_id(self, value):
        """ Validação simples para o ID do calendário. """
        if not value or '@' not in value: # Verifica se tem um '@', básico
             raise serializers.ValidationError("O ID do Calendário Google parece inválido.")
        # Remove espaços extras
        return value.strip()

    def validate_name(self, value):
         """ Garante que o nome não seja vazio. """
         if not value or not value.strip():
             raise serializers.ValidationError("O nome do calendário não pode ser vazio.")
         return value.strip()