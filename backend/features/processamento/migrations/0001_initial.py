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
            name='ShopifyConfig',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('shop_url', models.CharField(help_text='URL da loja (ex: minha-loja.myshopify.com)', max_length=255)),
                ('access_token', models.CharField(help_text='Token de acesso da API do Shopify', max_length=255)),
                ('api_version', models.CharField(default='2024-07', max_length=20)),
                ('ativo', models.BooleanField(default=True)),
                ('data_criacao', models.DateTimeField(auto_now_add=True)),
                ('data_atualizacao', models.DateTimeField(auto_now=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Configuração Shopify',
                'verbose_name_plural': 'Configurações Shopify',
                'ordering': ['-data_criacao'],
            },
        ),
        migrations.CreateModel(
            name='ProcessamentoLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('tipo', models.CharField(choices=[('busca', 'Busca de Duplicatas'), ('cancelamento', 'Cancelamento Individual'), ('cancelamento_lote', 'Cancelamento em Lote'), ('erro', 'Erro')], max_length=20)),
                ('status', models.CharField(choices=[('sucesso', 'Sucesso'), ('erro', 'Erro'), ('parcial', 'Parcial')], max_length=10)),
                ('detalhes', models.JSONField(default=dict)),
                ('pedidos_encontrados', models.IntegerField(default=0)),
                ('pedidos_cancelados', models.IntegerField(default=0)),
                ('erro_mensagem', models.TextField(blank=True)),
                ('data_execucao', models.DateTimeField(auto_now_add=True)),
                ('config', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='processamento.shopifyconfig')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Log de Processamento',
                'verbose_name_plural': 'Logs de Processamento',
                'ordering': ['-data_execucao'],
            },
        ),
    ]