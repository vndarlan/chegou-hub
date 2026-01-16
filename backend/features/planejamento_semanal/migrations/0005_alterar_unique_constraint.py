# Generated migration to change unique constraint
from django.db import migrations


def remove_duplicates(apps, schema_editor):
    """
    Remove planejamentos duplicados, mantendo o que tem mais itens.
    Duplicados são identificados por (semana_id, jira_account_id).
    """
    PlanejamentoSemanal = apps.get_model('planejamento_semanal', 'PlanejamentoSemanal')

    # Encontrar combinações duplicadas
    from django.db.models import Count

    duplicates = (
        PlanejamentoSemanal.objects
        .values('semana_id', 'jira_account_id')
        .annotate(count=Count('id'))
        .filter(count__gt=1)
    )

    for dup in duplicates:
        # Pegar todos os planejamentos duplicados
        planejamentos = list(
            PlanejamentoSemanal.objects
            .filter(semana_id=dup['semana_id'], jira_account_id=dup['jira_account_id'])
            .order_by('-id')  # Mais recente primeiro
        )

        if len(planejamentos) > 1:
            # Encontrar o que tem mais itens
            melhor = max(planejamentos, key=lambda p: p.itens.count())

            # Deletar os outros
            for p in planejamentos:
                if p.id != melhor.id:
                    p.delete()


def reverse_noop(apps, schema_editor):
    """Nada a fazer no reverse - dados já foram deletados"""
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('planejamento_semanal', '0004_add_configuracao_apresentacao'),
    ]

    operations = [
        # Primeiro remove duplicados
        migrations.RunPython(remove_duplicates, reverse_noop),

        # Depois altera a constraint
        migrations.AlterUniqueTogether(
            name='planejamentosemanal',
            unique_together={('semana', 'jira_account_id')},
        ),
    ]
