# backend/features/ia/services.py - Integração Meta WhatsApp Business API
import requests
import json
import logging
from typing import Dict, List, Optional, Tuple
from django.utils import timezone
from django.conf import settings
from django.db import transaction
from datetime import datetime, timedelta
# from cryptography.fernet import Fernet
import base64
import os

# Importação temporária para permitir migrations
try:
    from cryptography.fernet import Fernet
except ImportError:
    print("AVISO: cryptography não instalado. Install: pip install cryptography")
    Fernet = None

from .models import (
    BusinessManager, WhatsAppPhoneNumber, QualityHistory, QualityAlert,
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
        
    def _get_encryption_key(self) -> bytes:
        """Obtém chave de criptografia para tokens - VERSÃO SEGURA CORRIGIDA"""
        if not Fernet:
            raise ImportError("cryptography não instalado. Execute: pip install cryptography")
            
        key = getattr(settings, 'WHATSAPP_ENCRYPTION_KEY', None)
        if not key:
            # CORREÇÃO CRÍTICA: Gerar chave temporária se não existir
            logger.error("WHATSAPP_ENCRYPTION_KEY não configurada! Usando chave temporária.")
            # Em produção, DEVE estar nas variáveis de ambiente
            temp_key = Fernet.generate_key()
            logger.warning(f"Chave temporária gerada. CONFIGURE: export WHATSAPP_ENCRYPTION_KEY={temp_key.decode()}")
            return temp_key
        
        try:
            # Tentar decodificar como base64 primeiro
            if isinstance(key, str):
                return base64.urlsafe_b64decode(key.encode())
            return base64.urlsafe_b64decode(key)
        except Exception as e:
            logger.error(f"Erro ao decodificar chave de criptografia: {e}")
            # CORREÇÃO: Não falhar, usar chave temporária
            temp_key = Fernet.generate_key()
            logger.warning("Usando chave temporária devido a erro na configuração")
            return temp_key
    
    def _encrypt_token(self, token: str) -> str:
        """Criptografa o token de acesso - VERSÃO SEGURA"""
        if not token or not isinstance(token, str):
            raise ValueError("Token deve ser uma string não vazia")
            
        try:
            key = self._get_encryption_key()
            f = Fernet(key)
            encrypted = f.encrypt(token.encode('utf-8'))
            return base64.urlsafe_b64encode(encrypted).decode('utf-8')
        except Exception as e:
            # NUNCA logar o token real - apenas o tipo de erro
            logger.error(f"Erro ao criptografar token: {type(e).__name__}")
            raise ValueError("Erro na criptografia do token - verifique a configuração da chave")
    
    def _decrypt_token(self, encrypted_token: str) -> str:
        """Descriptografa o token de acesso - VERSÃO SEGURA"""
        if not encrypted_token or not isinstance(encrypted_token, str):
            raise ValueError("Token criptografado inválido")
            
        try:
            key = self._get_encryption_key()
            f = Fernet(key)
            decrypted_bytes = f.decrypt(base64.urlsafe_b64decode(encrypted_token.encode('utf-8')))
            return decrypted_bytes.decode('utf-8')
        except Exception as e:
            # NUNCA logar o token - apenas o tipo de erro
            logger.error(f"Erro ao descriptografar token: {type(e).__name__}")
            raise ValueError("Erro na descriptografia do token - verifique se o token está correto")
    
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
    
    def listar_numeros_whatsapp(self, business_manager: BusinessManager) -> Tuple[bool, Dict]:
        """Lista números WhatsApp de uma Business Manager específica"""
        try:
            logger.info(f"Listando números da Business Manager {business_manager.nome}")
            
            # Descriptografar token
            access_token = self._decrypt_token(business_manager.access_token_encrypted)
            
            # URL para listar números
            url = f"{self.base_url}/{business_manager.business_manager_id}/phone_numbers"
            
            # Fazer requisição
            response = self._make_request(url, access_token)
            
            if 'error' in response:
                logger.error(f"Erro ao listar números: {response['error']}")
                return False, response
            
            # Verificar se tem dados
            if 'data' not in response:
                logger.warning("Resposta da API não contém campo 'data'")
                return False, {'error': 'Resposta inválida da API'}
            
            numeros = response['data']
            logger.info(f"Encontrados {len(numeros)} números na Business Manager {business_manager.nome}")
            
            return True, {'numeros': numeros, 'total': len(numeros)}
            
        except Exception as e:
            logger.error(f"Erro inesperado ao listar números: {e}")
            return False, {'error': str(e)}
    
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
    
    def sincronizar_numeros_business_manager(self, business_manager: BusinessManager, 
                                           force_update: bool = False) -> Dict:
        """Sincroniza todos os números de uma Business Manager"""
        logger.info(f"Iniciando sincronização da Business Manager {business_manager.nome}")
        
        resultado = {
            'business_manager_id': business_manager.id,
            'business_manager_nome': business_manager.nome,
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
            if not force_update and business_manager.ultima_sincronizacao:
                delta = timezone.now() - business_manager.ultima_sincronizacao
                if delta.total_seconds() < 900:  # 15 minutos
                    resultado['erro'] = 'Sincronização muito recente (menos de 15 minutos)'
                    return resultado
            
            # Listar números da API
            sucesso, response_data = self.listar_numeros_whatsapp(business_manager)
            
            if not sucesso:
                resultado['erro'] = response_data.get('error', 'Erro desconhecido')
                # Atualizar erro na Business Manager
                business_manager.erro_ultima_sincronizacao = str(resultado['erro'])
                business_manager.save()
                return resultado
            
            numeros_api = response_data.get('numeros', [])
            access_token = self._decrypt_token(business_manager.access_token_encrypted)
            
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
                            business_manager, detalhes
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
            
            # Atualizar status da Business Manager
            business_manager.ultima_sincronizacao = timezone.now()
            business_manager.erro_ultima_sincronizacao = ""
            business_manager.save()
            
            resultado['sucesso'] = True
            logger.info(f"Sincronização concluída: {resultado['numeros_processados']} processados")
            
        except Exception as e:
            logger.error(f"Erro geral na sincronização: {e}")
            resultado['erro'] = str(e)
            business_manager.erro_ultima_sincronizacao = str(e)
            business_manager.save()
        
        return resultado
    
    def _processar_numero_whatsapp(self, business_manager: BusinessManager, 
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
                    'business_manager': business_manager,
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
    
    def sincronizar_qualidade_numeros(self, business_manager_id: Optional[int] = None, 
                                     force_update: bool = False) -> Dict:
        """Sincroniza qualidade de todos os números ou de uma Business Manager específica"""
        logger.info("Iniciando sincronização geral de qualidade")
        
        resultado = {
            'sucesso': True,
            'business_managers_processadas': 0,
            'total_numeros_processados': 0,
            'total_numeros_atualizados': 0,
            'total_numeros_criados': 0,
            'total_alertas_criados': 0,
            'erros': [],
            'detalhes_por_bm': []
        }
        
        try:
            # Definir quais Business Managers processar
            if business_manager_id:
                business_managers = BusinessManager.objects.filter(id=business_manager_id, ativo=True)
            else:
                business_managers = BusinessManager.objects.filter(ativo=True)
            
            if not business_managers.exists():
                resultado['sucesso'] = False
                resultado['erros'].append('Nenhuma Business Manager ativa encontrada')
                return resultado
            
            # Processar cada Business Manager
            for bm in business_managers:
                try:
                    resultado_bm = self.sincronizar_numeros_business_manager(bm, force_update)
                    
                    resultado['business_managers_processadas'] += 1
                    resultado['total_numeros_processados'] += resultado_bm['numeros_processados']
                    resultado['total_numeros_atualizados'] += resultado_bm['numeros_atualizados']
                    resultado['total_numeros_criados'] += resultado_bm['numeros_criados']
                    resultado['total_alertas_criados'] += resultado_bm['alertas_criados']
                    
                    resultado['detalhes_por_bm'].append(resultado_bm)
                    
                    if resultado_bm['erro']:
                        resultado['erros'].append(f"BM {bm.nome}: {resultado_bm['erro']}")
                
                except Exception as e:
                    erro = f"Erro ao processar Business Manager {bm.nome}: {str(e)}"
                    logger.error(erro)
                    resultado['erros'].append(erro)
            
            if resultado['erros']:
                resultado['sucesso'] = len(resultado['erros']) < len(business_managers)
            
            logger.info(f"Sincronização geral concluída: {resultado['total_numeros_processados']} números processados")
            
        except Exception as e:
            logger.error(f"Erro geral na sincronização: {e}")
            resultado['sucesso'] = False
            resultado['erros'].append(str(e))
        
        return resultado
    
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