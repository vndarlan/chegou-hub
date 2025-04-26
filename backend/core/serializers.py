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
    class Meta:
        model = ManagedCalendar
        fields = ['id', 'name', 'iframe_code', 'added_at'] # Campo atualizado
        read_only_fields = ['id', 'added_at']

    def validate_iframe_code(self, value):
        """ Validação muito básica para o código iframe. """
        if not value or not value.strip():
             raise serializers.ValidationError("O código iframe não pode ser vazio.")
        value = value.strip()
        # Verifica se contém elementos básicos de um iframe do Google
        if not value.startswith('<iframe') or '</iframe>' not in value or 'src="https://calendar.google.com/calendar/embed?src=' not in value:
             raise serializers.ValidationError("O código fornecido não parece ser um iframe válido do Google Calendar.")
        # Poderia adicionar validação de tamanho máximo se desejado
        return value

    def validate_name(self, value):
         if not value or not value.strip():
             raise serializers.ValidationError("O nome do calendário não pode ser vazio.")
         return value.strip()