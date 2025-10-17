# backend/features/ia/nicochat_service.py
"""
Service para integração com NicoChat API
Responsável por gerenciar chamadas à API externa do NicoChat
"""

import requests
import logging
from typing import Dict, List, Tuple, Optional
from cryptography.fernet import Fernet
from django.conf import settings
import json

logger = logging.getLogger(__name__)

# ===== FUNÇÕES DE CRIPTOGRAFIA =====

def get_encryption_key() -> bytes:
    """
    Obtém a chave de criptografia das settings do Django
    Se não existir, gera uma nova (apenas em desenvolvimento)
    """
    encryption_key = getattr(settings, 'NICOCHAT_ENCRYPTION_KEY', None)

    if not encryption_key:
        # ATENÇÃO: Isso só deve acontecer em desenvolvimento
        logger.warning("NICOCHAT_ENCRYPTION_KEY não encontrada. Gerando nova chave temporária.")
        encryption_key = Fernet.generate_key()
        settings.NICOCHAT_ENCRYPTION_KEY = encryption_key

    # Se for string, converter para bytes
    if isinstance(encryption_key, str):
        encryption_key = encryption_key.encode('utf-8')

    return encryption_key


def encrypt_api_key(api_key: str) -> str:
    """
    Criptografa a API key do NicoChat para armazenamento seguro

    Args:
        api_key: API key em texto plano

    Returns:
        API key criptografada como string
    """
    try:
        key = get_encryption_key()
        fernet = Fernet(key)
        encrypted = fernet.encrypt(api_key.encode('utf-8'))
        return encrypted.decode('utf-8')
    except Exception as e:
        logger.error(f"Erro ao criptografar API key: {e}")
        raise ValueError(f"Erro ao criptografar API key: {str(e)}")


def decrypt_api_key(encrypted_key: str) -> str:
    """
    Descriptografa a API key do NicoChat

    Args:
        encrypted_key: API key criptografada

    Returns:
        API key em texto plano
    """
    try:
        key = get_encryption_key()
        fernet = Fernet(key)
        decrypted = fernet.decrypt(encrypted_key.encode('utf-8'))
        return decrypted.decode('utf-8')
    except Exception as e:
        logger.error(f"Erro ao descriptografar API key: {e}")
        raise ValueError(f"Erro ao descriptografar API key: {str(e)}")


# ===== CLASSE PRINCIPAL DO SERVICE =====

class NicochatAPIService:
    """
    Service para integração com NicoChat API
    Fornece métodos para buscar dados dos fluxos
    """

    BASE_URL = "https://app.nicochat.com.br/api"

    def __init__(self, api_key: Optional[str] = None):
        """
        Inicializa o service

        Args:
            api_key: API key em texto plano (opcional, pode ser passada nos métodos)
        """
        self.api_key = api_key

    def _make_request(
        self,
        endpoint: str,
        api_key: Optional[str] = None,
        method: str = 'GET',
        params: Optional[Dict] = None,
        data: Optional[Dict] = None
    ) -> Tuple[bool, Dict]:
        """
        Faz requisição à API do NicoChat

        Args:
            endpoint: Endpoint da API (ex: '/flows/subflows')
            api_key: API key (usa a do construtor se não fornecida)
            method: Método HTTP ('GET', 'POST', etc)
            params: Query parameters
            data: Body data (para POST)

        Returns:
            Tupla (sucesso: bool, resposta: dict)
        """
        try:
            # Usar API key fornecida ou a do construtor
            key_to_use = api_key or self.api_key

            if not key_to_use:
                return False, {
                    'error': 'API key não fornecida',
                    'message': 'É necessário fornecer uma API key válida'
                }

            # Construir URL completa
            url = f"{self.BASE_URL}{endpoint}"

            # Headers
            headers = {
                'Authorization': f'Bearer {key_to_use}',
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }

            # Fazer requisição
            logger.info(f"NicoChat API Request: {method} {url}")

            response = requests.request(
                method=method,
                url=url,
                headers=headers,
                params=params,
                json=data,
                timeout=30
            )

            # Verificar status
            if response.status_code == 200:
                response_data = response.json()
                logger.info(f"NicoChat API Success: {endpoint}")
                return True, response_data

            elif response.status_code == 401:
                logger.error(f"NicoChat API Unauthorized: {endpoint}")
                return False, {
                    'error': 'API key inválida',
                    'message': 'A API key fornecida não é válida ou expirou',
                    'status_code': 401
                }

            elif response.status_code == 404:
                logger.error(f"NicoChat API Not Found: {endpoint}")
                return False, {
                    'error': 'Endpoint não encontrado',
                    'message': f'O endpoint {endpoint} não foi encontrado',
                    'status_code': 404
                }

            else:
                logger.error(f"NicoChat API Error: {response.status_code} - {response.text}")
                return False, {
                    'error': f'Erro HTTP {response.status_code}',
                    'message': response.text,
                    'status_code': response.status_code
                }

        except requests.exceptions.Timeout:
            logger.error(f"NicoChat API Timeout: {endpoint}")
            return False, {
                'error': 'Timeout',
                'message': 'A requisição demorou muito tempo e foi cancelada'
            }

        except requests.exceptions.ConnectionError:
            logger.error(f"NicoChat API Connection Error: {endpoint}")
            return False, {
                'error': 'Erro de conexão',
                'message': 'Não foi possível conectar à API do NicoChat'
            }

        except Exception as e:
            logger.error(f"NicoChat API Unexpected Error: {e}")
            return False, {
                'error': 'Erro inesperado',
                'message': str(e)
            }

    # ===== MÉTODOS PRINCIPAIS =====

    def get_flow_subflows(self, flow_id: str, api_key: Optional[str] = None) -> Tuple[bool, List[Dict]]:
        """
        Busca todos os subfluxos de um fluxo específico

        Args:
            flow_id: ID do fluxo principal (não usado - endpoint retorna todos)
            api_key: API key (opcional)

        Returns:
            Tupla (sucesso: bool, subfluxos: list)
        """
        endpoint = "/flow/subflows"
        sucesso, resposta = self._make_request(endpoint, api_key)

        if sucesso:
            subfluxos = resposta.get('data', [])
            logger.info(f"Obtidos {len(subfluxos)} subfluxos")
            return True, subfluxos

        return False, []

    def get_flow_user_fields(self, flow_id: str, api_key: Optional[str] = None) -> Tuple[bool, List[Dict]]:
        """
        Busca todos os campos customizados de usuário de um fluxo

        Args:
            flow_id: ID do fluxo (não usado - endpoint retorna todos)
            api_key: API key (opcional)

        Returns:
            Tupla (sucesso: bool, campos: list)
        """
        endpoint = "/flow/user-fields"
        sucesso, resposta = self._make_request(endpoint, api_key)

        if sucesso:
            campos = resposta.get('data', [])
            logger.info(f"Obtidos {len(campos)} campos customizados")
            return True, campos

        return False, []

    def get_flow_bot_users_count(self, flow_id: str, api_key: Optional[str] = None) -> Tuple[bool, Dict]:
        """
        Busca a quantidade de usuários (contatos) em um fluxo

        Args:
            flow_id: ID do fluxo (não usado - endpoint retorna estatísticas gerais)
            api_key: API key (opcional)

        Returns:
            Tupla (sucesso: bool, stats: dict com 'done' e 'open')
        """
        endpoint = "/flow/bot-users-count"
        sucesso, resposta = self._make_request(endpoint, api_key)

        if sucesso:
            # Resposta formato: {"status": "ok", "data": [{"num": 317, "status": "done"}, {"num": 196, "status": "open"}]}
            stats_list = resposta.get('data', [])
            stats = {'done': 0, 'open': 0, 'total': 0}

            for item in stats_list:
                status_key = item.get('status', '')
                num = item.get('num', 0)
                if status_key in ['done', 'open']:
                    stats[status_key] = num
                    stats['total'] += num

            logger.info(f"Usuários do bot: {stats['done']} concluídos, {stats['open']} abertos")
            return True, stats

        return False, {'done': 0, 'open': 0, 'total': 0}

    def get_flow_tags(self, flow_id: str, api_key: Optional[str] = None) -> Tuple[bool, List[Dict]]:
        """
        Busca todas as tags configuradas no flow

        Args:
            flow_id: ID do fluxo (não usado - endpoint retorna todas as tags)
            api_key: API key (opcional)

        Returns:
            Tupla (sucesso: bool, tags: list)
        """
        endpoint = "/flow/tags"
        sucesso, resposta = self._make_request(endpoint, api_key)

        if sucesso:
            tags = resposta.get('data', [])
            logger.info(f"Obtidas {len(tags)} tags")
            return True, tags

        return False, []

    def testar_conexao(self, api_key: str) -> Tuple[bool, str]:
        """
        Testa se a API key é válida fazendo uma requisição simples

        Args:
            api_key: API key a ser testada

        Returns:
            Tupla (sucesso: bool, mensagem: str)
        """
        # Tentar buscar informações da equipe (team-info é um endpoint público)
        endpoint = "/team-info"
        sucesso, resposta = self._make_request(endpoint, api_key)

        if sucesso:
            team_name = resposta.get('data', {}).get('name', 'Conta NicoChat')
            return True, f"Conexão bem-sucedida! Equipe: {team_name}"

        error_message = resposta.get('message', resposta.get('error', 'Erro desconhecido'))
        return False, f"Falha na conexão: {error_message}"

    def get_flows_list(self, api_key: Optional[str] = None) -> Tuple[bool, List[Dict]]:
        """
        Lista todos os fluxos disponíveis

        Args:
            api_key: API key (opcional)

        Returns:
            Tupla (sucesso: bool, fluxos: list)
        """
        endpoint = "/flows"
        sucesso, resposta = self._make_request(endpoint, api_key)

        if sucesso:
            fluxos = resposta.get('data', [])
            logger.info(f"Obtidos {len(fluxos)} fluxos")
            return True, fluxos

        return False, []

    def get_flow_details(self, flow_id: str, api_key: Optional[str] = None) -> Tuple[bool, Dict]:
        """
        Busca detalhes completos de um fluxo específico

        Args:
            flow_id: ID do fluxo
            api_key: API key (opcional)

        Returns:
            Tupla (sucesso: bool, detalhes: dict)
        """
        endpoint = f"/flows/{flow_id}"
        sucesso, resposta = self._make_request(endpoint, api_key)

        if sucesso:
            detalhes = resposta.get('data', {})
            logger.info(f"Obtidos detalhes do flow {flow_id}")
            return True, detalhes

        return False, {}

    def get_bot_users_count(self, api_key: str) -> Tuple[bool, Dict]:
        """
        Obtém contagem de usuários do bot (conversas abertas e concluídas)
        Endpoint: GET /flow/bot-users-count

        Args:
            api_key: API key (obrigatória)

        Returns:
            Tupla (sucesso: bool, dados: dict)
            Dados esperados: {"data": [{"num": 318, "status": "done"}, {"num": 196, "status": "open"}]}
        """
        endpoint = "/flow/bot-users-count"
        sucesso, resposta = self._make_request(endpoint, api_key, method='GET')

        if sucesso:
            dados = resposta.get('data', [])
            logger.info(f"Obtida contagem de usuários do bot: {len(dados)} registros")

            # Log detalhado da estrutura
            if dados:
                logger.info(f"Estrutura dos dados: {dados}")

            return True, resposta

        logger.error(f"Erro ao obter contagem de usuários do bot: {resposta}")
        return False, resposta

    def get_whatsapp_templates(self, api_key: str) -> Tuple[bool, Dict]:
        """
        Lista templates WhatsApp
        Endpoint: POST /whatsapp-template/list

        Args:
            api_key: API key (obrigatória)

        Returns:
            Tupla (sucesso: bool, dados: dict)
        """
        endpoint = "/whatsapp-template/list"
        sucesso, resposta = self._make_request(endpoint, api_key, method='POST')

        if sucesso:
            templates = resposta.get('data', [])
            logger.info(f"Obtidos {len(templates)} templates WhatsApp")
            return True, resposta

        logger.error(f"Erro ao obter templates WhatsApp: {resposta}")
        return False, resposta

    def sync_whatsapp_templates(self, api_key: str) -> Tuple[bool, Dict]:
        """
        Sincroniza templates WhatsApp com a API Meta
        Endpoint: POST /whatsapp-template/sync

        Args:
            api_key: API key (obrigatória)

        Returns:
            Tupla (sucesso: bool, dados: dict)
        """
        endpoint = "/whatsapp-template/sync"
        sucesso, resposta = self._make_request(endpoint, api_key, method='POST')

        if sucesso:
            logger.info(f"Templates WhatsApp sincronizados com sucesso")
            logger.info(f"Resposta: {resposta}")
            return True, resposta

        logger.error(f"Erro ao sincronizar templates WhatsApp: {resposta}")
        return False, resposta

    def get_all_subscribers_tags(self, api_key: str) -> Tuple[bool, Dict]:
        """
        Busca TODOS os subscribers paginados e extrai estatísticas de tags
        Endpoint: GET /subscribers (com paginação completa)

        Args:
            api_key: API key (obrigatória)

        Returns:
            Tupla (sucesso: bool, dados: dict)
            Formato: {
                "tags": [{"name": "tag1", "tag_ns": "id1", "count": 10, "percentage": 15.5}],
                "total_subscribers": 531,
                "total_tags_found": 62,
                "pages_processed": 54,
                "processing_time_seconds": 12.5
            }
        """
        import time
        from collections import defaultdict

        start_time = time.time()
        logger.info("=" * 80)
        logger.info("🔍 INICIANDO BUSCA DE TODAS AS TAGS DOS SUBSCRIBERS")

        # Dicionário para contar tags: {(name, tag_ns): count}
        tags_counter = defaultdict(int)
        total_subscribers = 0
        current_page = 1
        pages_processed = 0
        errors = []

        try:
            while True:
                # Buscar página atual
                endpoint = "/subscribers"
                params = {
                    'page': current_page,
                    'per_page': 100  # Máximo por página para otimizar
                }

                logger.info(f"📄 Buscando página {current_page}...")
                sucesso, resposta = self._make_request(
                    endpoint,
                    api_key,
                    method='GET',
                    params=params
                )

                if not sucesso:
                    error_msg = f"Erro na página {current_page}: {resposta.get('error', 'Desconhecido')}"
                    logger.error(f"❌ {error_msg}")
                    errors.append(error_msg)

                    # Se falhou logo na primeira página, retornar erro
                    if current_page == 1:
                        return False, {
                            'error': 'Falha ao buscar subscribers',
                            'detalhes': resposta
                        }

                    # Se falhou em páginas posteriores, continuar com o que já temos
                    break

                # Extrair dados da página
                data = resposta.get('data', {})
                subscribers = data.get('data', [])
                pagination = data.get('pagination', {})

                last_page = pagination.get('last_page', 1)
                total_subscribers = pagination.get('total', 0)

                logger.info(f"   ✅ Página {current_page}/{last_page} - {len(subscribers)} subscribers")

                # Processar tags desta página
                for subscriber in subscribers:
                    tags = subscriber.get('tags', [])
                    for tag in tags:
                        tag_name = tag.get('name', '')
                        tag_ns = tag.get('tag_ns', '')

                        if tag_name:  # Só contar tags com nome
                            tags_counter[(tag_name, tag_ns)] += 1

                pages_processed += 1

                # Verificar se chegou na última página
                if current_page >= last_page:
                    logger.info(f"✅ Processamento completo! {pages_processed} páginas processadas")
                    break

                current_page += 1

            # Calcular estatísticas finais
            processing_time = time.time() - start_time

            # Converter para lista ordenada por count (decrescente)
            tags_list = []
            for (tag_name, tag_ns), count in tags_counter.items():
                percentage = (count / total_subscribers * 100) if total_subscribers > 0 else 0
                tags_list.append({
                    'name': tag_name,
                    'tag_ns': tag_ns,
                    'count': count,
                    'percentage': round(percentage, 2)
                })

            # Ordenar por count (maior primeiro)
            tags_list.sort(key=lambda x: x['count'], reverse=True)

            result = {
                'tags': tags_list,
                'total_subscribers': total_subscribers,
                'total_tags_found': len(tags_list),
                'pages_processed': pages_processed,
                'processing_time_seconds': round(processing_time, 2)
            }

            if errors:
                result['errors'] = errors

            logger.info(f"📊 ESTATÍSTICAS FINAIS:")
            logger.info(f"   Total de subscribers: {total_subscribers}")
            logger.info(f"   Total de tags diferentes: {len(tags_list)}")
            logger.info(f"   Páginas processadas: {pages_processed}")
            logger.info(f"   Tempo de processamento: {processing_time:.2f}s")
            logger.info(f"   Top 5 tags:")
            for tag in tags_list[:5]:
                logger.info(f"      - {tag['name']}: {tag['count']} ({tag['percentage']}%)")
            logger.info("=" * 80)

            return True, result

        except Exception as e:
            processing_time = time.time() - start_time
            logger.error(f"❌ ERRO INESPERADO ao processar tags: {e}")
            logger.error(f"   Tempo decorrido: {processing_time:.2f}s")
            logger.error("=" * 80)

            return False, {
                'error': 'Erro inesperado ao processar tags',
                'message': str(e),
                'pages_processed': pages_processed,
                'processing_time_seconds': round(processing_time, 2)
            }
