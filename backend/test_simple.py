#!/usr/bin/env python3
"""
Teste simples e rápido da API Dropi
"""
import requests
import json
from datetime import date, timedelta

def test_simple():
    """Teste bem simples"""
    print("Testando API Dropi - período mínimo")
    
    # Ontem apenas
    end_date = date.today() - timedelta(days=1)
    start_date = end_date
    
    url = "https://dropi-api.up.railway.app/api/dados/mexico"
    
    payload = {
        "data_inicio": start_date.strftime('%Y-%m-%d'),
        "data_fim": end_date.strftime('%Y-%m-%d')
    }
    
    print(f"URL: {url}")
    print(f"Período: {payload}")
    print(f"Fazendo requisição...")
    
    try:
        response = requests.post(
            url,
            json=payload,
            headers={'Content-Type': 'application/json'},
            timeout=120  # 2 minutos
        )
        
        print(f"Status: {response.status_code}")
        print(f"Tamanho resposta: {len(response.text)} bytes")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Sucesso: {data.get('status')}")
            print(f"Total pedidos: {data.get('total_pedidos', 0)}")
        else:
            print(f"Erro: {response.text}")
            
    except Exception as e:
        print(f"ERRO: {e}")

if __name__ == "__main__":
    test_simple()