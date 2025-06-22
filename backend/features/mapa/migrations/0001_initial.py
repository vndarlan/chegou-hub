# Generated manually

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='StatusPais',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nome', models.CharField(max_length=50, unique=True)),
                ('descricao', models.CharField(max_length=100)),
                ('cor_hex', models.CharField(default='#4CAF50', max_length=7)),
                ('ordem', models.IntegerField(default=0)),
            ],
            options={
                'verbose_name': 'Status do País',
                'verbose_name_plural': 'Status dos Países',
                'ordering': ['ordem'],
            },
        ),
        migrations.CreateModel(
            name='Pais',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nome_display', models.CharField(max_length=100)),
                ('nome_geojson', models.CharField(max_length=100)),
                ('latitude', models.FloatField()),
                ('longitude', models.FloatField()),
                ('ativo', models.BooleanField(default=True)),
                ('data_criacao', models.DateTimeField(auto_now_add=True)),
                ('status', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='mapa.statuspais')),
            ],
            options={
                'verbose_name': 'País',
                'verbose_name_plural': 'Países',
                'ordering': ['nome_display'],
            },
        ),
    ]