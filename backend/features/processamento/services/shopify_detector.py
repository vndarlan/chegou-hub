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
            params = {
                "fields": "id,order_number,created_at,cancelled_at,total_price,currency,financial_status,fulfillment_status,customer,line_items,tags,browser_ip,client_details,shipping_address,billing_address,note_attributes,custom_attributes,properties"
            }
            response = requests.get(url, headers=self.headers, params=params, timeout=10)
            
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
        """Busca pedidos dos últimos X dias usando cursor-based pagination (INCLUINDO CANCELADOS)"""
        all_orders = []
        page_info = None
        page = 1
        
        date_min = (datetime.now() - timedelta(days=days_back)).isoformat()
        
        while True:
            if page_info:
                params = {
                    "limit": 250,
                    "page_info": page_info,
                    "fields": "id,order_number,created_at,cancelled_at,total_price,currency,financial_status,fulfillment_status,customer,line_items,tags,browser_ip,client_details,shipping_address,billing_address,note_attributes,custom_attributes,properties"
                }
            else:
                params = {
                    "limit": 250,
                    "status": "any",
                    "created_at_min": date_min,
                    "fields": "id,order_number,created_at,cancelled_at,total_price,currency,financial_status,fulfillment_status,customer,line_items,tags,browser_ip,client_details,shipping_address,billing_address,note_attributes,custom_attributes,properties"
                }
            
            url = f"{self.base_url}/orders.json"
            
            try:
                response = requests.get(url, headers=self.headers, params=params, timeout=30)
                response.raise_for_status()
                orders = response.json()["orders"]
                
                if not orders:
                    break
                
                # Filtra pedidos com cliente válido (INCLUINDO CANCELADOS)
                valid_orders = []
                for order in orders:
                    is_cancelled = order.get("cancelled_at") is not None
                    has_customer = order.get("customer") and order["customer"].get("phone")
                    
                    # MUDANÇA: Agora inclui pedidos cancelados também
                    if has_customer:
                        order["_normalized_phone"] = self.normalize_phone(order["customer"]["phone"])
                        order["_is_cancelled"] = is_cancelled  # Adiciona flag de cancelamento
                        order["_cancelled_at"] = order.get("cancelled_at")  # Data de cancelamento
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
        
        HIERARQUIA DE BUSCA EXPANDIDA (por prioridade):
        1. client_details.browser_ip (FONTE PRIMÁRIA SHOPIFY - mais confiável)
        2. client_details campos adicionais (real_ip, forwarded_for, x_forwarded_for)
        3. custom_attributes (campos customizados do pedido)
        4. note_attributes (atributos de nota do pedido)
        5. properties (propriedades do pedido)
        6. line_items properties customizadas
        7. customer.default_address.* (campos de IP no endereço do cliente) 
        8. shipping_address.* (IP associado ao endereço de entrega)  
        9. billing_address.* (IP associado ao endereço de cobrança)
        10. customer.* (outros campos do customer)
        11. cart.attributes (se disponível)
        12. checkout.attributes (se disponível)
        13. client_details.* headers HTTP adicionais
        14. order.* (campos diretos do pedido)
        15. tracking fields (domain_userid, network_userid)
        
        Args:
            order (dict): Dados completos do pedido do Shopify
            
        Returns:
            tuple: (ip_string, source_description) ou (None, None) se não encontrado
        """
        
        # Inicializar debug para esta busca
        debug_info = {
            "fields_checked": [],
            "ips_found": [],
            "validation_failures": []
        }
        
        # 1. CLIENT_DETAILS.BROWSER_IP (PRIORIDADE MÁXIMA - FONTE OFICIAL SHOPIFY)
        client_details = order.get("client_details", {})
        if client_details and isinstance(client_details, dict):
            browser_ip = client_details.get("browser_ip")
            debug_info["fields_checked"].append("client_details.browser_ip")
            if browser_ip and isinstance(browser_ip, str):
                browser_ip = browser_ip.strip()
                if browser_ip:
                    debug_info["ips_found"].append(("client_details.browser_ip", browser_ip))
                    if self._is_valid_ip(browser_ip) and self._is_likely_real_customer_ip(browser_ip):
                        return browser_ip, "client_details.browser_ip"
                    else:
                        debug_info["validation_failures"].append(("client_details.browser_ip", browser_ip, "invalid_or_suspicious"))
        
        # 2. CLIENT_DETAILS CAMPOS ADICIONAIS (headers HTTP e IPs alternativos)
        if client_details and isinstance(client_details, dict):
            client_ip_candidates = [
                ("real_ip", "client_details.real_ip"),
                ("forwarded_for", "client_details.forwarded_for"), 
                ("x_forwarded_for", "client_details.x_forwarded_for"),
                ("http_x_forwarded_for", "client_details.http_x_forwarded_for"),
                ("http_x_real_ip", "client_details.http_x_real_ip"),
                ("http_cf_connecting_ip", "client_details.http_cf_connecting_ip"),
                ("remote_addr", "client_details.remote_addr"),
                ("customer_ip", "client_details.customer_ip"),
                ("user_ip", "client_details.user_ip"),
                ("origin_ip", "client_details.origin_ip"),
            ]
            
            for field, source in client_ip_candidates:
                debug_info["fields_checked"].append(source)
                ip = client_details.get(field)
                if ip and isinstance(ip, str):
                    ip = ip.strip()
                    if ip:
                        debug_info["ips_found"].append((source, ip))
                        # Parse IPs de headers que podem ter múltiplos valores
                        parsed_ips = self._parse_forwarded_ip_header(ip)
                        for parsed_ip in parsed_ips:
                            if self._is_valid_ip(parsed_ip) and self._is_likely_real_customer_ip(parsed_ip):
                                return parsed_ip, f"{source} (parsed)"
                        # Tenta o IP original se parsing não funcionou
                        if self._is_valid_ip(ip) and self._is_likely_real_customer_ip(ip):
                            return ip, source
                        debug_info["validation_failures"].append((source, ip, "invalid_or_suspicious"))
        
        # 3. CUSTOM_ATTRIBUTES (campos customizados do pedido)
        custom_attributes = order.get("custom_attributes", [])
        if custom_attributes:
            debug_info["fields_checked"].append("custom_attributes")
            for attr in custom_attributes:
                if isinstance(attr, dict):
                    name = attr.get("name", "").lower()
                    value = attr.get("value", "")
                    
                    # Busca por nomes relacionados a IP
                    ip_related_names = ["ip", "customer_ip", "client_ip", "user_ip", "real_ip", 
                                      "browser_ip", "origin_ip", "visitor_ip", "session_ip"]
                    
                    if any(ip_name in name for ip_name in ip_related_names):
                        if value and isinstance(value, str):
                            value = value.strip()
                            if value:
                                source = f"custom_attributes.{name}"
                                debug_info["ips_found"].append((source, value))
                                if self._is_valid_ip(value) and self._is_likely_real_customer_ip(value):
                                    return value, source
                                debug_info["validation_failures"].append((source, value, "invalid_or_suspicious"))
        
        # 4. NOTE_ATTRIBUTES (atributos de nota do pedido)
        note_attributes = order.get("note_attributes", [])
        if note_attributes:
            debug_info["fields_checked"].append("note_attributes")
            for attr in note_attributes:
                if isinstance(attr, dict):
                    name = attr.get("name", "").lower()
                    value = attr.get("value", "")
                    
                    # Busca por nomes relacionados a IP
                    ip_related_names = ["ip", "customer_ip", "client_ip", "user_ip", "real_ip",
                                      "browser_ip", "origin_ip", "visitor_ip", "session_ip"]
                    
                    if any(ip_name in name for ip_name in ip_related_names):
                        if value and isinstance(value, str):
                            value = value.strip()
                            if value:
                                source = f"note_attributes.{name}"
                                debug_info["ips_found"].append((source, value))
                                if self._is_valid_ip(value) and self._is_likely_real_customer_ip(value):
                                    return value, source
                                debug_info["validation_failures"].append((source, value, "invalid_or_suspicious"))
        
        # 5. PROPERTIES (propriedades do pedido)
        properties = order.get("properties", [])
        if properties:
            debug_info["fields_checked"].append("properties")
            for prop in properties:
                if isinstance(prop, dict):
                    name = prop.get("name", "").lower()
                    value = prop.get("value", "")
                    
                    # Busca por nomes relacionados a IP
                    ip_related_names = ["ip", "customer_ip", "client_ip", "user_ip", "real_ip",
                                      "browser_ip", "origin_ip", "visitor_ip", "session_ip"]
                    
                    if any(ip_name in name for ip_name in ip_related_names):
                        if value and isinstance(value, str):
                            value = value.strip()
                            if value:
                                source = f"properties.{name}"
                                debug_info["ips_found"].append((source, value))
                                if self._is_valid_ip(value) and self._is_likely_real_customer_ip(value):
                                    return value, source
                                debug_info["validation_failures"].append((source, value, "invalid_or_suspicious"))
        
        # 6. LINE_ITEMS PROPERTIES CUSTOMIZADAS
        line_items = order.get("line_items", [])
        if line_items:
            debug_info["fields_checked"].append("line_items.properties")
            for item in line_items:
                if isinstance(item, dict):
                    item_properties = item.get("properties", [])
                    for prop in item_properties:
                        if isinstance(prop, dict):
                            name = prop.get("name", "").lower()
                            value = prop.get("value", "")
                            
                            # Busca por nomes relacionados a IP
                            ip_related_names = ["ip", "customer_ip", "client_ip", "user_ip", "real_ip",
                                              "browser_ip", "origin_ip", "visitor_ip", "session_ip"]
                            
                            if any(ip_name in name for ip_name in ip_related_names):
                                if value and isinstance(value, str):
                                    value = value.strip()
                                    if value:
                                        source = f"line_items.properties.{name}"
                                        debug_info["ips_found"].append((source, value))
                                        if self._is_valid_ip(value) and self._is_likely_real_customer_ip(value):
                                            return value, source
                                        debug_info["validation_failures"].append((source, value, "invalid_or_suspicious"))
        
        # 7. BUSCAR NO CUSTOMER.DEFAULT_ADDRESS (endereços do cliente)
        customer = order.get("customer", {})
        if customer:
            default_address = customer.get("default_address", {})
            if default_address:
                debug_info["fields_checked"].append("customer.default_address")
                ip_candidates = [
                    ("client_ip", "customer.default_address.client_ip"),
                    ("customer_ip", "customer.default_address.customer_ip"), 
                    ("ip_address", "customer.default_address.ip_address"),
                    ("ip", "customer.default_address.ip"),
                    ("browser_ip", "customer.default_address.browser_ip"),
                    ("real_ip", "customer.default_address.real_ip"),
                    ("visitor_ip", "customer.default_address.visitor_ip"),
                ]
                
                for field, source in ip_candidates:
                    ip = default_address.get(field)
                    if ip and isinstance(ip, str):
                        ip = ip.strip()
                        if ip:
                            debug_info["ips_found"].append((source, ip))
                            if self._is_valid_ip(ip) and self._is_likely_real_customer_ip(ip):
                                return ip, source
                            debug_info["validation_failures"].append((source, ip, "invalid_or_suspicious"))
        
        # 8. BUSCAR NO SHIPPING ADDRESS
        shipping_address = order.get("shipping_address", {})
        if shipping_address:
            debug_info["fields_checked"].append("shipping_address")
            shipping_candidates = [
                ("client_ip", "shipping_address.client_ip"),
                ("customer_ip", "shipping_address.customer_ip"),
                ("ip_address", "shipping_address.ip_address"),
                ("ip", "shipping_address.ip"),
                ("real_ip", "shipping_address.real_ip"),
                ("browser_ip", "shipping_address.browser_ip"),
                ("visitor_ip", "shipping_address.visitor_ip"),
            ]
            
            for field, source in shipping_candidates:
                ip = shipping_address.get(field)
                if ip and isinstance(ip, str):
                    ip = ip.strip()
                    if ip:
                        debug_info["ips_found"].append((source, ip))
                        if self._is_valid_ip(ip) and self._is_likely_real_customer_ip(ip):
                            return ip, source
                        debug_info["validation_failures"].append((source, ip, "invalid_or_suspicious"))
        
        # 9. BUSCAR NO BILLING ADDRESS  
        billing_address = order.get("billing_address", {})
        if billing_address:
            debug_info["fields_checked"].append("billing_address")
            billing_candidates = [
                ("client_ip", "billing_address.client_ip"),
                ("customer_ip", "billing_address.customer_ip"), 
                ("ip_address", "billing_address.ip_address"),
                ("ip", "billing_address.ip"),
                ("real_ip", "billing_address.real_ip"),
                ("browser_ip", "billing_address.browser_ip"),
                ("visitor_ip", "billing_address.visitor_ip"),
            ]
            
            for field, source in billing_candidates:
                ip = billing_address.get(field)
                if ip and isinstance(ip, str):
                    ip = ip.strip()
                    if ip:
                        debug_info["ips_found"].append((source, ip))
                        if self._is_valid_ip(ip) and self._is_likely_real_customer_ip(ip):
                            return ip, source
                        debug_info["validation_failures"].append((source, ip, "invalid_or_suspicious"))
        
        # 10. OUTROS CAMPOS DO CUSTOMER
        if customer:
            debug_info["fields_checked"].append("customer")
            customer_candidates = [
                ("last_order_ip", "customer.last_order_ip"),
                ("customer_ip", "customer.customer_ip"),
                ("registration_ip", "customer.registration_ip"),
                ("ip_address", "customer.ip_address"),
                ("signup_ip", "customer.signup_ip"),
                ("browser_ip", "customer.browser_ip"),
                ("real_ip", "customer.real_ip"),
                ("visitor_ip", "customer.visitor_ip"),
            ]
            
            for field, source in customer_candidates:
                ip = customer.get(field)
                if ip and isinstance(ip, str):
                    ip = ip.strip()
                    if ip:
                        debug_info["ips_found"].append((source, ip))
                        if self._is_valid_ip(ip) and self._is_likely_real_customer_ip(ip):
                            return ip, source
                        debug_info["validation_failures"].append((source, ip, "invalid_or_suspicious"))
        
        # 11. CART.ATTRIBUTES (se disponível)
        cart = order.get("cart", {})
        if cart:
            cart_attributes = cart.get("attributes", [])
            if cart_attributes:
                debug_info["fields_checked"].append("cart.attributes")
                for attr in cart_attributes:
                    if isinstance(attr, dict):
                        name = attr.get("name", "").lower()
                        value = attr.get("value", "")
                        
                        # Busca por nomes relacionados a IP
                        ip_related_names = ["ip", "customer_ip", "client_ip", "user_ip", "real_ip",
                                          "browser_ip", "origin_ip", "visitor_ip", "session_ip"]
                        
                        if any(ip_name in name for ip_name in ip_related_names):
                            if value and isinstance(value, str):
                                value = value.strip()
                                if value:
                                    source = f"cart.attributes.{name}"
                                    debug_info["ips_found"].append((source, value))
                                    if self._is_valid_ip(value) and self._is_likely_real_customer_ip(value):
                                        return value, source
                                    debug_info["validation_failures"].append((source, value, "invalid_or_suspicious"))
        
        # 12. CHECKOUT.ATTRIBUTES (se disponível)
        checkout = order.get("checkout", {})
        if checkout:
            checkout_attributes = checkout.get("attributes", [])
            if checkout_attributes:
                debug_info["fields_checked"].append("checkout.attributes")
                for attr in checkout_attributes:
                    if isinstance(attr, dict):
                        name = attr.get("name", "").lower()
                        value = attr.get("value", "")
                        
                        # Busca por nomes relacionados a IP
                        ip_related_names = ["ip", "customer_ip", "client_ip", "user_ip", "real_ip",
                                          "browser_ip", "origin_ip", "visitor_ip", "session_ip"]
                        
                        if any(ip_name in name for ip_name in ip_related_names):
                            if value and isinstance(value, str):
                                value = value.strip()
                                if value:
                                    source = f"checkout.attributes.{name}"
                                    debug_info["ips_found"].append((source, value))
                                    if self._is_valid_ip(value) and self._is_likely_real_customer_ip(value):
                                        return value, source
                                    debug_info["validation_failures"].append((source, value, "invalid_or_suspicious"))
        
        # 13. CLIENT DETAILS HEADERS HTTP ADICIONAIS (campos alternativos)
        if client_details:
            debug_info["fields_checked"].append("client_details_extra")
            client_extra_candidates = [
                ("http_x_cluster_client_ip", "client_details.http_x_cluster_client_ip"),
                ("http_true_client_ip", "client_details.http_true_client_ip"),
                ("http_client_ip", "client_details.http_client_ip"),
                ("cf_connecting_ip", "client_details.cf_connecting_ip"),
                ("fastly_client_ip", "client_details.fastly_client_ip"),
                ("x_original_forwarded_for", "client_details.x_original_forwarded_for"),
                ("x_client_ip", "client_details.x_client_ip"),
                ("x_cluster_client_ip", "client_details.x_cluster_client_ip"),
            ]
            
            for field, source in client_extra_candidates:
                ip = client_details.get(field)
                if ip and isinstance(ip, str):
                    ip = ip.strip()
                    if ip:
                        debug_info["ips_found"].append((source, ip))
                        # Parse headers que podem ter múltiplos valores
                        parsed_ips = self._parse_forwarded_ip_header(ip)
                        for parsed_ip in parsed_ips:
                            if self._is_valid_ip(parsed_ip) and self._is_likely_real_customer_ip(parsed_ip):
                                return parsed_ip, f"{source} (parsed)"
                        # Tenta o IP original se parsing não funcionou
                        if self._is_valid_ip(ip) and self._is_likely_real_customer_ip(ip):
                            return ip, source
                        debug_info["validation_failures"].append((source, ip, "invalid_or_suspicious"))
        
        # 14. CAMPOS DIRETOS DO PEDIDO
        debug_info["fields_checked"].append("order_direct")
        order_candidates = [
            ("customer_ip", "order.customer_ip"),
            ("client_ip", "order.client_ip"), 
            ("real_ip", "order.real_ip"),
            ("origin_ip", "order.origin_ip"),
            ("user_ip", "order.user_ip"),
            ("browser_ip", "order.browser_ip"),
            ("visitor_ip", "order.visitor_ip"),
            ("session_ip", "order.session_ip"),
        ]
        
        for field, source in order_candidates:
            ip = order.get(field)
            if ip and isinstance(ip, str):
                ip = ip.strip()
                if ip:
                    debug_info["ips_found"].append((source, ip))
                    if self._is_valid_ip(ip) and self._is_likely_real_customer_ip(ip):
                        return ip, source
                    debug_info["validation_failures"].append((source, ip, "invalid_or_suspicious"))
        
        # 15. TRACKING FIELDS (domain_userid, network_userid)
        debug_info["fields_checked"].append("tracking_fields")
        tracking_candidates = [
            ("domain_userid", "order.domain_userid"),
            ("network_userid", "order.network_userid"),
            ("session_id", "order.session_id"),
            ("visitor_id", "order.visitor_id"),
        ]
        
        for field, source in tracking_candidates:
            value = order.get(field)
            if value and isinstance(value, str):
                value = value.strip()
                if value:
                    # Alguns tracking IDs podem conter ou ser IPs
                    if self._is_valid_ip(value) and self._is_likely_real_customer_ip(value):
                        debug_info["ips_found"].append((source, value))
                        return value, source
        
        # Se chegou aqui, não encontrou IP válido
        # Log de debug para ajudar no diagnóstico
        self._log_ip_extraction_debug(order.get("id", "unknown"), debug_info)
        
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
        Agrupa pedidos por IP dos últimos X dias - VERSÃO OTIMIZADA
        
        Args:
            days (int): Dias para buscar pedidos (sem limite artificial)
            min_orders (int): Mínimo de pedidos por IP para incluir no resultado
            
        Returns:
            dict: Pedidos agrupados por IP com estatísticas
        """
        # Remove limitação artificial - deixa para o views.py decidir
        
        date_min = (datetime.now() - timedelta(days=days)).isoformat()
        all_orders = []
        page_info = None
        page = 1
        
        # Contador de diagnóstico
        debug_stats = {
            "total_orders_fetched": 0,
            "orders_with_real_ip_found": 0,
            "orders_without_any_ip": 0,
            "cancelled_orders_included": 0,  # Novo contador para cancelados
            "unique_ips_found": set(),
            "suspicious_ips": {},  # IP -> contagem para detectar padrões suspeitos
            "ip_extraction_sources": {}  # Fonte -> contagem (para debug)
        }
        
        # Busca todos os pedidos do período COM OTIMIZAÇÕES
        max_retries = 3
        base_delay = 1.0
        
        while True:
            # Reduz tamanho da página para períodos grandes para melhorar performance
            page_limit = 100 if days > 60 else 250
            
            if page_info:
                params = {
                    "limit": page_limit,
                    "page_info": page_info,
                    "fields": "id,order_number,created_at,cancelled_at,total_price,currency,financial_status,fulfillment_status,customer,line_items,tags,browser_ip,client_details,shipping_address,billing_address,note_attributes,custom_attributes,properties"
                }
            else:
                params = {
                    "limit": page_limit,
                    "status": "any",
                    "created_at_min": date_min,
                    "financial_status": "any",  # Inclui todos os status financeiros
                    "fields": "id,order_number,created_at,cancelled_at,total_price,currency,financial_status,fulfillment_status,customer,line_items,tags,browser_ip,client_details,shipping_address,billing_address,note_attributes,custom_attributes,properties"
                }
            
            url = f"{self.base_url}/orders.json"
            
            # IMPLEMENTA RETRY LOGIC COM EXPONENTIAL BACKOFF
            retry_count = 0
            while retry_count <= max_retries:
                try:
                    # Timeout adaptativo baseado no período
                    timeout = 30 if days <= 30 else 60 if days <= 90 else 90
                    
                    response = requests.get(url, headers=self.headers, params=params, timeout=timeout)
                    response.raise_for_status()
                    orders = response.json()["orders"]
                    break  # Sucesso - sai do loop de retry
                    
                except (requests.exceptions.Timeout, requests.exceptions.ConnectionError) as e:
                    retry_count += 1
                    if retry_count > max_retries:
                        raise Exception(f"Falha após {max_retries} tentativas na página {page}: {e}")
                    
                    # Exponential backoff
                    delay = base_delay * (2 ** (retry_count - 1))
                    print(f"Tentativa {retry_count}/{max_retries} falhou, aguardando {delay}s: {e}")
                    
                    import time
                    time.sleep(delay)
                    continue
                    
                except requests.exceptions.HTTPError as e:
                    if e.response.status_code == 429:  # Rate limit
                        retry_count += 1
                        if retry_count > max_retries:
                            raise Exception(f"Rate limit após {max_retries} tentativas na página {page}")
                        
                        # Rate limit - espera mais tempo
                        delay = base_delay * (3 ** retry_count)  # Delay maior para rate limit
                        print(f"Rate limit detectado, aguardando {delay}s (tentativa {retry_count}/{max_retries})")
                        
                        import time
                        time.sleep(delay)
                        continue
                    else:
                        # Outros erros HTTP - não tenta novamente
                        raise e
            
            # Se chegou aqui, teve sucesso na requisição
            if not orders:
                break
                
                # Filtra apenas pedidos válidos (INCLUINDO CANCELADOS)
                for order in orders:
                    try:
                        debug_stats["total_orders_fetched"] += 1
                        
                        # Determina se o pedido está cancelado (mas NÃO ignora mais)
                        is_cancelled = order.get("cancelled_at") is not None
                        cancelled_at = order.get("cancelled_at")
                        
                        # === NOVA LÓGICA: EXTRAÇÃO DO IP REAL DO CLIENTE ===
                        
                        # Tenta extrair IP real do cliente de múltiplas fontes
                        real_customer_ip, ip_source = self._extract_real_customer_ip(order)
                        
                        if real_customer_ip:
                            # IP real encontrado através do método _extract_real_customer_ip
                            customer_ip = real_customer_ip
                            debug_stats["orders_with_real_ip_found"] += 1
                            order["_ip_source"] = ip_source  # Fonte detalhada
                        else:
                            # Nenhum IP válido encontrado em qualquer fonte
                            debug_stats["orders_without_any_ip"] += 1
                            continue
                        
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
                        order["_is_cancelled"] = is_cancelled  # Status de cancelamento
                        order["_cancelled_at"] = cancelled_at  # Data de cancelamento
                        
                        # Conta pedidos cancelados incluídos
                        if is_cancelled:
                            debug_stats["cancelled_orders_included"] += 1
                        
                        all_orders.append(order)
                        
                    except Exception as e:
                        # Log do erro mas continua processando outros pedidos
                        print(f"Erro ao processar pedido {order.get('id', 'unknown')}: {e}")
                        continue
                
                # === OTIMIZAÇÕES DE MEMÓRIA ENTRE BATCHES ===
                
                # Log de progresso detalhado
                print(f"Página {page} processada: {len(orders)} pedidos brutos, {len(all_orders)} válidos acumulados")
                
                # Liberação de memória para períodos grandes
                if days > 60 and page % 10 == 0:  # A cada 10 páginas para períodos grandes
                    print(f"Executando garbage collection na página {page} (período: {days} dias)")
                    import gc
                    gc.collect()
                
                # Próxima página
                link_header = response.headers.get('Link')
                page_info = self.extract_page_info_from_link_header(link_header)
                
                if not page_info:
                    break
                
                page += 1
                
                # Limite de páginas adaptativo baseado no período
                max_pages = 30 if days <= 30 else 50 if days <= 90 else 100
                if page > max_pages:
                    print(f"Limite de {max_pages} páginas atingido para período de {days} dias")
                    break
                
                # Pausa adaptativa entre páginas para não sobrecarregar API
                if days > 60:
                    import time
                    time.sleep(0.2)  # 200ms de pausa para períodos grandes
        
        # === LOG DE DIAGNÓSTICO ATUALIZADO ===
        print("=== DIAGNÓSTICO DETECTOR DE IP (VERSÃO CORRIGIDA - SEM FALLBACK) ===")
        print(f"Total de pedidos buscados: {debug_stats['total_orders_fetched']}")
        print(f"Pedidos cancelados incluídos: {debug_stats['cancelled_orders_included']}")
        print(f"IPs encontrados via _extract_real_customer_ip: {debug_stats['orders_with_real_ip_found']}")
        print(f"Pedidos sem qualquer IP válido: {debug_stats['orders_without_any_ip']}")
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
            
            # Calcula estatísticas (incluindo dados de cancelamento)
            total_sales = sum(float(order.get("total_price", 0)) for order in orders)
            unique_customers = set()
            currencies = set()
            cancelled_count = sum(1 for order in orders if order.get("_is_cancelled", False))
            active_count = len(orders) - cancelled_count
            
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
                    "cancelled_at": order.get("_cancelled_at"),  # Data de cancelamento
                    "is_cancelled": order.get("_is_cancelled", False),  # Status de cancelamento
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
                "cancelled_orders": cancelled_count,  # Quantidade de pedidos cancelados
                "active_orders": active_count,  # Quantidade de pedidos ativos
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
                "cancelled_orders_included": debug_stats["cancelled_orders_included"],
                "real_customer_ips_found": debug_stats["orders_with_real_ip_found"],
                "orders_without_any_ip": debug_stats["orders_without_any_ip"]
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
            
        # Lista de padrões suspeitos conhecidos (expandida)
        suspicious_patterns = [
            # IPs específicos problemáticos reportados
            "177.55.192.",  # Range específico problemático reportado
            
            # Localhost e redes privadas (definitivamente suspeitos)
            "127.0.0.1",    # Localhost
            "127.",         # Loopback range completo
            "10.",          # Rede privada RFC 1918
            "192.168.",     # Rede privada RFC 1918
            "172.16.",      # Rede privada RFC 1918 (172.16.0.0/12)
            "172.17.",      # Rede privada RFC 1918 
            "172.18.",      # Rede privada RFC 1918
            "172.19.",      # Rede privada RFC 1918
            "172.20.",      # Rede privada RFC 1918
            "172.21.",      # Rede privada RFC 1918
            "172.22.",      # Rede privada RFC 1918
            "172.23.",      # Rede privada RFC 1918
            "172.24.",      # Rede privada RFC 1918
            "172.25.",      # Rede privada RFC 1918
            "172.26.",      # Rede privada RFC 1918
            "172.27.",      # Rede privada RFC 1918
            "172.28.",      # Rede privada RFC 1918
            "172.29.",      # Rede privada RFC 1918
            "172.30.",      # Rede privada RFC 1918
            "172.31.",      # Rede privada RFC 1918
            
            # CDNs e proxies conhecidos (definitivamente suspeitos)
            "104.16.",      # Cloudflare
            "104.17.",      # Cloudflare
            "172.64.",      # Cloudflare
            "198.41.",      # Cloudflare
            "141.101.",     # Cloudflare
            "108.162.",     # Cloudflare
            "13.107.",      # Microsoft CDN
            "52.",          # AWS ranges
            "54.",          # AWS ranges
            "3.",           # AWS ranges (EC2)
            "18.",          # AWS ranges
            "35.",          # AWS ranges
            
            # Google Cloud Platform
            "34.64.",       # GCP
            "35.184.",      # GCP
            "35.188.",      # GCP
            "35.192.",      # GCP
            "35.194.",      # GCP
            "35.196.",      # GCP
            "35.198.",      # GCP
            "35.200.",      # GCP
            "35.202.",      # GCP
            "35.204.",      # GCP
            "35.206.",      # GCP
            
            # Azure ranges
            "13.",          # Azure
            "20.",          # Azure
            "40.",          # Azure
            "51.",          # Azure
            "52.",          # Azure
            "104.",         # Azure
            
            # Akamai CDN
            "23.32.",       # Akamai
            "23.44.",       # Akamai
            "23.52.",       # Akamai
            "23.56.",       # Akamai
            "23.64.",       # Akamai
            
            # DigitalOcean
            "138.68.",      # DigitalOcean
            "159.89.",      # DigitalOcean
            "167.172.",     # DigitalOcean
            "178.62.",      # DigitalOcean
            
            # Vultr
            "45.76.",       # Vultr
            "95.179.",      # Vultr
            "108.61.",      # Vultr
            "149.28.",      # Vultr
            
            # OVH
            "51.68.",       # OVH
            "51.77.",       # OVH
            "51.83.",       # OVH
            "51.89.",       # OVH
            
            # Outros ranges suspeitos
            "169.254.",     # Link-local (APIPA)
            "224.",         # Multicast
            "225.",         # Multicast
            "226.",         # Multicast
            "227.",         # Multicast
            "228.",         # Multicast
            "229.",         # Multicast
            "230.",         # Multicast
            "231.",         # Multicast
            "232.",         # Multicast
            "233.",         # Multicast
            "234.",         # Multicast
            "235.",         # Multicast
            "236.",         # Multicast
            "237.",         # Multicast
            "238.",         # Multicast
            "239.",         # Multicast
        ]
        
        # Verifica padrões suspeitos
        for pattern in suspicious_patterns:
            if ip.startswith(pattern):
                return True
                
        # Detecção por padrões de comportamento (mais específica para reduzir falsos positivos)
        
        # IPs que terminam em .1 E começam com ranges conhecidos de gateway
        if (ip.endswith('.1') or ip.endswith('.254')) and (
            ip.startswith('192.168.') or 
            ip.startswith('10.') or
            ip.startswith('172.')
        ):
            return True
        
        # IPs com padrões de broadcast/network apenas em redes privadas conhecidas    
        if ('.0.' in ip or '.255.' in ip) and (
            ip.startswith('192.168.') or 
            ip.startswith('10.') or
            ip.startswith('172.')
        ):
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
            
        # Verifica padrões específicos (atualizados para refletir nova lógica)
        if ip.startswith("177.55.192."):
            return "Range específico problemático reportado"
        elif ip in ["127.0.0.1"]:
            return "Localhost"
        elif ip.startswith("10.") or ip.startswith("192.168."):
            return "Rede privada RFC 1918"
        elif ip.startswith("172.") and any(ip.startswith(f"172.{i}.") for i in range(16, 32)):
            return "Rede privada RFC 1918 (172.16-31.x.x)"
        elif ip.startswith("104.16.") or ip.startswith("104.17.") or ip.startswith("172.64."):
            return "CDN Cloudflare"
        elif ip.startswith("52.") or ip.startswith("54.") or ip.startswith("3."):
            return "AWS/Cloud Server"
        elif (ip.endswith('.1') or ip.endswith('.254')) and (
            ip.startswith('192.168.') or ip.startswith('10.') or ip.startswith('172.')
        ):
            return "Gateway/servidor em rede privada"
        elif ('.0.' in ip or '.255.' in ip) and (
            ip.startswith('192.168.') or ip.startswith('10.') or ip.startswith('172.')
        ):
            return "Range de infraestrutura em rede privada"
        else:
            return "Padrão suspeito detectado"
    
    def _parse_forwarded_ip_header(self, header_value):
        """
        Parse headers de IP que podem conter múltiplos valores separados por vírgula
        
        Args:
            header_value (str): Valor do header (ex: "192.168.1.1, 10.0.0.1, 203.0.113.1")
            
        Returns:
            list: Lista de IPs extraídos, priorizando o primeiro (mais provável de ser real)
        """
        if not header_value or not isinstance(header_value, str):
            return []
        
        # Split por vírgula e limpa espaços
        ips = [ip.strip() for ip in header_value.split(',')]
        
        # Filtra apenas IPs válidos
        valid_ips = []
        for ip in ips:
            if ip and self._is_valid_ip(ip):
                valid_ips.append(ip)
        
        # Retorna na ordem, priorizando o primeiro (geralmente o IP original do cliente)
        return valid_ips
    
    def _is_likely_real_customer_ip(self, ip):
        """
        Valida se um IP é provavelmente de um cliente real (não servidor/CDN/proxy)
        
        Args:
            ip (str): Endereço IP para validar
            
        Returns:
            bool: True se o IP parece ser de cliente real
        """
        if not ip or not isinstance(ip, str):
            return False
        
        # Primeiro valida se é IP válido
        if not self._is_valid_ip(ip):
            return False
        
        # Depois verifica se não é suspeito
        if self._is_suspicious_ip(ip):
            return False
        
        # Validações adicionais para IPs reais vs fictícios
        
        # IPs que terminam em .0 são suspeitos (normalmente network addresses)
        if ip.endswith('.0'):
            return False
        
        # IPs que terminam em .255 são suspeitos (normalmente broadcast addresses)
        if ip.endswith('.255'):
            return False
        
        # Padrões de IPs fictícios/placeholder comuns
        fictional_patterns = [
            "192.0.2.",     # RFC 3330 - TEST-NET-1
            "198.51.100.",  # RFC 3330 - TEST-NET-2  
            "203.0.113.",   # RFC 3330 - TEST-NET-3
            "0.0.0.0",      # Null IP
            "255.255.255.255",  # Broadcast
        ]
        
        for pattern in fictional_patterns:
            if ip.startswith(pattern) or ip == pattern:
                return False
        
        # Se passou por todas as validações, provavelmente é um IP real
        return True
    
    def _log_ip_extraction_debug(self, order_id, debug_info):
        """
        Log detalhado do processo de extração de IP para debugging
        
        Args:
            order_id: ID do pedido
            debug_info (dict): Informações de debug coletadas durante a extração
        """
        if not debug_info.get("ips_found") and not debug_info.get("validation_failures"):
            # Só loga se não encontrou nenhum IP ou se houve falhas de validação interessantes
            return
        
        print(f"=== DEBUG EXTRAÇÃO IP - Pedido {order_id} ===")
        print(f"Campos verificados: {', '.join(debug_info.get('fields_checked', []))}")
        
        if debug_info.get("ips_found"):
            print("IPs encontrados:")
            for source, ip in debug_info["ips_found"]:
                print(f"  - {source}: {ip}")
        
        if debug_info.get("validation_failures"):
            print("Falhas de validação:")
            for source, ip, reason in debug_info["validation_failures"]:
                print(f"  - {source}: {ip} ({reason})")
        
        print("=" * 50)

    def debug_ip_fields(self, order_limit=5):
        """
        Método específico para debugar campos de IP dos pedidos Shopify
        Agora verifica TODOS os novos campos adicionados na hierarquia expandida
        
        Args:
            order_limit (int): Quantos pedidos buscar para análise
            
        Returns:
            dict: Análise detalhada dos campos de IP encontrados
        """
        print("=== INÍCIO DEBUG CAMPOS IP SHOPIFY (VERSÃO EXPANDIDA) ===")
        
        try:
            # Busca pedidos recentes com TODOS os campos explícitos incluindo novos campos
            params = {
                "limit": order_limit,
                "status": "any",
                "fields": "id,order_number,created_at,browser_ip,client_details,shipping_address,billing_address,customer,custom_attributes,note_attributes,properties,line_items,cart,checkout"
            }
            
            url = f"{self.base_url}/orders.json"
            response = requests.get(url, headers=self.headers, params=params, timeout=30)
            response.raise_for_status()
            
            orders = response.json()["orders"]
            
            debug_results = {
                "total_orders_analyzed": len(orders),
                "fields_analysis": {
                    "client_details_browser_ip": 0,
                    "custom_attributes": 0,
                    "note_attributes": 0, 
                    "properties": 0,
                    "line_items_properties": 0,
                    "cart_attributes": 0,
                    "checkout_attributes": 0,
                    "customer_fields": 0,
                    "shipping_address_fields": 0,
                    "billing_address_fields": 0,
                    "order_direct_fields": 0
                },
                "ips_found_by_source": {},
                "sample_extractions": []
            }
            
            for order in orders:
                print(f"\n--- Analisando Pedido {order['id']} ---")
                
                # Testa a extração usando o método melhorado
                extracted_ip, source = self._extract_real_customer_ip(order)
                
                extraction_result = {
                    "order_id": order["id"],
                    "order_number": order["order_number"],
                    "extracted_ip": extracted_ip,
                    "source": source,
                    "success": extracted_ip is not None
                }
                
                if extracted_ip:
                    print(f"✅ IP extraído: {extracted_ip} (fonte: {source})")
                    if source not in debug_results["ips_found_by_source"]:
                        debug_results["ips_found_by_source"][source] = 0
                    debug_results["ips_found_by_source"][source] += 1
                else:
                    print("❌ Nenhum IP válido encontrado")
                
                # Análise detalhada dos campos disponíveis
                self._analyze_order_fields(order, debug_results)
                
                debug_results["sample_extractions"].append(extraction_result)
            
            # Relatório final
            print("\n=== RELATÓRIO FINAL ===")
            print(f"Total de pedidos analisados: {debug_results['total_orders_analyzed']}")
            print(f"IPs extraídos com sucesso: {sum(1 for x in debug_results['sample_extractions'] if x['success'])}")
            
            print("\n=== ANÁLISE POR FONTE ===")
            for source, count in debug_results["ips_found_by_source"].items():
                print(f"{source}: {count} pedidos")
            
            print("\n=== ANÁLISE DE CAMPOS DISPONÍVEIS ===")
            for field, count in debug_results["fields_analysis"].items():
                print(f"{field}: {count} pedidos com campo presente")
            
            success_rate = (sum(1 for x in debug_results["sample_extractions"] if x['success']) / len(debug_results["sample_extractions"])) * 100 if debug_results["sample_extractions"] else 0
            print(f"\n🎯 Taxa de sucesso na extração: {success_rate:.1f}%")
            
            print("=== FIM DEBUG CAMPOS IP SHOPIFY ===\n")
            
            return debug_results
            
        except Exception as e:
            error_msg = f"Erro durante debug de campos IP: {str(e)}"
            print(error_msg)
            return {"error": error_msg}
    
    def _analyze_order_fields(self, order, debug_results):
        """
        Analisa quais campos estão presentes em um pedido
        
        Args:
            order (dict): Dados do pedido
            debug_results (dict): Resultados de debug para atualizar
        """
        # client_details
        client_details = order.get("client_details", {})
        if client_details and client_details.get("browser_ip"):
            debug_results["fields_analysis"]["client_details_browser_ip"] += 1
        
        # custom_attributes
        if order.get("custom_attributes"):
            debug_results["fields_analysis"]["custom_attributes"] += 1
        
        # note_attributes  
        if order.get("note_attributes"):
            debug_results["fields_analysis"]["note_attributes"] += 1
        
        # properties
        if order.get("properties"):
            debug_results["fields_analysis"]["properties"] += 1
        
        # line_items properties
        line_items = order.get("line_items", [])
        has_line_item_properties = any(
            item.get("properties") for item in line_items if isinstance(item, dict)
        )
        if has_line_item_properties:
            debug_results["fields_analysis"]["line_items_properties"] += 1
        
        # cart attributes
        cart = order.get("cart", {})
        if cart and cart.get("attributes"):
            debug_results["fields_analysis"]["cart_attributes"] += 1
        
        # checkout attributes
        checkout = order.get("checkout", {})
        if checkout and checkout.get("attributes"):
            debug_results["fields_analysis"]["checkout_attributes"] += 1
        
        # customer fields
        customer = order.get("customer", {})
        if customer:
            customer_ip_fields = ["last_order_ip", "customer_ip", "registration_ip", "ip_address"]
            if any(customer.get(field) for field in customer_ip_fields):
                debug_results["fields_analysis"]["customer_fields"] += 1
        
        # shipping address fields
        shipping = order.get("shipping_address", {})
        if shipping:
            shipping_ip_fields = ["client_ip", "customer_ip", "ip_address", "ip"]
            if any(shipping.get(field) for field in shipping_ip_fields):
                debug_results["fields_analysis"]["shipping_address_fields"] += 1
        
        # billing address fields  
        billing = order.get("billing_address", {})
        if billing:
            billing_ip_fields = ["client_ip", "customer_ip", "ip_address", "ip"]
            if any(billing.get(field) for field in billing_ip_fields):
                debug_results["fields_analysis"]["billing_address_fields"] += 1
        
        # order direct fields
        order_ip_fields = ["customer_ip", "client_ip", "real_ip", "origin_ip", "user_ip"]
        if any(order.get(field) for field in order_ip_fields):
            debug_results["fields_analysis"]["order_direct_fields"] += 1
    
    def test_ip_extraction_improvements(self, order_limit=10):
        """
        Testa as melhorias na extração de IP comparando método antigo vs novo
        
        Args:
            order_limit (int): Número de pedidos para testar
            
        Returns:
            dict: Relatório de comparação entre os métodos
        """
        print("=== TESTE COMPARATIVO: EXTRAÇÃO DE IP MELHORADA ===")
        
        try:
            # Busca pedidos para teste
            params = {
                "limit": order_limit,
                "status": "any",
                "fields": "id,order_number,created_at,browser_ip,client_details,shipping_address,billing_address,customer,custom_attributes,note_attributes,properties,line_items,cart,checkout"
            }
            
            url = f"{self.base_url}/orders.json"
            response = requests.get(url, headers=self.headers, params=params, timeout=30)
            response.raise_for_status()
            
            orders = response.json()["orders"]
            
            comparison_results = {
                "total_orders_tested": len(orders),
                "old_method_success": 0,
                "new_method_success": 0,
                "improvement_count": 0,
                "detailed_results": []
            }
            
            for order in orders:
                # Simula método antigo (apenas client_details.browser_ip)
                old_ip = self._extract_ip_old_method(order)
                
                # Usa método novo (hierarquia expandida)  
                new_ip, source = self._extract_real_customer_ip(order)
                
                result = {
                    "order_id": order["id"],
                    "order_number": order["order_number"],
                    "old_method_ip": old_ip,
                    "new_method_ip": new_ip,
                    "new_method_source": source,
                    "old_success": old_ip is not None,
                    "new_success": new_ip is not None,
                    "improvement": (old_ip is None and new_ip is not None)
                }
                
                if result["old_success"]:
                    comparison_results["old_method_success"] += 1
                    
                if result["new_success"]:
                    comparison_results["new_method_success"] += 1
                    
                if result["improvement"]:
                    comparison_results["improvement_count"] += 1
                    print(f"✅ MELHORIA - Pedido {order['id']}: novo método encontrou {new_ip} em {source}")
                
                comparison_results["detailed_results"].append(result)
            
            # Relatório final
            print(f"\n=== RESULTADOS DO TESTE ===")
            print(f"Total de pedidos testados: {comparison_results['total_orders_tested']}")
            print(f"Método antigo (apenas browser_ip): {comparison_results['old_method_success']} sucessos")
            print(f"Método novo (hierarquia expandida): {comparison_results['new_method_success']} sucessos")
            print(f"Melhorias obtidas: {comparison_results['improvement_count']} IPs adicionais encontrados")
            
            old_rate = (comparison_results['old_method_success'] / len(orders)) * 100 if orders else 0
            new_rate = (comparison_results['new_method_success'] / len(orders)) * 100 if orders else 0
            improvement_rate = new_rate - old_rate
            
            print(f"Taxa de sucesso método antigo: {old_rate:.1f}%")
            print(f"Taxa de sucesso método novo: {new_rate:.1f}%")
            print(f"🎯 Melhoria na taxa de detecção: +{improvement_rate:.1f}%")
            
            return comparison_results
            
        except Exception as e:
            error_msg = f"Erro durante teste de melhorias: {str(e)}"
            print(error_msg)
            return {"error": error_msg}
    
    def _extract_ip_old_method(self, order):
        """
        Simula o método antigo de extração (apenas client_details.browser_ip)
        Para fins de comparação
        
        Args:
            order (dict): Dados do pedido
            
        Returns:
            str: IP encontrado ou None
        """
        client_details = order.get("client_details", {})
        if client_details and isinstance(client_details, dict):
            browser_ip = client_details.get("browser_ip")
            if browser_ip and isinstance(browser_ip, str):
                browser_ip = browser_ip.strip()
                if browser_ip and self._is_valid_ip(browser_ip):
                    return browser_ip
        return None