# backend/features/metricas_dropi/migrations/0002_add_dropi_token.py
from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('metricas_dropi', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='DropiToken',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('pais', models.CharField(choices=[('mexico', 'México'), ('colombia', 'Colômbia'), ('chile', 'Chile')], max_length=20, unique=True)),
                ('token', models.TextField(verbose_name='Token de Acesso')),
                ('expires_at', models.DateTimeField(verbose_name='Expira em')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Criado em')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Atualizado em')),
            ],
            options={
                'verbose_name': 'Token Dropi',
                'verbose_name_plural': 'Tokens Dropi',
                'ordering': ['-updated_at'],
            },
        ),
        migrations.AddField(
            model_name='analisedropi',
            name='pais',
            field=models.CharField(choices=[('mexico', 'México'), ('colombia', 'Colômbia'), ('chile', 'Chile')], default='mexico', max_length=20, verbose_name='País'),
        ),
    ]
