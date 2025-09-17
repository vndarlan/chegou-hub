# backend/features/metricas_n1italia/services.py
import pandas as pd
import numpy as np
import logging
from typing import Dict, List, Any
from collections import defaultdict
from datetime import datetime

logger = logging.getLogger(__name__)

class N1ItaliaProcessor:
    """Processador principal para métricas N1 Itália"""

    # Mapeamento de status N1 para categorias
    STATUS_MAPPING = {
        'entregues': ['Delivered'],
        'finalizados': ['Delivered', 'Return', 'Invalid', 'Out of stock', 'Deleted', 'Rejected', 'Duplicate'],
        'transito': ['To prepare', 'Waiting for carrier', 'Assigned to carrier', 'Shipped'],
        'problemas': ['Invalid', 'Out of stock', 'Rejected'],
        'devolucao': ['Return'],
        'cancelados': ['Deleted', 'Rejected', 'Duplicate']
    }

    def __init__(self):
        logger.info("Inicializando processador N1 Itália")

    def processar_excel(self, dados_excel: List[Dict]) -> Dict[str, Any]:
        """
        Processa dados Excel do N1 Itália

        Args:
            dados_excel: Lista de dicionários com dados do Excel

        Returns:
            Dict com dados processados no formato padrão
        """
        try:
            logger.info(f"Iniciando processamento de {len(dados_excel)} registros N1 Itália")

            # Converter para DataFrame para facilitar manipulação
            df = pd.DataFrame(dados_excel)

            # Detectar e processar kits
            df_processado = self.detectar_kits(df)

            # Agrupar dados por produto
            dados_agrupados = self.agrupar_por_produto(df_processado)

            # Calcular métricas
            metricas = self.calcular_metricas(dados_agrupados)

            # Gerar visualizações
            visualizacao_total = self.gerar_visualizacao_total(metricas)
            visualizacao_otimizada = self.gerar_visualizacao_otimizada(metricas)

            # Estatísticas gerais
            stats_total = self.gerar_estatisticas_totais(metricas)
            stats_otimizada = self.gerar_estatisticas_otimizadas(metricas)

            resultado = {
                'visualizacao_total': visualizacao_total,
                'visualizacao_otimizada': visualizacao_otimizada,
                'stats_total': stats_total,
                'stats_otimizada': stats_otimizada,
                'metadados': {
                    'total_registros': len(dados_excel),
                    'total_produtos': len(metricas),
                    'processado_em': datetime.now().isoformat(),
                    'kits_detectados': self._contar_kits(df_processado)
                }
            }

            # Converter tipos numpy para tipos Python para serialização JSON
            resultado = self._converter_tipos_python(resultado)

            logger.info("Processamento N1 Itália concluído com sucesso")
            return resultado

        except Exception as e:
            logger.error(f"Erro no processamento N1 Itália: {e}")
            raise

    def detectar_kits(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Detecta kits (pedidos com mesmo order_number) e os consolida

        Args:
            df: DataFrame com dados originais

        Returns:
            DataFrame com kits processados
        """
        try:
            logger.info("Detectando kits...")

            # Agrupar por order_number
            grouped = df.groupby('order_number')

            registros_processados = []

            for order_num, group in grouped:
                if len(group) > 1:
                    # É um kit - consolidar produtos
                    produtos = group['product_name'].tolist()
                    kit_name = f"Kit ({', '.join(produtos)})"

                    # Pegar dados do primeiro registro (assumindo que pedidos de kit têm mesmo status)
                    registro_kit = group.iloc[0].copy()
                    registro_kit['product_name'] = kit_name
                    registro_kit['is_kit'] = True
                    registro_kit['kit_produtos'] = produtos

                    registros_processados.append(registro_kit)
                else:
                    # Produto individual
                    registro = group.iloc[0].copy()
                    registro['is_kit'] = False
                    registro['kit_produtos'] = []

                    registros_processados.append(registro)

            df_processado = pd.DataFrame(registros_processados)
            logger.info(f"Kits detectados: {df_processado['is_kit'].sum()}")

            return df_processado

        except Exception as e:
            logger.error(f"Erro detectando kits: {e}")
            return df

    def agrupar_por_produto(self, df: pd.DataFrame) -> Dict[str, Dict[str, int]]:
        """
        Agrupa dados por produto e conta status

        Args:
            df: DataFrame processado

        Returns:
            Dict com produtos e contagem de status
        """
        try:
            logger.info("Agrupando dados por produto...")

            dados_agrupados = defaultdict(lambda: defaultdict(int))

            for _, row in df.iterrows():
                produto = row['product_name']
                status = row['status']

                dados_agrupados[produto][status] += 1

            logger.info(f"Produtos agrupados: {len(dados_agrupados)}")
            return dict(dados_agrupados)

        except Exception as e:
            logger.error(f"Erro agrupando dados: {e}")
            raise

    def calcular_metricas(self, dados_agrupados: Dict[str, Dict[str, int]]) -> Dict[str, Dict[str, Any]]:
        """
        Calcula métricas de efetividade para cada produto

        Args:
            dados_agrupados: Dados agrupados por produto

        Returns:
            Dict com métricas calculadas
        """
        try:
            logger.info("Calculando métricas...")

            metricas = {}

            for produto, status_counts in dados_agrupados.items():
                # Contar totais por categoria
                entregues = sum(status_counts.get(status, 0) for status in self.STATUS_MAPPING['entregues'])
                finalizados = sum(status_counts.get(status, 0) for status in self.STATUS_MAPPING['finalizados'])
                transito = sum(status_counts.get(status, 0) for status in self.STATUS_MAPPING['transito'])
                problemas = sum(status_counts.get(status, 0) for status in self.STATUS_MAPPING['problemas'])
                devolucao = sum(status_counts.get(status, 0) for status in self.STATUS_MAPPING['devolucao'])
                cancelados = sum(status_counts.get(status, 0) for status in self.STATUS_MAPPING['cancelados'])

                total = sum(status_counts.values())

                # Calcular percentuais
                efetividade_parcial = round((entregues / finalizados * 100) if finalizados > 0 else 0, 2)
                efetividade_total = round((entregues / total * 100) if total > 0 else 0, 2)
                pct_a_caminho = round((transito / total * 100) if total > 0 else 0, 2)
                pct_devolvidos = round((devolucao / total * 100) if total > 0 else 0, 2)

                metricas[produto] = {
                    'Total': total,
                    'Entregues': entregues,
                    'Finalizados': finalizados,
                    'Em Trânsito': transito,
                    'Problemas': problemas,
                    'Devolução': devolucao,
                    'Cancelados': cancelados,
                    'Efetividade Parcial (%)': efetividade_parcial,
                    'Efetividade Total (%)': efetividade_total,
                    '% A Caminho': pct_a_caminho,
                    '% Devolvidos': pct_devolvidos,
                    'status_detalhado': status_counts
                }

            logger.info(f"Métricas calculadas para {len(metricas)} produtos")
            return metricas

        except Exception as e:
            logger.error(f"Erro calculando métricas: {e}")
            raise

    def gerar_visualizacao_total(self, metricas: Dict[str, Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Gera visualização completa dos dados

        Args:
            metricas: Métricas calculadas

        Returns:
            Lista com visualização total
        """
        visualizacao = []

        for produto, dados in metricas.items():
            item = {
                'Produto': produto,
                'Total': dados['Total'],
                'Entregues': dados['Entregues'],
                'Finalizados': dados['Finalizados'],
                'Em Trânsito': dados['Em Trânsito'],
                'Problemas': dados['Problemas'],
                'Devolução': dados['Devolução'],
                'Cancelados': dados['Cancelados'],
                'Efetividade Parcial (%)': dados['Efetividade Parcial (%)'],
                'Efetividade Total (%)': dados['Efetividade Total (%)'],
                '% A Caminho': dados['% A Caminho'],
                '% Devolvidos': dados['% Devolvidos']
            }
            visualizacao.append(item)

        # Ordenar por total (maior primeiro)
        visualizacao.sort(key=lambda x: x['Total'], reverse=True)

        return visualizacao

    def gerar_visualizacao_otimizada(self, metricas: Dict[str, Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Gera visualização otimizada (apenas campos principais)

        Args:
            metricas: Métricas calculadas

        Returns:
            Lista com visualização otimizada
        """
        visualizacao = []

        for produto, dados in metricas.items():
            item = {
                'Produto': produto,
                'Total': dados['Total'],
                'Entregues': dados['Entregues'],
                'Efetividade Parcial (%)': dados['Efetividade Parcial (%)'],
                'Efetividade Total (%)': dados['Efetividade Total (%)']
            }
            visualizacao.append(item)

        # Ordenar por efetividade total (maior primeiro)
        visualizacao.sort(key=lambda x: x['Efetividade Total (%)'], reverse=True)

        return visualizacao

    def gerar_estatisticas_totais(self, metricas: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
        """
        Gera estatísticas totais consolidadas

        Args:
            metricas: Métricas calculadas

        Returns:
            Dict com estatísticas totais
        """
        total_pedidos = sum(dados['Total'] for dados in metricas.values())
        total_entregues = sum(dados['Entregues'] for dados in metricas.values())
        total_finalizados = sum(dados['Finalizados'] for dados in metricas.values())
        total_transito = sum(dados['Em Trânsito'] for dados in metricas.values())
        total_problemas = sum(dados['Problemas'] for dados in metricas.values())

        return {
            'total_produtos': len(metricas),
            'total_pedidos': total_pedidos,
            'total_entregues': total_entregues,
            'total_finalizados': total_finalizados,
            'total_transito': total_transito,
            'total_problemas': total_problemas,
            'efetividade_geral_parcial': round((total_entregues / total_finalizados * 100) if total_finalizados > 0 else 0, 2),
            'efetividade_geral_total': round((total_entregues / total_pedidos * 100) if total_pedidos > 0 else 0, 2),
            'pct_em_transito': round((total_transito / total_pedidos * 100) if total_pedidos > 0 else 0, 2),
            'pct_com_problemas': round((total_problemas / total_pedidos * 100) if total_pedidos > 0 else 0, 2)
        }

    def gerar_estatisticas_otimizadas(self, metricas: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
        """
        Gera estatísticas otimizadas (resumidas)

        Args:
            metricas: Métricas calculadas

        Returns:
            Dict com estatísticas otimizadas
        """
        stats_totais = self.gerar_estatisticas_totais(metricas)

        return {
            'total_produtos': stats_totais['total_produtos'],
            'total_pedidos': stats_totais['total_pedidos'],
            'efetividade_geral': stats_totais['efetividade_geral_total'],
            'pedidos_entregues': stats_totais['total_entregues'],
            'pedidos_em_transito': stats_totais['total_transito']
        }

    def _contar_kits(self, df: pd.DataFrame) -> int:
        """Conta quantos kits foram detectados"""
        kits_count = df['is_kit'].sum() if 'is_kit' in df.columns else 0
        # Converter para int nativo do Python
        return int(kits_count)

    def processar_arquivo_excel(self, arquivo) -> List[Dict]:
        """
        Processa arquivo Excel e extrai dados

        Args:
            arquivo: Arquivo Excel enviado

        Returns:
            Lista de dicionários com dados extraídos
        """
        try:
            logger.info(f"Processando arquivo Excel: {arquivo.name}")

            # Ler Excel
            df = pd.read_excel(arquivo)

            # Converter para lista de dicts
            dados = df.to_dict('records')

            # Limpar valores NaN
            dados_limpos = []
            for registro in dados:
                registro_limpo = {}
                for key, value in registro.items():
                    if pd.isna(value):
                        registro_limpo[key] = None
                    else:
                        registro_limpo[key] = value
                dados_limpos.append(registro_limpo)

            logger.info(f"Excel processado: {len(dados_limpos)} registros extraídos")
            return dados_limpos

        except Exception as e:
            logger.error(f"Erro processando Excel: {e}")
            raise

    def _converter_tipos_python(self, obj):
        """
        Converte recursivamente tipos numpy/pandas para tipos Python nativos
        para permitir serialização JSON
        """
        if isinstance(obj, dict):
            return {key: self._converter_tipos_python(value) for key, value in obj.items()}
        elif isinstance(obj, list):
            return [self._converter_tipos_python(item) for item in obj]
        elif isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            return float(obj)
        elif isinstance(obj, np.bool_):
            return bool(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        elif pd.isna(obj):
            return None
        else:
            return obj


# Instância singleton do processador
n1_italia_processor = N1ItaliaProcessor()