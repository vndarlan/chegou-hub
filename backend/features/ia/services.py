# backend/features/ia/services.py - Integração Meta WhatsApp Business API
import requests
import json
import logging
from typing import Dict, List, Optional, Tuple
from django.utils import timezone
from django.conf import settings
from django.db import transaction
from datetime import datetime, timedelta
import base64
import os

# Importar gerenciador de criptografia robusto
from config.whatsapp_config import get_whatsapp_encryption_manager

from .models import (
    WhatsAppBusinessAccount, BusinessManager, WhatsAppPhoneNumber, QualityHistory, QualityAlert,
    QualityRatingChoices, MessagingLimitTierChoices, PhoneNumberStatusChoices,
    AlertTypeChoices, AlertPriorityChoices
)

logger = logging.getLogger(__name__)

class WhatsAppMetaAPIService:
    """Serviço para integração com Meta WhatsApp Business API"""
    
    def __init__(self):
        self.base_url = "https://graph.facebook.com/v19.0"
        self.timeout = 30
        self._request_cache = {}  # Cache para rate limiting
        self._last_request_time = {}  # Controle de tempo entre requests
        self._encryption_manager = get_whatsapp_encryption_manager()
        
    def _encrypt_token(self, token: str) -> str:
        """Criptografa o token de acesso - VERSÃO ROBUSTA"""
        if not token or not isinstance(token, str):
            raise ValueError("Token deve ser uma string não vazia")
            
        sucesso, resultado = self._encryption_manager.encrypt_token(token)
        if sucesso:
            return resultado
        else:
            logger.error(f"Erro ao criptografar token: {resultado}")
            raise ValueError(f"Erro na criptografia do token: {resultado}")
    
    def _decrypt_token(self, encrypted_token: str) -> Tuple[bool, str]:
        """
        Descriptografa o token de acesso - VERSÃO ROBUSTA
        Returns: (sucesso, token_ou_erro)
        """
        if not encrypted_token or not isinstance(encrypted_token, str):
            return False, "Token criptografado inválido"
        
        # Tentar migração automática se necessário
        sucesso_migracao, token_final, foi_migrado = self._encryption_manager.migrate_token_if_needed(encrypted_token)
        
        if not sucesso_migracao:
            return False, token_final  # token_final contém a mensagem de erro
        
        if foi_migrado:
            logger.info("Token foi migrado para formato criptografado")
            # TODO: Salvar token migrado no banco (será feito na view)
            return True, token_final
        
        # Se não foi migrado, então já estava criptografado
        if self._encryption_manager.is_token_encrypted(token_final):
            sucesso, resultado = self._encryption_manager.decrypt_token(token_final)
            return sucesso, resultado
        else:
            # Token não criptografado
            return True, token_final
    
    def _get_access_token_safe(self, whatsapp_business_account: 'WhatsAppBusinessAccount') -> Tuple[bool, str, bool]:
        """
        Obtém token de acesso de forma segura
        Returns: (sucesso, token_ou_erro, precisa_atualizar_banco)
        """
        sucesso, resultado = self._decrypt_token(whatsapp_business_account.access_token_encrypted)
        
        if sucesso:
            # Verificar se houve migração
            sucesso_migracao, token_migrado, foi_migrado = self._encryption_manager.migrate_token_if_needed(
                whatsapp_business_account.access_token_encrypted
            )
            
            if foi_migrado and sucesso_migracao:
                # Token foi criptografado, precisa atualizar no banco
                return True, resultado, True
            else:
                return True, resultado, False
        else:
            # Marcar WhatsApp Business Account como requerendo re-cadastro
            logger.warning(f"Token corrompido para WABA {whatsapp_business_account.nome}: {resultado}")
            return False, f"Token corrompido - necessário re-cadastrar credenciais: {resultado}", False
    
    def _check_rate_limit(self, business_manager_id: str) -> bool:
        """Verifica rate limiting por Business Manager"""
        import time
        from django.core.cache import cache
        
        cache_key = f"meta_api_rate_limit_{business_manager_id}"
        current_time = time.time()
        
        # Verificar cache do Django (mais robusto)
        request_times = cache.get(cache_key, [])
        
        # Remover requests mais antigos que 1 minuto
        request_times = [t for t in request_times if current_time - t < 60]
        
        # CORREÇÃO: Limite mais restritivo - 5 requests por minuto por Business Manager
        if len(request_times) >= 5:
            logger.warning(f"Rate limit atingido para Business Manager {business_manager_id}")
            return False
        
        # Adicionar request atual
        request_times.append(current_time)
        cache.set(cache_key, request_times, 60)  # Cache por 1 minuto
        
        return True
    
    def _make_request(self, url: str, access_token: str, method: str = 'GET', 
                      params: Optional[Dict] = None, data: Optional[Dict] = None,
                      business_manager_id: Optional[str] = None) -> Dict:
        """Faz requisição para Meta API com tratamento de erros e rate limiting"""
        
        # Rate limiting por Business Manager
        if business_manager_id and not self._check_rate_limit(business_manager_id):
            return {'error': 'Rate limit excedido - tente novamente em 1 minuto'}
        
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json',
            'User-Agent': 'ChegouHub-WhatsApp-Monitor/1.0'
        }
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=self.timeout)
            elif method == 'POST':
                response = requests.post(url, headers=headers, json=data, timeout=self.timeout)
            else:
                raise ValueError(f"Método HTTP não suportado: {method}")
            
            response.raise_for_status()
            
            # Verificar se é JSON válido
            try:
                return response.json()
            except json.JSONDecodeError as e:
                logger.error(f"Resposta não é JSON válido: {response.text}")
                return {'error': 'Resposta inválida da API', 'raw_response': response.text}
                
        except requests.exceptions.Timeout:
            logger.error(f"Timeout na requisição para {url}")
            return {'error': 'Timeout na requisição'}
        except requests.exceptions.HTTPError as e:
            logger.error(f"Erro HTTP {e.response.status_code} para {url}: {e.response.text}")
            try:
                error_data = e.response.json()
                return {'error': error_data}
            except:
                return {'error': f'Erro HTTP {e.response.status_code}'}
        except Exception as e:
            logger.error(f"Erro inesperado na requisição: {e}")
            return {'error': str(e)}
    
    def listar_numeros_whatsapp(self, whatsapp_business_account: WhatsAppBusinessAccount) -> Tuple[bool, Dict]:
        """Lista números WhatsApp de uma WABA específica - VERSÃO ROBUSTA"""
        try:
            logger.info(f"Listando números da WABA {whatsapp_business_account.nome}")
            
            # Obter token de forma segura
            sucesso_token, token_ou_erro, precisa_atualizar = self._get_access_token_safe(whatsapp_business_account)
            
            if not sucesso_token:
                # Token corrompido - marcar WABA como requerendo re-cadastro
                whatsapp_business_account.erro_ultima_sincronizacao = token_ou_erro
                whatsapp_business_account.save()
                
                logger.error(f"Token corrompido para WABA {whatsapp_business_account.nome}: {token_ou_erro}")
                return False, {
                    'error': token_ou_erro,
                    'error_type': 'token_corrupted',
                    'action_required': 'recadastrar_credenciais',
                    'whatsapp_business_account_id': whatsapp_business_account.id
                }
            
            access_token = token_ou_erro
            
            # Se token foi migrado, atualizar no banco
            if precisa_atualizar:
                try:
                    whatsapp_business_account.access_token_encrypted = self._encrypt_token(access_token)
                    whatsapp_business_account.save()
                    logger.info(f"Token migrado e salvo para WABA {whatsapp_business_account.nome}")
                except Exception as e:
                    logger.warning(f"Erro ao salvar token migrado: {e}")
            
            # URL CORRIGIDA para listar números - usando WABA ID
            url = f"{self.base_url}/{whatsapp_business_account.whatsapp_business_account_id}/phone_numbers"
            
            # Fazer requisição
            response = self._make_request(url, access_token, business_manager_id=str(whatsapp_business_account.id))
            
            if 'error' in response:
                error_msg = response['error']
                logger.error(f"Erro ao listar números: {error_msg}")
                
                # Verificar se é erro de token inválido
                if isinstance(error_msg, dict) and 'error' in error_msg:
                    api_error = error_msg['error']
                    if 'code' in api_error and api_error['code'] in [190, 102]:  # Token inválido/expirado
                        whatsapp_business_account.erro_ultima_sincronizacao = "Token de acesso expirado ou inválido"
                        whatsapp_business_account.save()
                        return False, {
                            'error': 'Token de acesso expirado ou inválido',
                            'error_type': 'token_expired',
                            'action_required': 'recadastrar_credenciais',
                            'whatsapp_business_account_id': whatsapp_business_account.id
                        }
                
                return False, response
            
            # Verificar se tem dados
            if 'data' not in response:
                logger.warning("Resposta da API não contém campo 'data'")
                return False, {'error': 'Resposta inválida da API'}
            
            numeros = response['data']
            logger.info(f"Encontrados {len(numeros)} números na WABA {whatsapp_business_account.nome}")
            
            # Limpar erro anterior se houve sucesso
            if whatsapp_business_account.erro_ultima_sincronizacao:
                whatsapp_business_account.erro_ultima_sincronizacao = ""
                whatsapp_business_account.save()
            
            return True, {'numeros': numeros, 'total': len(numeros)}
            
        except Exception as e:
            error_msg = f"Erro inesperado ao listar números: {str(e)}"
            logger.error(error_msg)
            
            # Salvar erro na WhatsApp Business Account
            whatsapp_business_account.erro_ultima_sincronizacao = error_msg
            whatsapp_business_account.save()
            
            return False, {
                'error': error_msg,
                'error_type': 'unexpected_error',
                'whatsapp_business_account_id': whatsapp_business_account.id
            }
    
    def obter_detalhes_numero(self, phone_number_id: str, access_token: str) -> Tuple[bool, Dict]:
        """Obtém detalhes específicos de um número WhatsApp"""
        try:
            logger.info(f"Obtendo detalhes do número {phone_number_id}")
            
            # URL para obter detalhes do número
            url = f"{self.base_url}/{phone_number_id}"
            
            # Campos específicos que queremos
            params = {
                'fields': 'id,display_phone_number,verified_name,quality_rating,messaging_limit_tier,status'
            }
            
            # Fazer requisição
            response = self._make_request(url, access_token, params=params)
            
            if 'error' in response:
                logger.error(f"Erro ao obter detalhes do número {phone_number_id}: {response['error']}")
                return False, response
            
            logger.info(f"Detalhes obtidos com sucesso para número {phone_number_id}")
            return True, response
            
        except Exception as e:
            logger.error(f"Erro inesperado ao obter detalhes: {e}")
            return False, {'error': str(e)}
    
    def sincronizar_numeros_whatsapp_business_account(self, whatsapp_business_account: WhatsAppBusinessAccount, 
                                           force_update: bool = False) -> Dict:
        """Sincroniza todos os números de uma WhatsApp Business Account"""
        logger.info(f"Iniciando sincronização da WABA {whatsapp_business_account.nome}")
        
        resultado = {
            'whatsapp_business_account_id': whatsapp_business_account.id,
            'whatsapp_business_account_nome': whatsapp_business_account.nome,
            'sucesso': False,
            'numeros_processados': 0,
            'numeros_atualizados': 0,
            'numeros_criados': 0,
            'alertas_criados': 0,
            'erro': None,
            'detalhes': []
        }
        
        try:
            # Verificar se precisa sincronizar
            if not force_update and whatsapp_business_account.ultima_sincronizacao:
                delta = timezone.now() - whatsapp_business_account.ultima_sincronizacao
                if delta.total_seconds() < 900:  # 15 minutos
                    resultado['erro'] = 'Sincronização muito recente (menos de 15 minutos)'
                    return resultado
            
            # Listar números da API
            sucesso, response_data = self.listar_numeros_whatsapp(whatsapp_business_account)
            
            if not sucesso:
                resultado['erro'] = response_data.get('error', 'Erro desconhecido')
                # Atualizar erro na WhatsApp Business Account
                whatsapp_business_account.erro_ultima_sincronizacao = str(resultado['erro'])
                whatsapp_business_account.save()
                return resultado
            
            numeros_api = response_data.get('numeros', [])
            
            # Obter token seguro (já foi validado no listar_numeros_whatsapp)
            sucesso_token, access_token, _ = self._get_access_token_safe(whatsapp_business_account)
            if not sucesso_token:
                resultado['erro'] = f"Token inválido: {access_token}"
                return resultado
            
            # Processar cada número
            with transaction.atomic():
                for numero_data in numeros_api:
                    try:
                        phone_number_id = numero_data.get('id')
                        if not phone_number_id:
                            continue
                        
                        # Obter detalhes completos do número
                        sucesso_detalhes, detalhes = self.obter_detalhes_numero(
                            phone_number_id, access_token
                        )
                        
                        if not sucesso_detalhes:
                            logger.error(f"Erro ao obter detalhes de {phone_number_id}: {detalhes}")
                            continue
                        
                        # Processar o número
                        numero_resultado = self._processar_numero_whatsapp(
                            whatsapp_business_account, detalhes
                        )
                        
                        resultado['numeros_processados'] += 1
                        if numero_resultado['criado']:
                            resultado['numeros_criados'] += 1
                        if numero_resultado['atualizado']:
                            resultado['numeros_atualizados'] += 1
                        if numero_resultado['alertas_criados'] > 0:
                            resultado['alertas_criados'] += numero_resultado['alertas_criados']
                        
                        resultado['detalhes'].append(numero_resultado)
                        
                    except Exception as e:
                        logger.error(f"Erro ao processar número {numero_data.get('id', 'N/A')}: {e}")
                        continue
            
            # Atualizar status da WhatsApp Business Account
            whatsapp_business_account.ultima_sincronizacao = timezone.now()
            whatsapp_business_account.erro_ultima_sincronizacao = ""
            whatsapp_business_account.save()
            
            resultado['sucesso'] = True
            logger.info(f"Sincronização concluída: {resultado['numeros_processados']} processados")
            
        except Exception as e:
            logger.error(f"Erro geral na sincronização: {e}")
            resultado['erro'] = str(e)
            whatsapp_business_account.erro_ultima_sincronizacao = str(e)
            whatsapp_business_account.save()
        
        return resultado
    
    def _processar_numero_whatsapp(self, whatsapp_business_account: WhatsAppBusinessAccount, 
                                  dados_api: Dict) -> Dict:
        """Processa um número específico e suas mudanças de qualidade"""
        resultado = {
            'phone_number_id': dados_api.get('id'),
            'display_phone_number': dados_api.get('display_phone_number'),
            'criado': False,
            'atualizado': False,
            'alertas_criados': 0,
            'mudancas': []
        }
        
        try:
            phone_number_id = dados_api.get('id')
            display_phone_number = dados_api.get('display_phone_number')
            verified_name = dados_api.get('verified_name', '')
            
            # Mapear valores da API para nossas choices
            quality_rating = self._mapear_quality_rating(dados_api.get('quality_rating'))
            messaging_limit_tier = self._mapear_messaging_limit(dados_api.get('messaging_limit_tier'))
            status_numero = self._mapear_status(dados_api.get('status'))
            
            # Buscar ou criar número
            numero, criado = WhatsAppPhoneNumber.objects.get_or_create(
                phone_number_id=phone_number_id,
                defaults={
                    'whatsapp_business_account': whatsapp_business_account,
                    'display_phone_number': display_phone_number,
                    'verified_name': verified_name,
                    'quality_rating': quality_rating,
                    'messaging_limit_tier': messaging_limit_tier,
                    'status': status_numero,
                    'detalhes_api': dados_api
                }
            )
            
            resultado['criado'] = criado
            
            if not criado:
                # Verificar mudanças
                mudancas = self._detectar_mudancas_qualidade(numero, dados_api)
                
                if mudancas['houve_mudanca']:
                    # Salvar histórico
                    historico = QualityHistory.objects.create(
                        phone_number=numero,
                        quality_rating=quality_rating,
                        messaging_limit_tier=messaging_limit_tier,
                        status=status_numero,
                        quality_rating_anterior=numero.quality_rating,
                        messaging_limit_tier_anterior=numero.messaging_limit_tier,
                        status_anterior=numero.status,
                        houve_mudanca_qualidade=mudancas['qualidade'],
                        houve_mudanca_limite=mudancas['limite'],
                        houve_mudanca_status=mudancas['status'],
                        dados_api_completos=dados_api
                    )
                    
                    # Criar alertas se necessário
                    alertas = self._criar_alertas_mudancas(numero, historico, mudancas)
                    resultado['alertas_criados'] = len(alertas)
                    
                    # Atualizar número com novos dados
                    numero.quality_rating = quality_rating
                    numero.messaging_limit_tier = messaging_limit_tier
                    numero.status = status_numero
                    numero.verified_name = verified_name
                    numero.detalhes_api = dados_api
                    numero.ultima_verificacao = timezone.now()
                    numero.save()
                    
                    resultado['atualizado'] = True
                    resultado['mudancas'] = mudancas['detalhes']
                else:
                    # Apenas atualizar timestamp de verificação
                    numero.ultima_verificacao = timezone.now()
                    numero.detalhes_api = dados_api  # Sempre atualizar dados completos
                    numero.save()
            
        except Exception as e:
            logger.error(f"Erro ao processar número {phone_number_id}: {e}")
            resultado['erro'] = str(e)
        
        return resultado
    
    def _mapear_quality_rating(self, rating: str) -> str:
        """Mapeia quality rating da API para nossas choices"""
        mapping = {
            'GREEN': QualityRatingChoices.GREEN,
            'YELLOW': QualityRatingChoices.YELLOW,
            'RED': QualityRatingChoices.RED,
            'UNKNOWN': QualityRatingChoices.NA,
            None: QualityRatingChoices.NA
        }
        return mapping.get(rating, QualityRatingChoices.NA)
    
    def _mapear_messaging_limit(self, limit: str) -> str:
        """Mapeia messaging limit da API para nossas choices"""
        mapping = {
            'TIER_50': MessagingLimitTierChoices.TIER_50,
            'TIER_250': MessagingLimitTierChoices.TIER_250,
            'TIER_1K': MessagingLimitTierChoices.TIER_1000,
            'TIER_10K': MessagingLimitTierChoices.TIER_UNLIMITED,
            'TIER_100K': MessagingLimitTierChoices.TIER_UNLIMITED,
            'TIER_UNLIMITED': MessagingLimitTierChoices.TIER_UNLIMITED,
            None: MessagingLimitTierChoices.TIER_50
        }
        return mapping.get(limit, MessagingLimitTierChoices.TIER_50)
    
    def _mapear_status(self, status: str) -> str:
        """Mapeia status da API para nossas choices"""
        mapping = {
            'CONNECTED': PhoneNumberStatusChoices.CONNECTED,
            'DISCONNECTED': PhoneNumberStatusChoices.DISCONNECTED,
            'FLAGGED': PhoneNumberStatusChoices.FLAGGED,
            'RESTRICTED': PhoneNumberStatusChoices.RESTRICTED,
            None: PhoneNumberStatusChoices.DISCONNECTED
        }
        return mapping.get(status, PhoneNumberStatusChoices.DISCONNECTED)
    
    def _detectar_mudancas_qualidade(self, numero: WhatsAppPhoneNumber, 
                                    novos_dados: Dict) -> Dict:
        """Detecta mudanças na qualidade do número"""
        novo_rating = self._mapear_quality_rating(novos_dados.get('quality_rating'))
        novo_limit = self._mapear_messaging_limit(novos_dados.get('messaging_limit_tier'))
        novo_status = self._mapear_status(novos_dados.get('status'))
        
        mudanca_qualidade = numero.quality_rating != novo_rating
        mudanca_limite = numero.messaging_limit_tier != novo_limit
        mudanca_status = numero.status != novo_status
        
        detalhes = []
        if mudanca_qualidade:
            detalhes.append(f"Qualidade: {numero.get_quality_rating_display()} → {dict(QualityRatingChoices.choices)[novo_rating]}")
        if mudanca_limite:
            detalhes.append(f"Limite: {numero.get_messaging_limit_tier_display()} → {dict(MessagingLimitTierChoices.choices)[novo_limit]}")
        if mudanca_status:
            detalhes.append(f"Status: {numero.get_status_display()} → {dict(PhoneNumberStatusChoices.choices)[novo_status]}")
        
        return {
            'houve_mudanca': mudanca_qualidade or mudanca_limite or mudanca_status,
            'qualidade': mudanca_qualidade,
            'limite': mudanca_limite,
            'status': mudanca_status,
            'detalhes': detalhes
        }
    
    def _criar_alertas_mudancas(self, numero: WhatsAppPhoneNumber, 
                               historico: QualityHistory, mudancas: Dict) -> List[QualityAlert]:
        """Cria alertas baseados nas mudanças detectadas"""
        alertas = []
        
        try:
            # Alerta para degradação de qualidade
            if mudancas['qualidade']:
                if (historico.quality_rating_anterior == QualityRatingChoices.GREEN and 
                    historico.quality_rating in [QualityRatingChoices.YELLOW, QualityRatingChoices.RED]):
                    
                    priority = AlertPriorityChoices.HIGH if historico.quality_rating == QualityRatingChoices.RED else AlertPriorityChoices.MEDIUM
                    
                    alerta = QualityAlert.objects.create(
                        phone_number=numero,
                        quality_history=historico,
                        alert_type=AlertTypeChoices.QUALITY_DEGRADED,
                        priority=priority,
                        titulo=f"Qualidade degradada - {numero.display_phone_number}",
                        descricao=f"A qualidade do número mudou de {dict(QualityRatingChoices.choices)[historico.quality_rating_anterior]} para {dict(QualityRatingChoices.choices)[historico.quality_rating]}",
                        valor_anterior=historico.quality_rating_anterior,
                        valor_atual=historico.quality_rating
                    )
                    alertas.append(alerta)
            
            # Alerta para redução de limite
            if mudancas['limite']:
                # Definir ordem dos limites para detectar redução
                ordem_limites = {
                    MessagingLimitTierChoices.TIER_50: 1,
                    MessagingLimitTierChoices.TIER_250: 2,
                    MessagingLimitTierChoices.TIER_1000: 3,
                    MessagingLimitTierChoices.TIER_UNLIMITED: 4
                }
                
                limite_anterior = ordem_limites.get(historico.messaging_limit_tier_anterior, 0)
                limite_atual = ordem_limites.get(historico.messaging_limit_tier, 0)
                
                if limite_atual < limite_anterior:
                    alerta = QualityAlert.objects.create(
                        phone_number=numero,
                        quality_history=historico,
                        alert_type=AlertTypeChoices.LIMIT_REDUCED,
                        priority=AlertPriorityChoices.HIGH,
                        titulo=f"Limite reduzido - {numero.display_phone_number}",
                        descricao=f"O limite de mensagens foi reduzido de {dict(MessagingLimitTierChoices.choices)[historico.messaging_limit_tier_anterior]} para {dict(MessagingLimitTierChoices.choices)[historico.messaging_limit_tier]}",
                        valor_anterior=historico.messaging_limit_tier_anterior,
                        valor_atual=historico.messaging_limit_tier
                    )
                    alertas.append(alerta)
            
            # Alerta para mudança de status crítica
            if mudancas['status']:
                if historico.status in [PhoneNumberStatusChoices.DISCONNECTED, PhoneNumberStatusChoices.RESTRICTED]:
                    alert_type = AlertTypeChoices.DISCONNECTED if historico.status == PhoneNumberStatusChoices.DISCONNECTED else AlertTypeChoices.RESTRICTED
                    
                    alerta = QualityAlert.objects.create(
                        phone_number=numero,
                        quality_history=historico,
                        alert_type=alert_type,
                        priority=AlertPriorityChoices.CRITICAL,
                        titulo=f"Status crítico - {numero.display_phone_number}",
                        descricao=f"O número mudou para status {dict(PhoneNumberStatusChoices.choices)[historico.status]}",
                        valor_anterior=historico.status_anterior,
                        valor_atual=historico.status
                    )
                    alertas.append(alerta)
        
        except Exception as e:
            logger.error(f"Erro ao criar alertas: {e}")
        
        return alertas
    
    def sincronizar_qualidade_numeros(self, whatsapp_business_account_id: Optional[int] = None, 
                                     force_update: bool = False) -> Dict:
        """Sincroniza qualidade de todos os números ou de uma WABA específica"""
        logger.info("Iniciando sincronização geral de qualidade")
        
        resultado = {
            'sucesso': True,
            'whatsapp_business_accounts_processadas': 0,
            'total_numeros_processados': 0,
            'total_numeros_atualizados': 0,
            'total_numeros_criados': 0,
            'total_alertas_criados': 0,
            'erros': [],
            'detalhes_por_waba': []
        }
        
        try:
            # Definir quais WABAs processar
            if whatsapp_business_account_id:
                whatsapp_business_accounts = WhatsAppBusinessAccount.objects.filter(id=whatsapp_business_account_id, ativo=True)
            else:
                whatsapp_business_accounts = WhatsAppBusinessAccount.objects.filter(ativo=True)
            
            if not whatsapp_business_accounts.exists():
                resultado['sucesso'] = False
                resultado['erros'].append('Nenhuma WhatsApp Business Account ativa encontrada')
                return resultado
            
            # Processar cada WhatsApp Business Account
            for waba in whatsapp_business_accounts:
                try:
                    resultado_waba = self.sincronizar_numeros_whatsapp_business_account(waba, force_update)
                    
                    resultado['whatsapp_business_accounts_processadas'] += 1
                    resultado['total_numeros_processados'] += resultado_waba['numeros_processados']
                    resultado['total_numeros_atualizados'] += resultado_waba['numeros_atualizados']
                    resultado['total_numeros_criados'] += resultado_waba['numeros_criados']
                    resultado['total_alertas_criados'] += resultado_waba['alertas_criados']
                    
                    resultado['detalhes_por_waba'].append(resultado_waba)
                    
                    if resultado_waba['erro']:
                        resultado['erros'].append(f"WABA {waba.nome}: {resultado_waba['erro']}")
                
                except Exception as e:
                    erro = f"Erro ao processar WABA {waba.nome}: {str(e)}"
                    logger.error(erro)
                    resultado['erros'].append(erro)
            
            if resultado['erros']:
                resultado['sucesso'] = len(resultado['erros']) < len(whatsapp_business_accounts)
            
            logger.info(f"Sincronização geral concluída: {resultado['total_numeros_processados']} números processados")
            
        except Exception as e:
            logger.error(f"Erro geral na sincronização: {e}")
            resultado['sucesso'] = False
            resultado['erros'].append(str(e))
        
        return resultado
    
    # Função de compatibilidade temporária
    def sincronizar_numeros_business_manager(self, business_manager, force_update=False):
        """Função de compatibilidade - usar sincronizar_numeros_whatsapp_business_account"""
        return self.sincronizar_numeros_whatsapp_business_account(business_manager, force_update)
    
    def verificar_mudancas_qualidade(self) -> Dict:
        """Verifica mudanças recentes na qualidade dos números"""
        logger.info("Verificando mudanças recentes de qualidade")
        
        try:
            # Buscar mudanças das últimas 24 horas
            desde = timezone.now() - timedelta(hours=24)
            
            mudancas_recentes = QualityHistory.objects.filter(
                capturado_em__gte=desde
            ).select_related('phone_number', 'phone_number__business_manager')
            
            # Agrupar por tipo de mudança
            resultado = {
                'total_mudancas': mudancas_recentes.count(),
                'mudancas_qualidade': mudancas_recentes.filter(houve_mudanca_qualidade=True).count(),
                'mudancas_limite': mudancas_recentes.filter(houve_mudanca_limite=True).count(),
                'mudancas_status': mudancas_recentes.filter(houve_mudanca_status=True).count(),
                'alertas_pendentes': QualityAlert.objects.filter(resolvido=False).count(),
                'alertas_criticos': QualityAlert.objects.filter(
                    resolvido=False, 
                    priority=AlertPriorityChoices.CRITICAL
                ).count(),
                'numeros_qualidade_vermelha': WhatsAppPhoneNumber.objects.filter(
                    quality_rating=QualityRatingChoices.RED,
                    monitoramento_ativo=True
                ).count(),
                'numeros_desconectados': WhatsAppPhoneNumber.objects.filter(
                    status=PhoneNumberStatusChoices.DISCONNECTED,
                    monitoramento_ativo=True
                ).count()
            }
            
            logger.info(f"Verificação concluída: {resultado['total_mudancas']} mudanças encontradas")
            return resultado
            
        except Exception as e:
            logger.error(f"Erro ao verificar mudanças: {e}")
            return {'erro': str(e)}