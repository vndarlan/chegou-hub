# backend/core/services/primecod_service.py
import requests
from datetime import datetime, timezone
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
        Busca leads/pedidos da API Prime COD com tratamento melhorado para formato de resposta.
        """
        config = PrimeCODService.get_api_config()
        headers = {"Authorization": f"Bearer {config.api_key}"}
        
        params = filters or {}
        
        endpoint = f"{config.base_url}/leads"
        print(f"[PrimeCOD] Buscando pedidos de {endpoint} com filtros: {params}")
        
        try:
            response = requests.get(endpoint, headers=headers, params=params)
            
            if response.status_code != 200:
                print(f"[PrimeCOD] Erro HTTP {response.status_code}: {response.text[:200]}")
                raise Exception(f"Erro ao buscar pedidos: {response.status_code}")
            
            # Tratar diferentes formatos de resposta
            try:
                data = response.json()
                print(f"[PrimeCOD] Estrutura da resposta: {list(data.keys()) if isinstance(data, dict) else 'Não é um dicionário'}")
                
                # Verificar diferentes possíveis estruturas da resposta
                if isinstance(data, dict):
                    if 'data' in data:
                        return data
                    elif 'PrimeCOD' in data and isinstance(data['PrimeCOD'], list):
                        print(f"[PrimeCOD] Resposta contém chave 'PrimeCOD' com {len(data['PrimeCOD'])} itens")
                        return {'data': data['PrimeCOD']}
                    elif 'result' in data:
                        print(f"[PrimeCOD] Resposta contém chave 'result'")
                        return {'data': data['result']}
                    else:
                        # Tentar encontrar uma chave com lista de pedidos
                        for key, value in data.items():
                            if isinstance(value, list) and len(value) > 0:
                                print(f"[PrimeCOD] Usando '{key}' como fonte de dados ({len(value)} itens)")
                                return {'data': value}
                
                # Se chegou até aqui, tente usar o próprio data como lista
                if isinstance(data, list):
                    print(f"[PrimeCOD] Resposta é uma lista com {len(data)} itens")
                    return {'data': data}
                
                print(f"[PrimeCOD] Formato de resposta não reconhecido: {type(data)}")
                print(f"[PrimeCOD] Amostra da resposta: {str(data)[:500]}")
                return {'data': []}
                
            except ValueError as e:
                # A resposta não é JSON
                print(f"[PrimeCOD] Erro ao processar JSON: {str(e)}")
                print(f"[PrimeCOD] Amostra da resposta: {response.text[:500]}")
                return {'data': []}
        
        except Exception as e:
            print(f"[PrimeCOD] Erro de conexão: {str(e)}")
            raise Exception(f"Erro de conexão: {str(e)}")
    
    @staticmethod
    def sync_products():
        """
        Sincroniza produtos da API com o banco de dados.
        """
        # Lista de países incluindo Romênia e Polônia
        valid_countries = ['es', 'it', 'ro', 'pl'] 
        any_success = False
        
        for country in valid_countries:
            try:
                products_data = PrimeCODService.fetch_products(country)
                
                # Processa cada produto
                for product in products_data.get('data', []):
                    sku = product.get('sku')
                    if not sku:
                        continue
                        
                    try:
                        product_obj, created = PrimeCODProduct.objects.update_or_create(
                            sku=sku,
                            country_code=country,
                            defaults={
                                'name': product.get('name', f'Produto {sku}')
                            }
                        )
                        any_success = True
                    except Exception as e:
                        print(f"Erro ao salvar produto {sku}: {str(e)}")
                        continue
            except Exception as e:
                print(f"Erro ao sincronizar país {country}: {str(e)}")
                continue
        
        # Criar dados de exemplo se necessário
        if not any_success:
            print("Nenhum produto sincronizado. Criando dados de exemplo.")
            for country in ['es', 'it', 'ro', 'pl']:
                for i in range(1, 6):
                    try:
                        PrimeCODProduct.objects.get_or_create(
                            sku=f"DEMO-{country}-{i}",
                            country_code=country,
                            defaults={'name': f"Produto Demonstração {i} ({country.upper()})"}
                        )
                    except Exception:
                        pass
                        
            # Criar pedidos de exemplo
            for product in PrimeCODProduct.objects.all()[:10]:
                try:
                    from datetime import datetime, timezone
                    order_date = datetime.now(timezone.utc)
                    
                    PrimeCODOrder.objects.get_or_create(
                        reference=f"REF-{product.sku}",
                        defaults={
                            'product': product,
                            'status': 'new',
                            'country_code': product.country_code,
                            'order_date': order_date,
                            'shipping_fees': 10.0,
                            'total_price': 99.90
                        }
                    )
                except Exception as e:
                    print(f"Erro ao criar pedido de exemplo: {str(e)}")
    
    @staticmethod
    def sync_orders(start_date=None, end_date=None):
        """
        Sincroniza pedidos da API com o banco de dados.
        Versão modificada que não cria dados de exemplo quando a API falha.
        """
        # Definir parâmetros de filtro
        filters = {}
        
        if start_date and end_date:
            filters['dates_range'] = [
                start_date.strftime('%Y-%m-%d'),
                end_date.strftime('%Y-%m-%d')
            ]
        
        # Log para debug
        print(f"[PrimeCOD] Iniciando sincronização de pedidos com filtros: {filters}")
        
        try:
            # Buscar pedidos
            leads_data = PrimeCODService.fetch_leads(filters)
            
            # Verificar se temos dados
            if not leads_data or not isinstance(leads_data, dict):
                print(f"[PrimeCOD] ERRO: Resposta da API inválida: {leads_data}")
                return False  # Retorna False em vez de criar dados de exemplo
                
            # Verificar se temos a chave 'data'
            if 'data' not in leads_data or not leads_data['data']:
                print(f"[PrimeCOD] ERRO: Chave 'data' não encontrada ou vazia na resposta")
                return False  # Retorna False em vez de criar dados de exemplo
            
            leads = leads_data.get('data', [])
            total_pedidos = len(leads)
            print(f"[PrimeCOD] Total de pedidos recebidos: {total_pedidos}")
            
            if total_pedidos == 0:
                print(f"[PrimeCOD] AVISO: Nenhum pedido recebido da API.")
                return False  # Retorna False em vez de criar dados de exemplo
            
            # Contadores para monitoramento
            pedidos_criados = 0
            pedidos_atualizados = 0
            produtos_criados = 0
            erros = 0
            
            # Processar cada pedido
            for lead in leads:
                # Verificar se lead é um dicionário
                if not isinstance(lead, dict):
                    print(f"[PrimeCOD] AVISO: Lead não é um dicionário: {lead}")
                    continue
                    
                reference = lead.get('reference')
                if not reference:
                    print(f"[PrimeCOD] AVISO: Pedido sem referência ignorado")
                    continue
                
                # Log detalhado
                status = lead.get('status', 'unknown')
                print(f"[PrimeCOD] Processando pedido {reference}, status: {status}")
                
                # Buscar SKU do produto
                products = lead.get('products', [])
                if not products:
                    print(f"[PrimeCOD] AVISO: Pedido {reference} sem produtos ignorado")
                    continue
                
                # Verificar se products é uma lista ou um objeto
                if isinstance(products, dict):
                    products = [products]  # Converter para lista
                elif not isinstance(products, list):
                    print(f"[PrimeCOD] AVISO: Campo 'products' não é lista nem dicionário: {products}")
                    continue
                    
                # Obter o primeiro produto
                first_product = products[0] if products else None
                if not first_product:
                    print(f"[PrimeCOD] AVISO: Lista de produtos vazia para {reference}")
                    continue
                    
                # Verificar se first_product é um dicionário
                if not isinstance(first_product, dict):
                    print(f"[PrimeCOD] AVISO: Produto não é um dicionário: {first_product}")
                    continue
                    
                sku = first_product.get('sku')
                if not sku:
                    print(f"[PrimeCOD] AVISO: Produto sem SKU no pedido {reference}")
                    continue
                    
                country_code = lead.get('country_code', 'es')
                
                # Buscar produto relacionado
                try:
                    product = PrimeCODProduct.objects.get(sku=sku, country_code=country_code)
                except PrimeCODProduct.DoesNotExist:
                    # Criar produto se não existir
                    print(f"[PrimeCOD] Produto {sku} não encontrado. Criando novo produto.")
                    product_name = first_product.get('name', f"Produto {sku}")
                    try:
                        product = PrimeCODProduct.objects.create(
                            sku=sku,
                            name=product_name,
                            country_code=country_code
                        )
                        produtos_criados += 1
                    except Exception as e:
                        print(f"[PrimeCOD] ERRO ao criar produto {sku}: {str(e)}")
                        erros += 1
                        continue
                
                # Criar ou atualizar pedido
                try:
                    from datetime import datetime
                    
                    # Obter data do pedido
                    order_date_str = lead.get('date', '')
                    if not order_date_str:
                        print(f"[PrimeCOD] AVISO: Pedido {reference} sem data, usando data atual")
                        order_date = datetime.now()
                    else:
                        try:
                            # Tentar diversos formatos de data
                            formats = ['%Y-%m-%d %H:%M:%S', '%Y-%m-%d']
                            order_date = None
                            for fmt in formats:
                                try:
                                    order_date = datetime.strptime(order_date_str, fmt)
                                    break
                                except ValueError:
                                    continue
                                    
                            if not order_date:
                                raise ValueError(f"Nenhum formato válido para '{order_date_str}'")
                        except ValueError:
                            print(f"[PrimeCOD] ERRO: Formato de data inválido ({order_date_str}), usando data atual")
                            order_date = datetime.now()
                    
                    # Obter valores numéricos com segurança
                    try:
                        shipping_fees = float(lead.get('shipping_fees', 0))
                    except (ValueError, TypeError):
                        shipping_fees = 0
                        
                    try:
                        total_price = float(lead.get('total_price', 0))
                    except (ValueError, TypeError):
                        total_price = 0
                    
                    # Verificar se pedido já existe
                    pedido_existe = PrimeCODOrder.objects.filter(reference=reference).exists()
                    
                    # Criar ou atualizar pedido
                    print(f"[PrimeCOD] {'Atualizando' if pedido_existe else 'Criando'} pedido {reference} para produto {product.name}")
                    pedido, criado = PrimeCODOrder.objects.update_or_create(
                        reference=reference,
                        defaults={
                            'product': product,
                            'status': status,
                            'country_code': country_code,
                            'order_date': order_date,
                            'shipping_fees': shipping_fees,
                            'total_price': total_price
                        }
                    )
                    
                    if criado:
                        pedidos_criados += 1
                    else:
                        pedidos_atualizados += 1
                        
                except Exception as e:
                    print(f"[PrimeCOD] ERRO ao salvar pedido {reference}: {str(e)}")
                    erros += 1
            
            # Atualizar timestamp de sincronização
            from datetime import datetime, timezone
            config = PrimeCODService.get_api_config()
            config.last_sync = datetime.now(timezone.utc)
            config.save()
            
            if pedidos_criados + pedidos_atualizados == 0:
                print("[PrimeCOD] Nenhum pedido foi criado ou atualizado.")
                return False  # Retorna False em vez de criar dados de exemplo
                
            print(f"[PrimeCOD] Sincronização concluída: {pedidos_criados} pedidos criados, {pedidos_atualizados} atualizados, {produtos_criados} produtos criados, {erros} erros")
            return True
            
        except Exception as e:
            print(f"[PrimeCOD] ERRO ao sincronizar pedidos: {str(e)}")
            return False  # Retorna False em vez de criar dados de exemplo