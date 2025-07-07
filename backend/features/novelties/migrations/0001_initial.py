from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='NoveltyExecution',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('execution_date', models.DateTimeField(auto_now_add=True, verbose_name='Data/Hora da Execução')),
                ('country', models.CharField(default='chile', max_length=50, verbose_name='País')),
                ('total_processed', models.IntegerField(default=0, verbose_name='Total Processadas')),
                ('successful', models.IntegerField(default=0, verbose_name='Sucessos')),
                ('failed', models.IntegerField(default=0, verbose_name='Falhas')),
                ('tabs_closed', models.IntegerField(default=0, verbose_name='Guias Fechadas')),
                ('execution_time', models.FloatField(default=0.0, verbose_name='Tempo de Execução (segundos)')),
                ('found_pagination', models.BooleanField(default=False, verbose_name='Encontrou Paginação')),
                ('status', models.CharField(choices=[('success', 'Sucesso'), ('partial', 'Parcial'), ('failed', 'Falha'), ('error', 'Erro Crítico')], default='success', max_length=20, verbose_name='Status')),
                ('error_message', models.TextField(blank=True, null=True, verbose_name='Mensagem de Erro')),
                ('details', models.JSONField(blank=True, default=dict, verbose_name='Detalhes Adicionais')),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL, verbose_name='Criado por')),
            ],
            options={
                'verbose_name': 'Execução de Novelty',
                'verbose_name_plural': 'Execuções de Novelties',
                'ordering': ['-execution_date'],
            },
        ),
        migrations.CreateModel(
            name='NoveltyFailure',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('item_id', models.CharField(max_length=100, verbose_name='ID do Item')),
                ('error_type', models.CharField(max_length=100, verbose_name='Tipo de Erro')),
                ('error_message', models.TextField(verbose_name='Mensagem de Erro')),
                ('timestamp', models.DateTimeField(auto_now_add=True, verbose_name='Timestamp')),
                ('execution', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='failures', to='novelties.noveltyexecution')),
            ],
            options={
                'verbose_name': 'Falha de Novelty',
                'verbose_name_plural': 'Falhas de Novelties',
                'ordering': ['-timestamp'],
            },
        ),
        migrations.AddIndex(
            model_name='noveltyexecution',
            index=models.Index(fields=['execution_date'], name='novelties_n_executi_b8b2c4_idx'),
        ),
        migrations.AddIndex(
            model_name='noveltyexecution',
            index=models.Index(fields=['country'], name='novelties_n_country_8c5f42_idx'),
        ),
        migrations.AddIndex(
            model_name='noveltyexecution',
            index=models.Index(fields=['status'], name='novelties_n_status_9a4b21_idx'),
        ),
    ]