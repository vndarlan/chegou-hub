# Generated by Django 5.2 on 2025-07-01 02:12

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
            name='LogEntry',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('ferramenta', models.CharField(choices=[('Nicochat', 'Nicochat'), ('N8N', 'N8N')], max_length=20, verbose_name='Ferramenta')),
                ('nivel', models.CharField(choices=[('info', 'Info'), ('warning', 'Warning'), ('error', 'Error'), ('critical', 'Critical')], default='info', max_length=20, verbose_name='Nível')),
                ('mensagem', models.TextField(verbose_name='Mensagem')),
                ('detalhes', models.JSONField(blank=True, default=dict, null=True, verbose_name='Detalhes Técnicos')),
                ('pais', models.CharField(blank=True, choices=[('colombia', 'Colômbia'), ('chile', 'Chile'), ('mexico', 'México'), ('polonia', 'Polônia'), ('romenia', 'Romênia'), ('espanha', 'Espanha'), ('italia', 'Itália')], max_length=20, null=True, verbose_name='País (Nicochat)')),
                ('usuario_conversa', models.CharField(blank=True, max_length=100, null=True, verbose_name='Usuário da Conversa')),
                ('id_conversa', models.CharField(blank=True, max_length=100, null=True, verbose_name='ID da Conversa')),
                ('ip_origem', models.GenericIPAddressField(blank=True, null=True, verbose_name='IP de Origem')),
                ('user_agent', models.TextField(blank=True, null=True, verbose_name='User Agent')),
                ('timestamp', models.DateTimeField(auto_now_add=True, verbose_name='Data/Hora')),
                ('resolvido', models.BooleanField(default=False, verbose_name='Resolvido')),
                ('data_resolucao', models.DateTimeField(blank=True, null=True, verbose_name='Data de Resolução')),
                ('resolvido_por', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='ia_logs_resolvidos', to=settings.AUTH_USER_MODEL, verbose_name='Resolvido por')),
            ],
            options={
                'verbose_name': 'Log de IA',
                'verbose_name_plural': 'Logs de IA',
                'ordering': ['-timestamp'],
                'indexes': [models.Index(fields=['ferramenta', 'timestamp'], name='ia_logentry_ferrame_7e866b_idx'), models.Index(fields=['nivel', 'timestamp'], name='ia_logentry_nivel_8225fa_idx'), models.Index(fields=['pais', 'timestamp'], name='ia_logentry_pais_c41da4_idx'), models.Index(fields=['resolvido'], name='ia_logentry_resolvi_865ee9_idx')],
            },
        ),
    ]
