# backend/features/ia/migrations/0003_adicionar_novos_campos_financeiros.py
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ia', '0002_projetoia_versaoprojeto_and_more'),
    ]

    operations = [
        # Adicionar novos campos financeiros
        migrations.AddField(
            model_name='projetoia',
            name='custo_hora_empresa',
            field=models.DecimalField(decimal_places=2, default=80.0, help_text='Quanto custa cada hora de trabalho na empresa', max_digits=8, verbose_name='Custo/Hora da Empresa (R$)'),
        ),
        migrations.AddField(
            model_name='projetoia',
            name='custo_apis_mensal',
            field=models.DecimalField(decimal_places=2, default=0, help_text='Custo mensal com APIs (ChatGPT, Claude, etc.)', max_digits=10, verbose_name='Custo APIs/Mês (R$)'),
        ),
        migrations.AddField(
            model_name='projetoia',
            name='lista_ferramentas',
            field=models.JSONField(default=list, help_text='Lista de ferramentas com seus custos mensais [{nome, valor}]', verbose_name='Lista de Ferramentas'),
        ),
        migrations.AddField(
            model_name='projetoia',
            name='horas_economizadas_mes',
            field=models.DecimalField(decimal_places=2, default=0, help_text='Quantidade de horas economizadas mensalmente', max_digits=10, verbose_name='Horas Economizadas por Mês'),
        ),
        migrations.AddField(
            model_name='projetoia',
            name='valor_monetario_economizado_mes',
            field=models.DecimalField(decimal_places=2, default=0, help_text='Outros ganhos em reais por mês', max_digits=10, verbose_name='Valor Monetário Economizado/Mês (R$)'),
        ),
        migrations.AddField(
            model_name='projetoia',
            name='nivel_autonomia',
            field=models.CharField(choices=[('total', 'Totalmente Autônomo'), ('parcial', 'Requer Supervisão'), ('manual', 'Processo Manual')], default='total', max_length=10, verbose_name='Nível de Autonomia'),
        ),
        migrations.AddField(
            model_name='projetoia',
            name='data_break_even',
            field=models.DateField(blank=True, help_text='Quando o projeto começou a dar retorno', null=True, verbose_name='Data de Break-Even'),
        ),
    ]