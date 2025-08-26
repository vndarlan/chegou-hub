# backend/core/middleware/ultra_logging.py - SISTEMA DE LOGS ULTRA-DETALHADOS
import logging
import json
import time
import os
from datetime import datetime
from django.utils import timezone
from django.conf import settings
from django.http import JsonResponse

logger = logging.getLogger(__name__)

class UltraLoggingService:
    """Serviço de logging ultra-detalhado para investigar diferenças entre ambientes"""
    
    def __init__(self):
        self.ambiente = self._detectar_ambiente()
        self.logger = self._configurar_logger()
    
    def _detectar_ambiente(self):
        """Detecta se está rodando em local ou produção"""
        if os.getenv('RAILWAY_ENVIRONMENT_NAME'):
            return 'PRODUÇÃO'
        else:
            return 'LOCAL'
    
    def _configurar_logger(self):
        """Configura logger específico para ultra-logging"""
        logger_name = f'ultra_debug_{self.ambiente.lower()}'
        ultra_logger = logging.getLogger(logger_name)
        
        # Evitar duplicação de handlers
        if not ultra_logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                f'[{self.ambiente}] %(asctime)s - %(levelname)s - %(message)s'
            )
            handler.setFormatter(formatter)
            ultra_logger.addHandler(handler)
            ultra_logger.setLevel(logging.INFO)
        
        return ultra_logger
    
    def log_requisicao_detalhada(self, url, headers, payload, timeout):
        """Log ultra-detalhado da requisição"""
        self.logger.info("="*100)
        self.logger.info(f"🚀 REQUISIÇÃO ULTRA-DETALHADA - AMBIENTE: {self.ambiente}")
        self.logger.info("="*100)
        
        # Dados do ambiente
        self.logger.info(f"🌍 AMBIENTE: {self.ambiente}")
        self.logger.info(f"🔧 Django DEBUG: {getattr(settings, 'DEBUG', 'N/A')}")
        self.logger.info(f"🌐 RAILWAY_ENVIRONMENT: {os.getenv('RAILWAY_ENVIRONMENT_NAME', 'Não definido')}")
        self.logger.info(f"🏷️ URL Base Detectada: {url.split('/api/')[0] if '/api/' in url else url}")
        
        # Detalhes da requisição
        self.logger.info(f"📡 URL COMPLETA: {url}")
        self.logger.info(f"⏰ TIMEOUT: {timeout} segundos")
        self.logger.info(f"📅 Timestamp: {timezone.now().isoformat()}")
        
        # Headers completos
        self.logger.info(f"📋 HEADERS ENVIADOS:")
        for key, value in headers.items():
            self.logger.info(f"   {key}: {value}")
        
        # Payload completo
        self.logger.info(f"📦 PAYLOAD COMPLETO:")
        if isinstance(payload, dict):
            for key, value in payload.items():
                self.logger.info(f"   {key}: {value} (tipo: {type(value).__name__})")
        else:
            self.logger.info(f"   {payload} (tipo: {type(payload).__name__})")
        
        # Variáveis de ambiente relevantes
        self.logger.info(f"🔑 VARIÁVEIS DE AMBIENTE RELEVANTES:")
        env_vars = [
            'ECOMHUB_SELENIUM_SERVER',
            'DATABASE_URL',
            'REDIS_URL',
            'ALLOWED_HOSTS',
            'RAILWAY_PUBLIC_DOMAIN'
        ]
        for var in env_vars:
            valor = os.getenv(var, 'NÃO DEFINIDO')
            # Mascarar dados sensíveis
            if 'URL' in var and valor != 'NÃO DEFINIDO':
                valor = self._mascarar_url(valor)
            self.logger.info(f"   {var}: {valor}")
        
        # Informações de rede/IP
        self.logger.info(f"🌐 INFORMAÇÕES DE REDE:")
        try:
            import socket
            hostname = socket.gethostname()
            local_ip = socket.gethostbyname(hostname)
            self.logger.info(f"   Hostname: {hostname}")
            self.logger.info(f"   IP Local: {local_ip}")
        except Exception as e:
            self.logger.info(f"   Erro obtendo IP: {e}")
    
    def log_resposta_detalhada(self, response, tempo_resposta):
        """Log ultra-detalhado da resposta"""
        self.logger.info("="*100)
        self.logger.info(f"📡 RESPOSTA ULTRA-DETALHADA - AMBIENTE: {self.ambiente}")
        self.logger.info("="*100)
        
        # Status da resposta
        self.logger.info(f"📊 STATUS CODE: {response.status_code}")
        self.logger.info(f"⏱️ TEMPO DE RESPOSTA: {tempo_resposta:.2f} segundos")
        self.logger.info(f"📏 TAMANHO DA RESPOSTA: {len(response.text)} caracteres")
        
        # Headers da resposta
        self.logger.info(f"📋 HEADERS DA RESPOSTA:")
        for key, value in response.headers.items():
            self.logger.info(f"   {key}: {value}")
        
        # Content-Type específico
        content_type = response.headers.get('content-type', 'não informado')
        self.logger.info(f"🏷️ CONTENT-TYPE: {content_type}")
        
        # Análise do conteúdo
        if response.status_code == 200:
            self.logger.info(f"✅ RESPOSTA SUCCESSFUL")
            
            # Verificar se é JSON válido
            try:
                json_data = response.json()
                self.logger.info(f"✅ JSON VÁLIDO DECODIFICADO")
                self.logger.info(f"📊 TIPO DA RESPOSTA: {type(json_data).__name__}")
                
                if isinstance(json_data, dict):
                    self.logger.info(f"🔑 CHAVES DISPONÍVEIS: {list(json_data.keys())}")
                    
                    # Análise detalhada por chave
                    for key, value in json_data.items():
                        if isinstance(value, (list, dict)):
                            if isinstance(value, list):
                                self.logger.info(f"   📋 {key}: LISTA com {len(value)} itens")
                                if len(value) > 0:
                                    self.logger.info(f"      Primeiro item: {str(value[0])[:200]}...")
                            elif isinstance(value, dict):
                                self.logger.info(f"   📋 {key}: DICT com chaves: {list(value.keys())}")
                        else:
                            self.logger.info(f"   📋 {key}: {type(value).__name__} = {str(value)[:100]}...")
                    
                    # Foco nos dados processados
                    dados_processados = json_data.get('dados_processados', {})
                    self.logger.info(f"🎯 ANÁLISE ESPECÍFICA - dados_processados:")
                    self.logger.info(f"   Tipo: {type(dados_processados).__name__}")
                    
                    if isinstance(dados_processados, dict):
                        self.logger.info(f"   Chaves: {list(dados_processados.keys())}")
                        
                        # Verificar se tem pedidos individuais
                        if 'pedidos' in dados_processados:
                            pedidos = dados_processados['pedidos']
                            self.logger.info(f"   🎯 PEDIDOS INDIVIDUAIS ENCONTRADOS: {len(pedidos) if isinstance(pedidos, list) else 'NÃO É LISTA'}")
                        else:
                            self.logger.info(f"   ❌ PEDIDOS INDIVIDUAIS NÃO ENCONTRADOS")
                        
                        # Verificar dados agregados
                        if 'visualizacao_total' in dados_processados:
                            viz_total = dados_processados['visualizacao_total']
                            self.logger.info(f"   📊 DADOS AGREGADOS (visualizacao_total): {len(viz_total) if isinstance(viz_total, list) else 'NÃO É LISTA'}")
                        
                        if 'stats_total' in dados_processados:
                            stats = dados_processados['stats_total']
                            self.logger.info(f"   📊 ESTATÍSTICAS (stats_total): {len(stats) if isinstance(stats, list) else 'NÃO É LISTA'}")
                    
                    elif isinstance(dados_processados, list):
                        self.logger.info(f"   📋 LISTA com {len(dados_processados)} itens")
                        if len(dados_processados) > 0:
                            primeiro_item = dados_processados[0]
                            self.logger.info(f"   🎯 PRIMEIRO ITEM: {type(primeiro_item).__name__}")
                            if isinstance(primeiro_item, dict):
                                self.logger.info(f"      Chaves: {list(primeiro_item.keys())}")
                                # Verificar se parece com pedido individual
                                campos_pedido = ['pedido_id', 'order_id', 'customer_name', 'status']
                                tem_campos_pedido = any(campo in primeiro_item for campo in campos_pedido)
                                self.logger.info(f"      🎯 PARECE PEDIDO INDIVIDUAL: {tem_campos_pedido}")
                            else:
                                self.logger.info(f"      Conteúdo: {str(primeiro_item)[:200]}...")
                    
                elif isinstance(json_data, list):
                    self.logger.info(f"📋 LISTA com {len(json_data)} itens")
                    if len(json_data) > 0:
                        self.logger.info(f"   Primeiro item: {str(json_data[0])[:200]}...")
                
            except json.JSONDecodeError as e:
                self.logger.error(f"❌ ERRO DECODIFICANDO JSON: {e}")
                self.logger.error(f"❌ CONTEÚDO RAW (primeiros 1000 chars): {response.text[:1000]}")
                
                # Verificar se é HTML (erro comum)
                if response.text.strip().startswith('<'):
                    self.logger.error(f"⚠️ RESPOSTA PARECE SER HTML (possivelmente página de erro)")
                    # Extrair title da página se for HTML
                    import re
                    title_match = re.search(r'<title>(.*?)</title>', response.text, re.IGNORECASE)
                    if title_match:
                        self.logger.error(f"📄 TÍTULO DA PÁGINA: {title_match.group(1)}")
        else:
            self.logger.error(f"❌ RESPOSTA COM ERRO - Status: {response.status_code}")
            self.logger.error(f"❌ CONTEÚDO COMPLETO: {response.text}")
    
    def log_comparacao_ambientes(self, local_data=None, prod_data=None):
        """Log de comparação entre dados de diferentes ambientes"""
        self.logger.info("="*100)
        self.logger.info(f"🔍 COMPARAÇÃO ENTRE AMBIENTES")
        self.logger.info("="*100)
        
        if local_data:
            self.logger.info(f"🏠 DADOS LOCAL:")
            self.logger.info(f"   Tipo: {type(local_data).__name__}")
            self.logger.info(f"   Conteúdo: {str(local_data)[:500]}...")
        
        if prod_data:
            self.logger.info(f"🌐 DADOS PRODUÇÃO:")
            self.logger.info(f"   Tipo: {type(prod_data).__name__}")
            self.logger.info(f"   Conteúdo: {str(prod_data)[:500]}...")
        
        # Análise das diferenças
        if local_data and prod_data:
            self.logger.info(f"🔍 ANÁLISE DE DIFERENÇAS:")
            
            local_type = type(local_data).__name__
            prod_type = type(prod_data).__name__
            
            if local_type != prod_type:
                self.logger.warning(f"⚠️ TIPOS DIFERENTES: Local={local_type}, Prod={prod_type}")
            else:
                self.logger.info(f"✅ TIPOS IGUAIS: {local_type}")
            
            # Se ambos são dicts
            if isinstance(local_data, dict) and isinstance(prod_data, dict):
                local_keys = set(local_data.keys())
                prod_keys = set(prod_data.keys())
                
                keys_only_local = local_keys - prod_keys
                keys_only_prod = prod_keys - local_keys
                common_keys = local_keys & prod_keys
                
                if keys_only_local:
                    self.logger.warning(f"🏠 CHAVES APENAS NO LOCAL: {keys_only_local}")
                if keys_only_prod:
                    self.logger.warning(f"🌐 CHAVES APENAS NA PRODUÇÃO: {keys_only_prod}")
                if common_keys:
                    self.logger.info(f"✅ CHAVES EM COMUM: {common_keys}")
    
    def _mascarar_url(self, url):
        """Mascara partes sensíveis de URLs"""
        import re
        # Mascarar passwords
        url = re.sub(r'://([^:]+):([^@]+)@', r'://\1:****@', url)
        return url
    
    def log_erro_detalhado(self, erro, contexto=""):
        """Log detalhado de erros"""
        self.logger.error("="*100)
        self.logger.error(f"❌ ERRO DETALHADO - AMBIENTE: {self.ambiente}")
        self.logger.error("="*100)
        self.logger.error(f"📍 CONTEXTO: {contexto}")
        self.logger.error(f"❌ TIPO DO ERRO: {type(erro).__name__}")
        self.logger.error(f"❌ MENSAGEM: {str(erro)}")
        
        # Traceback completo
        import traceback
        self.logger.error(f"📋 TRACEBACK COMPLETO:")
        self.logger.error(traceback.format_exc())
        
        self.logger.error("="*100)
    
    def detectar_tipo_resposta(self, response_text):
        """Detecta automaticamente o tipo de resposta"""
        response_text = response_text.strip()
        
        # HTML
        if response_text.startswith('<') and ('html' in response_text.lower() or 'DOCTYPE' in response_text):
            return 'HTML'
        
        # JSON
        if (response_text.startswith('{') and response_text.endswith('}')) or \
           (response_text.startswith('[') and response_text.endswith(']')):
            return 'JSON'
        
        # XML
        if response_text.startswith('<?xml') or response_text.startswith('<xml'):
            return 'XML'
        
        # Texto simples
        return 'TEXT'

# Instância singleton
ultra_logging = UltraLoggingService()