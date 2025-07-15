# backend/features/metricas_ecomhub/utils.py - VERSÃO ATUALIZADA COM SHOPIFY
import pandas as pd
import json
import re
import logging
from collections import defaultdict
from .shopify_client import ShopifyClient

logger = logging.getLogger(__name__)

class EcomhubProcessor:
    """Classe utilitária para processamento de dados ECOMHUB"""
    
    @classmethod
    def process_ecomhub_file(cls, df, modo='produto', loja_shopify=None):
        """Processa arquivo da ECOMHUB por loja ou produto"""
        if modo == 'produto' and loja_shopify:
            return cls._process_by_product(df, loja_shopify)
        else:
            return cls._process_by_store(df)
    
    @classmethod
    def _process_by_store(cls, df):
        """Processamento original por loja"""
        store_col = cls._find_column(df, ['store_name', 'store', 'storeName'])
        status_col = cls._find_column(df, ['status'])
        
        if not store_col or not status_col:
            raise ValueError("Colunas de loja ou status não encontradas")
        
        unique_statuses = df[status_col].dropna().unique()
        unique_statuses = sorted([str(status).strip() for status in unique_statuses])
        
        store_counts = defaultdict(lambda: {"Total_Registros": 0, "Delivered_Count": 0})
        
        for idx, row in df.iterrows():
            store_name = str(row.get(store_col, 'Loja Desconhecida')).strip()
            if not store_name or store_name == 'nan':
                store_name = 'Loja Desconhecida'
            
            status = str(row.get(status_col, '')).strip()
            
            if store_name not in store_counts:
                store_counts[store_name] = {"Total_Registros": 0, "Delivered_Count": 0}
                for unique_status in unique_statuses:
                    store_counts[store_name][unique_status] = 0
            
            store_counts[store_name]["Total_Registros"] += 1
            
            if status in unique_statuses:
                store_counts[store_name][status] += 1
            
            if status.lower() == "delivered":
                store_counts[store_name]["Delivered_Count"] += 1
        
        # Converter para lista
        rows = []
        for store, counts in store_counts.items():
            total_registros = counts["Total_Registros"]
            delivered = counts["Delivered_Count"]
            
            if total_registros > 0:
                efetividade = (delivered / total_registros) * 100
            else:
                efetividade = 0
            
            row = {
                "Loja": store,
                "Total": total_registros,
            }
            
            for status in unique_statuses:
                row[status] = counts[status]
            
            row["Efetividade"] = f"{efetividade:.0f}%"
            rows.append(row)
        
        if rows:
            rows.sort(key=lambda x: float(x["Efetividade"].replace('%', '')), reverse=True)
            
            # Adicionar linha de totais
            totals = {"Loja": "Total"}
            numeric_cols = ["Total"] + unique_statuses
            for col in numeric_cols:
                totals[col] = sum(row[col] for row in rows)
            
            total_registros = totals["Total"]
            total_delivered = totals.get("delivered", 0)
            
            if total_registros > 0:
                efetividade_media = (total_delivered / total_registros) * 100
                totals["Efetividade"] = f"{efetividade_media:.0f}% (Média)"
            else:
                totals["Efetividade"] = "0% (Média)"
            
            rows.append(totals)
        
        return {
            'dados': rows,
            'stats': cls._calculate_stats(rows, 'Loja')
        }
    
    @classmethod
    def _process_by_product(cls, df, loja_shopify):
        """Novo processamento por produto usando Shopify"""
        # Encontrar colunas necessárias
        shopify_order_col = cls._find_column(df, ['shopifyOrderNumber', 'shopify_order_number', 'order_number'])
        status_col = cls._find_column(df, ['status'])
        
        if not shopify_order_col or not status_col:
            raise ValueError("Colunas 'shopifyOrderNumber' ou 'status' não encontradas")
        
        logger.info(f"Processando {len(df)} registros por produto usando loja Shopify: {loja_shopify.nome}")
        
        # Obter números únicos de pedidos
        order_numbers = df[shopify_order_col].dropna().unique()
        order_numbers = [str(num).strip() for num in order_numbers if str(num).strip() and str(num) != 'nan']
        
        logger.info(f"Encontrados {len(order_numbers)} números de pedidos únicos")
        
        # Inicializar cliente Shopify
        try:
            shopify_client = ShopifyClient(loja_shopify)
        except Exception as e:
            raise ValueError(f"Erro ao conectar com Shopify: {str(e)}")
        
        # Buscar produtos em lote (otimizado)
        logger.info("Buscando produtos na Shopify...")
        products_map = shopify_client.get_orders_batch(order_numbers)
        
        logger.info(f"Produtos encontrados: {len(products_map)}")
        
        # Obter status únicos
        unique_statuses = df[status_col].dropna().unique()
        unique_statuses = sorted([str(status).strip() for status in unique_statuses])
        
        # Agrupar por produto
        product_counts = defaultdict(lambda: {"Total_Registros": 0, "Delivered_Count": 0})
        produtos_nao_encontrados = set()
        
        for idx, row in df.iterrows():
            order_number = str(row.get(shopify_order_col, '')).strip()
            status = str(row.get(status_col, '')).strip()
            
            if not order_number or order_number == 'nan':
                continue
            
            # Buscar produto para este pedido
            produto_info = products_map.get(order_number)
            
            if produto_info:
                produto_nome = produto_info['produto_nome']
            else:
                produto_nome = 'Produto Não Encontrado'
                produtos_nao_encontrados.add(order_number)
            
            # Inicializar contador do produto
            if produto_nome not in product_counts:
                product_counts[produto_nome] = {"Total_Registros": 0, "Delivered_Count": 0}
                for unique_status in unique_statuses:
                    product_counts[produto_nome][unique_status] = 0
            
            # Contar
            product_counts[produto_nome]["Total_Registros"] += 1
            
            if status in unique_statuses:
                product_counts[produto_nome][status] += 1
            
            if status.lower() == "delivered":
                product_counts[produto_nome]["Delivered_Count"] += 1
        
        # Converter para lista
        rows = []
        for produto, counts in product_counts.items():
            total_registros = counts["Total_Registros"]
            delivered = counts["Delivered_Count"]
            
            if total_registros > 0:
                efetividade = (delivered / total_registros) * 100
            else:
                efetividade = 0
            
            row = {
                "Produto": produto,
                "Total": total_registros,
            }
            
            # Adicionar cada status
            for status in unique_statuses:
                row[status] = counts[status]
            
            row["Efetividade"] = f"{efetividade:.0f}%"
            rows.append(row)
        
        if rows:
            # Ordenar por efetividade
            rows.sort(key=lambda x: float(x["Efetividade"].replace('%', '')), reverse=True)
            
            # Adicionar linha de totais
            totals = {"Produto": "Total"}
            numeric_cols = ["Total"] + unique_statuses
            for col in numeric_cols:
                totals[col] = sum(row[col] for row in rows)
            
            total_registros = totals["Total"]
            total_delivered = totals.get("delivered", 0)
            
            if total_registros > 0:
                efetividade_media = (total_delivered / total_registros) * 100
                totals["Efetividade"] = f"{efetividade_media:.0f}% (Média)"
            else:
                totals["Efetividade"] = "0% (Média)"
            
            rows.append(totals)
        
        # Estatísticas adicionais
        stats = cls._calculate_stats(rows, 'Produto')
        stats['produtos_nao_encontrados'] = len(produtos_nao_encontrados)
        stats['total_pedidos_unicos'] = len(order_numbers)
        stats['produtos_encontrados'] = len(products_map)
        
        if produtos_nao_encontrados:
            logger.warning(f"Produtos não encontrados para {len(produtos_nao_encontrados)} pedidos")
        
        return {
            'dados': rows,
            'stats': stats,
            'produtos_nao_encontrados': list(produtos_nao_encontrados)[:10]  # Primeiros 10 para debug
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
    def _calculate_stats(dados, grupo_col):
        """Calcula estatísticas gerais"""
        if not dados or dados[-1][grupo_col] != "Total":
            return {}
        
        total_row = dados[-1]
        
        return {
            'total_registros': total_row.get("Total", 0),
            'delivered': total_row.get("delivered", 0),
            'efetividade_media': total_row.get("Efetividade", "0%"),
            'total_grupos': len(dados) - 1  # Subtraindo linha de total
        }