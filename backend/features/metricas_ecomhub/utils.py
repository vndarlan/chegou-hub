import pandas as pd
import json
import re
from collections import defaultdict

class EcomhubProcessor:
    """Classe utilitária para processamento de dados ECOMHUB"""
    
    @classmethod
    def process_ecomhub_file(cls, df):
        """Processa arquivo da ECOMHUB"""
        store_col = cls._find_column(df, ['store_name', 'store'])
        status_col = cls._find_column(df, ['status'])
        
        if not store_col or not status_col:
            raise ValueError("Colunas de loja ou status não encontradas")
        
        # Descobrir todos os status únicos no arquivo
        unique_statuses = df[status_col].dropna().unique()
        unique_statuses = sorted([str(status).strip() for status in unique_statuses])
        
        # Processar dados
        store_counts = defaultdict(lambda: {"Total_Registros": 0, "Delivered_Count": 0})
        
        for idx, row in df.iterrows():
            # Extrair loja
            store_name = str(row.get(store_col, 'Loja Desconhecida')).strip()
            if not store_name or store_name == 'nan':
                store_name = 'Loja Desconhecida'
            
            # Status
            status = str(row.get(status_col, '')).strip()
            
            # Inicializar contador da loja
            if store_name not in store_counts:
                store_counts[store_name] = {"Total_Registros": 0, "Delivered_Count": 0}
                # Adicionar uma coluna para cada status único
                for unique_status in unique_statuses:
                    store_counts[store_name][unique_status] = 0
            
            # Contar total
            store_counts[store_name]["Total_Registros"] += 1
            
            # Contar status específico
            if status in unique_statuses:
                store_counts[store_name][status] += 1
            
            # Se for "delivered", conta como entregue para cálculo de efetividade
            if status.lower() == "delivered":
                store_counts[store_name]["Delivered_Count"] += 1
        
        # Converter para lista
        rows = []
        for store, counts in store_counts.items():
            # Calcular efetividade: delivered / total * 100
            total_registros = counts["Total_Registros"]
            delivered = counts["Delivered_Count"]
            
            if total_registros > 0:
                efetividade = (delivered / total_registros) * 100
            else:
                efetividade = 0
            
            # Construir linha com todas as colunas
            row = {
                "Loja": store,
                "Total": total_registros,
            }
            
            # Adicionar cada status exatamente como vem da tabela
            for status in unique_statuses:
                row[status] = counts[status]
            
            # Adicionar efetividade no final
            row["Efetividade"] = f"{efetividade:.0f}%"
            
            rows.append(row)
        
        # Ordenar por efetividade (maior primeiro)
        if rows:
            rows.sort(key=lambda x: float(x["Efetividade"].replace('%', '')), reverse=True)
            
            # Adicionar linha de totais
            totals = {"Loja": "Total"}
            
            # Somar todas as colunas numéricas
            numeric_cols = ["Total"] + unique_statuses
            for col in numeric_cols:
                totals[col] = sum(row[col] for row in rows)
            
            # Calcular efetividade média
            total_registros = totals["Total"]
            total_delivered = totals.get("delivered", 0)  # Usar coluna "delivered" para total
            
            if total_registros > 0:
                efetividade_media = (total_delivered / total_registros) * 100
                totals["Efetividade"] = f"{efetividade_media:.0f}% (Média)"
            else:
                totals["Efetividade"] = "0% (Média)"
            
            rows.append(totals)
        
        return {
            'dados': rows,
            'stats': cls._calculate_ecomhub_stats(rows)
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
    def _calculate_ecomhub_stats(dados):
        """Calcula estatísticas ECOMHUB"""
        if not dados or dados[-1]["Loja"] != "Total":
            return {}
        
        total_row = dados[-1]
        
        return {
            'total_registros': total_row.get("Total", 0),
            'delivered': total_row.get("delivered", 0),
            'efetividade_media': total_row.get("Efetividade", "0%")
        }