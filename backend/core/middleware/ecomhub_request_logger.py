# backend/core/middleware/ecomhub_request_logger.py - MIDDLEWARE PARA LOGGING AUTOMÁTICO DAS REQUISIÇÕES ECOMHUB
import logging
import json
import time
from django.utils.deprecation import MiddlewareMixin
from django.http import JsonResponse
from core.middleware.ultra_logging import ultra_logging

logger = logging.getLogger(__name__)

class EcomhubRequestLoggerMiddleware(MiddlewareMixin):
    """
    Middleware que automaticamente loga todas as requisições relacionadas ao EcomHub
    para investigar diferenças entre ambiente local e produção
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.ecomhub_paths = [
            '/api/metricas-ecomhub/',
            '/api/status-tracking/',
            '/pedidos-status-tracking/',
        ]
    
    def process_request(self, request):
        """Processa requisições antes de chegar às views"""
        
        # Verificar se é uma requisição relacionada ao EcomHub
        if any(path in request.path for path in self.ecomhub_paths):
            # Marcar requisição para logging
            request._ecomhub_logging = True
            request._ecomhub_start_time = time.time()
            
            # Log detalhado da requisição
            ultra_logging.logger.info("="*100)
            ultra_logging.logger.info(f"📥 REQUISIÇÃO ECOMHUB INTERCEPTADA - {ultra_logging.ambiente}")
            ultra_logging.logger.info("="*100)
            ultra_logging.logger.info(f"🌐 Path: {request.path}")
            ultra_logging.logger.info(f"🔧 Método: {request.method}")
            ultra_logging.logger.info(f"👤 User: {getattr(request.user, 'username', 'Anonymous')}")
            ultra_logging.logger.info(f"🌍 Remote IP: {self._get_client_ip(request)}")
            ultra_logging.logger.info(f"🖥️ User Agent: {request.META.get('HTTP_USER_AGENT', 'N/A')}")
            
            # Log dos headers da requisição
            ultra_logging.logger.info(f"📋 HEADERS DA REQUISIÇÃO:")
            for header, value in request.META.items():
                if header.startswith('HTTP_'):
                    clean_header = header[5:].replace('_', '-').title()
                    ultra_logging.logger.info(f"   {clean_header}: {value}")
            
            # Log do body se for POST/PUT
            if request.method in ['POST', 'PUT', 'PATCH'] and hasattr(request, 'body'):
                try:
                    if request.content_type == 'application/json':
                        body_data = json.loads(request.body.decode('utf-8'))
                        ultra_logging.logger.info(f"📦 BODY (JSON): {json.dumps(body_data, indent=2)}")
                    else:
                        body_str = request.body.decode('utf-8')[:1000]  # Limitar a 1000 chars
                        ultra_logging.logger.info(f"📦 BODY (TEXT): {body_str}")
                except Exception as e:
                    ultra_logging.logger.info(f"📦 BODY (ERROR decoding): {str(e)}")
            
            # Log query parameters
            if request.GET:
                ultra_logging.logger.info(f"🔍 QUERY PARAMS: {dict(request.GET)}")
        
        return None
    
    def process_response(self, request, response):
        """Processa a resposta antes de enviar para o cliente"""
        
        # Verificar se foi uma requisição EcomHub monitorada
        if hasattr(request, '_ecomhub_logging') and request._ecomhub_logging:
            # Calcular tempo de processamento
            processing_time = time.time() - request._ecomhub_start_time
            
            # Log detalhado da resposta
            ultra_logging.logger.info("="*100)
            ultra_logging.logger.info(f"📤 RESPOSTA ECOMHUB - {ultra_logging.ambiente}")
            ultra_logging.logger.info("="*100)
            ultra_logging.logger.info(f"⏱️ Tempo de processamento: {processing_time:.3f} segundos")
            ultra_logging.logger.info(f"📊 Status Code: {response.status_code}")
            ultra_logging.logger.info(f"🏷️ Content-Type: {response.get('Content-Type', 'N/A')}")
            
            # Log dos headers da resposta
            ultra_logging.logger.info(f"📋 HEADERS DA RESPOSTA:")
            for header, value in response.items():
                ultra_logging.logger.info(f"   {header}: {value}")
            
            # Log do conteúdo da resposta (se for JSON)
            if response.get('Content-Type', '').startswith('application/json'):
                try:
                    # Para JsonResponse do Django
                    if hasattr(response, 'content'):
                        content_str = response.content.decode('utf-8')
                        if len(content_str) > 0:
                            response_data = json.loads(content_str)
                            
                            # Log estruturado da resposta
                            ultra_logging.logger.info(f"📦 RESPOSTA JSON ESTRUTURADA:")
                            ultra_logging.logger.info(f"   Tipo: {type(response_data).__name__}")
                            
                            if isinstance(response_data, dict):
                                ultra_logging.logger.info(f"   Chaves: {list(response_data.keys())}")
                                
                                # Focar em dados específicos do EcomHub
                                if 'dados_processados' in response_data:
                                    dados = response_data['dados_processados']
                                    ultra_logging.logger.info(f"🎯 dados_processados: {type(dados).__name__}")
                                    
                                    if isinstance(dados, list):
                                        ultra_logging.logger.info(f"   📋 Lista com {len(dados)} itens")
                                        if len(dados) > 0 and isinstance(dados[0], dict):
                                            campos = list(dados[0].keys())
                                            ultra_logging.logger.info(f"   🔑 Campos do primeiro item: {campos}")
                                            
                                            # Verificar se são pedidos individuais
                                            pedido_fields = ['pedido_id', 'order_id', 'customer_name', 'status']
                                            has_pedido_fields = any(field in campos for field in pedido_fields)
                                            ultra_logging.logger.info(f"   🎯 Parece ser pedidos individuais: {has_pedido_fields}")
                                    
                                    elif isinstance(dados, dict):
                                        ultra_logging.logger.info(f"   📊 Dict com chaves: {list(dados.keys())}")
                                        
                                        # Detectar se é estrutura agregada
                                        agregado_keys = ['visualizacao_total', 'stats_total', 'visualizacao_otimizada']
                                        has_agregado = any(key in dados for key in agregado_keys)
                                        ultra_logging.logger.info(f"   📊 Estrutura agregada detectada: {has_agregado}")
                                
                                # Log de status e mensagens
                                if 'status' in response_data:
                                    ultra_logging.logger.info(f"   🚦 Status: {response_data['status']}")
                                if 'message' in response_data:
                                    ultra_logging.logger.info(f"   💬 Mensagem: {response_data['message']}")
                                if 'ambiente_detectado' in response_data:
                                    ultra_logging.logger.info(f"   🌍 Ambiente detectado: {response_data['ambiente_detectado']}")
                            
                            # Log do JSON completo (limitado)
                            json_str = json.dumps(response_data, indent=2, ensure_ascii=False)
                            if len(json_str) > 2000:
                                ultra_logging.logger.info(f"📄 JSON COMPLETO (primeiros 2000 chars): {json_str[:2000]}...")
                            else:
                                ultra_logging.logger.info(f"📄 JSON COMPLETO: {json_str}")
                            
                except Exception as e:
                    ultra_logging.logger.error(f"❌ Erro decodificando resposta JSON: {e}")
                    if hasattr(response, 'content'):
                        content_preview = response.content.decode('utf-8')[:500]
                        ultra_logging.logger.error(f"📄 Conteúdo bruto: {content_preview}")
            
            # Análise final baseada no ambiente e resultado
            ultra_logging.logger.info("="*100)
            ultra_logging.logger.info(f"🎯 ANÁLISE FINAL - AMBIENTE: {ultra_logging.ambiente}")
            ultra_logging.logger.info("="*100)
            
            if response.status_code == 200:
                ultra_logging.logger.info(f"✅ Requisição bem-sucedida em {processing_time:.3f}s")
            else:
                ultra_logging.logger.warning(f"⚠️ Resposta não-200: {response.status_code}")
            
            # Detectar padrões específicos por ambiente
            if ultra_logging.ambiente == 'LOCAL':
                ultra_logging.logger.info(f"🏠 COMPORTAMENTO LOCAL: Analisar se retorna pedidos individuais")
            elif ultra_logging.ambiente == 'PRODUÇÃO':
                ultra_logging.logger.info(f"🌐 COMPORTAMENTO PRODUÇÃO: Analisar se retorna apenas dados agregados")
            
            ultra_logging.logger.info("="*100)
        
        return response
    
    def _get_client_ip(self, request):
        """Obter IP do cliente considerando proxies"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def process_exception(self, request, exception):
        """Loga exceções em requisições EcomHub"""
        if hasattr(request, '_ecomhub_logging') and request._ecomhub_logging:
            processing_time = time.time() - request._ecomhub_start_time
            
            ultra_logging.logger.error("="*100)
            ultra_logging.logger.error(f"💥 EXCEÇÃO EM REQUISIÇÃO ECOMHUB - {ultra_logging.ambiente}")
            ultra_logging.logger.error("="*100)
            ultra_logging.logger.error(f"⏱️ Tempo até exceção: {processing_time:.3f} segundos")
            ultra_logging.logger.error(f"🌐 Path: {request.path}")
            ultra_logging.logger.error(f"💥 Tipo da exceção: {type(exception).__name__}")
            ultra_logging.logger.error(f"💬 Mensagem: {str(exception)}")
            
            # Traceback completo
            import traceback
            ultra_logging.logger.error(f"📋 TRACEBACK:")
            ultra_logging.logger.error(traceback.format_exc())
            ultra_logging.logger.error("="*100)
        
        return None