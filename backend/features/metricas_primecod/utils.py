import pandas as pd
import json
import re
from collections import defaultdict

class PrimeCODProcessor:
    """Classe utilitária para processamento de dados Prime COD"""
    
    @staticmethod
    def extract_products_from_text(products_text, skus_text=None):
        """Extrai lista de produtos do texto"""
        products = []
        
        if pd.isna(products_text):
            return ['Produto Desconhecido']
        
        products_str = str(products_text)
        
        if '[' in products_str and ']' in products_str:
            try:
                if products_str.startswith('['):
                    products_data = json.loads(products_str)
                    for item in products_data:
                        if isinstance(item, dict):
                            name = item.get('name', item.get('title', item.get('sku', 'Produto')))
                            if name and name not in products:
                                products.append(name)
                        else:
                            product_name = str(item)
                            if product_name not in products:
                                products.append(product_name)
                else:
                    name_matches = re.findall(r'"name":\s*"([^"]+)"', products_str)
                    if name_matches:
                        for name in name_matches:
                            if name not in products:
                                products.append(name)
                    else:
                        sku_matches = re.findall(r'"sku":\s*"([^"]+)"', products_str)
                        for sku in sku_matches:
                            if sku not in products:
                                products.append(sku)
            except:
                clean_text = products_str[:50].strip()
                if clean_text:
                    products.append(clean_text)
        else:
            clean_text = products_str[:50].strip()
            if clean_text:
                products.append(clean_text)
        
        return products if products else ['Produto Desconhecido']
    
    @staticmethod
    def get_leads_status_mapping():
        """Define mapeamento de status para leads"""
        return {
            'confirmed': 'Confirmed',
            'duplicate': 'Duplicate', 
            'duplicated': 'Duplicate',
            'duplicado': 'Duplicate',
            'wrong': 'Wrong',
            'invalid': 'Wrong', 
            'errado': 'Wrong',
            'invalido': 'Wrong',
            'no answer': 'No Answer',
            'no_answer': 'No Answer',
            'new': 'No Answer',
            'novo': 'No Answer',
            'pending': 'No Answer',
            'canceled': 'Canceled',
            'cancelled': 'Canceled',
            'cancelado': 'Canceled',
            'trash': 'Trash',
            'rejected': 'Trash',
            'rejeitado': 'Trash',
            'lixo': 'Trash',
            'expired': 'Trash',
            'expirado': 'Trash'
        }
    
    @staticmethod
    def get_orders_status_mapping():
        """Define mapeamento de status para orders"""
        return {
            'delivered': 'Delivered',
            'entregue': 'Delivered',
            'returned': 'Returned',
            'devolvido': 'Returned', 
            'return': 'Returned',
            'refused': 'Refused',
            'recusado': 'Refused',
            'refuse': 'Refused',
            'incident': 'Incident',
            'incidente': 'Incident',
            'problem': 'Incident',
            'canceled': 'Canceled',
            'cancelled': 'Canceled',
            'cancelado': 'Canceled',
            'order placed': 'Order Placed',
            'pedido feito': 'Order Placed',
            'out of stock': 'Out of Stock',
            'sem estoque': 'Out of Stock',
            'returning': 'Returning',
            'retornando': 'Returning',
            'out for delivery': 'Out for Delivery',
            'saiu para entrega': 'Out for Delivery',
            'shipped': 'Shipped',
            'enviado': 'Shipped'
        }
    
    @classmethod
    def process_leads_file(cls, df):
        """Processa arquivo de leads e retorna dados estruturados"""
        product_col = cls._find_column(df, ['product'])
        status_col = cls._find_column(df, ['confirmation_status', 'status'])
        
        if not product_col or not status_col:
            raise ValueError("Colunas de produtos ou status não encontradas")
        
        status_mapping = cls.get_leads_status_mapping()
        unique_statuses = df[status_col].dropna().unique()
        unique_statuses_list = sorted([str(status).strip() for status in unique_statuses])
        
        unmapped_statuses = []
        for status in unique_statuses_list:
            if status.lower() not in status_mapping:
                unmapped_statuses.append(status)
        
        product_counts = defaultdict(lambda: {
            "Total": 0, "Confirmed": 0, "Duplicate": 0,
            "Wrong": 0, "Canceled": 0, "No Answer": 0, 
            "Trash": 0, "Outros": 0
        })
        
        for idx, row in df.iterrows():
            products_text = row.get(product_col)
            products = cls.extract_products_from_text(products_text)
            
            status = str(row.get(status_col, 'unknown')).lower().strip()
            
            for product in products:
                product_counts[product]["Total"] += 1
                
                if status in status_mapping:
                    mapped_status = status_mapping[status]
                    product_counts[product][mapped_status] += 1
                else:
                    product_counts[product]["Outros"] += 1
        
        rows = []
        for product, counts in product_counts.items():
            row = {
                "Product": product,
                "Total - duplicados": counts["Total"] - counts["Duplicate"],
                "Confirmed": counts["Confirmed"],
                "Duplicate": counts["Duplicate"],
                "Wrong": counts["Wrong"],
                "Canceled": counts["Canceled"],
                "No Answer": counts["No Answer"],
                "Trash": counts["Trash"],
                "Outros": counts["Outros"]
            }
            rows.append(row)
        
        if rows:
            totals = {"Product": "Total"}
            for col in ["Total - duplicados", "Confirmed", "Duplicate", "Wrong", "Canceled", "No Answer", "Trash", "Outros"]:
                totals[col] = sum(row[col] for row in rows)
            
            rows.append(totals)
        
        return {
            'dados': rows,
            'unmapped_statuses': unmapped_statuses,
            'stats': cls._calculate_leads_stats(rows)
        }
    
    @classmethod
    def process_orders_file(cls, df):
        """Processa arquivo de orders para efetividade"""
        product_col = cls._find_column(df, ['product'])
        status_col = cls._find_column(df, ['shipping_status', 'status'])
        
        if not product_col or not status_col:
            raise ValueError("Colunas de produtos ou status de envio não encontradas")
        
        status_mapping = cls.get_orders_status_mapping()
        unique_statuses = df[status_col].dropna().unique()
        unique_statuses_list = sorted([str(status).strip() for status in unique_statuses])
        
        unmapped_statuses = []
        for status in unique_statuses_list:
            if status.lower() not in status_mapping:
                unmapped_statuses.append(status)
        
        product_orders = defaultdict(lambda: {
            "Delivered": 0, "Returned": 0, "Refused": 0, "Incident": 0,
            "Order Placed": 0, "Out of Stock": 0, "Returning": 0,
            "Out for Delivery": 0, "Shipped": 0, "Canceled": 0, "Outros": 0
        })
        
        for idx, row in df.iterrows():
            products_text = row.get(product_col)
            products = cls.extract_products_from_text(products_text)
            
            shipping_status = str(row.get(status_col, 'unknown')).lower().strip()
            
            for product in products:
                if shipping_status in status_mapping:
                    mapped_status = status_mapping[shipping_status]
                    product_orders[product][mapped_status] += 1
                else:
                    product_orders[product]["Outros"] += 1
        
        return {
            'dados': dict(product_orders),
            'unmapped_statuses': unmapped_statuses
        }
    
    @staticmethod
    def _find_column(df, possible_names):
        """Encontra coluna baseada em nomes possíveis"""
        for col in df.columns:
            for name in possible_names:
                if name.lower() in col.lower():
                    return col
        return None
    
    @staticmethod
    def _calculate_leads_stats(dados):
        """Calcula estatísticas de leads"""
        if not dados or dados[-1]["Product"] != "Total":
            return {}
        
        total_row = dados[-1]
        confirmed = total_row.get("Confirmed", 0)
        total = total_row.get("Total - duplicados", 1)
        taxa_confirmacao = (confirmed / total * 100) if total > 0 else 0
        
        return {
            'total_leads': total,
            'confirmados': confirmed,
            'duplicados': total_row.get("Duplicate", 0),
            'taxa_confirmacao': f"{taxa_confirmacao:.1f}%"
        }