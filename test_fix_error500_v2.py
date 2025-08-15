#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# test_fix_error500_v2.py - Script para testar correções do erro 500 com URL correta

import requests
import json
import time

# URLs para testar (tanto Railway quanto localhost se disponível)
URLS_TO_TEST = [
    "https://web-production-55da.up.railway.app/api",
    "https://chegou-hub-production.up.railway.app/api",
    "http://localhost:8000/api"
]

def test_base_url(base_url):
    """Testa se uma URL base está funcionando"""
    try:
        response = requests.get(f"{base_url}/processamento/status-lojas/", timeout=10)
        print(f"Testando {base_url}: Status {response.status_code}")
        return response.status_code != 404
    except:
        print(f"Erro ao conectar com {base_url}")
        return False

def find_working_base_url():
    """Encontra uma URL base que esteja funcionando"""
    for url in URLS_TO_TEST:
        if test_base_url(url):
            return url
    return None

def test_endpoint(base_url, endpoint, data, description):
    """Testa um endpoint específico"""
    print(f"\n{'='*50}")
    print(f"TESTANDO: {description}")
    print(f"Base URL: {base_url}")
    print(f"Endpoint: {endpoint}")
    print(f"Payload: {json.dumps(data, indent=2)}")
    print(f"{'='*50}")
    
    headers = {"Content-Type": "application/json"}
    
    try:
        url = f"{base_url}{endpoint}"
        response = requests.post(url, headers=headers, json=data, timeout=30)
        
        print(f"Status Code: {response.status_code}")
        
        try:
            response_data = response.json()
            print(f"Response JSON:")
            print(json.dumps(response_data, indent=2, ensure_ascii=False))
        except:
            print(f"Response Text: {response.text[:500]}...")
        
        if response.status_code == 500:
            print("[ERRO 500] - PROBLEMA AINDA PERSISTE!")
            return False, response.status_code
        elif response.status_code == 404:
            print("[404] - Endpoint ou aplicação não encontrada")
            return True, response.status_code
        elif response.status_code in [200, 400, 401, 403]:
            print("[SUCESSO] - SEM ERRO 500!")
            return True, response.status_code
        else:
            print(f"[STATUS INESPERADO]: {response.status_code}")
            return True, response.status_code
            
    except requests.exceptions.RequestException as e:
        print(f"[ERRO DE CONEXAO]: {str(e)}")
        return False, 0

def main():
    """Executa todos os testes"""
    print("TESTANDO CORRECOES DOS ERROS 500 NO DETECTOR DE IP")
    print("="*60)
    
    # Encontra URL base que funciona
    working_url = find_working_base_url()
    if not working_url:
        print("NENHUMA URL BASE ENCONTRADA FUNCIONANDO!")
        print("Tentativas:")
        for url in URLS_TO_TEST:
            print(f"  - {url}")
        return
    
    print(f"USANDO URL BASE: {working_url}")
    
    # Lista de testes a executar
    tests = [
        {
            "endpoint": "/processamento/test-simple/",
            "data": {},
            "description": "Teste de Endpoint Simples"
        },
        {
            "endpoint": "/processamento/status-lojas/",
            "data": {},
            "description": "Status das Lojas (GET convertido para POST)"
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
        }
    ]
    
    successful_tests = 0
    failed_tests = 0
    error_500_tests = 0
    
    for test in tests:
        success, status_code = test_endpoint(
            working_url,
            test["endpoint"], 
            test["data"], 
            test["description"]
        )
        
        if status_code == 500:
            error_500_tests += 1
            failed_tests += 1
        elif success:
            successful_tests += 1
        else:
            failed_tests += 1
        
        time.sleep(2)  # Pausa entre testes
    
    # Relatório final
    print(f"\n{'='*60}")
    print("RELATORIO FINAL DOS TESTES")
    print(f"{'='*60}")
    print(f"URL testada: {working_url}")
    print(f"Testes bem-sucedidos: {successful_tests}")
    print(f"Testes falharam: {failed_tests}")
    print(f"Erros 500 encontrados: {error_500_tests}")
    print(f"Taxa de sucesso: {(successful_tests/(successful_tests+failed_tests)*100):.1f}%")
    
    if error_500_tests == 0:
        print("NENHUM ERRO 500 ENCONTRADO! Correções funcionaram!")
    else:
        print(f"AINDA EXISTEM {error_500_tests} ERROS 500. Investigação adicional necessária.")

if __name__ == "__main__":
    main()