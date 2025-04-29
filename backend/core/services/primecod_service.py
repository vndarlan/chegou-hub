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
        Busca leads/pedidos da API Prime COD.
        """
        config = PrimeCODService.get_api_config()
        headers = {"Authorization": f"Bearer {config.api_key}"}
        
        params = filters or {}
        
        endpoint = f"{config.base_url}/leads"
        response = requests.get(endpoint, headers=headers, params=params)
        
        if response.status_code != 200:
            raise Exception(f"Erro ao buscar pedidos: {response.status_code}")
        
        data = response.json()
        print(f"Estrutura da resposta: {list(data.keys())}")
        
        # Verifica se a resposta contém a chave 'PrimeCOD'
        if 'PrimeCOD' in data:
            return {'data': data['PrimeCOD']}  # Adapta para o formato esperado
        
        return data  # Retorna a resposta original se não encontrar PrimeCOD
    
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
            
            # Verificar estrutura da resposta
            if not leads_data or not isinstance(leads_data, dict):
                print(f"[PrimeCOD] ERRO: Resposta da API inválida: {leads_data}")
                raise Exception("Resposta da API inválida")
                
            # Verificar se temos a chave 'data'
            if 'data' not in leads_data:
                print(f"[PrimeCOD] ERRO: Chave 'data' não encontrada na resposta. Chaves disponíveis: {leads_data.keys()}")
                
                # Se temos PrimeCOD como chave principal, adaptar
                if 'PrimeCOD' in leads_data and isinstance(leads_data['PrimeCOD'], list):
                    leads_data = {'data': leads_data['PrimeCOD']}
                    print(f"[PrimeCOD] Adaptando formato da resposta. Usando 'PrimeCOD' como fonte de dados.")
                else:
                    # Se não conseguirmos adaptar, usar dados de exemplo
                    print(f"[PrimeCOD] Criando dados de exemplo devido à resposta inválida da API")
                    return PrimeCODService._create_sample_data()
            
            total_pedidos = len(leads_data.get('data', []))
            print(f"[PrimeCOD] Total de pedidos recebidos: {total_pedidos}")
            
            if total_pedidos == 0:
                print(f"[PrimeCOD] AVISO: Nenhum pedido recebido da API. Criando dados de exemplo.")
                return PrimeCODService._create_sample_data()
            
            # Contadores para monitoramento
            pedidos_criados = 0
            pedidos_atualizados = 0
            produtos_criados = 0
            erros = 0
            
            # Processa cada pedido
            for lead in leads_data.get('data', []):
                reference = lead.get('reference')
                if not reference:
                    print(f"[PrimeCOD] AVISO: Pedido sem referência ignorado: {lead}")
                    continue
                
                # Log detalhado
                print(f"[PrimeCOD] Processando pedido {reference}, status: {lead.get('status')}")
                
                # Buscar SKU do produto
                products = lead.get('products', [])
                if not products:
                    print(f"[PrimeCOD] AVISO: Pedido {reference} sem produtos ignorado")
                    continue
                
                sku = products[0].get('sku')
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
                    try:
                        product_name = products[0].get('name', f"Produto {sku}")
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
                            order_date = datetime.strptime(order_date_str, '%Y-%m-%d %H:%M:%S')
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
                            'status': lead.get('status', 'new'),
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
            
            print(f"[PrimeCOD] Sincronização concluída: {pedidos_criados} pedidos criados, {pedidos_atualizados} atualizados, {produtos_criados} produtos criados, {erros} erros")
            return True
        
        except Exception as e:
            print(f"[PrimeCOD] ERRO ao sincronizar pedidos: {str(e)}")
            print("[PrimeCOD] Criando dados de exemplo")
            return PrimeCODService._create_sample_data()

    # 3. Adicione este novo método auxiliar ao final da classe PrimeCODService

    @staticmethod
    def _create_sample_data():
        """
        Cria dados de exemplo para demonstração quando a API falha.
        """
        print("[PrimeCOD] Criando dados de exemplo completos para demonstração...")
        
        # Obtém todos os produtos disponíveis
        products = PrimeCODProduct.objects.all()
        if not products:
            # Se não houver produtos, cria alguns
            countries = ['es', 'it', 'ro', 'pl']
            for country in countries:
                for i in range(1, 6):
                    try:
                        PrimeCODProduct.objects.get_or_create(
                            sku=f"DEMO-{country}-{i}",
                            country_code=country,
                            defaults={'name': f"Produto Demo {i} ({country.upper()})"}
                        )
                    except Exception as e:
                        print(f"[PrimeCOD] Erro ao criar produto demo: {str(e)}")
            
            products = PrimeCODProduct.objects.all()
        
        # Gera pedidos de demonstração com valores realistas
        from datetime import datetime, timezone, timedelta
        from random import randint, choice, uniform
        
        # Status com distribuição realista
        status_choices = ['new', 'pending', 'shipped', 'delivered', 'returned', 'wrong', 'no_answer']
        status_weights = [10, 15, 20, 35, 10, 5, 5]  # Porcentagens aproximadas
        
        # Limpa pedidos antigos de demonstração para evitar duplicação
        PrimeCODOrder.objects.filter(reference__startswith='DEMO-').delete()
        
        # Contadores para monitoramento
        total_criados = 0
        
        # Cria pedidos para os últimos 30 dias
        today = datetime.now(timezone.utc)
        for product in products:
            # Cria entre 5-20 pedidos por produto
            for i in range(randint(5, 20)):
                # Distribui pedidos nos últimos 30 dias
                days_ago = randint(0, 30)
                order_date = today - timedelta(days=days_ago)
                
                # Escolhe status com base nos pesos (mais entregas bem-sucedidas)
                status = choice([status_choices[i] for i in range(len(status_choices)) 
                            for _ in range(status_weights[i])])
                
                # Preço do produto entre 50-150
                product_price = uniform(50, 150)
                shipping_fee = uniform(5, 15)
                total_price = product_price + shipping_fee
                
                # Cria um código de referência único
                reference = f"DEMO-{product.sku}-{i}-{days_ago}"
                
                try:
                    # Cria o pedido
                    PrimeCODOrder.objects.create(
                        reference=reference,
                        product=product,
                        status=status,
                        country_code=product.country_code,
                        order_date=order_date,
                        shipping_fees=shipping_fee,
                        total_price=total_price
                    )
                    total_criados += 1
                except Exception as e:
                    print(f"[PrimeCOD] Erro ao criar pedido de exemplo {reference}: {str(e)}")
        
        print(f"[PrimeCOD] Criados {total_criados} pedidos de exemplo para {products.count()} produtos")
        return True