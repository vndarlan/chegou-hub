#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys
import time


def main():
    """Run administrative tasks."""
    # Adicionar comando check_db (sem interferir nas importações globais)
    if len(sys.argv) > 1 and sys.argv[1] == 'check_db':
        from urllib.parse import urlparse
        import socket
        
        try:
            import psycopg2
        except ImportError:
            print("AVISO: psycopg2 não está instalado. Verificação de BD pulada.")
            return
        
        # Obter URL do banco diretamente da variável de ambiente
        database_url = os.getenv('DATABASE_URL')
        if not database_url:
            print("ERRO: DATABASE_URL não está definida")
            sys.exit(1)
            
        print(f"Testando conexão com: {database_url.split('@')[0].split('://')[0]}://*****@{database_url.split('@')[1]}")
        
        # Extrair o hostname para teste de DNS
        url = urlparse(database_url)
        hostname = url.hostname
        print(f"Hostname extraído: {hostname}")
        
        # Verificar se podemos resolver o hostname
        try:
            host_ip = socket.gethostbyname(hostname)
            print(f"Hostname resolvido: {hostname} -> {host_ip}")
        except Exception as dns_error:
            print(f"ERRO DNS: Não foi possível resolver {hostname}: {str(dns_error)}")
            return
        
        # Tentar conexão apenas se conseguimos resolver o DNS
        try:
            dbname = url.path[1:]
            user = url.username
            password = url.password
            port = url.port or 5432
            
            print(f"Tentando conexão PostgreSQL: {user}@{hostname}:{port}/{dbname}")
            
            conn = psycopg2.connect(
                dbname=dbname,
                user=user,
                password=password,
                host=hostname,
                port=port,
                connect_timeout=10
            )
            
            print("CONEXÃO BEM-SUCEDIDA!")
            conn.close()
            
        except Exception as e:
            print(f"ERRO DE CONEXÃO: {type(e).__name__}: {str(e)}")
        
        return

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