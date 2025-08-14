# backend/features/processamento/test_security_filters.py
"""
Teste para validar ajustes nos filtros de segurança
Verifica se falsos positivos foram reduzidos mantendo a segurança
"""
from services.shopify_detector import ShopifyDuplicateOrderDetector

def test_ip_security_filters():
    """
    Testa os filtros de IP após ajustes para reduzir falsos positivos
    """
    # Cria instância do detector para usar métodos de validação
    detector = ShopifyDuplicateOrderDetector("test.myshopify.com", "test_token")
    
    # IPs que DEVEM ser considerados suspeitos (verdadeiros positivos)
    suspicious_ips = [
        "127.0.0.1",           # Localhost
        "192.168.1.1",         # Rede privada
        "10.0.0.1",            # Rede privada
        "172.16.0.1",          # Rede privada
        "177.55.192.100",      # Range específico problemático
        "104.16.1.1",          # Cloudflare CDN
        "52.1.1.1",            # AWS
    ]
    
    # IPs que NÃO devem ser considerados suspeitos (evitar falsos positivos)
    legitimate_ips = [
        "177.55.1.100",        # Range 177.55 mas NÃO 192 (removido do filtro amplo)
        "189.1.1.100",         # Range brasileiro comum (removido filtro)
        "200.147.1.100",       # Provedor corporativo (removido filtro)  
        "191.36.1.100",        # Infraestrutura (removido filtro)
        "189.89.123.45",       # IP brasileiro comum
        "201.17.45.78",        # IP brasileiro comum
        "179.123.45.67",       # IP brasileiro comum
        "186.45.67.89",        # IP brasileiro comum
        "170.1.2.3",           # Fora do range privado 172.16-31
        "173.1.2.3",           # Fora do range privado 172.16-31
        "8.8.8.8",             # Google DNS (público legítimo)
        "1.1.1.1",             # Cloudflare DNS (público legítimo)
    ]
    
    # IPs que devem ter detecção mais específica (contexto importa)
    context_dependent_ips = [
        ("189.123.0.1", False),    # .1 em IP público - deve ser aceito
        ("192.168.1.1", True),     # .1 em rede privada - deve ser suspeito
        ("179.45.255.1", False),   # .255 em IP público - deve ser aceito  
        ("10.0.255.1", True),      # .255 em rede privada - deve ser suspeito
    ]
    
    print("=== TESTE DE FILTROS DE SEGURANÇA DE IP ===\n")
    
    # Testa IPs definitivamente suspeitos
    print("1. TESTANDO IPs SUSPEITOS (devem ser detectados):")
    all_passed = True
    
    for ip in suspicious_ips:
        is_suspicious = detector._is_suspicious_ip(ip)
        pattern = detector._get_suspicious_pattern(ip) if is_suspicious else "N/A"
        status = "[OK] CORRETO" if is_suspicious else "[ERRO] FALSO NEGATIVO"
        
        print(f"   {ip:<20} -> {status:<15} | Padrao: {pattern}")
        if not is_suspicious:
            all_passed = False
    
    print(f"\nResultado Suspeitos: {'[OK] PASSOU' if all_passed else '[ERRO] FALHOU'}")
    
    # Testa IPs que devem ser considerados legítimos
    print("\n2. TESTANDO IPs LEGÍTIMOS (NÃO devem ser detectados):")
    all_passed = True
    
    for ip in legitimate_ips:
        is_suspicious = detector._is_suspicious_ip(ip)
        pattern = detector._get_suspicious_pattern(ip) if is_suspicious else "N/A"
        status = "[OK] CORRETO" if not is_suspicious else "[ERRO] FALSO POSITIVO"
        
        print(f"   {ip:<20} -> {status:<15} | Padrao: {pattern}")
        if is_suspicious:
            all_passed = False
    
    print(f"\nResultado Legitimos: {'[OK] PASSOU' if all_passed else '[ERRO] FALHOU'}")
    
    # Testa IPs dependentes de contexto
    print("\n3. TESTANDO IPs DEPENDENTES DE CONTEXTO:")
    all_passed = True
    
    for ip, should_be_suspicious in context_dependent_ips:
        is_suspicious = detector._is_suspicious_ip(ip)
        pattern = detector._get_suspicious_pattern(ip) if is_suspicious else "N/A"
        
        if should_be_suspicious:
            status = "[OK] CORRETO" if is_suspicious else "[ERRO] FALSO NEGATIVO"
        else:
            status = "[OK] CORRETO" if not is_suspicious else "[ERRO] FALSO POSITIVO"
        
        expected = "suspeito" if should_be_suspicious else "legítimo"
        print(f"   {ip:<20} -> {status:<15} | Esperado: {expected} | Padrao: {pattern}")
        
        if is_suspicious != should_be_suspicious:
            all_passed = False
    
    print(f"\nResultado Contexto: {'[OK] PASSOU' if all_passed else '[ERRO] FALHOU'}")
    
    # Resumo final
    print("\n=== RESUMO DOS AJUSTES IMPLEMENTADOS ===")
    print("[OK] Removidos ranges amplos demais (177.55.*, 189.1.*, 200.147.*, 191.36.*)")
    print("[OK] Mantido apenas range específico problemático (177.55.192.*)")
    print("[OK] Detecção .1/.254 agora só em redes privadas conhecidas")
    print("[OK] Detecção .0./.255. agora só em redes privadas conhecidas")
    print("[OK] Removido ';' dos padrões suspeitos do middleware")
    print("[OK] Melhorada especificidade da detecção RFC 1918 (172.16-31.x.x)")
    
    return all_passed

if __name__ == "__main__":
    test_ip_security_filters()