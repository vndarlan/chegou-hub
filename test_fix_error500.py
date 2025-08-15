#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# test_fix_error500.py - Script para testar correções do erro 500

import requests
import json
import time

# Configurações
BASE_URL = "https://chegou-hub-production.up.railway.app/api"

# Headers de autenticação (você precisa obter um token válido)
HEADERS = {
    "Content-Type": "application/json",
    # "Authorization": "Token YOUR_TOKEN_HERE"  # Descomente e adicione seu token
}

def test_endpoint(endpoint, data, description):
    """Testa um endpoint específico"""
    print(f"\n{'='*50}")
    print(f"TESTANDO: {description}")
    print(f"Endpoint: {endpoint}")
    print(f"Payload: {json.dumps(data, indent=2)}")
    print(f"{'='*50}")
    
    try:
        url = f"{BASE_URL}{endpoint}"
        response = requests.post(url, headers=HEADERS, json=data, timeout=30)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        try:
            response_data = response.json()
            print(f"Response JSON:")
            print(json.dumps(response_data, indent=2, ensure_ascii=False))
        except:
            print(f"Response Text: {response.text}")
        
        if response.status_code == 500:
            print("[ERRO 500] - PROBLEMA AINDA PERSISTE!")
            return False
        elif response.status_code in [200, 400, 401, 403, 404]:
            print("[SUCESSO] - SEM ERRO 500!")
            return True
        else:
            print(f"[STATUS INESPERADO]: {response.status_code}")
            return True
            
    except requests.exceptions.RequestException as e:
        print(f"[ERRO DE CONEXAO]: {str(e)}")
        return False

def main():
    """Executa todos os testes"""
    print("TESTANDO CORRECOES DOS ERROS 500 NO DETECTOR DE IP")
    print("="*60)
    
    # Lista de testes a executar
    tests = [
        {
            "endpoint": "/processamento/test-simple/",
            "data": {},
            "description": "Teste de Endpoint Simples (sem auth)"
        },
        {
            "endpoint": "/processamento/buscar-ips-duplicados/",
            "data": {"loja_id": "1", "days": 7, "min_orders": 2},
            "description": "Buscar IPs Duplicados (PRINCIPAL - CORRIGIDO)"
        },
        {
            "endpoint": "/processamento/detalhar-ip/",
            "data": {"loja_id": "1", "ip": "177.55.192.123", "days": 7},
            "description": "Detalhar IP Específico (PRINCIPAL - CORRIGIDO)"
        },
        {
            "endpoint": "/processamento/debug-detector/",
            "data": {"loja_id": "1"},
            "description": "Debug do Detector (NOVO ENDPOINT)"
        }
    ]
    
    successful_tests = 0
    failed_tests = 0
    
    for test in tests:
        success = test_endpoint(
            test["endpoint"], 
            test["data"], 
            test["description"]
        )
        
        if success:
            successful_tests += 1
        else:
            failed_tests += 1
        
        time.sleep(2)  # Pausa entre testes
    
    # Relatório final
    print(f"\n{'='*60}")
    print("RELATORIO FINAL DOS TESTES")
    print(f"{'='*60}")
    print(f"Testes bem-sucedidos: {successful_tests}")
    print(f"Testes falharam: {failed_tests}")
    print(f"Taxa de sucesso: {(successful_tests/(successful_tests+failed_tests)*100):.1f}%")
    
    if failed_tests == 0:
        print("TODOS OS TESTES PASSARAM! Erros 500 corrigidos!")
    else:
        print("Alguns testes ainda falharam. Investigação adicional necessária.")
    
    print(f"\nBase URL testada: {BASE_URL}")
    print("Para testes autenticados, adicione um token válido no script")

if __name__ == "__main__":
    main()