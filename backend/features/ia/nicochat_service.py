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
            flow_id: ID do fluxo principal
            api_key: API key (opcional)

        Returns:
            Tupla (sucesso: bool, subfluxos: list)
        """
        # NOTA: O endpoint /flows/{id}/subflows não existe na API do NicoChat
        # Retornando lista vazia temporariamente até identificar endpoint correto
        logger.warning(f"get_flow_subflows: endpoint /flows/{flow_id}/subflows não implementado na API NicoChat - retornando vazio")
        return True, []

    def get_flow_user_fields(self, flow_id: str, api_key: Optional[str] = None) -> Tuple[bool, List[Dict]]:
        """
        Busca todos os campos customizados de usuário de um fluxo

        Args:
            flow_id: ID do fluxo
            api_key: API key (opcional)

        Returns:
            Tupla (sucesso: bool, campos: list)
        """
        # NOTA: O endpoint /flows/{id}/user-fields não existe na API do NicoChat
        # Retornando lista vazia temporariamente até identificar endpoint correto
        logger.warning(f"get_flow_user_fields: endpoint /flows/{flow_id}/user-fields não implementado na API NicoChat - retornando vazio")
        return True, []

    def get_flow_bot_users_count(self, flow_id: str, api_key: Optional[str] = None) -> Tuple[bool, int]:
        """
        Busca a quantidade de usuários (contatos) em um fluxo

        Args:
            flow_id: ID do fluxo
            api_key: API key (opcional)

        Returns:
            Tupla (sucesso: bool, quantidade: int)
        """
        endpoint = f"/flows/{flow_id}/bot-users/count"
        sucesso, resposta = self._make_request(endpoint, api_key)

        if sucesso:
            # Extrair quantidade da resposta
            quantidade = resposta.get('count', 0)
            logger.info(f"Flow {flow_id} tem {quantidade} usuários")
            return True, quantidade

        return False, 0

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
