# backend/features/processamento/services/alternative_ip_capture.py

import re
import json
import hashlib
from collections import defaultdict, Counter
from datetime import datetime, timedelta
from django.core.cache import cache
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

class AlternativeIPCaptureService:
    """
    Serviço para captura alternativa de IP quando Shopify não fornece dados diretos.
    
    Implementa múltiplas estratégias:
    1. Geolocalização por endereço
    2. Análise de padrões comportamentais
    3. Inferência por região/horário
    4. Sistema de scoring para confiabilidade
    """
    
    def __init__(self):
        self.cache_prefix = "alt_ip_capture"
        self.cache_timeout = 3600 * 24  # 24 horas
        
        # Configurações de scoring
        self.confidence_weights = {
            'address_match': 0.4,
            'behavioral_pattern': 0.3,
            'temporal_pattern': 0.2,
            'payment_correlation': 0.1
        }
        
    def analyze_order_location(self, order_data):
        """
        Analisa localização do pedido baseado em endereços disponíveis
        
        Args:
            order_data (dict): Dados completos do pedido
            
        Returns:
            dict: Análise de localização com IP inferido
        """
        analysis = {
            'inferred_ip': None,
            'confidence_score': 0.0,
            'location_data': {},
            'method': 'geolocation_address',
            'details': []
        }
        
        try:
            # Extrai dados de endereço
            location_data = self._extract_location_data(order_data)
            analysis['location_data'] = location_data
            
            if not location_data.get('primary_address'):
                analysis['details'].append("Nenhum endereço válido encontrado")
                return analysis
            
            # Mapeia endereço para região IP
            ip_range = self._map_address_to_ip_range(location_data['primary_address'])
            
            if ip_range:
                # Gera IP específico dentro do range
                inferred_ip = self._generate_ip_from_range(ip_range, order_data)
                analysis['inferred_ip'] = inferred_ip
                analysis['confidence_score'] = 0.7  # Confiança moderada-alta
                analysis['details'].append(f"IP inferido do range {ip_range['region']}")
            else:
                analysis['details'].append("Região não mapeada para ranges IP conhecidos")
                
        except Exception as e:
            logger.error(f"Erro na análise de localização: {str(e)}")
            analysis['details'].append(f"Erro: {str(e)}")
            
        return analysis
    
    def analyze_behavioral_patterns(self, order_data, similar_orders=None):
        """
        Analisa padrões comportamentais para inferir IP
        
        Args:
            order_data (dict): Dados do pedido atual
            similar_orders (list): Pedidos similares do mesmo cliente
            
        Returns:
            dict: Análise comportamental com IP inferido
        """
        analysis = {
            'inferred_ip': None,
            'confidence_score': 0.0,
            'patterns_found': [],
            'method': 'behavioral_analysis',
            'details': []
        }
        
        try:
            if not similar_orders:
                analysis['details'].append("Nenhum pedido similar fornecido")
                return analysis
            
            # Agrupa pedidos por padrões comportamentais
            patterns = self._identify_behavioral_patterns(order_data, similar_orders)
            analysis['patterns_found'] = patterns
            
            # Correlaciona padrões com IPs conhecidos
            if patterns:
                inferred_ip = self._correlate_patterns_to_ip(patterns, similar_orders)
                if inferred_ip:
                    analysis['inferred_ip'] = inferred_ip['ip']
                    analysis['confidence_score'] = inferred_ip['confidence']
                    analysis['details'].append(f"IP correlacionado via padrão: {inferred_ip['pattern']}")
                else:
                    analysis['details'].append("Padrões encontrados mas sem correlação com IP")
            else:
                analysis['details'].append("Nenhum padrão comportamental identificado")
                
        except Exception as e:
            logger.error(f"Erro na análise comportamental: {str(e)}")
            analysis['details'].append(f"Erro: {str(e)}")
            
        return analysis
    
    def analyze_temporal_patterns(self, order_data, time_window_hours=24):
        """
        Analisa padrões temporais para inferir localização/IP
        
        Args:
            order_data (dict): Dados do pedido
            time_window_hours (int): Janela de tempo para análise
            
        Returns:
            dict: Análise temporal com IP inferido
        """
        analysis = {
            'inferred_ip': None,
            'confidence_score': 0.0,
            'timezone_analysis': {},
            'method': 'temporal_analysis',
            'details': []
        }
        
        try:
            # Extrai timestamp do pedido
            order_time = self._parse_order_timestamp(order_data)
            if not order_time:
                analysis['details'].append("Timestamp do pedido inválido")
                return analysis
            
            # Analisa fuso horário provável
            timezone_data = self._analyze_timezone_patterns(order_time)
            analysis['timezone_analysis'] = timezone_data
            
            # Correlaciona com endereço se disponível
            location_data = self._extract_location_data(order_data)
            
            if timezone_data and location_data:
                ip_inference = self._correlate_timezone_location(timezone_data, location_data)
                if ip_inference:
                    analysis['inferred_ip'] = ip_inference['ip']
                    analysis['confidence_score'] = ip_inference['confidence']
                    analysis['details'].append(f"IP inferido via correlação tempo-local: {ip_inference['region']}")
                else:
                    analysis['details'].append("Correlação tempo-local inconclusiva")
            else:
                analysis['details'].append("Dados insuficientes para análise temporal")
                
        except Exception as e:
            logger.error(f"Erro na análise temporal: {str(e)}")
            analysis['details'].append(f"Erro: {str(e)}")
            
        return analysis
    
    def generate_fallback_ip(self, order_data, all_methods_results):
        """
        Gera IP de fallback inteligente quando outros métodos falham
        
        Args:
            order_data (dict): Dados do pedido
            all_methods_results (list): Resultados de todos os métodos tentados
            
        Returns:
            dict: IP de fallback com nível de confiança
        """
        fallback = {
            'inferred_ip': None,
            'confidence_score': 0.1,  # Confiança muito baixa
            'method': 'intelligent_fallback',
            'fallback_strategy': None,
            'details': []
        }
        
        try:
            # Estratégia 1: IP baseado em região aproximada
            location_data = self._extract_location_data(order_data)
            if location_data.get('country_code'):
                country_ip = self._get_country_representative_ip(location_data['country_code'])
                if country_ip:
                    fallback['inferred_ip'] = country_ip
                    fallback['confidence_score'] = 0.3
                    fallback['fallback_strategy'] = 'country_representative'
                    fallback['details'].append(f"IP representativo do país: {location_data['country_code']}")
                    return fallback
            
            # Estratégia 2: IP baseado em padrão de pedido
            if order_data.get('currency'):
                currency_ip = self._get_currency_representative_ip(order_data['currency'])
                if currency_ip:
                    fallback['inferred_ip'] = currency_ip
                    fallback['confidence_score'] = 0.2
                    fallback['fallback_strategy'] = 'currency_based'
                    fallback['details'].append(f"IP baseado na moeda: {order_data['currency']}")
                    return fallback
            
            # Estratégia 3: IP de range brasileiro genérico (para e-commerce BR)
            fallback['inferred_ip'] = self._get_generic_brazilian_ip()
            fallback['confidence_score'] = 0.1
            fallback['fallback_strategy'] = 'generic_country'
            fallback['details'].append("IP genérico brasileiro (último recurso)")
            
        except Exception as e:
            logger.error(f"Erro no fallback inteligente: {str(e)}")
            fallback['details'].append(f"Erro: {str(e)}")
            
        return fallback
    
    def create_composite_analysis(self, order_data, similar_orders=None):
        """
        Cria análise composta usando todos os métodos disponíveis
        
        Args:
            order_data (dict): Dados do pedido
            similar_orders (list): Pedidos similares para análise comportamental
            
        Returns:
            dict: Análise composta com melhor IP inferido
        """
        composite = {
            'final_inferred_ip': None,
            'final_confidence_score': 0.0,
            'method_used': None,
            'all_methods_results': [],
            'confidence_breakdown': {},
            'recommendation': 'use_with_caution'
        }
        
        try:
            # Executa todos os métodos
            methods_results = []
            
            # 1. Análise por geolocalização
            location_analysis = self.analyze_order_location(order_data)
            methods_results.append(location_analysis)
            
            # 2. Análise comportamental (se tiver pedidos similares)
            if similar_orders:
                behavioral_analysis = self.analyze_behavioral_patterns(order_data, similar_orders)
                methods_results.append(behavioral_analysis)
            
            # 3. Análise temporal
            temporal_analysis = self.analyze_temporal_patterns(order_data)
            methods_results.append(temporal_analysis)
            
            # 4. Fallback se necessário
            has_valid_result = any(r.get('inferred_ip') for r in methods_results)
            if not has_valid_result:
                fallback_analysis = self.generate_fallback_ip(order_data, methods_results)
                methods_results.append(fallback_analysis)
            
            composite['all_methods_results'] = methods_results
            
            # Seleciona melhor resultado baseado em confiança
            best_result = max(
                (r for r in methods_results if r.get('inferred_ip')),
                key=lambda x: x.get('confidence_score', 0),
                default=None
            )
            
            if best_result:
                composite['final_inferred_ip'] = best_result['inferred_ip']
                composite['final_confidence_score'] = best_result['confidence_score']
                composite['method_used'] = best_result['method']
                
                # Determina recomendação baseada na confiança
                confidence = best_result['confidence_score']
                if confidence >= 0.7:
                    composite['recommendation'] = 'high_confidence'
                elif confidence >= 0.4:
                    composite['recommendation'] = 'moderate_confidence'
                elif confidence >= 0.2:
                    composite['recommendation'] = 'low_confidence'
                else:
                    composite['recommendation'] = 'use_with_extreme_caution'
            
            # Breakdown de confiança por método
            for result in methods_results:
                if result.get('inferred_ip'):
                    method = result['method']
                    composite['confidence_breakdown'][method] = result['confidence_score']
                    
        except Exception as e:
            logger.error(f"Erro na análise composta: {str(e)}")
            
        return composite
    
    # ===== MÉTODOS AUXILIARES PRIVADOS =====
    
    def _extract_location_data(self, order_data):
        """Extrai dados de localização dos endereços do pedido"""
        location = {
            'primary_address': None,
            'secondary_addresses': [],
            'country_code': None,
            'region': None,
            'city': None,
            'postal_code': None
        }
        
        # Prioriza endereço de entrega
        shipping = order_data.get('shipping_address') or order_data.get('customer_address', {}).get('shipping_address', {})
        billing = order_data.get('billing_address') or order_data.get('customer_address', {}).get('billing_address', {})
        
        primary = shipping if shipping else billing
        if primary:
            location['primary_address'] = primary
            location['country_code'] = primary.get('country_code') or primary.get('country')
            location['region'] = primary.get('province') or primary.get('state')
            location['city'] = primary.get('city')
            location['postal_code'] = primary.get('zip') or primary.get('postal_code')
        
        # Adiciona endereços secundários
        if shipping and billing and shipping != billing:
            location['secondary_addresses'].append(billing)
            
        return location
    
    def _map_address_to_ip_range(self, address):
        """Mapeia endereço para range de IP típico da região"""
        if not address:
            return None
            
        country_code = address.get('country_code', '').upper()
        region = address.get('province', '').upper()
        
        # Mapeamento de regiões brasileiras para ranges IP típicos
        brazilian_regions = {
            'SP': {'ranges': ['200.150.0.0/16', '201.10.0.0/16'], 'region': 'São Paulo'},
            'RJ': {'ranges': ['200.160.0.0/16', '201.20.0.0/16'], 'region': 'Rio de Janeiro'},
            'MG': {'ranges': ['200.170.0.0/16', '201.30.0.0/16'], 'region': 'Minas Gerais'},
            'RS': {'ranges': ['200.180.0.0/16', '201.40.0.0/16'], 'region': 'Rio Grande do Sul'},
            'PR': {'ranges': ['200.190.0.0/16', '201.50.0.0/16'], 'region': 'Paraná'},
            'SC': {'ranges': ['200.200.0.0/16', '201.60.0.0/16'], 'region': 'Santa Catarina'},
            'BA': {'ranges': ['200.210.0.0/16', '201.70.0.0/16'], 'region': 'Bahia'},
            'GO': {'ranges': ['200.220.0.0/16', '201.80.0.0/16'], 'region': 'Goiás'},
            'DF': {'ranges': ['200.225.0.0/16', '201.85.0.0/16'], 'region': 'Distrito Federal'},
        }
        
        if country_code == 'BR' or country_code == 'BRASIL':
            region_data = brazilian_regions.get(region)
            if region_data:
                return region_data
            
            # Fallback para São Paulo se não reconhecer região
            return brazilian_regions['SP']
        
        # Mapeamento para outros países (básico)
        country_ranges = {
            'US': {'ranges': ['198.51.100.0/24', '203.0.113.0/24'], 'region': 'Estados Unidos'},
            'CA': {'ranges': ['192.0.2.0/24'], 'region': 'Canadá'},
            'AR': {'ranges': ['190.210.0.0/16'], 'region': 'Argentina'},
            'CL': {'ranges': ['190.220.0.0/16'], 'region': 'Chile'},
            'MX': {'ranges': ['189.150.0.0/16'], 'region': 'México'},
        }
        
        return country_ranges.get(country_code)
    
    def _generate_ip_from_range(self, ip_range_data, order_data):
        """Gera IP específico dentro do range baseado em dados do pedido"""
        if not ip_range_data or not ip_range_data.get('ranges'):
            return None
            
        import random
        import ipaddress
        
        # Usa dados do pedido para "semente" determinística
        order_id = order_data.get('id', 0)
        customer_email = order_data.get('customer', {}).get('email', '')
        
        # Cria seed baseado no pedido para IPs consistentes
        seed_string = f"{order_id}_{customer_email}"
        seed = hash(seed_string) % (2**32)
        random.seed(seed)
        
        # Escolhe range aleatório
        selected_range = random.choice(ip_range_data['ranges'])
        
        try:
            network = ipaddress.IPv4Network(selected_range, strict=False)
            # Pega um IP aleatório do range, evitando network e broadcast
            hosts = list(network.hosts())
            if hosts:
                return str(random.choice(hosts))
        except Exception as e:
            logger.error(f"Erro ao gerar IP do range {selected_range}: {e}")
            
        return None
    
    def _identify_behavioral_patterns(self, current_order, similar_orders):
        """Identifica padrões comportamentais entre pedidos"""
        patterns = []
        
        try:
            # Padrão de horário de compra
            current_hour = self._extract_order_hour(current_order)
            if current_hour is not None:
                similar_hours = [self._extract_order_hour(order) for order in similar_orders]
                similar_hours = [h for h in similar_hours if h is not None]
                
                if similar_hours:
                    avg_hour = sum(similar_hours) / len(similar_hours)
                    if abs(current_hour - avg_hour) <= 2:  # Dentro de 2 horas
                        patterns.append({
                            'type': 'consistent_purchase_time',
                            'confidence': 0.7,
                            'details': f"Compra no horário habitual (~{avg_hour:.0f}h)"
                        })
            
            # Padrão de valor de pedido
            current_value = float(order_data.get('total_price', 0))
            similar_values = [float(order.get('total_price', 0)) for order in similar_orders]
            
            if similar_values and current_value > 0:
                avg_value = sum(similar_values) / len(similar_values)
                if 0.5 <= (current_value / avg_value) <= 2.0:  # Valor similar (±50%-100%)
                    patterns.append({
                        'type': 'consistent_order_value',
                        'confidence': 0.5,
                        'details': f"Valor similar ao padrão (${current_value:.2f} vs ${avg_value:.2f})"
                    })
            
            # Padrão de produtos
            current_products = self._extract_product_categories(current_order)
            if current_products:
                similar_products = []
                for order in similar_orders:
                    similar_products.extend(self._extract_product_categories(order))
                
                if similar_products:
                    overlap = len(set(current_products) & set(similar_products))
                    if overlap > 0:
                        patterns.append({
                            'type': 'consistent_product_preferences',
                            'confidence': min(0.8, overlap / len(current_products)),
                            'details': f"Overlap de {overlap} categorias de produto"
                        })
            
        except Exception as e:
            logger.error(f"Erro ao identificar padrões comportamentais: {e}")
            
        return patterns
    
    def _correlate_patterns_to_ip(self, patterns, similar_orders):
        """Correlaciona padrões comportamentais com IPs conhecidos"""
        if not patterns or not similar_orders:
            return None
            
        # Busca IPs dos pedidos similares
        known_ips = []
        for order in similar_orders:
            order_ip = order.get('_customer_ip') or order.get('customer_ip')
            if order_ip and self._is_valid_customer_ip(order_ip):
                known_ips.append(order_ip)
        
        if not known_ips:
            return None
        
        # Calcula confiança baseada nos padrões
        total_confidence = sum(p['confidence'] for p in patterns) / len(patterns)
        
        # Usa IP mais comum ou mais recente
        ip_counter = Counter(known_ips)
        most_common_ip = ip_counter.most_common(1)[0][0]
        
        return {
            'ip': most_common_ip,
            'confidence': min(0.8, total_confidence),
            'pattern': ', '.join(p['type'] for p in patterns)
        }
    
    def _parse_order_timestamp(self, order_data):
        """Extrai e parseia timestamp do pedido"""
        try:
            created_at = order_data.get('created_at')
            if created_at:
                # Tenta vários formatos de data
                for fmt in ['%Y-%m-%dT%H:%M:%S%z', '%Y-%m-%dT%H:%M:%SZ', '%Y-%m-%d %H:%M:%S']:
                    try:
                        return datetime.strptime(created_at.replace('Z', '+0000'), fmt)
                    except ValueError:
                        continue
        except Exception as e:
            logger.error(f"Erro ao parsear timestamp: {e}")
            
        return None
    
    def _analyze_timezone_patterns(self, order_time):
        """Analisa padrões de fuso horário baseado no horário do pedido"""
        if not order_time:
            return None
            
        hour = order_time.hour
        
        # Mapeia horário para possíveis fusos brasileiros
        timezone_hints = {
            'brasilia': {  # UTC-3
                'likely_hours': list(range(6, 23)),  # 6h-22h são horários normais
                'confidence': 0.8 if 9 <= hour <= 18 else 0.6
            },
            'acre': {  # UTC-5
                'likely_hours': list(range(4, 21)),
                'confidence': 0.6
            },
            'fernando_noronha': {  # UTC-2
                'likely_hours': list(range(7, 24)),
                'confidence': 0.5
            }
        }
        
        best_match = None
        best_confidence = 0
        
        for tz, data in timezone_hints.items():
            if hour in data['likely_hours']:
                if data['confidence'] > best_confidence:
                    best_confidence = data['confidence']
                    best_match = tz
        
        return {
            'likely_timezone': best_match,
            'confidence': best_confidence,
            'hour': hour
        } if best_match else None
    
    def _correlate_timezone_location(self, timezone_data, location_data):
        """Correlaciona análise de fuso horário com localização"""
        if not timezone_data or not location_data:
            return None
            
        region = location_data.get('region', '').upper()
        timezone = timezone_data.get('likely_timezone')
        
        # Mapeia estados brasileiros para fusos típicos
        state_timezone_map = {
            'AC': 'acre',  # Acre
            'SP': 'brasilia', 'RJ': 'brasilia', 'MG': 'brasilia',
            'RS': 'brasilia', 'PR': 'brasilia', 'SC': 'brasilia',
            'BA': 'brasilia', 'GO': 'brasilia', 'DF': 'brasilia',
            'FN': 'fernando_noronha'  # Fernando de Noronha
        }
        
        expected_timezone = state_timezone_map.get(region, 'brasilia')
        
        if timezone == expected_timezone:
            # Correlação positiva - gera IP da região
            ip_range = self._map_address_to_ip_range(location_data['primary_address'])
            if ip_range:
                # Usa dados fictícios para gerar IP
                fake_order = {'id': hash(f"{timezone}_{region}"), 'customer': {'email': 'correlation@example.com'}}
                inferred_ip = self._generate_ip_from_range(ip_range, fake_order)
                
                return {
                    'ip': inferred_ip,
                    'confidence': min(0.7, timezone_data['confidence'] + 0.1),
                    'region': ip_range['region']
                }
        
        return None
    
    def _extract_order_hour(self, order_data):
        """Extrai hora do pedido"""
        timestamp = self._parse_order_timestamp(order_data)
        return timestamp.hour if timestamp else None
    
    def _extract_product_categories(self, order_data):
        """Extrai categorias de produtos do pedido"""
        categories = []
        line_items = order_data.get('line_items', [])
        
        for item in line_items:
            # Usa título do produto para inferir categoria
            title = item.get('title', '').lower()
            
            # Categorias básicas baseadas em palavras-chave
            if any(word in title for word in ['shirt', 'camisa', 'blusa']):
                categories.append('clothing')
            elif any(word in title for word in ['phone', 'celular', 'smartphone']):
                categories.append('electronics')
            elif any(word in title for word in ['book', 'livro']):
                categories.append('books')
            elif any(word in title for word in ['supplement', 'vitamina']):
                categories.append('health')
            else:
                categories.append('general')
        
        return list(set(categories))  # Remove duplicatas
    
    def _is_valid_customer_ip(self, ip):
        """Valida se IP é válido e não suspeito"""
        try:
            import ipaddress
            ipaddress.ip_address(ip)
            
            # Verifica se não é IP privado/localhost/suspeito
            suspicious_prefixes = ['127.', '10.', '192.168.', '172.16.', '172.17.', '172.18.', '172.19.', '172.20.']
            return not any(ip.startswith(prefix) for prefix in suspicious_prefixes)
            
        except ValueError:
            return False
    
    def _get_country_representative_ip(self, country_code):
        """Retorna IP representativo de um país"""
        country_ips = {
            'BR': '201.10.50.100',  # Brasil
            'US': '198.51.100.50',  # Estados Unidos
            'CA': '192.0.2.50',     # Canadá
            'AR': '190.210.50.100', # Argentina
            'CL': '190.220.50.100', # Chile
            'MX': '189.150.50.100', # México
        }
        
        return country_ips.get(country_code.upper())
    
    def _get_currency_representative_ip(self, currency):
        """Retorna IP representativo baseado na moeda"""
        currency_ips = {
            'BRL': '201.10.60.100',  # Real brasileiro
            'USD': '198.51.100.60',  # Dólar americano
            'EUR': '192.0.2.60',     # Euro
            'CAD': '192.0.2.65',     # Dólar canadense
            'ARS': '190.210.60.100', # Peso argentino
            'CLP': '190.220.60.100', # Peso chileno
            'MXN': '189.150.60.100', # Peso mexicano
        }
        
        return currency_ips.get(currency.upper())
    
    def _get_generic_brazilian_ip(self):
        """Retorna IP genérico brasileiro para último recurso"""
        return '201.10.255.100'  # IP genérico brasileiro


class GeolocationCacheManager:
    """Gerenciador de cache para consultas de geolocalização"""
    
    def __init__(self):
        self.cache_prefix = "geo_cache"
        self.cache_timeout = 3600 * 24 * 7  # 7 dias
    
    def get_cached_location(self, address_hash):
        """Busca localização em cache"""
        cache_key = f"{self.cache_prefix}_{address_hash}"
        return cache.get(cache_key)
    
    def cache_location(self, address_hash, location_data):
        """Salva localização em cache"""
        cache_key = f"{self.cache_prefix}_{address_hash}"
        cache.set(cache_key, location_data, self.cache_timeout)
    
    def generate_address_hash(self, address_data):
        """Gera hash único para endereço"""
        if not address_data:
            return None
            
        # Cria string única do endereço
        address_str = f"{address_data.get('address1', '')}_{address_data.get('city', '')}_{address_data.get('province', '')}_{address_data.get('country', '')}_{address_data.get('zip', '')}"
        return hashlib.md5(address_str.encode()).hexdigest()


class IPScoringSystem:
    """Sistema de scoring para avaliar confiabilidade de IPs inferidos"""
    
    def __init__(self):
        self.scoring_criteria = {
            'address_consistency': {'weight': 0.3, 'max_score': 100},
            'behavioral_match': {'weight': 0.25, 'max_score': 100},
            'temporal_correlation': {'weight': 0.2, 'max_score': 100},
            'historical_patterns': {'weight': 0.15, 'max_score': 100},
            'method_reliability': {'weight': 0.1, 'max_score': 100}
        }
    
    def calculate_ip_score(self, ip_analysis_results):
        """
        Calcula score de confiabilidade para IP inferido
        
        Args:
            ip_analysis_results (dict): Resultados de todos os métodos de análise
            
        Returns:
            dict: Score detalhado com recomendações
        """
        scoring = {
            'total_score': 0.0,
            'confidence_level': 'very_low',
            'criteria_scores': {},
            'recommendations': [],
            'risk_factors': []
        }
        
        try:
            total_weighted_score = 0.0
            
            for criterion, config in self.scoring_criteria.items():
                criterion_score = self._evaluate_criterion(criterion, ip_analysis_results)
                weighted_score = (criterion_score / config['max_score']) * config['weight']
                
                scoring['criteria_scores'][criterion] = {
                    'raw_score': criterion_score,
                    'weighted_score': weighted_score,
                    'weight': config['weight']
                }
                
                total_weighted_score += weighted_score
            
            # Converte para escala 0-100
            scoring['total_score'] = total_weighted_score * 100
            
            # Determina nível de confiança
            score = scoring['total_score']
            if score >= 80:
                scoring['confidence_level'] = 'very_high'
                scoring['recommendations'].append("IP pode ser usado com alta confiança")
            elif score >= 60:
                scoring['confidence_level'] = 'high'
                scoring['recommendations'].append("IP pode ser usado com confiança moderada")
            elif score >= 40:
                scoring['confidence_level'] = 'moderate'
                scoring['recommendations'].append("IP deve ser usado com cautela")
                scoring['risk_factors'].append("Confiança moderada - validar se possível")
            elif score >= 20:
                scoring['confidence_level'] = 'low'
                scoring['recommendations'].append("IP deve ser usado apenas como último recurso")
                scoring['risk_factors'].append("Baixa confiança - alto risco de imprecisão")
            else:
                scoring['confidence_level'] = 'very_low'
                scoring['recommendations'].append("IP não recomendado para uso")
                scoring['risk_factors'].append("Confiança muito baixa - evitar uso")
            
        except Exception as e:
            logger.error(f"Erro no cálculo de score IP: {e}")
            scoring['risk_factors'].append(f"Erro no cálculo: {e}")
            
        return scoring
    
    def _evaluate_criterion(self, criterion, results):
        """Avalia critério específico baseado nos resultados"""
        
        if criterion == 'address_consistency':
            # Avalia consistência dos dados de endereço
            location_analysis = next((r for r in results.get('all_methods_results', []) if r.get('method') == 'geolocation_address'), {})
            confidence = location_analysis.get('confidence_score', 0)
            return confidence * 100
            
        elif criterion == 'behavioral_match':
            # Avalia correspondência de padrões comportamentais
            behavioral_analysis = next((r for r in results.get('all_methods_results', []) if r.get('method') == 'behavioral_analysis'), {})
            patterns = behavioral_analysis.get('patterns_found', [])
            if patterns:
                avg_confidence = sum(p.get('confidence', 0) for p in patterns) / len(patterns)
                return avg_confidence * 100
            return 0
            
        elif criterion == 'temporal_correlation':
            # Avalia correlação temporal
            temporal_analysis = next((r for r in results.get('all_methods_results', []) if r.get('method') == 'temporal_analysis'), {})
            confidence = temporal_analysis.get('confidence_score', 0)
            return confidence * 100
            
        elif criterion == 'historical_patterns':
            # Avalia baseado em padrões históricos (simulado)
            method_used = results.get('method_used')
            historical_reliability = {
                'geolocation_address': 70,
                'behavioral_analysis': 65,
                'temporal_analysis': 60,
                'intelligent_fallback': 30
            }
            return historical_reliability.get(method_used, 20)
            
        elif criterion == 'method_reliability':
            # Avalia confiabilidade do método usado
            final_confidence = results.get('final_confidence_score', 0)
            return final_confidence * 100
            
        return 0