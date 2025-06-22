from rest_framework import serializers
from .models import Pais, StatusPais

class StatusPaisSerializer(serializers.ModelSerializer):
    class Meta:
        model = StatusPais
        fields = '__all__'

class PaisSerializer(serializers.ModelSerializer):
    status_info = StatusPaisSerializer(source='status', read_only=True)
    
    class Meta:
        model = Pais
        fields = '__all__'