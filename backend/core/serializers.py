# backend/core/serializers.py
from rest_framework import serializers
from .models import ManagedCalendar, AIProject, ImageStyle, PrimeCODProduct, PrimeCODOrder, PrimeCODApiConfig
from django.contrib.auth import get_user_model

User = get_user_model()

# --- Serializer para ImageStyle ---
# A definição da classe vem DEPOIS do import
class ImageStyleSerializer(serializers.ModelSerializer):
    creator_email = serializers.EmailField(source='creator.email', read_only=True, allow_null=True)

    class Meta:
        model = ImageStyle # O modelo ImageStyle deve ser conhecido aqui por causa do import acima
        fields = [
            'id',
            'name',
            'instructions',
            'creator',
            'creator_email',
            'added_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'added_at', 'updated_at', 'creator_email']

    def validate_name(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("O nome do estilo não pode ser vazio.")
        instance = getattr(self, 'instance', None)
        query = ImageStyle.objects.filter(name__iexact=value.strip())
        if instance:
            query = query.exclude(pk=instance.pk)
        if query.exists():
            raise serializers.ValidationError("Já existe um estilo com este nome.")
        return value.strip()

    def validate_instructions(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("As instruções do estilo não podem ser vazias.")
        return value.strip()

# --- Serializers Existentes (ManagedCalendarSerializer, AIProjectSerializer) ---
# A definição destas classes também vem DEPOIS do import dos modelos
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
        # if 'src="https://calendar.google.com/calendar/embed?src=' not in value:
        #      print("AVISO: O iframe não parece ser do Google Calendar, mas será aceito.")
        return value

    def validate_name(self, value):
         if not value or not value.strip():
             raise serializers.ValidationError("O nome do calendário não pode ser vazio.")
         return value.strip()

class AIProjectSerializer(serializers.ModelSerializer):
    creator_email = serializers.EmailField(source='creator.email', read_only=True, allow_null=True)

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
            'creator',
            'creator_email',
            'creator_names',
            'added_at',
        ]
        read_only_fields = ['id', 'added_at', 'creator_email']

    def validate(self, data):
        creation_date = data.get('creation_date')
        finalization_date = data.get('finalization_date')
        if creation_date and finalization_date and finalization_date < creation_date:
            raise serializers.ValidationError({
                'finalization_date': 'A data de finalização não pode ser anterior à data de criação.'
            })
        return data
    
class PrimeCODProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = PrimeCODProduct
        fields = ['id', 'sku', 'name', 'country_code', 'created_at', 'updated_at']
        
class PrimeCODOrderSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    
    class Meta:
        model = PrimeCODOrder
        fields = ['id', 'reference', 'product', 'product_name', 'status', 
                 'country_code', 'order_date', 'shipping_fees', 'total_price']

class PrimeCODMetricsSerializer(serializers.Serializer):
    product = serializers.CharField()
    pedidos = serializers.IntegerField()
    pedidos_enviados = serializers.IntegerField()
    pedidos_entregues = serializers.IntegerField()
    efetividade = serializers.FloatField()
    em_transito = serializers.IntegerField()
    recusados = serializers.IntegerField()
    devolvidos = serializers.IntegerField()
    outros_status = serializers.IntegerField()
    receita_liquida = serializers.DecimalField(max_digits=12, decimal_places=2)