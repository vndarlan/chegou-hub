# backend/features/ia/migrations/0006_corrigir_dados_existentes.py
from django.db import migrations

def corrigir_dados_existentes(apps, schema_editor):
    """
    Corrige dados existentes para garantir compatibilidade
    """
    ProjetoIA = apps.get_model('ia', 'ProjetoIA')
    
    for projeto in ProjetoIA.objects.all():
        mudou = False
        
        # Corrigir departamentos_atendidos se estiver vazio
        if not projeto.departamentos_atendidos and projeto.departamento_atendido:
            projeto.departamentos_atendidos = [projeto.departamento_atendido]
            mudou = True
            print(f"✅ Projeto {projeto.id}: departamento '{projeto.departamento_atendido}' migrado para array")
        
        # Garantir que ferramentas_tecnologias seja uma lista
        if projeto.ferramentas_tecnologias is None:
            projeto.ferramentas_tecnologias = []
            mudou = True
            print(f"✅ Projeto {projeto.id}: ferramentas_tecnologias inicializado como lista")
        
        # Garantir que lista_ferramentas seja uma lista
        if projeto.lista_ferramentas is None:
            projeto.lista_ferramentas = []
            mudou = True
            print(f"✅ Projeto {projeto.id}: lista_ferramentas inicializado como lista")
        
        # Garantir valores padrão para campos decimais
        campos_decimais = [
            'horas_desenvolvimento', 'horas_testes', 'horas_documentacao', 'horas_deploy',
            'custo_hora_empresa', 'custo_apis_mensal', 'custo_treinamentos', 
            'custo_setup_inicial', 'custo_consultoria', 'horas_economizadas_mes',
            'valor_monetario_economizado_mes'
        ]
        
        for campo in campos_decimais:
            if getattr(projeto, campo) is None:
                if campo == 'custo_hora_empresa':
                    setattr(projeto, campo, 80.00)
                else:
                    setattr(projeto, campo, 0.00)
                mudou = True
                print(f"✅ Projeto {projeto.id}: {campo} inicializado")
        
        # Garantir nível de autonomia
        if not projeto.nivel_autonomia:
            projeto.nivel_autonomia = 'total'
            mudou = True
            print(f"✅ Projeto {projeto.id}: nivel_autonomia definido como 'total'")
        
        if mudou:
            projeto.save()
            print(f"💾 Projeto {projeto.id} salvo com correções")

def reverter_correcoes(apps, schema_editor):
    """
    Não faz nada na reversão - manter dados como estão
    """
    pass

class Migration(migrations.Migration):

    dependencies = [
        ('ia', '0005_adicionar_departamentos_multiplos'),
    ]

    operations = [
        migrations.RunPython(corrigir_dados_existentes, reverter_correcoes),
    ]