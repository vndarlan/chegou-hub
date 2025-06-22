# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='ManagedCalendar',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(help_text='Um nome descritivo para o calendário (Ex: Marketing, Feriados).', max_length=100, verbose_name='Nome do Calendário')),
                ('iframe_code', models.TextField(blank=True, help_text='Cole aqui o código iframe completo obtido do Google Calendar.', null=True, unique=True, verbose_name='Código Iframe do Google Calendar')),
                ('added_at', models.DateTimeField(auto_now_add=True, verbose_name='Adicionado em')),
            ],
            options={
                'verbose_name': 'Calendário Gerenciado (Iframe)',
                'verbose_name_plural': 'Calendários Gerenciados (Iframe)',
                'ordering': ['name'],
            },
        ),
    ]