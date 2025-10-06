# backend/features/tutoriais/serializers.py
from rest_framework import serializers
from .models import CategoriaAula, Aula


class AulaSerializer(serializers.ModelSerializer):
    """Serializer para aulas individuais"""

    video_id = serializers.ReadOnlyField()
    embed_url = serializers.ReadOnlyField()
    categoria_nome = serializers.CharField(source='categoria.nome', read_only=True)

    class Meta:
        model = Aula
        fields = [
            'id', 'titulo', 'slug', 'descricao', 'video_url',
            'embed_url', 'video_id', 'categoria', 'categoria_nome',
            'ordem', 'duracao', 'ativo', 'criado_em', 'atualizado_em'
        ]
        read_only_fields = ['slug', 'criado_em', 'atualizado_em']


class AulaListSerializer(serializers.ModelSerializer):
    """Serializer simplificado para listagem de aulas"""

    categoria_nome = serializers.CharField(source='categoria.nome', read_only=True)

    class Meta:
        model = Aula
        fields = [
            'id', 'titulo', 'slug', 'categoria_nome',
            'ordem', 'duracao', 'ativo'
        ]


class CategoriaAulaSerializer(serializers.ModelSerializer):
    """Serializer para categorias com suas aulas aninhadas"""

    aulas = AulaSerializer(many=True, read_only=True)
    total_aulas = serializers.ReadOnlyField()

    class Meta:
        model = CategoriaAula
        fields = [
            'id', 'nome', 'slug', 'ordem', 'icone',
            'ativo', 'total_aulas', 'aulas',
            'criado_em', 'atualizado_em'
        ]
        read_only_fields = ['slug', 'criado_em', 'atualizado_em']


class CategoriaAulaListSerializer(serializers.ModelSerializer):
    """Serializer simplificado para listagem de categorias"""

    total_aulas = serializers.ReadOnlyField()

    class Meta:
        model = CategoriaAula
        fields = [
            'id', 'nome', 'slug', 'ordem', 'icone',
            'ativo', 'total_aulas'
        ]
