#!/usr/bin/env python
"""
Script para testar se a função pode ser importada
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, '.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

def main():
    print("=== TESTE DE IMPORT DA FUNCAO ===\n")
    
    try:
        # Tenta importar a função
        from features.processamento.views import buscar_ips_duplicados_simples
        print("[OK] Funcao buscar_ips_duplicados_simples importada com sucesso")
        print(f"[INFO] Funcao: {buscar_ips_duplicados_simples}")
        print(f"[INFO] Doc: {buscar_ips_duplicados_simples.__doc__}")
        return True
        
    except Exception as e:
        print(f"[ERROR] Erro ao importar funcao: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    main()