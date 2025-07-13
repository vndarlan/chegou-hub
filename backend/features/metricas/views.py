# backend/features/metricas/views.py
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
from .models import AnaliseEfetividade, StatusMapping
from .serializers import (
    AnaliseEfetividadeSerializer, 
    CSVUploadSerializer, 
    ProcessarAnaliseSerializer,
    StatusMappingSerializer
)
import pandas as pd
import json
import re
from collections import defaultdict

class AnaliseEfetividadeViewSet(viewsets.ModelViewSet):
    serializer_class = AnaliseEfetividadeSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return AnaliseEfetividade.objects.all().order_by('-atualizado_em')
    
    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def upload_csv(self, request):
        """Upload e processamento inicial de CSV"""
        serializer = CSVUploadSerializer(data=request.data)
        if serializer.is_valid():
            try:
                df = serializer.process_csv()
                tipo_arquivo = serializer.validated_data['tipo_arquivo']
                
                # Processar baseado no tipo
                if tipo_arquivo == 'leads':
                    resultado = self._processar_leads(df)
                elif tipo_arquivo == 'orders':
                    resultado = self._processar_orders(df)
                elif tipo_arquivo == 'ecomhub':
                    resultado = self._processar_ecomhub(df)
                
                return Response({
                    'status': 'success',
                    'tipo': tipo_arquivo,
                    'dados_processados': resultado['dados'],
                    'estatisticas': resultado['stats'],
                    'status_nao_mapeados': resultado.get('unmapped_statuses', [])
                })
                
            except Exception as e:
                return Response({
                    'status': 'error',
                    'message': f"Erro no processamento: {str(e)}"
                }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def processar_analise(self, request):
        """Processa dados e salva análise completa"""
        serializer = ProcessarAnaliseSerializer(data=request.data)
        if serializer.is_valid():
            try:
                data = serializer.validated_data
                tipo = data['tipo']
                
                if tipo == 'PRIMECOD':
                    resultado = self._criar_analise_primecod(data)
                elif tipo == 'ECOMHUB':
                    resultado = self._criar_analise_ecomhub(data)
                
                # Salvar análise
                analise = AnaliseEfetividade.objects.create(
                    nome=data['nome_analise'],
                    tipo=tipo,
                    dados_leads=resultado.get('dados_leads'),
                    dados_efetividade=resultado.get('dados_efetividade'),
                    criado_por=request.user
                )
                
                return Response({
                    'status': 'success',
                    'analise_id': analise.id,
                    'message': f"Análise '{analise.nome}' salva com sucesso!"
                })
                
            except Exception as e:
                return Response({
                    'status': 'error',
                    'message': f"Erro ao processar análise: {str(e)}"
                }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def _processar_leads(self, df):
        """Processa arquivo de leads"""
        # Identificar colunas
        product_col = self._find_column(df, ['product'])
        status_col = self._find_column(df, ['confirmation_status', 'status'])
        
        if not product_col or not status_col:
            raise ValueError("Colunas de produto ou status não encontradas")
        
        # Mapeamento de status
        status_mapping = self._get_leads_status_mapping()
        
        # Descobrir status únicos
        unique_statuses = df[status_col].dropna().unique()
        unmapped_statuses = [s for s in unique_statuses if s.lower() not in status_mapping]
        
        # Processar dados
        product_counts = defaultdict(lambda: {
            "Total": 0, "Confirmed": 0, "Duplicate": 0,
            "Wrong": 0, "Canceled": 0, "No Answer": 0, 
            "Trash": 0, "Outros": 0
        })
        
        for _, row in df.iterrows():
            products = self._extract_products(row[product_col])
            status_raw = str(row[status_col]).lower().strip()
            
            for product in products:
                product_counts[product]["Total"] += 1
                
                if status_raw in status_mapping:
                    mapped_status = status_mapping[status_raw]
                    product_counts[product][mapped_status] += 1
                else:
                    product_counts[product]["Outros"] += 1
        
        # Converter para lista
        dados = []
        for product, counts in product_counts.items():
            row = {
                "Product": product,
                "Total - duplicados": counts["Total"] - counts["Duplicate"],
                **{k: v for k, v in counts.items() if k != "Total"}
            }
            dados.append(row)
        
        # Adicionar totais
        if dados:
            totals = {"Product": "Total"}
            for col in ["Total - duplicados", "Confirmed", "Duplicate", "Wrong", "Canceled", "No Answer", "Trash", "Outros"]:
                totals[col] = sum(row[col] for row in dados)
            dados.append(totals)
        
        return {
            'dados': dados,
            'stats': self._calculate_leads_stats(dados),
            'unmapped_statuses': unmapped_statuses
        }
    
    def _processar_orders(self, df):
        """Processa arquivo de orders"""
        product_col = self._find_column(df, ['product'])
        status_col = self._find_column(df, ['shipping_status', 'status'])
        
        if not product_col or not status_col:
            raise ValueError("Colunas de produto ou status de shipping não encontradas")
        
        status_mapping = self._get_orders_status_mapping()
        
        unique_statuses = df[status_col].dropna().unique()
        unmapped_statuses = [s for s in unique_statuses if s.lower() not in status_mapping]
        
        product_orders = defaultdict(lambda: {
            "Delivered": 0, "Returned": 0, "Refused": 0, "Incident": 0,
            "Order Placed": 0, "Out of Stock": 0, "Returning": 0,
            "Out for Delivery": 0, "Shipped": 0, "Canceled": 0, "Outros": 0
        })
        
        for _, row in df.iterrows():
            products = self._extract_products(row[product_col])
            status_raw = str(row[status_col]).lower().strip()
            
            for product in products:
                if status_raw in status_mapping:
                    mapped_status = status_mapping[status_raw]
                    product_orders[product][mapped_status] += 1
                else:
                    product_orders[product]["Outros"] += 1
        
        return {
            'dados': dict(product_orders),
            'stats': {},
            'unmapped_statuses': unmapped_statuses
        }
    
    def _processar_ecomhub(self, df):
        """Processa arquivo ECOMHUB"""
        store_col = self._find_column(df, ['store_name', 'store'])
        status_col = self._find_column(df, ['status'])
        
        if not store_col or not status_col:
            raise ValueError("Colunas de loja ou status não encontradas")
        
        unique_statuses = sorted(df[status_col].dropna().unique())
        
        store_counts = defaultdict(lambda: {"Total_Registros": 0, "Delivered_Count": 0})
        
        # Adicionar colunas para cada status único
        for store in store_counts.values():
            for status_name in unique_statuses:
                store[status_name] = 0
        
        for _, row in df.iterrows():
            store_name = str(row[store_col]).strip() or 'Loja Desconhecida'
            status_raw = str(row[status_col]).strip()
            
            if store_name not in store_counts:
                store_counts[store_name] = {"Total_Registros": 0, "Delivered_Count": 0}
                for status_name in unique_statuses:
                    store_counts[store_name][status_name] = 0
            
            store_counts[store_name]["Total_Registros"] += 1
            
            if status_raw in unique_statuses:
                store_counts[store_name][status_raw] += 1
            
            if status_raw.lower() == "delivered":
                store_counts[store_name]["Delivered_Count"] += 1
        
        # Converter para lista
        dados = []
        for store, counts in store_counts.items():
            total_registros = counts["Total_Registros"]
            delivered = counts["Delivered_Count"]
            efetividade = (delivered / total_registros * 100) if total_registros > 0 else 0
            
            row = {
                "Loja": store,
                "Total": total_registros,
                **{status: counts[status] for status in unique_statuses},
                "Efetividade": f"{efetividade:.0f}%"
            }
            dados.append(row)
        
        # Ordenar por efetividade
        dados.sort(key=lambda x: float(x["Efetividade"].replace('%', '')), reverse=True)
        
        # Adicionar totais
        if dados:
            totals = {"Loja": "Total"}
            numeric_cols = ["Total"] + unique_statuses
            for col in numeric_cols:
                totals[col] = sum(row[col] for row in dados)
            
            total_delivered = totals.get("delivered", 0)
            total_registros = totals["Total"]
            efetividade_media = (total_delivered / total_registros * 100) if total_registros > 0 else 0
            totals["Efetividade"] = f"{efetividade_media:.0f}% (Média)"
            
            dados.append(totals)
        
        return {
            'dados': dados,
            'stats': self._calculate_ecomhub_stats(dados),
            'unmapped_statuses': []
        }
    
    def _criar_analise_primecod(self, data):
        """Cria análise combinada Prime COD"""
        leads_data = data['dados_leads']
        orders_data = data.get('dados_orders', {})
        
        # Criar tabela de efetividade
        efetividade_data = []
        
        for lead_row in leads_data:
            if lead_row["Product"] == "Total":
                continue
                
            product = lead_row["Product"]
            confirmed = lead_row["Confirmed"]
            total_minus_dup = lead_row["Total - duplicados"]
            
            order_info = orders_data.get(product, {})
            delivered = order_info.get("Delivered", 0)
            
            efetividade = (delivered / total_minus_dup * 100) if total_minus_dup > 0 else 0
            
            row = {
                "Product": product,
                "Confirmed (Leads)": confirmed,
                "Delivered": delivered,
                **{k: v for k, v in order_info.items() if k != "Delivered"},
                "Efetividade": f"{efetividade:.0f}%"
            }
            efetividade_data.append(row)
        
        # Adicionar totais para efetividade
        if efetividade_data:
            totals = {"Product": "Total"}
            numeric_cols = [k for k in efetividade_data[0].keys() if k not in ["Product", "Efetividade"]]
            
            for col in numeric_cols:
                totals[col] = sum(row[col] for row in efetividade_data)
            
            total_delivered = totals["Delivered"]
            total_leads = sum(row["Total - duplicados"] for row in leads_data if row["Product"] != "Total")
            efetividade_media = (total_delivered / total_leads * 100) if total_leads > 0 else 0
            totals["Efetividade"] = f"{efetividade_media:.0f}% (Média)"
            
            efetividade_data.append(totals)
        
        return {
            'dados_leads': leads_data,
            'dados_efetividade': efetividade_data
        }
    
    def _criar_analise_ecomhub(self, data):
        """Cria análise ECOMHUB"""
        return {
            'dados_leads': None,
            'dados_efetividade': data['dados_ecomhub']
        }
    
    # Métodos auxiliares
    def _find_column(self, df, possible_names):
        """Encontra coluna baseada em nomes possíveis"""
        for col in df.columns:
            for name in possible_names:
                if name.lower() in col.lower():
                    return col
        return None
    
    def _extract_products(self, products_text):
        """Extrai produtos do texto (mesma lógica do Streamlit)"""
        if pd.isna(products_text):
            return ['Produto Desconhecido']
        
        products_str = str(products_text)
        products = []
        
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
    
    def _get_leads_status_mapping(self):
        """Mapeamento de status de leads"""
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
    
    def _get_orders_status_mapping(self):
        """Mapeamento de status de orders"""
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
    
    def _calculate_leads_stats(self, dados):
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
    
    def _calculate_ecomhub_stats(self, dados):
        """Calcula estatísticas ECOMHUB"""
        if not dados or dados[-1]["Loja"] != "Total":
            return {}
        
        total_row = dados[-1]
        
        return {
            'total_registros': total_row.get("Total", 0),
            'delivered': total_row.get("delivered", 0),
            'efetividade_media': total_row.get("Efetividade", "0%")
        }


class StatusMappingViewSet(viewsets.ModelViewSet):
    queryset = StatusMapping.objects.all()
    serializer_class = StatusMappingSerializer
    permission_classes = [permissions.IsAuthenticated]