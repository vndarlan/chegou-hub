#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys


def main():
    """Run administrative tasks."""
    # Adicione código de diagnóstico para verificar a conexão PostgreSQL
    if __name__ == '__main__' and 'check_db' in sys.argv:
        import os
        from urllib.parse import urlparse
        import psycopg2
        
        # Obter URL do banco diretamente da variável de ambiente
        database_url = os.getenv('DATABASE_URL')
        if not database_url:
            print("ERRO: DATABASE_URL não está definida")
            sys.exit(1)
            
        print(f"Testando conexão direta com: {database_url.split('@')[0].split('://')[0]}://*****@{database_url.split('@')[1]}")
        
        try:
            # Parsear a URL
            url = urlparse(database_url)
            dbname = url.path[1:]
            user = url.username
            password = url.password
            host = url.hostname
            port = url.port
            
            # Conectar diretamente
            conn = psycopg2.connect(
                dbname=dbname,
                user=user,
                password=password,
                host=host,
                port=port,
                connect_timeout=10
            )
            
            print("CONEXÃO BEM-SUCEDIDA!")
            
            # Teste adicional: tentar criar uma tabela temporária
            with conn.cursor() as cur:
                try:
                    cur.execute("CREATE TEMPORARY TABLE test_connection (id serial PRIMARY KEY, data text);")
                    print("Tabela temporária criada com sucesso!")
                    conn.commit()
                except Exception as table_err:
                    print(f"ERRO ao criar tabela temporária: {str(table_err)}")
                    conn.rollback()
            
            conn.close()
            print("Teste de conexão PostgreSQL completo")
            
        except Exception as e:
            print(f"ERRO DE CONEXÃO: {type(e).__name__}: {str(e)}")
            sys.exit(1)
            
        if 'check_db' in sys.argv and len(sys.argv) == 2:
            sys.exit(0)

    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()