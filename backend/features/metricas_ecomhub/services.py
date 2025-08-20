# backend/features/metricas_ecomhub/services.py - SERVIÇOS DE TRACKING DE STATUS
import requests
import logging
from datetime import datetime, timedelta
from django.utils import timezone
from django.conf import settings
from django.db import transaction
from django.db.models import Q, Count, Avg, Max
from .models import PedidoStatusAtual, HistoricoStatus, ConfiguracaoStatusTracking

logger = logging.getLogger(__name__)

class StatusTrackingService:
    """Serviço principal para tracking de status de pedidos"""
    
    PAISES_MAPPING = {
        '164': 'Espanha',
        '41': 'Croácia',
        '66': 'Grécia',
        '82': 'Itália',
        '142': 'Romênia',
        '44': 'República Checa',
        '139': 'Polônia',
        'todos': 'Todos os Países'
    }
    
    def __init__(self):
        self.servidor_externo_url = getattr(settings, 'ECOMHUB_SELENIUM_SERVER', 'http://localhost:8001')
    
    def sincronizar_dados_pedidos(self, data_inicio=None, data_fim=None, pais_id='todos', forcar=False):
        """
        Sincroniza dados de pedidos com a API externa e atualiza tracking local
        """
        try:
            # Verificar se precisa sincronizar
            config = ConfiguracaoStatusTracking.get_configuracao()
            
            if not forcar and config.ultima_sincronizacao:
                tempo_desde_ultima = timezone.now() - config.ultima_sincronizacao
                if tempo_desde_ultima.total_seconds() < (config.intervalo_sincronizacao * 3600):
                    logger.info(f"Sincronização recente. Pulando... (última: {config.ultima_sincronizacao})")
                    return {
                        'status': 'skipped',
                        'message': 'Sincronização recente. Use forçar=True para sincronizar novamente.',
                        'ultima_sincronizacao': config.ultima_sincronizacao
                    }
            
            # Definir período padrão se não informado
            if not data_inicio:
                data_inicio = (timezone.now() - timedelta(days=30)).date()
            if not data_fim:
                data_fim = timezone.now().date()
            
            logger.info(f"Iniciando sincronização: {data_inicio} a {data_fim}, país: {pais_id}")
            
            # Buscar dados da API externa
            dados_api = self._buscar_dados_api_externa(data_inicio, data_fim, pais_id)
            
            if not dados_api.get('success'):
                return {
                    'status': 'error',
                    'message': f"Erro na API externa: {dados_api.get('message', 'Erro desconhecido')}"
                }
            
            # Processar dados e atualizar base local
            resultado_processamento = self._processar_dados_api(dados_api.get('dados_processados', []))
            
            # Atualizar timestamp da última sincronização
            config.ultima_sincronizacao = timezone.now()
            config.save()
            
            logger.info(f"Sincronização concluída com sucesso: {resultado_processamento}")
            
            return {
                'status': 'success',
                'message': 'Sincronização concluída com sucesso',
                'dados_processados': resultado_processamento,
                'ultima_sincronizacao': config.ultima_sincronizacao
            }
            
        except Exception as e:
            logger.error(f"Erro na sincronização: {e}")
            return {
                'status': 'error',
                'message': f'Erro inesperado na sincronização: {str(e)}'
            }
    
    def _buscar_dados_api_externa(self, data_inicio, data_fim, pais_id):
        """Busca dados da API externa (servidor Selenium)"""
        try:
            payload = {
                'data_inicio': data_inicio.isoformat(),
                'data_fim': data_fim.isoformat(),
                'pais_id': pais_id
            }
            
            logger.info(f"Chamando API externa: {self.servidor_externo_url}/api/processar-ecomhub/")
            
            response = requests.post(
                f"{self.servidor_externo_url}/api/processar-ecomhub/",
                json=payload,
                timeout=300  # 5 minutos
            )
            
            if response.status_code == 200:
                return {
                    'success': True,
                    'dados_processados': response.json().get('dados_processados', [])
                }
            else:
                logger.error(f"Erro API externa: {response.status_code} - {response.text}")
                return {
                    'success': False,
                    'message': f'Erro HTTP {response.status_code}: {response.text}'
                }
                
        except requests.exceptions.Timeout:
            return {'success': False, 'message': 'Timeout na requisição'}
        except requests.exceptions.ConnectionError:
            return {'success': False, 'message': 'Erro de conexão com servidor externo'}
        except Exception as e:
            return {'success': False, 'message': f'Erro inesperado: {str(e)}'}
    
    @transaction.atomic
    def _processar_dados_api(self, dados_lista):
        """Processa dados da API e atualiza base local"""
        novos_pedidos = 0
        pedidos_atualizados = 0
        mudancas_status = 0
        erros = 0
        
        for dados_pedido in dados_lista:
            try:
                resultado = self._processar_pedido_individual(dados_pedido)
                
                if resultado['acao'] == 'criado':
                    novos_pedidos += 1
                elif resultado['acao'] == 'atualizado':
                    pedidos_atualizados += 1
                    if resultado.get('mudanca_status'):
                        mudancas_status += 1
                        
            except Exception as e:
                logger.error(f"Erro processando pedido {dados_pedido.get('pedido_id', 'UNKNOWN')}: {e}")
                erros += 1
        
        return {
            'novos_pedidos': novos_pedidos,
            'pedidos_atualizados': pedidos_atualizados,
            'mudancas_status': mudancas_status,
            'erros': erros,
            'total_processados': len(dados_lista)
        }
    
    def _processar_pedido_individual(self, dados):
        """Processa um pedido individual"""
        pedido_id = dados.get('pedido_id')
        if not pedido_id:
            raise ValueError("pedido_id é obrigatório")
        
        # Buscar pedido existente
        try:
            pedido = PedidoStatusAtual.objects.get(pedido_id=pedido_id)
            return self._atualizar_pedido_existente(pedido, dados)
        except PedidoStatusAtual.DoesNotExist:
            return self._criar_novo_pedido(dados)
    
    def _criar_novo_pedido(self, dados):
        """Cria um novo pedido no sistema"""
        # Converter datas string para datetime se necessário
        data_criacao = self._converter_data(dados.get('data_criacao'))
        data_ultima_atualizacao = self._converter_data(dados.get('data_ultima_atualizacao'))
        
        # Calcular tempo no status atual
        tempo_atual = self._calcular_tempo_status(data_ultima_atualizacao)
        
        pedido = PedidoStatusAtual.objects.create(
            pedido_id=dados.get('pedido_id'),
            status_atual=dados.get('status', ''),
            customer_name=dados.get('customer_name', ''),
            customer_email=dados.get('customer_email', ''),
            customer_phone=dados.get('customer_phone', ''),
            produto_nome=dados.get('produto_nome', ''),
            pais=dados.get('pais', ''),
            preco=dados.get('preco', 0),
            data_criacao=data_criacao,
            data_ultima_atualizacao=data_ultima_atualizacao,
            shopify_order_number=dados.get('shopify_order_number', ''),
            tracking_url=dados.get('tracking_url', ''),
            tempo_no_status_atual=tempo_atual
        )
        
        # Criar primeiro registro no histórico
        HistoricoStatus.objects.create(
            pedido=pedido,
            status_anterior='',
            status_novo=pedido.status_atual,
            data_mudanca=data_criacao,
            tempo_no_status_anterior=0
        )
        
        logger.info(f"Novo pedido criado: {pedido_id}")
        return {'acao': 'criado', 'pedido': pedido}
    
    def _atualizar_pedido_existente(self, pedido, dados):
        """Atualiza um pedido existente"""
        mudanca_status = False
        status_anterior = pedido.status_atual
        novo_status = dados.get('status', '')
        
        # Verificar se houve mudança de status
        if status_anterior != novo_status:
            mudanca_status = True
            
            # Calcular tempo no status anterior
            tempo_anterior = pedido.tempo_no_status_atual
            
            # Registrar mudança no histórico
            HistoricoStatus.objects.create(
                pedido=pedido,
                status_anterior=status_anterior,
                status_novo=novo_status,
                data_mudanca=timezone.now(),
                tempo_no_status_anterior=tempo_anterior
            )
            
            logger.info(f"Mudança de status detectada para {pedido.pedido_id}: {status_anterior} → {novo_status}")
        
        # Atualizar dados do pedido
        data_ultima_atualizacao = self._converter_data(dados.get('data_ultima_atualizacao'))
        
        pedido.status_atual = novo_status
        pedido.customer_name = dados.get('customer_name', pedido.customer_name)
        pedido.customer_email = dados.get('customer_email', pedido.customer_email)
        pedido.customer_phone = dados.get('customer_phone', pedido.customer_phone)
        pedido.produto_nome = dados.get('produto_nome', pedido.produto_nome)
        pedido.pais = dados.get('pais', pedido.pais)
        pedido.preco = dados.get('preco', pedido.preco)
        pedido.data_ultima_atualizacao = data_ultima_atualizacao
        pedido.tracking_url = dados.get('tracking_url', pedido.tracking_url)
        
        # Recalcular tempo no status atual
        if mudanca_status:
            pedido.tempo_no_status_atual = 0  # Resetar para novo status
        else:
            pedido.tempo_no_status_atual = self._calcular_tempo_status(data_ultima_atualizacao)
        
        pedido.save()
        
        return {
            'acao': 'atualizado',
            'pedido': pedido,
            'mudanca_status': mudanca_status
        }
    
    def _converter_data(self, data_str):
        """Converte string de data para datetime"""
        if isinstance(data_str, datetime):
            return data_str
        
        if isinstance(data_str, str):
            try:
                # Tentar vários formatos
                formatos = [
                    '%Y-%m-%d %H:%M:%S',
                    '%Y-%m-%dT%H:%M:%S',
                    '%Y-%m-%dT%H:%M:%S.%f',
                    '%Y-%m-%d'
                ]
                
                for formato in formatos:
                    try:
                        return datetime.strptime(data_str, formato).replace(tzinfo=timezone.utc)
                    except ValueError:
                        continue
                
                # Se nenhum formato funcionou
                logger.warning(f"Formato de data não reconhecido: {data_str}")
                return timezone.now()
                
            except Exception as e:
                logger.error(f"Erro convertendo data {data_str}: {e}")
                return timezone.now()
        
        return timezone.now()
    
    def _calcular_tempo_status(self, data_ultima_atualizacao):
        """Calcula tempo em horas desde a última atualização"""
        if not data_ultima_atualizacao:
            return 0
        
        try:
            agora = timezone.now()
            if data_ultima_atualizacao.tzinfo is None:
                data_ultima_atualizacao = data_ultima_atualizacao.replace(tzinfo=timezone.utc)
            
            diferenca = agora - data_ultima_atualizacao
            return int(diferenca.total_seconds() / 3600)  # Converter para horas
        except Exception as e:
            logger.error(f"Erro calculando tempo: {e}")
            return 0
    
    def gerar_metricas_dashboard(self):
        """Gera métricas para o dashboard"""
        try:
            # Contadores por nível de alerta
            contadores = PedidoStatusAtual.objects.aggregate(
                total=Count('id'),
                criticos=Count('id', filter=Q(nivel_alerta='critico')),
                vermelhos=Count('id', filter=Q(nivel_alerta='vermelho')),
                amarelos=Count('id', filter=Q(nivel_alerta='amarelo')),
                normais=Count('id', filter=Q(nivel_alerta='normal'))
            )
            
            # Distribuição por status
            distribuicao_status = dict(
                PedidoStatusAtual.objects.values('status_atual')
                .annotate(count=Count('id'))
                .values_list('status_atual', 'count')
            )
            
            # Tempo médio por status
            tempo_medio_status = dict(
                PedidoStatusAtual.objects.values('status_atual')
                .annotate(tempo_medio=Avg('tempo_no_status_atual'))
                .values_list('status_atual', 'tempo_medio')
            )
            
            # Pedidos com mais tempo parado (top 10)
            pedidos_mais_tempo = PedidoStatusAtual.objects.exclude(
                nivel_alerta='normal'
            ).order_by('-tempo_no_status_atual')[:10]
            
            # Estatísticas por país
            estatisticas_pais = {}
            for pais, nome in self.PAISES_MAPPING.items():
                if pais != 'todos':
                    stats = PedidoStatusAtual.objects.filter(pais=nome).aggregate(
                        total=Count('id'),
                        criticos=Count('id', filter=Q(nivel_alerta='critico')),
                        vermelhos=Count('id', filter=Q(nivel_alerta='vermelho')),
                        amarelos=Count('id', filter=Q(nivel_alerta='amarelo'))
                    )
                    if stats['total'] > 0:
                        estatisticas_pais[nome] = stats
            
            # Última sincronização
            config = ConfiguracaoStatusTracking.get_configuracao()
            
            return {
                'total_pedidos': contadores['total'] or 0,
                'alertas_criticos': contadores['criticos'] or 0,
                'alertas_vermelhos': contadores['vermelhos'] or 0,
                'alertas_amarelos': contadores['amarelos'] or 0,
                'pedidos_normais': contadores['normais'] or 0,
                'distribuicao_status': distribuicao_status,
                'tempo_medio_por_status': {k: round(v or 0, 1) for k, v in tempo_medio_status.items()},
                'pedidos_mais_tempo': pedidos_mais_tempo,
                'estatisticas_pais': estatisticas_pais,
                'ultima_sincronizacao': config.ultima_sincronizacao
            }
            
        except Exception as e:
            logger.error(f"Erro gerando métricas: {e}")
            return {
                'total_pedidos': 0,
                'alertas_criticos': 0,
                'alertas_vermelhos': 0,
                'alertas_amarelos': 0,
                'pedidos_normais': 0,
                'distribuicao_status': {},
                'tempo_medio_por_status': {},
                'pedidos_mais_tempo': [],
                'estatisticas_pais': {},
                'ultima_sincronizacao': None
            }
    
    def atualizar_tempos_status(self):
        """Atualiza os tempos de status de todos os pedidos ativos"""
        try:
            pedidos_ativos = PedidoStatusAtual.objects.exclude(
                status_atual__in=['delivered', 'returned', 'cancelled']
            )
            
            atualizados = 0
            for pedido in pedidos_ativos:
                tempo_atual = self._calcular_tempo_status(pedido.data_ultima_atualizacao)
                if tempo_atual != pedido.tempo_no_status_atual:
                    pedido.tempo_no_status_atual = tempo_atual
                    pedido.save()
                    atualizados += 1
            
            logger.info(f"Tempos de status atualizados para {atualizados} pedidos")
            return atualizados
            
        except Exception as e:
            logger.error(f"Erro atualizando tempos: {e}")
            return 0


# Instância singleton do serviço
status_tracking_service = StatusTrackingService()