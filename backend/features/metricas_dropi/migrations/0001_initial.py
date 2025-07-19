import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='AnaliseDropi',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nome', models.CharField(max_length=255, verbose_name='Nome da Análise')),
                ('descricao', models.TextField(blank=True, null=True, verbose_name='Descrição')),
                ('dados_pedidos', models.JSONField(blank=True, null=True, verbose_name='Dados dos Pedidos')),
                ('tipo_metrica', models.CharField(default='pedidos', max_length=20, verbose_name='Tipo de Métrica')),
                ('data_inicio', models.DateField(verbose_name='Data Início')),
                ('data_fim', models.DateField(verbose_name='Data Fim')),
                ('user_id_dropi', models.CharField(max_length=50, verbose_name='User ID Dropi')),
                ('total_pedidos', models.IntegerField(default=0, verbose_name='Total de Pedidos')),
                ('criado_em', models.DateTimeField(auto_now_add=True, verbose_name='Criado em')),
                ('atualizado_em', models.DateTimeField(auto_now=True, verbose_name='Atualizado em')),
                ('criado_por', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL, verbose_name='Criado por')),
            ],
            options={
                'verbose_name': 'Análise Dropi MX',
                'verbose_name_plural': 'Análises Dropi MX',
                'ordering': ['-atualizado_em'],
                'unique_together': {('nome', 'criado_por')},
            },
        ),
    ]