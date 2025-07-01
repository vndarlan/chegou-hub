from rest_framework import serializers
from .models import LogEntry, TipoFerramenta, NivelLog, PaisNicochat

class LogEntrySerializer(serializers.ModelSerializer):
    resolvido_por_nome = serializers.CharField(
        source='resolvido_por.get_full_name', 
        read_only=True
    )
    tempo_relativo = serializers.SerializerMethodField()
    
    class Meta:
        model = LogEntry
        fields = [
            'id', 'ferramenta', 'nivel', 'mensagem', 'detalhes',
            'pais', 'usuario_conversa', 'id_conversa', 
            'ip_origem', 'user_agent', 'timestamp', 'tempo_relativo',
            'resolvido', 'resolvido_por', 'resolvido_por_nome', 'data_resolucao'
        ]
        read_only_fields = ['timestamp', 'resolvido_por_nome', 'tempo_relativo']
    
    def get_tempo_relativo(self, obj):
        from django.utils import timezone
        from datetime import timedelta
        
        now = timezone.now()
        diff = now - obj.timestamp
        
        if diff < timedelta(minutes=1):
            return "Agora há pouco"
        elif diff < timedelta(hours=1):
            return f"{diff.seconds // 60} min atrás"
        elif diff < timedelta(days=1):
            return f"{diff.seconds // 3600} h atrás"
        elif diff < timedelta(days=7):
            return f"{diff.days} dia(s) atrás"
        else:
            return obj.timestamp.strftime("%d/%m/%Y %H:%M")

class CriarLogSerializer(serializers.ModelSerializer):
    """Serializer simplificado para criação de logs via API"""
    
    class Meta:
        model = LogEntry
        fields = [
            'ferramenta', 'nivel', 'mensagem', 'detalhes',
            'pais', 'usuario_conversa', 'id_conversa', 
            'ip_origem', 'user_agent'
        ]
    
    def validate_ferramenta(self, value):
        if value not in [choice[0] for choice in TipoFerramenta.choices]:
            raise serializers.ValidationError("Ferramenta inválida")
        return value
    
    def validate_nivel(self, value):
        if value not in [choice[0] for choice in NivelLog.choices]:
            raise serializers.ValidationError("Nível de log inválido")
        return value
    
    def validate(self, data):
        # Se for Nicochat, país é obrigatório
        if data.get('ferramenta') == TipoFerramenta.NICOCHAT:
            if not data.get('pais'):
                raise serializers.ValidationError({
                    'pais': 'País é obrigatório para logs do Nicochat'
                })
            if data.get('pais') not in [choice[0] for choice in PaisNicochat.choices]:
                raise serializers.ValidationError({
                    'pais': 'País inválido para Nicochat'
                })
        return data

class MarcarResolvidoSerializer(serializers.Serializer):
    """Serializer para marcar/desmarcar logs como resolvidos"""
    resolvido = serializers.BooleanField()
    observacoes = serializers.CharField(
        required=False, 
        allow_blank=True,
        help_text="Observações sobre a resolução"
    )