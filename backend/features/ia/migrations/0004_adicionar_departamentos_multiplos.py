# backend/features/ia/migrations/0004_adicionar_departamentos_multiplos.py
from django.db import migrations, models

def migrar_departamentos(apps, schema_editor):
    """Migrar dados do campo singular para o campo múltiplo"""
    ProjetoIA = apps.get_model('ia', 'ProjetoIA')
    
    # Mapear valores antigos para novos
    mapeamento = {
        'ti': 'ia_automacoes',
        'marketing': 'trafego_pago',
        'vendas': 'operacional', 
        'operacional': 'operacional',
        'financeiro': 'gestao',
        'rh': 'gestao',
        'atendimento': 'suporte',
        'diretoria': 'diretoria'
    }
    
    for projeto in ProjetoIA.objects.all():
        if projeto.departamento_atendido:
            novo_dept = mapeamento.get(projeto.departamento_atendido, 'operacional')
            projeto.departamentos_atendidos = [novo_dept]
            projeto.save()

def reverter_migracoes(apps, schema_editor):
    """Reverter para campo singular (pega primeiro departamento)"""
    ProjetoIA = apps.get_model('ia', 'ProjetoIA')
    
    for projeto in ProjetoIA.objects.all():
        if projeto.departamentos_atendidos:
            projeto.departamento_atendido = projeto.departamentos_atendidos[0]
            projeto.save()

class Migration(migrations.Migration):

    dependencies = [
        ('ia', '0003_adicionar_novos_campos_financeiros'),
    ]

    operations = [
        # Adicionar novo campo
        migrations.AddField(
            model_name='projetoia',
            name='departamentos_atendidos',
            field=models.JSONField(default=list, help_text='Lista de departamentos que o projeto atende', verbose_name='Departamentos Atendidos'),
        ),
        
        # Migrar dados
        migrations.RunPython(migrar_departamentos, reverter_migracoes),
        
        # Remover required do campo antigo (manter por compatibilidade)
        migrations.AlterField(
            model_name='projetoia',
            name='departamento_atendido',
            field=models.CharField(blank=True, choices=[('diretoria', 'Diretoria'), ('gestao', 'Gestão'), ('operacional', 'Operacional'), ('ia_automacoes', 'IA & Automações'), ('suporte', 'Suporte'), ('trafego_pago', 'Tráfego Pago')], max_length=20, null=True, verbose_name='Departamento Atendido (LEGADO)'),
        ),
    ]