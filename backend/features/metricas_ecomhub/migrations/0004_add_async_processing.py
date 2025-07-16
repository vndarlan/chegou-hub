from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings

class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('metricas_ecomhub', '0003_rename_metricas_ec_loja_sh_5a7b57_idx_metricas_ec_loja_sh_eb3b6d_idx_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='ProcessamentoJob',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('job_id', models.CharField(max_length=100, unique=True, verbose_name='ID do Job')),
                ('nome', models.CharField(max_length=255, verbose_name='Nome do Processamento')),
                ('tipo_metrica', models.CharField(choices=[('loja', 'Por Loja'), ('produto', 'Por Produto')], default='produto', max_length=20)),
                ('arquivo_nome', models.CharField(max_length=255, verbose_name='Nome do Arquivo')),
                ('arquivo_path', models.TextField(verbose_name='Caminho do Arquivo Temporário')),
                ('status', models.CharField(choices=[('pending', 'Pendente'), ('processing', 'Processando'), ('completed', 'Concluído'), ('failed', 'Falhou'), ('cancelled', 'Cancelado')], default='pending', max_length=20)),
                ('progresso_atual', models.IntegerField(default=0, verbose_name='Progresso Atual')),
                ('progresso_total', models.IntegerField(default=0, verbose_name='Total de Itens')),
                ('progresso_porcentagem', models.FloatField(default=0.0, verbose_name='Porcentagem')),
                ('mensagem_atual', models.TextField(blank=True, null=True, verbose_name='Mensagem Atual')),
                ('log_processamento', models.JSONField(default=list, verbose_name='Log de Processamento')),
                ('erro_detalhes', models.TextField(blank=True, null=True, verbose_name='Detalhes do Erro')),
                ('dados_resultado', models.JSONField(blank=True, null=True, verbose_name='Dados do Resultado')),
                ('estatisticas', models.JSONField(blank=True, null=True, verbose_name='Estatísticas')),
                ('produtos_nao_encontrados', models.JSONField(default=list, verbose_name='Produtos Não Encontrados')),
                ('cache_hits', models.IntegerField(default=0, verbose_name='Cache Hits')),
                ('api_calls', models.IntegerField(default=0, verbose_name='Chamadas API')),
                ('tempo_inicio', models.DateTimeField(blank=True, null=True)),
                ('tempo_fim', models.DateTimeField(blank=True, null=True)),
                ('criado_em', models.DateTimeField(auto_now_add=True)),
                ('atualizado_em', models.DateTimeField(auto_now=True)),
                ('criado_por', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL, verbose_name='Criado por')),
                ('loja_shopify', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to='metricas_ecomhub.lojashopify')),
            ],
            options={
                'verbose_name': 'Job de Processamento',
                'verbose_name_plural': 'Jobs de Processamento',
                'ordering': ['-criado_em'],
            },
        ),
        migrations.CreateModel(
            name='ProcessamentoChunk',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('chunk_index', models.IntegerField(verbose_name='Índice do Chunk')),
                ('pedidos', models.JSONField(verbose_name='Lista de Pedidos do Chunk')),
                ('status', models.CharField(choices=[('pending', 'Pendente'), ('processing', 'Processando'), ('completed', 'Concluído'), ('failed', 'Falhou')], default='pending', max_length=20)),
                ('produtos_encontrados', models.JSONField(default=dict, verbose_name='Produtos Encontrados')),
                ('cache_hits_chunk', models.IntegerField(default=0)),
                ('api_calls_chunk', models.IntegerField(default=0)),
                ('erro_chunk', models.TextField(blank=True, null=True)),
                ('inicio_chunk', models.DateTimeField(blank=True, null=True)),
                ('fim_chunk', models.DateTimeField(blank=True, null=True)),
                ('job', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='chunks', to='metricas_ecomhub.processamentojob')),
            ],
            options={
                'verbose_name': 'Chunk de Processamento',
                'verbose_name_plural': 'Chunks de Processamento',
                'ordering': ['chunk_index'],
            },
        ),
        migrations.AddIndex(
            model_name='processamentojob',
            index=models.Index(fields=['job_id'], name='metricas_ec_job_id_eb2a5b_idx'),
        ),
        migrations.AddIndex(
            model_name='processamentojob',
            index=models.Index(fields=['status', 'criado_em'], name='metricas_ec_status_5a8c5b_idx'),
        ),
        migrations.AddIndex(
            model_name='processamentojob',
            index=models.Index(fields=['criado_por', 'status'], name='metricas_ec_criado__9f6a2b_idx'),
        ),
        migrations.AlterUniqueTogether(
            name='processamentochunk',
            unique_together={('job', 'chunk_index')},
        ),
    ]