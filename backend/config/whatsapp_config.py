# backend/config/whatsapp_config.py - Configuração segura para WhatsApp Business API

import os
import base64
import logging
from typing import Optional, Tuple
from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)

# Importação segura da cryptography
try:
    from cryptography.fernet import Fernet
    CRYPTOGRAPHY_AVAILABLE = True
except ImportError:
    CRYPTOGRAPHY_AVAILABLE = False
    logger.warning("cryptography não instalado. Execute: pip install cryptography")


class WhatsAppEncryptionManager:
    """Gerenciador de criptografia para tokens WhatsApp Business API"""
    
    def __init__(self):
        self._cache_key = "whatsapp_encryption_key"
        self._encryption_key = None
    
    def is_cryptography_available(self) -> bool:
        """Verifica se a biblioteca cryptography está disponível"""
        return CRYPTOGRAPHY_AVAILABLE
    
    def get_encryption_key(self) -> Optional[bytes]:
        """Obtém chave de criptografia de forma segura"""
        if not self.is_cryptography_available():
            logger.error("cryptography não está disponível")
            return None
        
        # Verificar cache primeiro
        if self._encryption_key:
            return self._encryption_key
        
        # Tentar obter das configurações
        key_from_settings = getattr(settings, 'WHATSAPP_ENCRYPTION_KEY', None)
        
        if key_from_settings:
            try:
                # Tentar decodificar como base64
                if isinstance(key_from_settings, str):
                    decoded_key = base64.urlsafe_b64decode(key_from_settings.encode())
                else:
                    decoded_key = base64.urlsafe_b64decode(key_from_settings)
                
                # Validar se é uma chave Fernet válida
                Fernet(decoded_key)  # Isso vai falhar se não for válida
                
                self._encryption_key = decoded_key
                logger.info("Chave de criptografia carregada das configurações")
                return self._encryption_key
                
            except Exception as e:
                logger.error(f"Erro ao decodificar chave das configurações: {e}")
        
        # Se chegou aqui, não há chave válida configurada
        logger.error("WHATSAPP_ENCRYPTION_KEY não configurada ou inválida")
        return None
    
    def generate_new_key(self) -> str:
        """Gera nova chave de criptografia"""
        if not self.is_cryptography_available():
            raise ImportError("cryptography não disponível")
        
        new_key = Fernet.generate_key()
        encoded_key = base64.urlsafe_b64encode(new_key).decode()
        
        logger.warning(f"Nova chave gerada. Configure: export WHATSAPP_ENCRYPTION_KEY={encoded_key}")
        return encoded_key
    
    def encrypt_token(self, token: str) -> Tuple[bool, str]:
        """
        Criptografa token de forma segura
        Returns: (sucesso, token_criptografado_ou_erro)
        """
        if not token or not isinstance(token, str):
            return False, "Token deve ser uma string não vazia"
        
        if not self.is_cryptography_available():
            return False, "cryptography não disponível"
        
        encryption_key = self.get_encryption_key()
        if not encryption_key:
            return False, "Chave de criptografia não disponível"
        
        try:
            f = Fernet(encryption_key)
            encrypted = f.encrypt(token.encode('utf-8'))
            encrypted_b64 = base64.urlsafe_b64encode(encrypted).decode('utf-8')
            return True, encrypted_b64
        except Exception as e:
            logger.error(f"Erro ao criptografar token: {type(e).__name__}")
            return False, "Erro na criptografia"
    
    def decrypt_token(self, encrypted_token: str) -> Tuple[bool, str]:
        """
        Descriptografa token de forma segura
        Returns: (sucesso, token_descriptografado_ou_erro)
        """
        if not encrypted_token or not isinstance(encrypted_token, str):
            return False, "Token criptografado inválido"
        
        if not self.is_cryptography_available():
            return False, "cryptography não disponível"
        
        encryption_key = self.get_encryption_key()
        if not encryption_key:
            return False, "Chave de criptografia não disponível"
        
        try:
            f = Fernet(encryption_key)
            decoded = base64.urlsafe_b64decode(encrypted_token.encode('utf-8'))
            decrypted_bytes = f.decrypt(decoded)
            return True, decrypted_bytes.decode('utf-8')
        except Exception as e:
            logger.error(f"Erro ao descriptografar token: {type(e).__name__}")
            return False, "Token corrompido ou chave incorreta"
    
    def is_token_encrypted(self, token: str) -> bool:
        """Verifica se um token está criptografado (heurística)"""
        if not token:
            return False
        
        # Tokens não criptografados do Facebook geralmente começam com prefixos conhecidos
        if token.startswith(('EAA', 'EAAG', 'EAAB')):
            return False
        
        # Tokens criptografados são base64 e mais longos
        try:
            base64.urlsafe_b64decode(token.encode('utf-8'))
            # Se conseguiu decodificar e é longo, provavelmente é criptografado
            return len(token) > 50
        except:
            return False
    
    def migrate_token_if_needed(self, token: str) -> Tuple[bool, str, bool]:
        """
        Migra token se necessário
        Returns: (sucesso, token_final, foi_migrado)
        """
        if not token:
            return False, "Token vazio", False
        
        # Se não está criptografado, criptografar
        if not self.is_token_encrypted(token):
            logger.info("Token não criptografado detectado, criptografando...")
            sucesso, resultado = self.encrypt_token(token)
            if sucesso:
                return True, resultado, True
            else:
                # Se não conseguiu criptografar, usar como está
                logger.warning("Não foi possível criptografar token, usando como está")
                return True, token, False
        
        # Se está criptografado, tentar descriptografar para validar
        sucesso, token_descriptografado = self.decrypt_token(token)
        if sucesso:
            return True, token, False  # Token já está criptografado e válido
        else:
            # Token corrompido
            return False, "Token criptografado corrompido", False


# Instância global do gerenciador
encryption_manager = WhatsAppEncryptionManager()


def get_whatsapp_encryption_manager() -> WhatsAppEncryptionManager:
    """Obtém instância do gerenciador de criptografia"""
    return encryption_manager


def check_encryption_health() -> dict:
    """Verifica saúde do sistema de criptografia"""
    manager = get_whatsapp_encryption_manager()
    
    result = {
        'cryptography_available': manager.is_cryptography_available(),
        'encryption_key_configured': False,
        'encryption_key_valid': False,
        'can_encrypt': False,
        'can_decrypt': False,
        'recommendations': []
    }
    
    if not result['cryptography_available']:
        result['recommendations'].append("Instale cryptography: pip install cryptography")
        return result
    
    # Verificar chave
    key = manager.get_encryption_key()
    if key:
        result['encryption_key_configured'] = True
        result['encryption_key_valid'] = True
        
        # Testar criptografia
        test_token = "test_token_123"
        encrypt_success, encrypted = manager.encrypt_token(test_token)
        if encrypt_success:
            result['can_encrypt'] = True
            
            # Testar descriptografia
            decrypt_success, decrypted = manager.decrypt_token(encrypted)
            if decrypt_success and decrypted == test_token:
                result['can_decrypt'] = True
            else:
                result['recommendations'].append("Erro na descriptografia - verifique a chave")
        else:
            result['recommendations'].append("Erro na criptografia - verifique a configuração")
    else:
        result['recommendations'].append(
            "Configure WHATSAPP_ENCRYPTION_KEY nas variáveis de ambiente"
        )
        # Sugerir nova chave
        try:
            new_key = manager.generate_new_key()
            result['recommendations'].append(f"Use esta chave: export WHATSAPP_ENCRYPTION_KEY={new_key}")
        except:
            pass
    
    return result