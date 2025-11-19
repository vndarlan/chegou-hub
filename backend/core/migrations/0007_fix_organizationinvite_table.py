# Generated manually to fix production migration issue
# This migration ensures the OrganizationInvite table exists with all required fields

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def create_table_if_not_exists(apps, schema_editor):
    """
    Cria a tabela core_organizationinvite se ela não existir.
    Isso resolve o problema onde a migration 0001 não foi aplicada corretamente em produção.
    """
    from django.db import connection

    with connection.cursor() as cursor:
        # Verifica se a tabela existe
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name = 'core_organizationinvite'
            );
        """)
        table_exists = cursor.fetchone()[0]

        if not table_exists:
            print("❌ Tabela core_organizationinvite não existe. Criando...")

            # Cria a tabela completa com todos os campos (incluindo modulos_permitidos da migration 0002)
            cursor.execute("""
                CREATE TABLE core_organizationinvite (
                    id BIGSERIAL PRIMARY KEY,
                    email VARCHAR(254) NOT NULL,
                    role VARCHAR(10) NOT NULL DEFAULT 'member',
                    codigo VARCHAR(64) NOT NULL UNIQUE,
                    criado_em TIMESTAMP WITH TIME ZONE NOT NULL,
                    expira_em TIMESTAMP WITH TIME ZONE NOT NULL,
                    aceito_em TIMESTAMP WITH TIME ZONE NULL,
                    status VARCHAR(10) NOT NULL DEFAULT 'pending',
                    modulos_permitidos JSONB NOT NULL DEFAULT '[]'::jsonb,
                    aceito_por_id BIGINT NULL,
                    convidado_por_id BIGINT NOT NULL,
                    organization_id BIGINT NOT NULL,
                    CONSTRAINT core_organizationinvite_aceito_por_id_fk
                        FOREIGN KEY (aceito_por_id) REFERENCES auth_user(id)
                        ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED,
                    CONSTRAINT core_organizationinvite_convidado_por_id_fk
                        FOREIGN KEY (convidado_por_id) REFERENCES auth_user(id)
                        ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
                    CONSTRAINT core_organizationinvite_organization_id_fk
                        FOREIGN KEY (organization_id) REFERENCES core_organization(id)
                        ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED
                );
            """)

            # Cria índices
            cursor.execute("""
                CREATE INDEX core_organi_codigo_dc88e7_idx
                ON core_organizationinvite (codigo);
            """)

            cursor.execute("""
                CREATE INDEX core_organi_email_b09687_idx
                ON core_organizationinvite (email, status);
            """)

            cursor.execute("""
                CREATE INDEX core_organi_organiz_b16aa0_idx
                ON core_organizationinvite (organization_id, status);
            """)

            cursor.execute("""
                CREATE INDEX core_organizationinvite_aceito_por_id_idx
                ON core_organizationinvite (aceito_por_id);
            """)

            cursor.execute("""
                CREATE INDEX core_organizationinvite_convidado_por_id_idx
                ON core_organizationinvite (convidado_por_id);
            """)

            cursor.execute("""
                CREATE INDEX core_organizationinvite_organization_id_idx
                ON core_organizationinvite (organization_id);
            """)

            print("✅ Tabela core_organizationinvite criada com sucesso!")
        else:
            print("✅ Tabela core_organizationinvite já existe.")

            # Verifica se o campo modulos_permitidos existe
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.columns
                    WHERE table_schema = 'public'
                    AND table_name = 'core_organizationinvite'
                    AND column_name = 'modulos_permitidos'
                );
            """)
            column_exists = cursor.fetchone()[0]

            if not column_exists:
                print("⚠️ Campo modulos_permitidos não existe. Adicionando...")
                cursor.execute("""
                    ALTER TABLE core_organizationinvite
                    ADD COLUMN modulos_permitidos JSONB NOT NULL DEFAULT '[]'::jsonb;
                """)
                print("✅ Campo modulos_permitidos adicionado com sucesso!")
            else:
                print("✅ Campo modulos_permitidos já existe.")


def reverse_migration(apps, schema_editor):
    """
    Não fazemos nada no reverse porque não queremos deletar a tabela.
    """
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0006_fix_organizations_status_for_approved_filter'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.RunPython(create_table_if_not_exists, reverse_migration),
    ]
