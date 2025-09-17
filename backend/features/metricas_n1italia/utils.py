# backend/features/metricas_n1italia/utils.py
import logging
from typing import List, Dict, Any
from datetime import datetime

logger = logging.getLogger(__name__)


class N1ItaliaUtils:
    """Utilitários para processamento de dados N1 Itália"""

    @staticmethod
    def validar_dados_excel(dados: List[Dict]) -> Dict[str, Any]:
        """
        Valida estrutura e integridade dos dados Excel

        Args:
            dados: Lista de registros do Excel

        Returns:
            Dict com resultado da validação
        """
        try:
            if not dados:
                return {
                    'valido': False,
                    'erro': 'Dados vazios',
                    'detalhes': 'Nenhum registro encontrado'
                }

            # Verificar campos obrigatórios
            campos_obrigatorios = ['order_number', 'status']
            primeiro_registro = dados[0]

            campos_faltando = [campo for campo in campos_obrigatorios if campo not in primeiro_registro]

            if campos_faltando:
                return {
                    'valido': False,
                    'erro': 'Campos obrigatórios faltando',
                    'detalhes': f'Campos necessários: {", ".join(campos_faltando)}',
                    'campos_encontrados': list(primeiro_registro.keys())
                }

            # Verificar consistência dos campos em todos os registros
            campos_referencia = set(primeiro_registro.keys())
            registros_inconsistentes = []

            for i, registro in enumerate(dados[1:], 1):  # Começar do segundo registro
                campos_registro = set(registro.keys())
                if campos_registro != campos_referencia:
                    registros_inconsistentes.append(i)

                # Parar se encontrar muitos registros inconsistentes
                if len(registros_inconsistentes) > 10:
                    break

            if registros_inconsistentes:
                return {
                    'valido': False,
                    'erro': 'Registros com estrutura inconsistente',
                    'detalhes': f'Registros com problemas (primeiros 10): {registros_inconsistentes[:10]}',
                    'total_problematicos': len(registros_inconsistentes)
                }

            # Verificar valores vazios em campos críticos
            registros_com_valores_vazios = []
            for i, registro in enumerate(dados):
                for campo in campos_obrigatorios:
                    valor = registro.get(campo)
                    if valor is None or str(valor).strip() == '':
                        registros_com_valores_vazios.append({
                            'registro': i + 1,
                            'campo': campo,
                            'valor': valor
                        })

                # Limitar verificação para não sobrecarregar
                if len(registros_com_valores_vazios) > 20:
                    break

            return {
                'valido': True,
                'total_registros': len(dados),
                'campos_detectados': list(campos_referencia),
                'registros_com_valores_vazios': registros_com_valores_vazios[:10],  # Mostrar apenas os primeiros 10
                'estatisticas': {
                    'total_order_numbers': len(set(r.get('order_number') for r in dados if r.get('order_number'))),
                    'status_unicos': list(set(r.get('status') for r in dados if r.get('status'))),
                }
            }

        except Exception as e:
            logger.error(f"Erro validando dados: {e}")
            return {
                'valido': False,
                'erro': 'Erro na validação',
                'detalhes': str(e)
            }

    @staticmethod
    def limpar_dados(dados: List[Dict]) -> List[Dict]:
        """
        Limpa e padroniza dados antes do processamento

        Args:
            dados: Dados originais

        Returns:
            Dados limpos
        """
        try:
            dados_limpos = []

            for registro in dados:
                registro_limpo = {}

                for key, value in registro.items():
                    # Limpar chaves (nomes de colunas)
                    key_limpo = str(key).strip()

                    # Limpar valores
                    if value is None or str(value).strip().lower() in ['nan', 'null', 'none', '']:
                        valor_limpo = None
                    else:
                        valor_limpo = str(value).strip()

                    registro_limpo[key_limpo] = valor_limpo

                dados_limpos.append(registro_limpo)

            logger.info(f"Dados limpos: {len(dados_limpos)} registros processados")
            return dados_limpos

        except Exception as e:
            logger.error(f"Erro limpando dados: {e}")
            return dados

    @staticmethod
    def detectar_duplicatas(dados: List[Dict]) -> Dict[str, Any]:
        """
        Detecta registros duplicados baseado no order_number

        Args:
            dados: Lista de registros

        Returns:
            Informações sobre duplicatas encontradas
        """
        try:
            order_numbers = []
            duplicatas = []

            for i, registro in enumerate(dados):
                order_num = registro.get('order_number')
                if order_num:
                    if order_num in order_numbers:
                        duplicatas.append({
                            'order_number': order_num,
                            'posicao': i + 1,
                            'registro': registro
                        })
                    else:
                        order_numbers.append(order_num)

            return {
                'total_registros': len(dados),
                'order_numbers_unicos': len(set(order_numbers)),
                'duplicatas_encontradas': len(duplicatas),
                'detalhes_duplicatas': duplicatas[:10]  # Mostrar apenas os primeiros 10
            }

        except Exception as e:
            logger.error(f"Erro detectando duplicatas: {e}")
            return {'erro': str(e)}

    @staticmethod
    def gerar_preview_dados(dados: List[Dict], quantidade: int = 5) -> Dict[str, Any]:
        """
        Gera preview dos dados para visualização

        Args:
            dados: Dados completos
            quantidade: Quantidade de registros para preview

        Returns:
            Preview formatado dos dados
        """
        try:
            if not dados:
                return {'preview': [], 'total': 0, 'campos': []}

            preview = dados[:quantidade]
            campos = list(dados[0].keys()) if dados else []

            return {
                'preview': preview,
                'total': len(dados),
                'campos': campos,
                'mostrando': min(quantidade, len(dados)),
                'timestamp': datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"Erro gerando preview: {e}")
            return {'erro': str(e)}

    @staticmethod
    def calcular_estatisticas_basicas(dados: List[Dict]) -> Dict[str, Any]:
        """
        Calcula estatísticas básicas dos dados antes do processamento completo

        Args:
            dados: Lista de registros

        Returns:
            Estatísticas básicas
        """
        try:
            if not dados:
                return {}

            # Contagem de status
            status_count = {}
            order_numbers = set()
            produtos = set()

            for registro in dados:
                status = registro.get('status')
                if status:
                    status_count[status] = status_count.get(status, 0) + 1

                order_num = registro.get('order_number')
                if order_num:
                    order_numbers.add(order_num)

                produto = registro.get('product_name')
                if produto:
                    produtos.add(produto)

            return {
                'total_registros': len(dados),
                'pedidos_unicos': len(order_numbers),
                'produtos_unicos': len(produtos),
                'status_distribuicao': status_count,
                'possivel_kits': len(dados) - len(order_numbers) if len(dados) > len(order_numbers) else 0
            }

        except Exception as e:
            logger.error(f"Erro calculando estatísticas básicas: {e}")
            return {'erro': str(e)}


# Instância utilitária
n1_italia_utils = N1ItaliaUtils()