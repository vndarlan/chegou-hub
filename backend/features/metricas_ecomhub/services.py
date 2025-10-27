# backend/features/metricas_ecomhub/services.py - SERVIÇOS DE TRACKING DE STATUS
import requests
import logging
import time
from datetime import datetime, timedelta
from django.utils import timezone
from django.conf import settings
from django.db import transaction
from django.db.models import Q, Count, Avg, Max
from .models import PedidoStatusAtual, HistoricoStatus, ConfiguracaoStatusTracking
from core.middleware.ultra_logging import ultra_logging

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
            
            # CORREÇÃO: Definir período padrão ANTES de chamar API externa
            if not data_inicio:
                data_inicio = (timezone.now() - timedelta(days=30)).date()
            if not data_fim:
                data_fim = timezone.now().date()
            
            # VALIDAÇÃO: Garantir que data_inicio e data_fim não são None
            if data_inicio is None or data_fim is None:
                logger.error("Erro: data_inicio ou data_fim são None após definição padrão")
                return {
                    'status': 'error',
                    'message': 'Erro na validação das datas: valores None detectados'
                }
            
            logger.info("="*80)
            logger.info("🚀 INICIANDO SINCRONIZAÇÃO COMPLETA")
            logger.info("="*80)
            logger.info(f"📅 Período solicitado: {data_inicio} a {data_fim} ({(data_fim - data_inicio).days + 1} dias)")
            logger.info(f"🌍 País ID: {pais_id}")
            logger.info(f"🔧 Forçar sincronização: {forcar}")
            logger.info(f"🌐 URL da API: {self.servidor_externo_url}")
            
            # Buscar dados da API externa (APÓS validação das datas)
            dados_api = self._buscar_dados_api_externa(data_inicio, data_fim, pais_id)
            
            if not dados_api.get('success'):
                logger.error("="*80)
                logger.error("❌ FALHA NA API EXTERNA")
                logger.error("="*80)
                logger.error(f"❌ Mensagem de erro: {dados_api.get('message', 'Erro desconhecido')}")
                logger.error(f"❌ Dados completos da resposta: {dados_api}")
                return {
                    'status': 'error',
                    'message': f"Erro na API externa: {dados_api.get('message', 'Erro desconhecido')}"
                }
            
            logger.info("="*80)
            logger.info("✅ API EXTERNA RESPONDEU COM SUCESSO")
            logger.info("="*80)
            
            # Log detalhado dos dados recebidos
            dados_processados = dados_api.get('dados_processados', [])
            logger.info(f"📦 DADOS RECEBIDOS DA API:")
            logger.info(f"   📊 Tipo: {type(dados_processados)}")
            logger.info(f"   📏 Quantidade: {len(dados_processados) if isinstance(dados_processados, list) else 'N/A'}")
            logger.info(f"   📄 Conteúdo (resumo): {str(dados_processados)[:500]}...")
            
            # Log da estrutura completa da resposta da API
            logger.info(f"🔍 ESTRUTURA COMPLETA DA RESPOSTA DA API:")
            for key, value in dados_api.items():
                if key != 'dados_processados':  # Já logamos acima
                    logger.info(f"   🔑 {key}: {type(value).__name__} = {str(value)[:100]}...")
                else:
                    logger.info(f"   🔑 {key}: [já detalhado acima]")
            
            logger.info("="*80)
            logger.info("🔄 PROCESSANDO DADOS DA API")
            logger.info("="*80)
            
            # 🚨 CORREÇÃO CRÍTICA: API retorna DADOS AGREGADOS, não pedidos individuais
            logger.info("📋 API retornou dados AGREGADOS/ESTATÍSTICOS")
            logger.info("🔍 A API EcomHub não retorna pedidos individuais, apenas estatísticas por produto/país")
            
            # Verificar estrutura real da API
            if isinstance(dados_processados, dict):
                logger.info(f"📊 Estrutura recebida - chaves disponíveis: {list(dados_processados.keys())}")
                
                # A API retorna dados estatísticos em diferentes formatos:
                # - visualizacao_total: lista de estatísticas por produto
                # - visualizacao_otimizada: dados otimizados  
                # - stats_total: estatísticas totais
                # - stats_otimizada: estatísticas otimizadas
                
                lista_pedidos = []  # NÃO há pedidos individuais
                
                # Extrair informações das estatísticas para análise
                visualizacao_total = dados_processados.get('visualizacao_total', [])
                stats_total = dados_processados.get('stats_total', [])
                
                logger.info(f"📈 visualizacao_total: {len(visualizacao_total)} produtos")
                logger.info(f"📊 stats_total: {len(stats_total)} estatísticas")
                
                if visualizacao_total:
                    logger.info(f"📋 Primeiro produto: {str(visualizacao_total[0])[:200]}...")
                    
                    # Calcular total de pedidos das estatísticas
                    total_pedidos_stats = 0
                    for produto in visualizacao_total:
                        if isinstance(produto, dict) and 'Total' in produto:
                            total_pedidos_stats += int(produto.get('Total', 0))
                    
                    logger.info(f"📊 Total de pedidos nas estatísticas: {total_pedidos_stats}")
                
                # ❌ IMPORTANTE: Não podemos processar estatísticas como pedidos individuais
                # A API mudou de formato - agora só retorna dados agregados
                logger.warning("⚠️ API MUDOU DE FORMATO: Não há mais pedidos individuais disponíveis")
                logger.warning("⚠️ Apenas dados estatísticos/agregados são fornecidos")
                logger.warning("⚠️ Sistema de tracking individual não pode ser alimentado com estes dados")
                
            elif isinstance(dados_processados, list):
                logger.info(f"📋 API retornou dados como LISTA com {len(dados_processados)} itens")
                lista_pedidos = dados_processados if dados_processados else []
                if lista_pedidos:
                    logger.info(f"📋 Primeiro item: {str(lista_pedidos[0])[:200]}...")
            else:
                logger.error(f"❌ TIPO INESPERADO: dados_processados não é dict nem list: {type(dados_processados)}")
                logger.error(f"❌ Conteúdo: {str(dados_processados)[:300]}...")
                lista_pedidos = []
            
            logger.info(f"🎯 RESULTADO FINAL: {len(lista_pedidos)} pedidos individuais para processar")
            logger.warning("⚠️ ATENÇÃO: API externa não fornece mais pedidos individuais, apenas estatísticas!")
            
            # Processar dados e atualizar base local
            resultado_processamento = self._processar_dados_api(lista_pedidos)
            
            logger.info("="*80)
            logger.info("✅ PROCESSAMENTO LOCAL FINALIZADO")
            logger.info("="*80)
            logger.info(f"📊 Resultado do processamento: {resultado_processamento}")
            
            # Atualizar timestamp da última sincronização
            config.ultima_sincronizacao = timezone.now()
            config.save()
            
            logger.info(f"🕒 Timestamp da última sincronização atualizado: {config.ultima_sincronizacao}")
            
            # Mensagem mais clara baseada na quantidade de dados processados
            total_processados = resultado_processamento.get('total_processados', 0)
            if total_processados == 0:
                # Verificar se a API retornou dados estatísticos
                if isinstance(dados_processados, dict) and 'visualizacao_total' in dados_processados:
                    mensagem = f'API externa mudou de formato: retorna apenas dados estatísticos agregados, não pedidos individuais. Período: {data_inicio} a {data_fim}'
                    logger.warning(f"⚠️ {mensagem}")
                else:
                    mensagem = f'Sincronização concluída: nenhum pedido encontrado no período {data_inicio} a {data_fim}'
                    logger.info(f"⚠️ {mensagem}")
            else:
                mensagem = f'Sincronização concluída: {total_processados} pedidos processados'
                logger.info(f"🎉 {mensagem}")
                
            logger.info("="*80)
            logger.info("🏁 SINCRONIZAÇÃO COMPLETA FINALIZADA")
            logger.info("="*80)
            
            return {
                'status': 'success',
                'message': mensagem,
                'dados_processados': resultado_processamento,
                'ultima_sincronizacao': config.ultima_sincronizacao,
                'periodo_sincronizado': {
                    'data_inicio': data_inicio.isoformat(),
                    'data_fim': data_fim.isoformat(),
                    'pais_id': pais_id
                }
            }
            
        except Exception as e:
            logger.error(f"Erro na sincronização: {e}")
            return {
                'status': 'error',
                'message': f'Erro inesperado na sincronização: {str(e)}'
            }
    
    def _buscar_dados_api_externa(self, data_inicio, data_fim, pais_id):
        """Busca dados da API externa (servidor Selenium) - COM ULTRA LOGGING"""
        try:
            # VALIDAÇÃO ROBUSTA: Verificar se datas não são None antes de isoformat()
            if data_inicio is None:
                ultra_logging.log_erro_detalhado(
                    ValueError("data_inicio é None"), 
                    "Validação inicial no método _buscar_dados_api_externa"
                )
                return {'success': False, 'message': 'data_inicio não pode ser None'}
            
            if data_fim is None:
                ultra_logging.log_erro_detalhado(
                    ValueError("data_fim é None"), 
                    "Validação inicial no método _buscar_dados_api_externa"
                )
                return {'success': False, 'message': 'data_fim não pode ser None'}
            
            # Verificar se as datas têm o método isoformat (são objetos date/datetime)
            if not hasattr(data_inicio, 'isoformat'):
                ultra_logging.log_erro_detalhado(
                    TypeError(f"data_inicio não é date/datetime: {type(data_inicio)} - {data_inicio}"),
                    "Validação de tipo de data_inicio"
                )
                return {'success': False, 'message': f'data_inicio deve ser date/datetime, recebido: {type(data_inicio).__name__}'}
            
            if not hasattr(data_fim, 'isoformat'):
                ultra_logging.log_erro_detalhado(
                    TypeError(f"data_fim não é date/datetime: {type(data_fim)} - {data_fim}"),
                    "Validação de tipo de data_fim"
                )
                return {'success': False, 'message': f'data_fim deve ser date/datetime, recebido: {type(data_fim).__name__}'}
            
            # Preparar requisição
            url_completa = f"{self.servidor_externo_url}/api/processar-ecomhub/"
            headers = {
                'Content-Type': 'application/json',
                'User-Agent': f'ChegouHub-Backend/{ultra_logging.ambiente}',
                'X-Request-Source': ultra_logging.ambiente,
                'X-Timestamp': timezone.now().isoformat()
            }
            payload = {
                'data_inicio': data_inicio.isoformat(),
                'data_fim': data_fim.isoformat(),
                'pais_id': pais_id
            }
            timeout = 1800  # 30 minutos timeout
            
            # 🚨 ULTRA LOGGING DA REQUISIÇÃO
            ultra_logging.log_requisicao_detalhada(url_completa, headers, payload, timeout)
            
            # Teste de conectividade ANTES da requisição
            try:
                ultra_logging.logger.info(f"🔗 Testando conectividade com {self.servidor_externo_url}/health...")
                test_response = requests.get(f"{self.servidor_externo_url}/health", timeout=10)
                ultra_logging.logger.info(f"✅ Health check: Status {test_response.status_code}")
                ultra_logging.logger.info(f"📄 Health check response: {test_response.text[:200]}...")
            except Exception as health_error:
                ultra_logging.log_erro_detalhado(health_error, "Health check antes da requisição principal")
            
            # Executar requisição principal com medição de tempo
            inicio_chamada = time.time()
            ultra_logging.logger.info(f"⏱️ Iniciando requisição principal às {timezone.now()}")
            
            response = requests.post(
                url_completa,
                json=payload,
                timeout=timeout,
                headers=headers
            )
            
            tempo_resposta = time.time() - inicio_chamada
            ultra_logging.logger.info(f"⏱️ Tempo total da requisição: {tempo_resposta:.2f} segundos")
            
            # 🚨 ULTRA LOGGING DA RESPOSTA
            ultra_logging.log_resposta_detalhada(response, tempo_resposta)
            
            # Análise detalhada baseada no status
            if response.status_code == 200:
                try:
                    response_data = response.json()
                    ultra_logging.logger.info(f"✅ JSON decodificado com sucesso")
                    
                    # Verificar estrutura da resposta
                    if isinstance(response_data, dict):
                        dados_processados = response_data.get('dados_processados', [])
                        
                        # 🚨 DETECÇÃO CRÍTICA: Verificar se há pedidos individuais vs dados agregados
                        ultra_logging.logger.info(f"🎯 INVESTIGAÇÃO CRÍTICA - TIPO DE DADOS:")
                        
                        if isinstance(dados_processados, list) and len(dados_processados) > 0:
                            primeiro_item = dados_processados[0]
                            if isinstance(primeiro_item, dict) and any(campo in primeiro_item for campo in ['pedido_id', 'order_id', 'customer_name']):
                                ultra_logging.logger.info(f"🎯 DETECTADO: API RETORNA PEDIDOS INDIVIDUAIS")
                                ultra_logging.logger.info(f"📊 Quantidade de pedidos individuais: {len(dados_processados)}")
                            else:
                                ultra_logging.logger.warning(f"⚠️ DETECTADO: API RETORNA DADOS AGREGADOS, NÃO PEDIDOS INDIVIDUAIS")
                                
                        elif isinstance(dados_processados, dict):
                            # Verificar se é estrutura agregada
                            if 'visualizacao_total' in dados_processados or 'stats_total' in dados_processados:
                                ultra_logging.logger.warning(f"⚠️ CONFIRMADO: API MUDOU PARA DADOS AGREGADOS")
                                ultra_logging.logger.warning(f"📊 Estrutura agregada detectada - chaves: {list(dados_processados.keys())}")
                            elif 'pedidos' in dados_processados:
                                pedidos_individuais = dados_processados['pedidos']
                                ultra_logging.logger.info(f"🎯 DETECTADO: PEDIDOS INDIVIDUAIS EM SUBCHAVE 'pedidos'")
                                ultra_logging.logger.info(f"📊 Quantidade: {len(pedidos_individuais) if isinstance(pedidos_individuais, list) else 'N/A'}")
                        
                        # Comparar com expectativa baseada no ambiente
                        ambiente_esperado = 'LOCAL' if 'localhost' in self.servidor_externo_url else 'PRODUÇÃO'
                        ultra_logging.logger.info(f"🌍 AMBIENTE DETECTADO: {ambiente_esperado}")
                        
                        if ambiente_esperado == 'LOCAL' and isinstance(dados_processados, list) and len(dados_processados) > 0:
                            ultra_logging.logger.info(f"✅ COMPORTAMENTO ESPERADO: Local retorna pedidos individuais")
                        elif ambiente_esperado == 'PRODUÇÃO' and isinstance(dados_processados, dict) and 'visualizacao_total' in dados_processados:
                            ultra_logging.logger.warning(f"⚠️ COMPORTAMENTO DIFERENTE: Produção retorna apenas dados agregados")
                        else:
                            ultra_logging.logger.warning(f"❓ COMPORTAMENTO INESPERADO para ambiente {ambiente_esperado}")
                        
                        return {
                            'success': True,
                            'dados_processados': dados_processados,
                            'ambiente_detectado': ambiente_esperado,
                            'tipo_resposta': ultra_logging.detectar_tipo_resposta(response.text)
                        }
                    else:
                        ultra_logging.log_erro_detalhado(
                            ValueError(f"API retornou tipo inesperado: {type(response_data)}"),
                            "Validação do tipo de resposta JSON"
                        )
                        return {
                            'success': False,
                            'message': f'API retornou formato inesperado (tipo: {type(response_data).__name__}): {str(response_data)[:200]}...'
                        }
                        
                except ValueError as json_error:
                    ultra_logging.log_erro_detalhado(json_error, "Decodificação JSON da resposta da API")
                    
                    # Análise adicional do conteúdo não-JSON
                    tipo_conteudo = ultra_logging.detectar_tipo_resposta(response.text)
                    ultra_logging.logger.error(f"🔍 TIPO DE CONTEÚDO DETECTADO: {tipo_conteudo}")
                    
                    if tipo_conteudo == 'HTML':
                        ultra_logging.logger.error(f"⚠️ API RETORNOU HTML EM VEZ DE JSON - POSSÍVEL ERRO DE ROTEAMENTO OU AUTENTICAÇÃO")
                        # Extrair informações úteis do HTML
                        import re
                        title_match = re.search(r'<title>(.*?)</title>', response.text, re.IGNORECASE)
                        if title_match:
                            ultra_logging.logger.error(f"📄 TÍTULO DA PÁGINA HTML: {title_match.group(1)}")
                    
                    return {
                        'success': False,
                        'message': f'API retornou resposta não-JSON ({tipo_conteudo}): {str(json_error)} - Início: {response.text[:100]}...'
                    }
                    
            else:
                ultra_logging.log_erro_detalhado(
                    requests.HTTPError(f"HTTP {response.status_code}: {response.text}"),
                    f"Resposta HTTP não-200 da API externa"
                )
                return {
                    'success': False,
                    'message': f'Erro HTTP {response.status_code}: {response.text}'
                }
                
        except requests.exceptions.Timeout as timeout_error:
            ultra_logging.log_erro_detalhado(timeout_error, "Timeout na requisição para API externa")
            return {'success': False, 'message': 'Timeout na requisição'}
        except requests.exceptions.ConnectionError as conn_error:
            ultra_logging.log_erro_detalhado(conn_error, "Erro de conexão com API externa")
            return {'success': False, 'message': 'Erro de conexão com servidor externo'}
        except Exception as e:
            ultra_logging.log_erro_detalhado(e, "Erro inesperado na comunicação com API externa")
            return {'success': False, 'message': f'Erro inesperado: {str(e)}'}
    
    @transaction.atomic
    def _processar_dados_api(self, dados_lista):
        """Processa dados da API e atualiza base local"""
        novos_pedidos = 0
        pedidos_atualizados = 0
        mudancas_status = 0
        erros = 0
        
        # VALIDAÇÃO: Verificar se dados_lista é uma lista
        if not isinstance(dados_lista, list):
            logger.error(f"Dados recebidos não são uma lista: {type(dados_lista)} - {str(dados_lista)[:200]}...")
            return {
                'novos_pedidos': 0,
                'pedidos_atualizados': 0,
                'mudancas_status': 0,
                'erros': 1,
                'total_processados': 0,
                'erro_tipo': f'Dados não são lista: {type(dados_lista).__name__}'
            }
        
        for i, dados_pedido in enumerate(dados_lista):
            try:
                # VALIDAÇÃO: Verificar se cada item é um dict
                if not isinstance(dados_pedido, dict):
                    logger.error(f"Item {i} não é um dicionário: {type(dados_pedido)} - {str(dados_pedido)[:100]}...")
                    erros += 1
                    continue
                
                resultado = self._processar_pedido_individual(dados_pedido)
                
                if resultado['acao'] == 'criado':
                    novos_pedidos += 1
                elif resultado['acao'] == 'atualizado':
                    pedidos_atualizados += 1
                    if resultado.get('mudanca_status'):
                        mudancas_status += 1
                        
            except Exception as e:
                # Usar get() com validação robusta para pedido_id
                pedido_id = 'UNKNOWN'
                if isinstance(dados_pedido, dict):
                    pedido_id = dados_pedido.get('pedido_id', 'UNKNOWN')
                
                logger.error(f"Erro processando pedido {pedido_id}: {e}")
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
        # VALIDAÇÃO ROBUSTA: Verificar se dados é dict
        if not isinstance(dados, dict):
            raise ValueError(f"Dados do pedido devem ser um dicionário, recebido: {type(dados).__name__}")
        
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
        
        logger.info(f"Novo pedido criado: {pedido.pedido_id}")
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
                    '%Y-%m-%dT%H:%M:%S.%f%z',  # ISO com timezone
                    '%Y-%m-%dT%H:%M:%S%z',     # ISO simples com timezone
                    '%Y-%m-%d'
                ]
                
                for formato in formatos:
                    try:
                        import pytz
                        return datetime.strptime(data_str, formato).replace(tzinfo=pytz.UTC)
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
        """Gera métricas para o dashboard - FOCADO APENAS EM PEDIDOS ATIVOS"""
        try:
            # FILTRAR APENAS PEDIDOS ATIVOS (que podem ter problemas)
            pedidos_ativos = PedidoStatusAtual.objects.exclude(
                status_atual__in=PedidoStatusAtual.STATUS_FINAIS
            )
            
            # Contadores por nível de alerta - APENAS ATIVOS
            contadores = pedidos_ativos.aggregate(
                total=Count('id'),
                criticos=Count('id', filter=Q(nivel_alerta='critico')),
                vermelhos=Count('id', filter=Q(nivel_alerta='vermelho')),
                amarelos=Count('id', filter=Q(nivel_alerta='amarelo')),
                normais=Count('id', filter=Q(nivel_alerta='normal'))
            )
            
            # Distribuição por status - APENAS ATIVOS
            distribuicao_status = dict(
                pedidos_ativos.values('status_atual')
                .annotate(count=Count('id'))
                .values_list('status_atual', 'count')
            )
            
            # Distribuição por categorias lógicas
            distribuicao_categorias = {
                'processando': pedidos_ativos.filter(
                    status_atual__in=['processing', 'preparing_for_shipping', 'ready_to_ship']
                ).count(),
                'em_transito': pedidos_ativos.filter(
                    status_atual__in=['shipped', 'with_courier', 'out_for_delivery']
                ).count(),
                'problemas': pedidos_ativos.filter(
                    status_atual='issue'
                ).count()
            }
            
            # Tempo médio por status - APENAS ATIVOS
            tempo_medio_status = dict(
                pedidos_ativos.values('status_atual')
                .annotate(tempo_medio=Avg('tempo_no_status_atual'))
                .values_list('status_atual', 'tempo_medio')
            )
            
            # Pedidos com mais tempo parado (top 10) - APENAS ATIVOS COM PROBLEMAS
            pedidos_mais_tempo = pedidos_ativos.filter(
                nivel_alerta__in=['amarelo', 'vermelho', 'critico']
            ).order_by('-tempo_no_status_atual')[:10]
            
            # Estatísticas por país - APENAS ATIVOS
            estatisticas_pais = {}
            for pais, nome in self.PAISES_MAPPING.items():
                if pais != 'todos':
                    stats = pedidos_ativos.filter(pais=nome).aggregate(
                        total=Count('id'),
                        criticos=Count('id', filter=Q(nivel_alerta='critico')),
                        vermelhos=Count('id', filter=Q(nivel_alerta='vermelho')),
                        amarelos=Count('id', filter=Q(nivel_alerta='amarelo')),
                        normais=Count('id', filter=Q(nivel_alerta='normal'))
                    )
                    if stats['total'] > 0:
                        estatisticas_pais[nome] = stats
            
            # Última sincronização
            config = ConfiguracaoStatusTracking.get_configuracao()
            
            # Métricas de eficiência
            total_todos_pedidos = PedidoStatusAtual.objects.count()
            pedidos_finalizados = PedidoStatusAtual.objects.filter(
                status_atual__in=PedidoStatusAtual.STATUS_FINAIS
            ).count()
            pedidos_entregues = PedidoStatusAtual.objects.filter(
                status_atual='delivered'
            ).count()
            
            eficiencia_entrega = round(
                (pedidos_entregues / total_todos_pedidos * 100) if total_todos_pedidos > 0 else 0, 1
            )
            
            taxa_problemas = round(
                (contadores['criticos'] + contadores['vermelhos']) / contadores['total'] * 100 
                if contadores['total'] > 0 else 0, 1
            )
            
            return {
                # FOCO: Apenas pedidos ativos
                'total_pedidos_ativos': contadores['total'] or 0,
                'alertas_criticos': contadores['criticos'] or 0,
                'alertas_vermelhos': contadores['vermelhos'] or 0,
                'alertas_amarelos': contadores['amarelos'] or 0,
                'pedidos_normais_ativos': contadores['normais'] or 0,
                
                # Distribuições
                'distribuicao_status': distribuicao_status,
                'distribuicao_categorias': distribuicao_categorias,
                
                # Métricas de tempo
                'tempo_medio_por_status': {k: round(v or 0, 1) for k, v in tempo_medio_status.items()},
                'pedidos_mais_tempo': pedidos_mais_tempo,
                
                # Estatísticas
                'estatisticas_pais': estatisticas_pais,
                
                # Métricas de eficiência
                'total_todos_pedidos': total_todos_pedidos,
                'pedidos_finalizados': pedidos_finalizados,
                'pedidos_entregues': pedidos_entregues,
                'eficiencia_entrega_pct': eficiencia_entrega,
                'taxa_problemas_pct': taxa_problemas,
                
                # Meta
                'ultima_sincronizacao': config.ultima_sincronizacao
            }
            
        except Exception as e:
            logger.error(f"Erro gerando métricas: {e}")
            return {
                'total_pedidos_ativos': 0,
                'alertas_criticos': 0,
                'alertas_vermelhos': 0,
                'alertas_amarelos': 0,
                'pedidos_normais_ativos': 0,
                'distribuicao_status': {},
                'distribuicao_categorias': {},
                'tempo_medio_por_status': {},
                'pedidos_mais_tempo': [],
                'estatisticas_pais': {},
                'total_todos_pedidos': 0,
                'pedidos_finalizados': 0,
                'pedidos_entregues': 0,
                'eficiencia_entrega_pct': 0,
                'taxa_problemas_pct': 0,
                'ultima_sincronizacao': None
            }
    
    def atualizar_tempos_status(self):
        """Atualiza os tempos de status de todos os pedidos ativos"""
        try:
            # USAR CONSTANTES DA CLASSE
            pedidos_ativos = PedidoStatusAtual.objects.exclude(
                status_atual__in=PedidoStatusAtual.STATUS_FINAIS
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
    
    def _extrair_pedidos_reais_da_api(self, dados_api):
        """
        Extrai apenas pedidos reais da API externa.
        NÃO cria dados simulados ou fictícios.
        """
        pedidos_reais = []
        
        # Verificar se a API retornou pedidos individuais
        if 'pedidos' in dados_api and isinstance(dados_api['pedidos'], list):
            pedidos_reais = dados_api['pedidos']
            logger.info(f"Extraídos {len(pedidos_reais)} pedidos reais da API")
        else:
            logger.error("API externa não retornou pedidos individuais. Apenas dados agregados não são suficientes.")
            
        return pedidos_reais
    
    def _mapear_codigo_pais_para_nome(self, codigo):
        """Mapeia código de país para nome completo"""
        mapeamento = {
            'ro': 'Romênia',
            'pl': 'Polônia', 
            'hr': 'Croácia',
            'gr': 'Grécia',
            'cz': 'República Checa',
            'it': 'Itália',
            'es': 'Espanha'
        }
        return mapeamento.get(codigo, codigo)


# Instância singleton do serviço
status_tracking_service = StatusTrackingService()

# Funções de validação de lojas ECOMHUB
from collections import Counter


def test_ecomhub_connection(token, secret):
    """
    Testa conexão com API ECOMHUB usando token e secret
    
    Returns:
        dict: {
            'success': bool,
            'store_id': str or None,
            'myshopify_domain': str or None,
            'error_message': str or None
        }
    """
    try:
        response = requests.get(
            f"https://api.ecomhub.app/apps/stores",
            params={'token': token},
            headers={'Secret': secret, 'Content-Type': 'application/json'},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            return {
                'success': True,
                'store_id': data.get('id'),
                'myshopify_domain': data.get('myshopifyDomain'),
                'error_message': None
            }
        else:
            return {
                'success': False,
                'store_id': None,
                'myshopify_domain': None,
                'error_message': f"API retornou status {response.status_code}"
            }
    except requests.exceptions.Timeout:
        return {
            'success': False,
            'store_id': None,
            'myshopify_domain': None,
            'error_message': "Timeout ao conectar com API ECOMHUB"
        }
    except Exception as e:
        return {
            'success': False,
            'store_id': None,
            'myshopify_domain': None,
            'error_message': str(e)
        }


def get_store_country(token, secret):
    """
    Detecta o país da loja analisando pedidos recentes
    
    Returns:
        dict: {
            'country_id': int or None,
            'country_name': str or None,
            'error_message': str or None
        }
    """
    try:
        # Buscar pedidos recentes
        response = requests.get(
            f"https://api.ecomhub.app/apps/orders",
            params={'token': token, 'orderBy': 'date', 'skip': 0},
            headers={'Secret': secret, 'Content-Type': 'application/json'},
            timeout=15
        )
        
        if response.status_code != 200:
            return {
                'country_id': None,
                'country_name': None,
                'error_message': f"Erro ao buscar pedidos: status {response.status_code}"
            }
        
        orders = response.json()
        
        if not orders or len(orders) == 0:
            return {
                'country_id': None,
                'country_name': None,
                'error_message': "Loja não possui pedidos para detectar país"
            }
        
        # Identificar país mais comum nos pedidos
        country_ids = [order.get('shippingCountry_id') for order in orders if order.get('shippingCountry_id')]
        
        if not country_ids:
            return {
                'country_id': None,
                'country_name': None,
                'error_message': "Pedidos não possuem informação de país"
            }
        
        most_common_country_id = Counter(country_ids).most_common(1)[0][0]
        
        # Buscar nome do país (cache local ou API)
        country_name = get_country_name_by_id(most_common_country_id)
        
        return {
            'country_id': most_common_country_id,
            'country_name': country_name,
            'error_message': None
        }
    except Exception as e:
        return {
            'country_id': None,
            'country_name': None,
            'error_message': str(e)
        }


def get_country_name_by_id(country_id):
    """
    Busca nome do país pelo ID (usando cache local ou API)
    """
    # Mapeamento dos países que usamos
    COUNTRIES_MAP = {
        164: 'Spain',
        41: 'Croatia',
        66: 'Greece',
        82: 'Italy',
        142: 'Romania',
        44: 'Czechia',
        139: 'Poland'
    }
    
    # Retorna do cache local se existir
    if country_id in COUNTRIES_MAP:
        return COUNTRIES_MAP[country_id]
    
    # Se não, busca na API (opcional, pode cachear depois)
    try:
        response = requests.get(
            f"https://api.ecomhub.app/apps/countries",
            params={'token': 'any'},  # Endpoint público não precisa token válido
            timeout=10
        )
        
        if response.status_code == 200:
            countries = response.json()
            for country in countries:
                if country.get('id') == country_id:
                    return country.get('name')
    except:
        pass
    
    return f"Country ID {country_id}"
