# Generated by Django 5.2 on 2025-07-24 00:29

from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('processamento', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='shopifyconfig',
            name='nome_loja',
            field=models.CharField(default='Loja Principal', help_text='Nome para identificar a loja', max_length=100),
            preserve_default=False,
        ),
        migrations.AlterUniqueTogether(
            name='shopifyconfig',
            unique_together={('user', 'shop_url')},
        ),
    ]
