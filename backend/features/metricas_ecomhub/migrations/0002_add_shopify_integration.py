# backend/features/metricas_ecomhub/migrations/0002_add_shopify_integration.py
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('metricas_ecomhub', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='LojaShopify',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nome', models.CharField(max_length=100, unique=True, verbose_name='Nome da Loja')),
                ('shopify_domain', models.CharField(max_length=255, verbose_name='Domínio Shopify (ex: minhaloja.myshopify.com)')),
                ('access_token', models.TextField(verbose_name='Access Token')),
                ('api_version', models.CharField(default='2024-01', max_length=20, verbose_name='Versão da API')),
                ('descricao', models.TextField(blank=True, null=True, verbose_name='Descrição')),
                ('pais', models.CharField(blank=True, max_length=50, null=True, verbose_name='País')),
                ('moeda', models.CharField(blank=True, max_length=10, null=True, verbose_name='Moeda')),
                ('ativo', models.BooleanField(default=True, verbose_name='Ativo')),
                ('testado_em', models.DateTimeField(blank=True, null=True, verbose_name='Última Conexão Testada')),
                ('ultimo_erro', models.TextField(blank=True, null=True, verbose_name='Último Erro')),
                ('criado_em', models.DateTimeField(auto_now_add=True, verbose_name='Criado em')),
                ('atualizado_em', models.DateTimeField(auto_now=True, verbose_name='Atualizado em')),
                ('criado_por', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL, verbose_name='Criado por')),
            ],
            options={
                'verbose_name': 'Loja Shopify',
                'verbose_name_plural': 'Lojas Shopify',
                'ordering': ['nome'],
            },
        ),
        migrations.CreateModel(
            name='CacheProdutoShopify',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('order_number', models.CharField(max_length=50, verbose_name='Número do Pedido')),
                ('produto_nome', models.CharField(max_length=255, verbose_name='Nome do Produto')),
                ('produto_id', models.CharField(max_length=50, verbose_name='ID do Produto')),
                ('variant_id', models.CharField(blank=True, max_length=50, null=True, verbose_name='ID da Variante')),
                ('sku', models.CharField(blank=True, max_length=100, null=True, verbose_name='SKU')),
                ('criado_em', models.DateTimeField(auto_now_add=True)),
                ('atualizado_em', models.DateTimeField(auto_now=True)),
                ('loja_shopify', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='metricas_ecomhub.lojashopify')),
            ],
            options={
                'verbose_name': 'Cache Produto Shopify',
                'verbose_name_plural': 'Cache Produtos Shopify',
            },
        ),
        migrations.AddField(
            model_name='analiseecomhub',
            name='tipo_metrica',
            field=models.CharField(choices=[('loja', 'Por Loja'), ('produto', 'Por Produto')], default='produto', max_length=20, verbose_name='Tipo de Métrica'),
        ),
        migrations.AddField(
            model_name='analiseecomhub',
            name='loja_shopify',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='metricas_ecomhub.lojashopify'),
        ),
        migrations.AddIndex(
            model_name='cacheprodutoshopify',
            index=models.Index(fields=['loja_shopify', 'order_number'], name='metricas_ec_loja_sh_5a7b57_idx'),
        ),
        migrations.AlterUniqueTogether(
            name='cacheprodutoshopify',
            unique_together={('loja_shopify', 'order_number')},
        ),
    ]