# backend/features/processamento/services/shopify_detector.py
import requests
import json
from datetime import datetime, timedelta
from collections import defaultdict
import re

class ShopifyDuplicateOrderDetector:
    def __init__(self, shop_url, access_token, api_version="2024-07"):
        self.shop_url = shop_url
        self.access_token = access_token
        self.api_version = api_version
        self.base_url = f"https://{shop_url}/admin/api/{api_version}"
        self.headers = {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": access_token
        }
    
    def normalize_product_name(self, name):
        """Normaliza nome do produto para comparação"""
        if not name:
            return ""
        return name.lower().strip()
    
    def get_product_identifier(self, item):
        """Retorna identificador único do produto (SKU ou nome normalizado)"""
        sku = item.get("sku", "").strip()
        name = self.normalize_product_name(item.get("title", ""))
        return {"sku": sku, "name": name}
    
    def products_match(self, item1, item2):
        """Verifica se dois produtos são iguais (SKU igual OU nome igual)"""
        id1 = self.get_product_identifier(item1)
        id2 = self.get_product_identifier(item2)
        
        # Considera igual se SKU igual (e não vazio) OU nome igual (e não vazio)
        sku_match = id1["sku"] and id2["sku"] and id1["sku"] == id2["sku"]
        name_match = id1["name"] and id2["name"] and id1["name"] == id2["name"]
        
        return sku_match or name_match
    
    def normalize_phone(self, phone):
        """Normaliza número de telefone para comparação"""
        if not phone:
            return ""
        return ''.join(filter(str.isdigit, str(phone)))
    
    def extract_page_info_from_link_header(self, link_header):
        """Extrai page_info do header Link para próxima página"""
        if not link_header:
            return None
        
        match = re.search(r'<([^>]+)>;\s*rel="next"', link_header)
        if not match:
            return None
        
        next_url = match.group(1)
        page_info_match = re.search(r'page_info=([^&]+)', next_url)
        if page_info_match:
            return page_info_match.group(1)
        
        return None
    
    def test_connection(self):
        """Testa conexão com Shopify"""
        try:
            url = f"{self.base_url}/shop.json"
            response = requests.get(url, headers=self.headers, timeout=10)
            
            if response.status_code == 200:
                shop_data = response.json()["shop"]
                return True, f"Conectado com sucesso à loja: {shop_data['name']}"
            else:
                return False, f"Erro de conexão: {response.status_code}"
                
        except Exception as e:
            return False, f"Erro: {str(e)}"
    
    def get_order_details(self, order_id):
        """Busca detalhes completos de um pedido incluindo TODOS os dados de endereço"""
        try:
            url = f"{self.base_url}/orders/{order_id}.json"
            response = requests.get(url, headers=self.headers, timeout=10)
            
            if response.status_code == 200:
                order_data = response.json()["order"]
                
                # Extrair TODOS os endereços disponíveis
                shipping_address = order_data.get("shipping_address", {})
                billing_address = order_data.get("billing_address", {})
                customer_data = order_data.get("customer", {})
                
                # Compilar TODOS os dados de endereço disponíveis
                address_data = {
                    "order_id": order_id,
                    "order_number": order_data.get("order_number", ""),
                    "order_date": order_data.get("created_at", ""),
                    "order_total": order_data.get("total_price", ""),
                    "has_shipping": bool(shipping_address),
                    "has_billing": bool(billing_address),
                    "shipping_address": {
                        "first_name": shipping_address.get("first_name", ""),
                        "last_name": shipping_address.get("last_name", ""),
                        "name": shipping_address.get("name", ""),
                        "company": shipping_address.get("company", ""),
                        "address1": shipping_address.get("address1", ""),
                        "address2": shipping_address.get("address2", ""),
                        "city": shipping_address.get("city", ""),
                        "province": shipping_address.get("province", ""),
                        "province_code": shipping_address.get("province_code", ""),
                        "country": shipping_address.get("country", ""),
                        "country_code": shipping_address.get("country_code", ""),
                        "zip": shipping_address.get("zip", ""),
                        "phone": shipping_address.get("phone", ""),
                        "latitude": shipping_address.get("latitude", ""),
                        "longitude": shipping_address.get("longitude", "")
                    },
                    "billing_address": {
                        "first_name": billing_address.get("first_name", ""),
                        "last_name": billing_address.get("last_name", ""),
                        "name": billing_address.get("name", ""),
                        "company": billing_address.get("company", ""),
                        "address1": billing_address.get("address1", ""),
                        "address2": billing_address.get("address2", ""),
                        "city": billing_address.get("city", ""),
                        "province": billing_address.get("province", ""),
                        "province_code": billing_address.get("province_code", ""),
                        "country": billing_address.get("country", ""),
                        "country_code": billing_address.get("country_code", ""),
                        "zip": billing_address.get("zip", ""),
                        "phone": billing_address.get("phone", ""),
                        "latitude": billing_address.get("latitude", ""),
                        "longitude": billing_address.get("longitude", "")
                    },
                    "customer_info": {
                        "email": customer_data.get("email", ""),
                        "accepts_marketing": customer_data.get("accepts_marketing", False),
                        "created_at": customer_data.get("created_at", ""),
                        "updated_at": customer_data.get("updated_at", ""),
                        "orders_count": customer_data.get("orders_count", 0),
                        "state": customer_data.get("state", ""),
                        "total_spent": customer_data.get("total_spent", ""),
                        "last_order_id": customer_data.get("last_order_id", ""),
                        "note": customer_data.get("note", ""),
                        "verified_email": customer_data.get("verified_email", False),
                        "multipass_identifier": customer_data.get("multipass_identifier", ""),
                        "tax_exempt": customer_data.get("tax_exempt", False),
                        "tags": customer_data.get("tags", "")
                    }
                }
                
                return address_data
            else:
                return None
                
        except Exception as e:
            print(f"Erro ao buscar detalhes do pedido {order_id}: {str(e)}")
            return None
    
    def get_all_orders(self, days_back=60):
        """Busca pedidos dos últimos X dias usando cursor-based pagination"""
        all_orders = []
        page_info = None
        page = 1
        
        date_min = (datetime.now() - timedelta(days=days_back)).isoformat()
        
        while True:
            if page_info:
                params = {
                    "limit": 250,
                    "page_info": page_info
                }
            else:
                params = {
                    "limit": 250,
                    "status": "any",
                    "created_at_min": date_min
                }
            
            url = f"{self.base_url}/orders.json"
            
            try:
                response = requests.get(url, headers=self.headers, params=params, timeout=30)
                response.raise_for_status()
                orders = response.json()["orders"]
                
                if not orders:
                    break
                
                # Filtra apenas pedidos não cancelados com cliente válido
                valid_orders = []
                for order in orders:
                    is_cancelled = order.get("cancelled_at") is not None
                    has_customer = order.get("customer") and order["customer"].get("phone")
                    
                    if not is_cancelled and has_customer:
                        order["_normalized_phone"] = self.normalize_phone(order["customer"]["phone"])
                        if order["_normalized_phone"]:
                            valid_orders.append(order)
                
                all_orders.extend(valid_orders)
                
                # Próxima página
                link_header = response.headers.get('Link')
                page_info = self.extract_page_info_from_link_header(link_header)
                
                if not page_info:
                    break
                
                page += 1
                
                if page > 50:  # Segurança
                    break
                    
            except requests.exceptions.RequestException as e:
                raise Exception(f"Erro ao buscar pedidos na página {page}: {e}")
        
        return all_orders
    
    def categorize_orders(self, all_orders):
        """Separa pedidos em processados e não processados"""
        unprocessed_orders = []
        all_orders_by_phone = defaultdict(list)
        
        for order in all_orders:
            tags = order.get("tags", "").lower()
            is_processed = ("order sent to dropi" in tags or "dropi sync error" in tags or 
                          "eh" in tags or "p cod" in tags or "prime cod" in tags)
            normalized_phone = order["_normalized_phone"]
            
            all_orders_by_phone[normalized_phone].append(order)
            
            if not is_processed:
                unprocessed_orders.append(order)
        
        return unprocessed_orders, all_orders_by_phone
    
    def find_duplicate_orders(self):
        """Encontra duplicatas baseado em pedidos não processados"""
        all_orders = self.get_all_orders()
        unprocessed_orders, all_orders_by_phone = self.categorize_orders(all_orders)
        
        duplicate_candidates = []
        
        for unprocessed_order in unprocessed_orders:
            normalized_phone = unprocessed_order["_normalized_phone"]
            customer_orders = all_orders_by_phone[normalized_phone]
            
            if len(customer_orders) < 2:
                continue
            
            # Remove duplicatas por ID
            unique_orders = {}
            for order in customer_orders:
                unique_orders[order['id']] = order
            customer_orders = list(unique_orders.values())
            
            if len(customer_orders) < 2:
                continue
            
            customer_orders.sort(key=lambda x: x["created_at"])
            
            # Agrupa por produto (SKU ou nome)
            product_orders = defaultdict(list)
            for order in customer_orders:
                for item in order["line_items"]:
                    sku = item.get("sku", "").strip()
                    product_name = self.normalize_product_name(item.get("title", ""))
                    
                    # Adiciona ao grupo por SKU se existir
                    if sku:
                        product_orders[f"sku:{sku}"].append({"order": order, "item": item, "sku": sku, "name": product_name})
                    # Adiciona ao grupo por nome se existir
                    if product_name:
                        product_orders[f"name:{product_name}"].append({"order": order, "item": item, "sku": sku, "name": product_name})
            
            # Verifica duplicatas para produtos do pedido não processado
            for item in unprocessed_order["line_items"]:
                sku = item.get("sku", "").strip()
                product_name = self.normalize_product_name(item.get("title", ""))
                
                # Verifica se existe duplicata por SKU E/OU nome
                sku_matches = []
                name_matches = []
                
                if sku and f"sku:{sku}" in product_orders:
                    sku_matches = product_orders[f"sku:{sku}"]
                
                if product_name and f"name:{product_name}" in product_orders:
                    name_matches = product_orders[f"name:{product_name}"]
                
                # Combina todas as correspondências
                all_matches = []
                if sku_matches:
                    all_matches.extend(sku_matches)
                if name_matches:
                    all_matches.extend(name_matches)
                
                if len(all_matches) < 2:
                    continue
                
                # Extrai apenas os pedidos únicos
                unique_orders = {}
                for order_info in all_matches:
                    order = order_info["order"]
                    unique_orders[order['id']] = order
                orders_with_product_unique = list(unique_orders.values())
                
                if len(orders_with_product_unique) < 2:
                    continue
                
                orders_with_product_unique.sort(key=lambda x: x["created_at"])
                
                # Busca pedidos processados do mesmo produto
                processed_orders = []
                for order in orders_with_product_unique:
                    if order['id'] != unprocessed_order['id']:
                        tags = order.get("tags", "").lower()
                        is_processed = ("order sent to dropi" in tags or "dropi sync error" in tags or 
                                      "eh" in tags or "p cod" in tags or "prime cod" in tags)
                        if is_processed:
                            processed_orders.append(order)
                
                # CENÁRIO 1: Existe pedido processado (lógica atual)
                if processed_orders:
                    processed_orders.sort(key=lambda x: x["created_at"])
                    original_order = processed_orders[-1]
                # CENÁRIO 2: Nenhum processado - mais antigo prevalece
                else:
                    # Filtra apenas pedidos não processados do mesmo produto
                    unprocessed_orders_with_product = []
                    for order in orders_with_product_unique:
                        tags = order.get("tags", "").lower()
                        is_processed = ("order sent to dropi" in tags or "dropi sync error" in tags or 
                                      "eh" in tags or "p cod" in tags or "prime cod" in tags)
                        if not is_processed:
                            unprocessed_orders_with_product.append(order)
                    
                    # Precisa ter pelo menos 2 pedidos não processados
                    if len(unprocessed_orders_with_product) < 2:
                        continue
                    
                    # Ordena por data - mais antigo será o original
                    unprocessed_orders_with_product.sort(key=lambda x: x["created_at"])
                    original_order = unprocessed_orders_with_product[0]  # Mais antigo
                    
                    # Se o pedido atual É o mais antigo, pula (não é duplicata)
                    if unprocessed_order['id'] == original_order['id']:
                        continue
                
                if unprocessed_order['id'] == original_order['id']:
                    continue
                
                # Verifica intervalo de 30 dias
                date1 = datetime.fromisoformat(original_order["created_at"].replace('Z', '+00:00'))
                date2 = datetime.fromisoformat(unprocessed_order["created_at"].replace('Z', '+00:00'))
                days_diff = (date2 - date1).days
                
                if days_diff <= 30:
                    first_name = unprocessed_order["customer"].get("first_name") or ""
                    last_name = unprocessed_order["customer"].get("last_name") or ""
                    customer_name = f"{first_name} {last_name}".strip()
                    
                    # Buscar endereços dos dois pedidos
                    duplicate_address = self.get_order_details(unprocessed_order["id"])
                    original_address = self.get_order_details(original_order["id"])
                    
                    # Buscar detalhes do produto baseado no primeiro item encontrado
                    product_info = all_matches[0]
                    item_info = product_info["item"]
                    product_title = item_info.get("title", f"SKU: {sku}" if sku else product_name)
                    
                    # Determinar critério de match baseado nos tipos de correspondência encontrados
                    match_criteria = []
                    has_sku_match = bool(sku_matches)
                    has_name_match = bool(name_matches)
                    
                    if has_sku_match and has_name_match:
                        match_criteria.append("Mesmo SKU + Produto")
                    elif has_sku_match:
                        match_criteria.append("Mesmo SKU")
                    elif has_name_match:
                        match_criteria.append("Mesmo Produto")
                    
                    duplicate_candidates.append({
                        "customer_phone": unprocessed_order["customer"]["phone"],
                        "customer_name": customer_name,
                        "customer_address": duplicate_address,
                        "original_order_address": original_address,
                        "first_order": {
                            "id": original_order["id"],
                            "number": original_order["order_number"],
                            "date": date1.strftime("%d/%m/%Y %H:%M"),
                            "total": original_order['total_price'],
                            "currency": original_order.get('currency', 'USD')
                        },
                        "duplicate_order": {
                            "id": unprocessed_order["id"],
                            "number": unprocessed_order["order_number"],
                            "date": date2.strftime("%d/%m/%Y %H:%M"),
                            "total": unprocessed_order['total_price'],
                            "currency": unprocessed_order.get('currency', 'USD')
                        },
                        "common_products": [sku] if sku else [product_name],
                        "common_product_names": [product_title],
                        "match_criteria": match_criteria,  # Como foi detectada a duplicata
                        "days_between": days_diff,
                        "status": unprocessed_order["financial_status"]
                    })
                    break
        
        return duplicate_candidates
    
    def cancel_order(self, order_id, reason="duplicate"):
        """Cancela um pedido"""
        url = f"{self.base_url}/orders/{order_id}/cancel.json"
        
        payload = {
            "reason": reason,
            "email": True,
            "refund": False
        }
        
        try:
            response = requests.post(url, headers=self.headers, json=payload, timeout=30)
            
            if response.status_code == 200:
                return True, "Pedido cancelado com sucesso"
            else:
                return False, f"Erro {response.status_code}: {response.text}"
                
        except requests.exceptions.RequestException as e:
            return False, f"Erro de rede: {str(e)}"
        except Exception as e:
            return False, f"Erro inesperado: {str(e)}"
    
    def get_detailed_duplicates(self):
        """Retorna lista detalhada de duplicatas"""
        duplicates = self.find_duplicate_orders()
        
        if not duplicates:
            return []
        
        # Os nomes dos produtos já estão incluídos em common_product_names
        for dup in duplicates:
            dup["product_names"] = dup.get("common_product_names", [])
        
        return duplicates
    
    def _extract_real_customer_ip(self, order):
        """
        Extrai o IP real do cliente de múltiplas fontes possíveis do pedido Shopify
        
        HIERARQUIA DE BUSCA (por prioridade):
        1. customer.default_address.* (campos de endereço do cliente)
        2. shipping_address.* (IP associado ao endereço de entrega)  
        3. billing_address.* (IP associado ao endereço de cobrança)
        4. customer.* (outros campos do customer)
        5. client_details.* (campos alternativos do client_details)
        6. order.* (campos diretos do pedido)
        
        Args:
            order (dict): Dados completos do pedido do Shopify
            
        Returns:
            tuple: (ip_string, source_description) ou (None, None) se não encontrado
        """
        
        # 1. BUSCAR NO CUSTOMER.DEFAULT_ADDRESS (prioridade máxima)
        customer = order.get("customer", {})
        if customer:
            default_address = customer.get("default_address", {})
            if default_address:
                ip_candidates = [
                    ("client_ip", "customer.default_address.client_ip"),
                    ("customer_ip", "customer.default_address.customer_ip"), 
                    ("ip_address", "customer.default_address.ip_address"),
                    ("ip", "customer.default_address.ip"),
                    ("browser_ip", "customer.default_address.browser_ip"),
                ]
                
                for field, source in ip_candidates:
                    ip = default_address.get(field)
                    if ip and isinstance(ip, str):
                        ip = ip.strip()
                        if ip and self._is_valid_ip(ip):
                            return ip, source
        
        # 2. BUSCAR NO SHIPPING ADDRESS
        shipping_address = order.get("shipping_address", {})
        if shipping_address:
            shipping_candidates = [
                ("client_ip", "shipping_address.client_ip"),
                ("customer_ip", "shipping_address.customer_ip"),
                ("ip_address", "shipping_address.ip_address"),
                ("ip", "shipping_address.ip"),
            ]
            
            for field, source in shipping_candidates:
                ip = shipping_address.get(field)
                if ip and isinstance(ip, str):
                    ip = ip.strip()
                    if ip and self._is_valid_ip(ip):
                        return ip, source
        
        # 3. BUSCAR NO BILLING ADDRESS  
        billing_address = order.get("billing_address", {})
        if billing_address:
            billing_candidates = [
                ("client_ip", "billing_address.client_ip"),
                ("customer_ip", "billing_address.customer_ip"), 
                ("ip_address", "billing_address.ip_address"),
                ("ip", "billing_address.ip"),
            ]
            
            for field, source in billing_candidates:
                ip = billing_address.get(field)
                if ip and isinstance(ip, str):
                    ip = ip.strip()
                    if ip and self._is_valid_ip(ip):
                        return ip, source
        
        # 4. OUTROS CAMPOS DO CUSTOMER
        if customer:
            customer_candidates = [
                ("last_order_ip", "customer.last_order_ip"),
                ("customer_ip", "customer.customer_ip"),
                ("registration_ip", "customer.registration_ip"),
                ("ip_address", "customer.ip_address"),
            ]
            
            for field, source in customer_candidates:
                ip = customer.get(field)
                if ip and isinstance(ip, str):
                    ip = ip.strip()
                    if ip and self._is_valid_ip(ip):
                        return ip, source
        
        # 5. CLIENT DETAILS (campos alternativos)
        client_details = order.get("client_details", {})
        if client_details:
            client_candidates = [
                ("customer_ip", "client_details.customer_ip"),
                ("real_ip", "client_details.real_ip"),
                ("user_ip", "client_details.user_ip"),
                ("origin_ip", "client_details.origin_ip"),
            ]
            
            for field, source in client_candidates:
                ip = client_details.get(field)
                if ip and isinstance(ip, str):
                    ip = ip.strip()
                    if ip and self._is_valid_ip(ip):
                        return ip, source
        
        # 6. CAMPOS DIRETOS DO PEDIDO
        order_candidates = [
            ("customer_ip", "order.customer_ip"),
            ("client_ip", "order.client_ip"), 
            ("real_ip", "order.real_ip"),
            ("origin_ip", "order.origin_ip"),
            ("user_ip", "order.user_ip"),
        ]
        
        for field, source in order_candidates:
            ip = order.get(field)
            if ip and isinstance(ip, str):
                ip = ip.strip()
                if ip and self._is_valid_ip(ip):
                    return ip, source
        
        return None, None
    
    def _is_valid_ip(self, ip_string):
        """
        Valida se uma string é um endereço IP válido (IPv4 ou IPv6)
        
        Args:
            ip_string (str): String para validar
            
        Returns:
            bool: True se é um IP válido
        """
        if not ip_string or not isinstance(ip_string, str):
            return False
        
        ip_string = ip_string.strip()
        
        # Validação básica de formato IPv4
        if '.' in ip_string:
            parts = ip_string.split('.')
            if len(parts) == 4:
                try:
                    for part in parts:
                        num = int(part)
                        if not (0 <= num <= 255):
                            return False
                    return True
                except ValueError:
                    return False
        
        # Validação básica de formato IPv6 (simplificada)
        elif ':' in ip_string:
            # IPv6 tem pelo menos 2 grupos separados por :
            return len(ip_string.split(':')) >= 2
        
        return False
    
    def get_orders_by_ip(self, days=30, min_orders=2):
        """
        Agrupa pedidos por IP dos últimos X dias
        
        Args:
            days (int): Dias para buscar pedidos (máximo 90)
            min_orders (int): Mínimo de pedidos por IP para incluir no resultado
            
        Returns:
            dict: Pedidos agrupados por IP com estatísticas
        """
        # Limita período máximo para performance
        if days > 90:
            days = 90
        
        date_min = (datetime.now() - timedelta(days=days)).isoformat()
        all_orders = []
        page_info = None
        page = 1
        
        # Contador de diagnóstico
        debug_stats = {
            "total_orders_fetched": 0,
            "orders_without_client_details": 0,
            "orders_without_browser_ip": 0,
            "orders_with_empty_ip": 0,
            "orders_with_real_ip_found": 0,
            "orders_fallback_browser_ip": 0,
            "unique_ips_found": set(),
            "suspicious_ips": {},  # IP -> contagem para detectar padrões suspeitos
            "ip_extraction_sources": {}  # Fonte -> contagem (para debug)
        }
        
        # Busca todos os pedidos do período
        while True:
            if page_info:
                params = {
                    "limit": 250,
                    "page_info": page_info
                }
            else:
                params = {
                    "limit": 250,
                    "status": "any",
                    "created_at_min": date_min,
                    "financial_status": "any"  # Inclui todos os status financeiros
                }
            
            url = f"{self.base_url}/orders.json"
            
            try:
                response = requests.get(url, headers=self.headers, params=params, timeout=30)
                response.raise_for_status()
                orders = response.json()["orders"]
                
                if not orders:
                    break
                
                # Filtra apenas pedidos válidos
                for order in orders:
                    try:
                        debug_stats["total_orders_fetched"] += 1
                        
                        # Ignora pedidos cancelados
                        if order.get("cancelled_at"):
                            continue
                        
                        # === NOVA LÓGICA: EXTRAÇÃO DO IP REAL DO CLIENTE ===
                        
                        # Tenta extrair IP real do cliente de múltiplas fontes
                        real_customer_ip, ip_source = self._extract_real_customer_ip(order)
                        
                        if real_customer_ip:
                            # IP real encontrado em customer/address data
                            customer_ip = real_customer_ip
                            debug_stats["orders_with_real_ip_found"] += 1
                            order["_ip_source"] = ip_source  # Fonte detalhada
                        else:
                            # Fallback para browser_ip (lógica anterior)
                            client_details = order.get("client_details")
                            if not client_details or not isinstance(client_details, dict):
                                debug_stats["orders_without_client_details"] += 1
                                continue
                                
                            browser_ip = client_details.get("browser_ip")
                            if not browser_ip or not isinstance(browser_ip, str):
                                debug_stats["orders_without_browser_ip"] += 1
                                continue
                                
                            browser_ip = browser_ip.strip()
                            if not browser_ip:
                                debug_stats["orders_with_empty_ip"] += 1
                                continue
                            
                            customer_ip = browser_ip
                            debug_stats["orders_fallback_browser_ip"] += 1
                            order["_ip_source"] = "browser_ip_fallback"
                        
                        # Registra fonte para estatísticas
                        source = order["_ip_source"]
                        if source not in debug_stats["ip_extraction_sources"]:
                            debug_stats["ip_extraction_sources"][source] = 0
                        debug_stats["ip_extraction_sources"][source] += 1
                        
                        # === FILTROS ANTI-FALSO POSITIVO ===
                        
                        # 1. DETECTA IPs SUSPEITOS (provavelmente servidores/proxies)
                        if self._is_suspicious_ip(customer_ip):
                            if customer_ip not in debug_stats["suspicious_ips"]:
                                debug_stats["suspicious_ips"][customer_ip] = 0
                            debug_stats["suspicious_ips"][customer_ip] += 1
                            # AINDA INCLUI mas marca como suspeito para debug
                            order["_ip_suspicious"] = True
                        else:
                            order["_ip_suspicious"] = False
                            
                        debug_stats["unique_ips_found"].add(customer_ip)
                        order["_customer_ip"] = customer_ip  # Nome mais descritivo
                        all_orders.append(order)
                        
                    except Exception as e:
                        # Log do erro mas continua processando outros pedidos
                        print(f"Erro ao processar pedido {order.get('id', 'unknown')}: {e}")
                        continue
                
                # Próxima página
                link_header = response.headers.get('Link')
                page_info = self.extract_page_info_from_link_header(link_header)
                
                if not page_info:
                    break
                
                page += 1
                if page > 50:  # Segurança
                    break
                    
            except requests.exceptions.RequestException as e:
                raise Exception(f"Erro ao buscar pedidos por IP na página {page}: {e}")
        
        # === LOG DE DIAGNÓSTICO ATUALIZADO ===
        print("=== DIAGNÓSTICO DETECTOR DE IP (VERSÃO MELHORADA) ===")
        print(f"Total de pedidos buscados: {debug_stats['total_orders_fetched']}")
        print(f"IPs reais encontrados em customer data: {debug_stats['orders_with_real_ip_found']}")
        print(f"Fallback para browser_ip: {debug_stats['orders_fallback_browser_ip']}")
        print(f"Sem client_details: {debug_stats['orders_without_client_details']}")
        print(f"Sem browser_ip: {debug_stats['orders_without_browser_ip']}")
        print(f"IP vazio: {debug_stats['orders_with_empty_ip']}")
        print(f"IPs únicos encontrados: {len(debug_stats['unique_ips_found'])}")
        print(f"Pedidos válidos processados: {len(all_orders)}")
        
        # Estatísticas das fontes de IP
        if debug_stats["ip_extraction_sources"]:
            print("\n=== FONTES DE EXTRAÇÃO DE IP ===")
            for source, count in debug_stats["ip_extraction_sources"].items():
                percentage = (count / len(all_orders)) * 100 if all_orders else 0
                print(f"{source}: {count} pedidos ({percentage:.1f}%)")
        
        if debug_stats["suspicious_ips"]:
            print("\n=== IPs SUSPEITOS DETECTADOS ===")
            for ip, count in sorted(debug_stats["suspicious_ips"].items(), key=lambda x: x[1], reverse=True):
                print(f"{ip}: {count} pedidos (provável servidor/proxy)")
        
        # Lista primeiros 10 IPs únicos para debug
        sample_ips = list(debug_stats["unique_ips_found"])[:10]
        print(f"\nAmostra de IPs encontrados: {sample_ips}")
        print("=====================================\n")
        
        # Agrupa pedidos por IP (usando o novo campo _customer_ip)
        ip_groups = defaultdict(list)
        for order in all_orders:
            ip = order["_customer_ip"]  # Usa o IP real extraído
            ip_groups[ip].append(order)
        
        # Filtra apenas IPs com quantidade mínima de pedidos
        filtered_groups = {}
        for ip, orders in ip_groups.items():
            if len(orders) >= min_orders:
                filtered_groups[ip] = orders
        
        # Prepara resultado final
        result_groups = []
        for ip, orders in filtered_groups.items():
            # Ordena pedidos por data
            orders.sort(key=lambda x: x["created_at"])
            
            # Calcula estatísticas
            total_sales = sum(float(order.get("total_price", 0)) for order in orders)
            unique_customers = set()
            currencies = set()
            
            for order in orders:
                # Cliente único por email ou phone
                customer = order.get("customer", {})
                if customer:
                    email = customer.get("email")
                    phone = customer.get("phone")
                    if email:
                        unique_customers.add(email)
                    elif phone:
                        unique_customers.add(self.normalize_phone(phone))
                
                # Moeda
                currency = order.get("currency", "BRL")
                currencies.add(currency)
            
            # Determina moeda predominante
            main_currency = list(currencies)[0] if currencies else "BRL"
            
            # Prepara dados dos pedidos para retorno
            order_data = []
            for order in orders:
                customer = order.get("customer", {})
                order_data.append({
                    "id": order["id"],
                    "order_number": order["order_number"],
                    "created_at": order["created_at"],
                    "total_price": order["total_price"],
                    "currency": order.get("currency", "BRL"),
                    "financial_status": order["financial_status"],
                    "fulfillment_status": order.get("fulfillment_status"),
                    "customer": {
                        "email": customer.get("email", ""),
                        "first_name": customer.get("first_name", ""),
                        "last_name": customer.get("last_name", ""),
                        "phone": customer.get("phone", "")
                    },
                    "line_items_count": len(order.get("line_items", [])),
                    "tags": order.get("tags", ""),
                    "ip_source": order.get("_ip_source", "unknown"),  # Nova informação sobre fonte do IP
                    "is_ip_suspicious": order.get("_ip_suspicious", False)
                })
            
            # Verifica se é IP suspeito
            is_suspicious = self._is_suspicious_ip(ip)
            suspicious_order_count = sum(1 for order in orders if order.get("_ip_suspicious", False))
            
            result_groups.append({
                "ip": ip,
                "order_count": len(orders),
                "unique_customers": len(unique_customers),
                "total_sales": f"{total_sales:.2f}",
                "currency": main_currency,
                "date_range": {
                    "first": orders[0]["created_at"],
                    "last": orders[-1]["created_at"]
                },
                "orders": order_data,
                "is_suspicious": is_suspicious,
                "suspicious_flags": {
                    "detected_as_suspicious": is_suspicious,
                    "orders_marked_suspicious": suspicious_order_count,
                    "pattern_match": self._get_suspicious_pattern(ip) if is_suspicious else None
                }
            })
        
        # Ordena por quantidade de pedidos (decrescente)
        result_groups.sort(key=lambda x: x["order_count"], reverse=True)
        
        return {
            "ip_groups": result_groups,
            "total_ips_found": len(result_groups),
            "total_orders_analyzed": len(all_orders),
            "period_days": days,
            "debug_stats": {
                "unique_ips_count": len(debug_stats["unique_ips_found"]),
                "suspicious_ips_count": len(debug_stats["suspicious_ips"]),
                "total_fetched": debug_stats["total_orders_fetched"],
                "valid_processed": len(all_orders),
                "real_customer_ips_found": debug_stats["orders_with_real_ip_found"],
                "fallback_browser_ip": debug_stats["orders_fallback_browser_ip"]
            },
            "ip_extraction_sources": debug_stats["ip_extraction_sources"]
        }
    
    def _is_suspicious_ip(self, ip):
        """
        Detecta IPs suspeitos que provavelmente são de servidores/proxies/CDN
        
        Args:
            ip (str): Endereço IP para analisar
            
        Returns:
            bool: True se o IP é suspeito (provável servidor)
        """
        if not ip:
            return True
            
        # Lista de padrões suspeitos conhecidos
        suspicious_patterns = [
            # IPs comuns de CDN/Proxy do Brasil
            "177.55.192.",  # IP problemático reportado
            "177.55.",      # Range suspeito
            "200.147.",     # Provedores corporativos
            "189.1.",       # Ranges corporativos
            "191.36.",      # Infraestrutura
            
            # Ranges de servidores conhecidos
            "127.0.0.1",    # Localhost
            "10.",          # Rede privada
            "192.168.",     # Rede privada
            "172.16.",      # Rede privada
            
            # CDNs e proxies conhecidos
            "104.16.",      # Cloudflare
            "104.17.",      # Cloudflare
            "172.64.",      # Cloudflare
            "198.41.",      # Cloudflare
            "13.107.",      # Microsoft CDN
            "52.",          # AWS ranges
            "54.",          # AWS ranges
            "3.",           # AWS ranges
        ]
        
        # Verifica padrões suspeitos
        for pattern in suspicious_patterns:
            if ip.startswith(pattern):
                return True
                
        # Detecção por padrões de comportamento
        # IPs que terminam em .1 são frequentemente gateways/servidores
        if ip.endswith('.1') or ip.endswith('.254'):
            return True
            
        # IPs com muitos zeros podem ser ranges de infraestrutura
        if '.0.' in ip or '.255.' in ip:
            return True
        
        return False
    
    def _get_suspicious_pattern(self, ip):
        """
        Retorna o padrão suspeito que foi detectado no IP
        
        Args:
            ip (str): Endereço IP
            
        Returns:
            str: Descrição do padrão suspeito detectado
        """
        if not ip:
            return "IP vazio/inválido"
            
        # Verifica padrões específicos
        if ip.startswith("177.55.192."):
            return "IP reportado como problemático (proxy/servidor)"
        elif ip.startswith("177.55."):
            return "Range suspeito de infraestrutura"
        elif ip in ["127.0.0.1"]:
            return "Localhost"
        elif ip.startswith("10.") or ip.startswith("192.168.") or ip.startswith("172.16."):
            return "Rede privada"
        elif ip.startswith("104.16.") or ip.startswith("104.17.") or ip.startswith("172.64."):
            return "CDN Cloudflare"
        elif ip.startswith("52.") or ip.startswith("54.") or ip.startswith("3."):
            return "AWS/Cloud Server"
        elif ip.endswith('.1') or ip.endswith('.254'):
            return "Provável gateway/servidor"
        elif '.0.' in ip or '.255.' in ip:
            return "Range de infraestrutura"
        else:
            return "Padrão suspeito detectado"