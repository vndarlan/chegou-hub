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
            
            # Agrupa por produto
            product_orders = defaultdict(list)
            for order in customer_orders:
                for item in order["line_items"]:
                    product_id = item["product_id"]
                    product_orders[product_id].append(order)
            
            # Verifica duplicatas para produtos do pedido não processado
            unprocessed_products = set()
            for item in unprocessed_order["line_items"]:
                unprocessed_products.add(item["product_id"])
            
            for product_id in unprocessed_products:
                orders_with_product = product_orders[product_id]
                
                if len(orders_with_product) < 2:
                    continue
                
                # Remove duplicatas por ID
                unique_product_orders = {}
                for order in orders_with_product:
                    unique_product_orders[order['id']] = order
                orders_with_product = list(unique_product_orders.values())
                
                if len(orders_with_product) < 2:
                    continue
                
                orders_with_product.sort(key=lambda x: x["created_at"])
                
                # Busca pedidos processados do mesmo produto
                processed_orders = []
                for order in orders_with_product:
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
                    for order in orders_with_product:
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
                    
                    # Buscar endereço do pedido duplicado
                    duplicate_address = self.get_order_details(unprocessed_order["id"])
                    
                    duplicate_candidates.append({
                        "customer_phone": unprocessed_order["customer"]["phone"],
                        "customer_name": customer_name,
                        "customer_address": duplicate_address,  # NOVO: endereço real da API
                        "first_order": {
                            "id": original_order["id"],
                            "number": original_order["order_number"],
                            "date": date1.strftime("%d/%m/%Y %H:%M"),
                            "total": f"R$ {original_order['total_price']}"
                        },
                        "duplicate_order": {
                            "id": unprocessed_order["id"],
                            "number": unprocessed_order["order_number"],
                            "date": date2.strftime("%d/%m/%Y %H:%M"),
                            "total": f"R$ {unprocessed_order['total_price']}"
                        },
                        "common_products": [product_id],
                        "days_between": days_diff,
                        "status": unprocessed_order["financial_status"]
                    })
                    break
        
        return duplicate_candidates
    
    def get_product_details(self, product_ids):
        """Busca detalhes dos produtos"""
        product_details = {}
        
        for product_id in product_ids:
            url = f"{self.base_url}/products/{product_id}.json"
            try:
                response = requests.get(url, headers=self.headers, timeout=10)
                if response.status_code == 200:
                    product = response.json()["product"]
                    product_details[product_id] = {
                        "title": product["title"],
                        "handle": product["handle"]
                    }
            except:
                product_details[product_id] = {"title": f"Produto ID {product_id}", "handle": ""}
        
        return product_details
    
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
        
        # Busca detalhes dos produtos
        all_product_ids = set()
        for dup in duplicates:
            all_product_ids.update(dup["common_products"])
        
        product_details = self.get_product_details(list(all_product_ids))
        
        # Adiciona detalhes dos produtos
        for dup in duplicates:
            dup["product_names"] = []
            for pid in dup["common_products"]:
                if pid in product_details:
                    dup["product_names"].append(product_details[pid]["title"])
                else:
                    dup["product_names"].append(f"Produto {pid}")
        
        return duplicates