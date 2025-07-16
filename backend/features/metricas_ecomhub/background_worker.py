# backend/features/metricas_ecomhub/background_worker.py
import pandas as pd
import time
import logging
from collections import defaultdict
from django.utils import timezone
from .models import ProcessamentoJob, ProcessamentoChunk, LojaShopify
from .shopify_client import ShopifyClient
import os
import tempfile

logger = logging.getLogger(__name__)

class EcomhubBackgroundProcessor:
    """Processador background para análises ECOMHUB"""
    
    def __init__(self, job_id):
        self.job = ProcessamentoJob.objects.get(job_id=job_id)
        self.chunk_size = 25  # Reduzido para melhor controle
        self.pause_between_chunks = 2  # segundos
        
    def processar(self):
        """Método principal de processamento"""
        try:
            self.job.marcar_inicio()
            
            # Carregar e validar CSV
            self._carregar_csv()
            
            # Processar baseado no tipo
            if self.job.tipo_metrica == 'produto':
                resultado = self._processar_por_produto()
            else:
                resultado = self._processar_por_loja()
            
            # Finalizar com sucesso
            self.job.marcar_conclusao(
                dados_resultado=resultado['dados'],
                estatisticas=resultado['stats']
            )
            
        except Exception as e:
            logger.error(f"Erro no processamento do job {self.job.job_id}: {e}")
            self.job.marcar_erro(e)
            raise
        
        finally:
            # Limpeza
            self._limpar_arquivo_temp()
    
    def _carregar_csv(self):
        """Carrega e valida o arquivo CSV"""
        self.job.update_progress(0, 100, "Carregando arquivo CSV...")
        
        try:
            # Ler CSV com múltiplas encodings
            for encoding in ['utf-8', 'latin1', 'iso-8859-1']:
                try:
                    self.df = pd.read_csv(self.job.arquivo_path, encoding=encoding)
                    break
                except UnicodeDecodeError:
                    continue
            else:
                raise ValueError("Não foi possível decodificar o arquivo CSV")
            
            # Validar colunas obrigatórias
            required_columns = ['status']
            missing = [col for col in required_columns if not any(col.lower() in c.lower() for c in self.df.columns)]
            if missing:
                raise ValueError(f"Colunas obrigatórias não encontradas: {missing}")
            
            # Para modo produto, verificar shopifyOrderNumber
            if self.job.tipo_metrica == 'produto':
                shopify_cols = [col for col in self.df.columns if 'shopify' in col.lower() and 'order' in col.lower() and 'number' in col.lower()]
                if not shopify_cols:
                    raise ValueError("Para processamento por produto, o arquivo deve conter a coluna 'shopifyOrderNumber'")
                self.shopify_order_col = shopify_cols[0]
            
            # Encontrar coluna de status
            self.status_col = self._find_column(['status'])
            if not self.status_col:
                raise ValueError("Coluna 'status' não encontrada")
            
            self.job.update_progress(20, 100, f"CSV carregado: {len(self.df)} registros")
            
        except Exception as e:
            raise ValueError(f"Erro ao carregar CSV: {str(e)}")
    
    def _processar_por_produto(self):
        """Processamento por produto com Shopify"""
        if not self.job.loja_shopify:
            raise ValueError("Loja Shopify é obrigatória para processamento por produto")
        
        self.job.update_progress(30, 100, "Iniciando processamento por produto...")
        
        # Obter números únicos de pedidos
        order_numbers = self.df[self.shopify_order_col].dropna().unique()
        order_numbers = [str(num).strip() for num in order_numbers if str(num).strip() and str(num) != 'nan']
        
        self.job.update_progress(40, 100, f"Encontrados {len(order_numbers)} pedidos únicos")
        
        # Criar chunks de processamento
        chunks = self._criar_chunks(order_numbers)
        self.job.update_progress(50, 100, f"Criados {len(chunks)} chunks para processamento")
        
        # Processar chunks
        products_map = self._processar_chunks_shopify(chunks)
        
        # Calcular efetividade por produto
        resultado = self._calcular_efetividade_produto(products_map)
        
        return resultado
    
    def _processar_por_loja(self):
        """Processamento tradicional por loja"""
        self.job.update_progress(30, 100, "Processando por loja...")
        
        store_col = self._find_column(['store_name', 'store', 'storeName'])
        if not store_col:
            raise ValueError("Coluna de loja não encontrada")
        
        unique_statuses = self.df[self.status_col].dropna().unique()
        unique_statuses = sorted([str(status).strip() for status in unique_statuses])
        
        store_counts = defaultdict(lambda: {"Total_Registros": 0, "Delivered_Count": 0})
        
        total_rows = len(self.df)
        for idx, row in self.df.iterrows():
            if idx % 100 == 0:  # Atualizar progresso a cada 100 linhas
                progress = 30 + (idx / total_rows) * 60
                self.job.update_progress(int(progress), 100, f"Processando linha {idx+1}/{total_rows}")
            
            store_name = str(row.get(store_col, 'Loja Desconhecida')).strip()
            if not store_name or store_name == 'nan':
                store_name = 'Loja Desconhecida'
            
            status = str(row.get(self.status_col, '')).strip()
            
            if store_name not in store_counts:
                store_counts[store_name] = {"Total_Registros": 0, "Delivered_Count": 0}
                for unique_status in unique_statuses:
                    store_counts[store_name][unique_status] = 0
            
            store_counts[store_name]["Total_Registros"] += 1
            
            if status in unique_statuses:
                store_counts[store_name][status] += 1
            
            if status.lower() == "delivered":
                store_counts[store_name]["Delivered_Count"] += 1
        
        # Converter para formato final
        rows = self._formatar_resultado_loja(store_counts, unique_statuses)
        
        self.job.update_progress(95, 100, "Finalizando processamento por loja...")
        
        return {
            'dados': rows,
            'stats': self._calculate_stats(rows, 'Loja')
        }
    
    def _criar_chunks(self, order_numbers):
        """Cria chunks de processamento"""
        chunks = []
        for i in range(0, len(order_numbers), self.chunk_size):
            chunk_orders = order_numbers[i:i + self.chunk_size]
            
            chunk = ProcessamentoChunk.objects.create(
                job=self.job,
                chunk_index=i // self.chunk_size,
                pedidos=chunk_orders
            )
            chunks.append(chunk)
        
        return chunks
    
    def _processar_chunks_shopify(self, chunks):
        """Processa chunks usando Shopify API"""
        try:
            shopify_client = ShopifyClient(self.job.loja_shopify)
        except Exception as e:
            raise ValueError(f"Erro ao conectar com Shopify: {str(e)}")
        
        products_map = {}
        total_chunks = len(chunks)
        
        for idx, chunk in enumerate(chunks):
            if self.job.status == 'cancelled':
                break
            
            try:
                chunk.status = 'processing'
                chunk.inicio_chunk = timezone.now()
                chunk.save()
                
                progress = 60 + (idx / total_chunks) * 30
                self.job.update_progress(
                    int(progress), 100, 
                    f"Processando chunk {idx+1}/{total_chunks} ({len(chunk.pedidos)} pedidos)"
                )
                
                # Processar chunk
                chunk_results = shopify_client.get_orders_batch(chunk.pedidos)
                
                # Atualizar estatísticas do chunk
                chunk.produtos_encontrados = chunk_results
                chunk.cache_hits_chunk = len([r for r in chunk_results.values() if r.get('from_cache')])
                chunk.api_calls_chunk = len(chunk_results) - chunk.cache_hits_chunk
                chunk.status = 'completed'
                chunk.fim_chunk = timezone.now()
                chunk.save()
                
                # Adicionar ao mapa geral
                products_map.update(chunk_results)
                
                # Atualizar estatísticas do job
                self.job.cache_hits += chunk.cache_hits_chunk
                self.job.api_calls += chunk.api_calls_chunk
                self.job.save()
                
                # Pausa entre chunks para rate limiting
                if idx < total_chunks - 1:
                    self.job.add_log(f"Chunk {idx+1} concluído. Pausando {self.pause_between_chunks}s...")
                    time.sleep(self.pause_between_chunks)
                
            except Exception as e:
                chunk.status = 'failed'
                chunk.erro_chunk = str(e)
                chunk.fim_chunk = timezone.now()
                chunk.save()
                
                logger.error(f"Erro no chunk {idx}: {e}")
                # Continua com próximo chunk em caso de erro
                continue
        
        return products_map
    
    def _calcular_efetividade_produto(self, products_map):
        """Calcula efetividade por produto"""
        self.job.update_progress(90, 100, "Calculando efetividade por produto...")
        
        unique_statuses = self.df[self.status_col].dropna().unique()
        unique_statuses = sorted([str(status).strip() for status in unique_statuses])
        
        product_counts = defaultdict(lambda: {"Total_Registros": 0, "Delivered_Count": 0})
        produtos_nao_encontrados = set()
        
        for idx, row in self.df.iterrows():
            order_number = str(row.get(self.shopify_order_col, '')).strip()
            status = str(row.get(self.status_col, '')).strip()
            
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
        
        # Salvar produtos não encontrados no job
        self.job.produtos_nao_encontrados = list(produtos_nao_encontrados)
        self.job.save()
        
        # Converter para formato final
        rows = self._formatar_resultado_produto(product_counts, unique_statuses)
        
        # Estatísticas
        stats = self._calculate_stats(rows, 'Produto')
        stats['produtos_nao_encontrados'] = len(produtos_nao_encontrados)
        stats['cache_hits'] = self.job.cache_hits
        stats['api_calls'] = self.job.api_calls
        
        return {
            'dados': rows,
            'stats': stats
        }
    
    def _formatar_resultado_produto(self, product_counts, unique_statuses):
        """Formata resultado para produto"""
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
            
            for status in unique_statuses:
                row[status] = counts[status]
            
            row["Efetividade"] = f"{efetividade:.0f}%"
            rows.append(row)
        
        if rows:
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
        
        return rows
    
    def _formatar_resultado_loja(self, store_counts, unique_statuses):
        """Formata resultado para loja"""
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
        
        return rows
    
    def _find_column(self, possible_names):
        """Encontra coluna baseada em nomes possíveis"""
        for col in self.df.columns:
            for name in possible_names:
                if name.lower() in col.lower():
                    return col
        return None
    
    def _calculate_stats(self, dados, grupo_col):
        """Calcula estatísticas gerais"""
        if not dados or dados[-1][grupo_col] != "Total":
            return {}
        
        total_row = dados[-1]
        
        return {
            'total_registros': total_row.get("Total", 0),
            'delivered': total_row.get("delivered", 0),
            'efetividade_media': total_row.get("Efetividade", "0%"),
            'total_grupos': len(dados) - 1
        }
    
    def _limpar_arquivo_temp(self):
        """Remove arquivo temporário"""
        try:
            if os.path.exists(self.job.arquivo_path):
                os.remove(self.job.arquivo_path)
        except Exception as e:
            logger.warning(f"Erro ao limpar arquivo temporário: {e}")

# Função para Django-RQ
def processar_ecomhub_job(job_id):
    """Função para ser executada pelo Django-RQ"""
    processor = EcomhubBackgroundProcessor(job_id)
    processor.processar()