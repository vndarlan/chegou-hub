# backend/core/services/primecod_service.py
import requests
from datetime import datetime
from django.conf import settings
from ..models import PrimeCODProduct, PrimeCODOrder, PrimeCODApiConfig
import os

class PrimeCODService:
    """
    Serviço para interagir com a API Prime COD.
    """
    
    @staticmethod
    def get_api_config():
        """Obtém a configuração ativa da API."""
        config = PrimeCODApiConfig.objects.filter(is_active=True).first()
        
        # Se não encontrar configuração no banco, tenta usar variável de ambiente
        if not config:
            import os
            api_key = os.getenv('PRIME_COD_API_KEY')
            if api_key:
                config = PrimeCODApiConfig(
                    api_key=api_key,
                    base_url="https://api.primecod.app/api",
                    is_active=True
                )
                config.save()
            else:
                raise ValueError("Configuração da API Prime COD não encontrada")
        return config
    
    @staticmethod
    def fetch_products(country_code=None):
        """
        Busca produtos da API Prime COD.
        """
        config = PrimeCODService.get_api_config()
        headers = {"Authorization": f"Bearer {config.api_key}"}
        
        params = {}
        if country_code:
            params['country_code'] = country_code
        
        endpoint = f"{config.base_url}/cod-drop/products"
        
        try:
            print(f"Tentando conexão com: {endpoint}")
            print(f"Headers: {headers}")
            print(f"Params: {params}")
            
            response = requests.get(endpoint, headers=headers, params=params)
            
            if response.status_code != 200:
                error_detail = response.text
                print(f"Erro da API: {error_detail}")
                raise Exception(f"Erro ao buscar produtos: {response.status_code} - {error_detail[:100]}")
                
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Erro de requisição: {str(e)}")
            raise Exception(f"Erro de conexão: {str(e)}")
    
    @staticmethod
    def fetch_leads(filters=None):
        """
        Busca leads/pedidos da API Prime COD.
        """
        config = PrimeCODService.get_api_config()
        headers = {"Authorization": f"Bearer {config.api_key}"}
        
        params = filters or {}
        
        endpoint = f"{config.base_url}/leads"
        response = requests.get(endpoint, headers=headers, params=params)
        
        if response.status_code != 200:
            raise Exception(f"Erro ao buscar pedidos: {response.status_code}")
            
        return response.json()
    
    @staticmethod
    def sync_products():
        """
        Sincroniza produtos da API com o banco de dados.
        """
        try:
            countries = ['es', 'fr', 'it', 'pt', 'de'] 
            
            for country in countries:
                try:
                    products_data = PrimeCODService.fetch_products(country)
                    
                    # Processa cada produto
                    for product in products_data.get('data', []):
                        sku = product.get('sku')
                        if not sku:
                            continue
                            
                        # Busca ou cria o produto
                        product_obj, created = PrimeCODProduct.objects.update_or_create(
                            sku=sku,
                            country_code=country,
                            defaults={
                                'name': product.get('name', f'Produto {sku}')
                            }
                        )
                except Exception as e:
                    print(f"Erro ao sincronizar país {country}: {str(e)}")
                    continue  # continua para o próximo país
                    
            return True
        except Exception as e:
            print(f"Erro geral na sincronização: {str(e)}")
            # Criar produtos de teste para desenvolvimento
            if os.getenv('DEBUG') == 'True':
                print("Criando dados de teste para desenvolvimento")
                for country in ['es', 'fr']:
                    for i in range(1, 4):
                        PrimeCODProduct.objects.update_or_create(
                            sku=f"TEST-{country}-{i}",
                            country_code=country,
                            defaults={'name': f"Produto Teste {i} ({country})"}
                        )
                return True
            return False
    
    @staticmethod
    def sync_orders(start_date=None, end_date=None):
        """
        Sincroniza pedidos da API com o banco de dados.
        """
        # Definir parâmetros de filtro
        filters = {}
        
        if start_date and end_date:
            filters['dates_range'] = [
                start_date.strftime('%Y-%m-%d'),
                end_date.strftime('%Y-%m-%d')
            ]
        
        # Buscar pedidos
        leads_data = PrimeCODService.fetch_leads(filters)
        
        # Processa cada pedido
        for lead in leads_data.get('data', []):
            reference = lead.get('reference')
            if not reference:
                continue
                
            # Buscar SKU do produto
            products = lead.get('products', [])
            if not products:
                continue
                
            sku = products[0].get('sku')
            country_code = lead.get('country_code', 'es')
            
            # Buscar produto relacionado
            try:
                product = PrimeCODProduct.objects.get(sku=sku, country_code=country_code)
            except PrimeCODProduct.DoesNotExist:
                # Criar produto se não existir
                product = PrimeCODProduct.objects.create(
                    sku=sku,
                    name=f"Produto {sku}",
                    country_code=country_code
                )
            
            # Criar ou atualizar pedido
            order_date = datetime.strptime(lead.get('date', ''), '%Y-%m-%d %H:%M:%S')
            
            PrimeCODOrder.objects.update_or_create(
                reference=reference,
                defaults={
                    'product': product,
                    'status': lead.get('status', 'new'),
                    'country_code': country_code,
                    'order_date': order_date,
                    'shipping_fees': lead.get('shipping_fees', 0),
                    'total_price': lead.get('total_price', 0)
                }
            )
        
        # Atualizar timestamp de sincronização
        config = PrimeCODService.get_api_config()
        config.last_sync = datetime.now()
        config.save()
        
        return True