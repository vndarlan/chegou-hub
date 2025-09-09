# backend/features/estoque/services/estoque_service.py
import logging
from django.db import transaction
from django.utils import timezone
from typing import Dict, Any, List, Optional, Tuple
from decimal import Decimal

from ..models import ProdutoEstoque, MovimentacaoEstoque, AlertaEstoque

logger = logging.getLogger(__name__)

# Função para print seguro que não quebra com emojis no Windows
def safe_print(message):
    """Print seguro que trata problemas de encoding no Windows"""
    try:
        print(message)
    except UnicodeEncodeError:
        # Se houver erro de encoding, remover caracteres problemáticos
        safe_message = message.encode('ascii', errors='replace').decode('ascii')
        print(safe_message)

# Import para notificações em tempo real (com fallback se não disponível)
try:
    from features.sync_realtime.services import (
        notify_venda_shopify, notify_estoque_update, 
        notify_alerta_gerado, notify_webhook_error
    )
    REALTIME_NOTIFICATIONS_AVAILABLE = True
except ImportError:
    logger.warning("Notificações em tempo real não disponíveis - funcionará sem WebSockets")
    REALTIME_NOTIFICATIONS_AVAILABLE = False


class EstoqueService:
    """Serviço para operações de controle de estoque"""
    
    @staticmethod
    @transaction.atomic
    def processar_venda_webhook(loja_config, order_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Processa uma venda recebida via webhook para decrementar estoque
        
        Args:
            loja_config: Instância de ShopifyConfig
            order_data: Dados do pedido extraídos do webhook
            
        Returns:
            Dict com resultado do processamento
        """
        # ===== DEBUG LOG: ENTRADA DO SERVIÇO =====
        safe_print(f"[ESTOQUE SERVICE] === PROCESSAR VENDA WEBHOOK ===")
        safe_print(f"[ESTOQUE SERVICE] Loja: {loja_config.nome_loja if hasattr(loja_config, 'nome_loja') else 'N/A'}")
        safe_print(f"[ESTOQUE SERVICE] Order Number: #{order_data.get('order_number', 'N/A')}")
        safe_print(f"[ESTOQUE SERVICE] Order ID: {order_data.get('shopify_order_id', 'N/A')}")
        safe_print(f"[ESTOQUE SERVICE] Line Items: {len(order_data.get('line_items', []))}")
        print("[ESTOQUE SERVICE] =======================================")
        
        result = {
            'success': True,
            'shopify_order_id': order_data.get('shopify_order_id'),
            'order_number': order_data.get('order_number'),
            'items_processados': 0,
            'items_com_erro': 0,
            'detalhes': [],
            'alertas_gerados': []
        }
        
        try:
            line_items = order_data.get('line_items', [])
            
            safe_print(f"[ESTOQUE SERVICE] Iniciando loop pelos {len(line_items)} line_items...")
            
            for i, item in enumerate(line_items):
                sku = item.get('sku', 'N/A')
                quantity = item.get('quantity', 0)
                
                safe_print(f"[ESTOQUE SERVICE] --- ITEM {i+1}/{len(line_items)} ---")
                safe_print(f"[ESTOQUE SERVICE] SKU: {sku}")
                safe_print(f"[ESTOQUE SERVICE] Quantity: {quantity}")
                safe_print(f"[ESTOQUE SERVICE] Title: {item.get('title', 'N/A')}")
                
                safe_print(f"[ESTOQUE SERVICE] Chamando _processar_item_venda()...")
                item_result = EstoqueService._processar_item_venda(
                    loja_config, item, order_data
                )
                
                safe_print(f"[ESTOQUE SERVICE] Resultado para SKU {sku}:")
                safe_print(f"[ESTOQUE SERVICE]   - Success: {item_result['success']}")
                safe_print(f"[ESTOQUE SERVICE]   - Message: {item_result['message']}")
                if item_result['success']:
                    safe_print(f"[ESTOQUE SERVICE]   - Estoque: {item_result['estoque_anterior']} → {item_result['estoque_posterior']}")
                
                result['detalhes'].append(item_result)
                
                if item_result['success']:
                    result['items_processados'] += 1
                    
                    # Adicionar alertas se gerados
                    if item_result.get('alertas_gerados'):
                        result['alertas_gerados'].extend(item_result['alertas_gerados'])
                        safe_print(f"[ESTOQUE SERVICE]   - Alertas gerados: {len(item_result['alertas_gerados'])}")
                else:
                    result['items_com_erro'] += 1
                
                safe_print(f"[ESTOQUE SERVICE] ----------------------------------------")
            
            safe_print(f"[ESTOQUE SERVICE] === FINALIZANDO PROCESSAMENTO ===")
            safe_print(f"[ESTOQUE SERVICE] Items processados: {result['items_processados']}")
            safe_print(f"[ESTOQUE SERVICE] Items com erro: {result['items_com_erro']}")
            safe_print(f"[ESTOQUE SERVICE] Total alertas gerados: {len(result['alertas_gerados'])}")
            
            # Definir sucesso geral
            if result['items_com_erro'] > 0:
                if result['items_processados'] == 0:
                    result['success'] = False
                    result['message'] = "Nenhum item pôde ser processado"
                    safe_print(f"[ESTOQUE SERVICE] ERROR FALHA TOTAL - Nenhum item processado")
                else:
                    result['message'] = f"Processamento parcial: {result['items_processados']} sucessos, {result['items_com_erro']} erros"
                    safe_print(f"[ESTOQUE SERVICE] WARN PROCESSAMENTO PARCIAL")
            else:
                result['message'] = f"Todos os {result['items_processados']} itens processados com sucesso"
                safe_print(f"[ESTOQUE SERVICE] OK SUCESSO TOTAL - Todos os itens processados")
            
            safe_print(f"[ESTOQUE SERVICE] Message final: {result['message']}")
            print("[ESTOQUE SERVICE] ==========================================")
            
            # === NOTIFICAÇÃO EM TEMPO REAL ===
            # Enviar notificação WebSocket sobre a venda processada
            if REALTIME_NOTIFICATIONS_AVAILABLE:
                try:
                    notify_venda_shopify(
                        user=loja_config.user,
                        loja_config=loja_config,
                        order_data=order_data,
                        result=result
                    )
                    logger.info(f"Notificação WebSocket enviada para venda {order_data.get('order_number')}")
                except Exception as e:
                    logger.error(f"Erro ao enviar notificação WebSocket: {str(e)}")
            
            return result
            
        except Exception as e:
            logger.error(f"Erro no processamento da venda webhook: {str(e)}")
            result['success'] = False
            result['message'] = f"Erro no processamento: {str(e)}"
            
            # Notificar erro via WebSocket
            if REALTIME_NOTIFICATIONS_AVAILABLE:
                try:
                    notify_webhook_error(
                        user=loja_config.user,
                        loja_config=loja_config,
                        error_details={
                            'error_type': 'processing_error',
                            'error_message': str(e),
                            'order_number': order_data.get('order_number'),
                            'shopify_order_id': order_data.get('shopify_order_id'),
                            'webhook_topic': 'orders/paid',
                            'suggested_action': 'Verificar logs do sistema e configurações da loja'
                        }
                    )
                except Exception as notify_error:
                    logger.error(f"Erro ao notificar erro webhook: {str(notify_error)}")
            
            return result
    
    @staticmethod
    @transaction.atomic
    def processar_cancelamento_webhook(loja_config, order_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Processa um cancelamento recebido via webhook para adicionar estoque de volta
        
        Args:
            loja_config: Instância de ShopifyConfig
            order_data: Dados do pedido cancelado extraídos do webhook
            
        Returns:
            Dict com resultado do processamento
        """
        # ===== DEBUG LOG: ENTRADA DO SERVIÇO =====
        safe_print(f"[CANCELAMENTO SERVICE] === PROCESSAR CANCELAMENTO WEBHOOK ===")
        safe_print(f"[CANCELAMENTO SERVICE] Loja: {loja_config.nome_loja if hasattr(loja_config, 'nome_loja') else 'N/A'}")
        safe_print(f"[CANCELAMENTO SERVICE] Order Number: #{order_data.get('order_number', 'N/A')}")
        safe_print(f"[CANCELAMENTO SERVICE] Order ID: {order_data.get('shopify_order_id', 'N/A')}")
        safe_print(f"[CANCELAMENTO SERVICE] Line Items: {len(order_data.get('line_items', []))}")
        print("[CANCELAMENTO SERVICE] =======================================")
        
        result = {
            'success': True,
            'shopify_order_id': order_data.get('shopify_order_id'),
            'order_number': order_data.get('order_number'),
            'items_processados': 0,
            'items_com_erro': 0,
            'detalhes': [],
            'alertas_gerados': []
        }
        
        try:
            line_items = order_data.get('line_items', [])
            
            safe_print(f"[CANCELAMENTO SERVICE] Iniciando loop pelos {len(line_items)} line_items...")
            
            for i, item in enumerate(line_items):
                sku = item.get('sku', 'N/A')
                quantity = item.get('quantity', 0)
                
                safe_print(f"[CANCELAMENTO SERVICE] --- ITEM {i+1}/{len(line_items)} ---")
                safe_print(f"[CANCELAMENTO SERVICE] SKU: {sku}")
                safe_print(f"[CANCELAMENTO SERVICE] Quantity: {quantity}")
                safe_print(f"[CANCELAMENTO SERVICE] Title: {item.get('title', 'N/A')}")
                
                safe_print(f"[CANCELAMENTO SERVICE] Chamando _processar_item_cancelamento()...")
                item_result = EstoqueService._processar_item_cancelamento(
                    loja_config, item, order_data
                )
                
                safe_print(f"[CANCELAMENTO SERVICE] Resultado para SKU {sku}:")
                safe_print(f"[CANCELAMENTO SERVICE]   - Success: {item_result['success']}")
                safe_print(f"[CANCELAMENTO SERVICE]   - Message: {item_result['message']}")
                if item_result['success']:
                    safe_print(f"[CANCELAMENTO SERVICE]   - Estoque: {item_result['estoque_anterior']} → {item_result['estoque_posterior']}")
                
                result['detalhes'].append(item_result)
                
                if item_result['success']:
                    result['items_processados'] += 1
                else:
                    result['items_com_erro'] += 1
                
                safe_print(f"[CANCELAMENTO SERVICE] ----------------------------------------")
            
            safe_print(f"[CANCELAMENTO SERVICE] === FINALIZANDO PROCESSAMENTO ===")
            safe_print(f"[CANCELAMENTO SERVICE] Items processados: {result['items_processados']}")
            safe_print(f"[CANCELAMENTO SERVICE] Items com erro: {result['items_com_erro']}")
            
            # Definir sucesso geral
            if result['items_com_erro'] > 0:
                if result['items_processados'] == 0:
                    result['success'] = False
                    result['message'] = "Nenhum item pôde ter estoque revertido"
                    safe_print(f"[CANCELAMENTO SERVICE] ERROR FALHA TOTAL - Nenhum item processado")
                else:
                    result['message'] = f"Reversão parcial: {result['items_processados']} sucessos, {result['items_com_erro']} erros"
                    safe_print(f"[CANCELAMENTO SERVICE] WARN PROCESSAMENTO PARCIAL")
            else:
                result['message'] = f"Todos os {result['items_processados']} itens tiveram estoque revertido com sucesso"
                safe_print(f"[CANCELAMENTO SERVICE] OK SUCESSO TOTAL - Todos os itens processados")
            
            safe_print(f"[CANCELAMENTO SERVICE] Message final: {result['message']}")
            print("[CANCELAMENTO SERVICE] ==========================================")
            
            return result
            
        except Exception as e:
            logger.error(f"Erro no processamento do cancelamento webhook: {str(e)}")
            result['success'] = False
            result['message'] = f"Erro no processamento: {str(e)}"
            return result
    
    @staticmethod
    def _processar_item_cancelamento(loja_config, item: Dict[str, Any], order_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Processa um item individual do cancelamento (adiciona estoque de volta)
        
        Args:
            loja_config: Configuração da loja
            item: Dados do item
            order_data: Dados completos do pedido cancelado
            
        Returns:
            Dict com resultado do processamento do item
        """
        item_result = {
            'sku': item.get('sku'),
            'title': item.get('title'),
            'quantity': item.get('quantity', 0),
            'success': False,
            'message': '',
            'produto_id': None,
            'estoque_anterior': None,
            'estoque_posterior': None
        }
        
        try:
            sku = item.get('sku')
            quantity = int(item.get('quantity', 0))
            
            safe_print(f"[CANCELAMENTO PROCESSOR] === PROCESSANDO ITEM CANCELADO ===")
            safe_print(f"[CANCELAMENTO PROCESSOR] SKU recebido: '{sku}'")
            safe_print(f"[CANCELAMENTO PROCESSOR] Quantity para ADICIONAR de volta: {quantity}")
            
            if not sku:
                safe_print(f"[CANCELAMENTO PROCESSOR] ERROR SKU vazio ou nulo!")
                item_result['message'] = "SKU não fornecido"
                return item_result
            
            if quantity <= 0:
                safe_print(f"[CANCELAMENTO PROCESSOR] ERROR Quantidade inválida: {quantity}")
                item_result['message'] = f"Quantidade inválida: {quantity}"
                return item_result
            
            # Buscar produto no estoque
            safe_print(f"[CANCELAMENTO PROCESSOR] Buscando produto no banco de dados...")
            
            try:
                produto = ProdutoEstoque.objects.get(
                    loja_config=loja_config,
                    sku=sku,
                    ativo=True
                )
                safe_print(f"[CANCELAMENTO PROCESSOR] OK Produto encontrado!")
                safe_print(f"[CANCELAMENTO PROCESSOR] ID: {produto.id}")
                safe_print(f"[CANCELAMENTO PROCESSOR] Nome: {produto.nome}")
                safe_print(f"[CANCELAMENTO PROCESSOR] Estoque atual: {produto.estoque_atual}")
                
            except ProdutoEstoque.DoesNotExist:
                safe_print(f"[CANCELAMENTO PROCESSOR] ❌ ERROR: Produto NÃO encontrado no banco!")
                safe_print(f"[CANCELAMENTO PROCESSOR] SKU PROCURADO: '{sku}'")
                
                # Listar produtos da mesma loja
                produtos_loja = ProdutoEstoque.objects.filter(
                    loja_config=loja_config,
                    ativo=True
                ).values_list('id', 'sku', 'nome')
                
                safe_print(f"[CANCELAMENTO PROCESSOR] Produtos na loja ({produtos_loja.count()} total):")
                for prod_id, prod_sku, prod_nome in produtos_loja:
                    safe_print(f"[CANCELAMENTO PROCESSOR]   ID:{prod_id} | SKU:'{prod_sku}' | Nome:{prod_nome}")
                
                item_result['message'] = f"Produto com SKU '{sku}' não encontrado para cancelamento"
                return item_result
            
            # Adicionar estoque de volta
            safe_print(f"[CANCELAMENTO PROCESSOR] OK Produto encontrado! Adicionando estoque de volta...")
            
            estoque_anterior = produto.estoque_atual
            
            observacao = f"CANCELAMENTO Shopify - Pedido #{order_data.get('order_number')} - {item.get('title', 'Produto sem título')}"
            
            safe_print(f"[CANCELAMENTO PROCESSOR] Chamando produto.adicionar_estoque()...")
            safe_print(f"[CANCELAMENTO PROCESSOR] Parâmetros:")
            safe_print(f"[CANCELAMENTO PROCESSOR]   - quantidade: {quantity}")
            safe_print(f"[CANCELAMENTO PROCESSOR]   - observacao: {observacao}")
            
            produto.adicionar_estoque(
                quantidade=quantity,
                observacao=observacao,
                pedido_shopify_id=order_data.get('shopify_order_id')
            )
            
            # CORREÇÃO: Verificar alertas automaticamente após cancelamento
            safe_print(f"[CANCELAMENTO PROCESSOR] Verificando alertas após cancelamento...")
            produto._check_and_resolve_alerts_after_adjustment()
            
            safe_print(f"[CANCELAMENTO PROCESSOR] OK Estoque adicionado com sucesso!")
            safe_print(f"[CANCELAMENTO PROCESSOR] Estoque anterior: {estoque_anterior}")
            safe_print(f"[CANCELAMENTO PROCESSOR] Estoque atual: {produto.estoque_atual}")
            
            # Atualizar resultado
            item_result.update({
                'success': True,
                'message': 'Estoque revertido com sucesso',
                'produto_id': produto.id,
                'estoque_anterior': estoque_anterior,
                'estoque_posterior': produto.estoque_atual
            })
            
            return item_result
            
        except Exception as e:
            logger.error(f"Erro ao processar cancelamento do item: {str(e)}")
            item_result['message'] = f"Erro no processamento: {str(e)}"
            return item_result
    
    @staticmethod
    def _processar_item_venda(loja_config, item: Dict[str, Any], order_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Processa um item individual da venda
        
        Args:
            loja_config: Configuração da loja
            item: Dados do item
            order_data: Dados completos do pedido
            
        Returns:
            Dict com resultado do processamento do item
        """
        item_result = {
            'sku': item.get('sku'),
            'title': item.get('title'),
            'quantity': item.get('quantity', 0),
            'success': False,
            'message': '',
            'produto_id': None,
            'estoque_anterior': None,
            'estoque_posterior': None,
            'alertas_gerados': []
        }
        
        try:
            sku = item.get('sku')
            quantity = int(item.get('quantity', 0))
            
            safe_print(f"[ITEM PROCESSOR] === PROCESSANDO ITEM ===")
            safe_print(f"[ITEM PROCESSOR] SKU recebido: '{sku}'")
            safe_print(f"[ITEM PROCESSOR] Quantity recebida: {quantity}")
            
            if not sku:
                safe_print(f"[ITEM PROCESSOR] ERROR SKU vazio ou nulo!")
                item_result['message'] = "SKU não fornecido"
                return item_result
            
            if quantity <= 0:
                safe_print(f"[ITEM PROCESSOR] ERROR Quantidade inválida: {quantity}")
                item_result['message'] = f"Quantidade inválida: {quantity}"
                return item_result
            
            # Buscar produto no estoque
            safe_print(f"[ITEM PROCESSOR] Buscando produto no banco de dados...")
            safe_print(f"[ITEM PROCESSOR] Critérios da busca:")
            safe_print(f"[ITEM PROCESSOR]   - loja_config: {loja_config.id if hasattr(loja_config, 'id') else 'N/A'}")
            safe_print(f"[ITEM PROCESSOR]   - sku: '{sku}'")
            safe_print(f"[ITEM PROCESSOR]   - ativo: True")
            
            try:
                produto = ProdutoEstoque.objects.get(
                    loja_config=loja_config,
                    sku=sku,
                    ativo=True
                )
                safe_print(f"[ITEM PROCESSOR] OK Produto encontrado!")
                safe_print(f"[ITEM PROCESSOR] ID: {produto.id}")
                safe_print(f"[ITEM PROCESSOR] Nome: {produto.nome}")
                safe_print(f"[ITEM PROCESSOR] Estoque atual: {produto.estoque_atual}")
                safe_print(f"[ITEM PROCESSOR] Estoque mínimo: {produto.estoque_minimo}")
                
            except ProdutoEstoque.DoesNotExist:
                safe_print(f"[ITEM PROCESSOR] ❌ ERROR: Produto NÃO encontrado no banco!")
                safe_print(f"[ITEM PROCESSOR] ============== DEBUG DETALHADO ==============")
                safe_print(f"[ITEM PROCESSOR] SKU PROCURADO: '{sku}' (tipo: {type(sku)})")
                safe_print(f"[ITEM PROCESSOR] Loja ID: {loja_config.id if hasattr(loja_config, 'id') else 'N/A'}")
                safe_print(f"[ITEM PROCESSOR] Nome da Loja: {loja_config.nome_loja if hasattr(loja_config, 'nome_loja') else 'N/A'}")
                safe_print(f"[ITEM PROCESSOR] Shop URL: {loja_config.shop_url if hasattr(loja_config, 'shop_url') else 'N/A'}")
                
                # Debug: Listar TODOS os produtos da mesma loja para comparação
                produtos_loja = ProdutoEstoque.objects.filter(
                    loja_config=loja_config,
                    ativo=True
                ).values_list('id', 'sku', 'nome', 'estoque_atual')
                
                safe_print(f"[ITEM PROCESSOR] TODOS os produtos cadastrados nesta loja ({produtos_loja.count()} total):")
                if produtos_loja.count() == 0:
                    safe_print(f"[ITEM PROCESSOR] ⚠️  NENHUM produto cadastrado nesta loja!")
                else:
                    for prod_id, prod_sku, prod_nome, estoque in produtos_loja:
                        # Comparar caractere por caractere se necessário
                        sku_match = "✅ EXATO" if prod_sku == sku else "❌ DIFERENTE"
                        safe_print(f"[ITEM PROCESSOR]   ID:{prod_id} | SKU:'{prod_sku}' | Nome:{prod_nome} | Estoque:{estoque} | {sku_match}")
                
                # Verificar se existe produto com esse SKU em outras lojas
                outros_produtos = ProdutoEstoque.objects.filter(
                    sku=sku,
                    ativo=True
                ).exclude(loja_config=loja_config).values_list('loja_config__nome_loja', 'loja_config__shop_url')
                
                if outros_produtos.exists():
                    safe_print(f"[ITEM PROCESSOR] ⚠️  ATENÇÃO: SKU '{sku}' existe em outras lojas:")
                    for nome_loja, shop_url in outros_produtos:
                        safe_print(f"[ITEM PROCESSOR]     - Loja: {nome_loja} ({shop_url})")
                    safe_print(f"[ITEM PROCESSOR] 💡 POSSÍVEL SOLUÇÃO: Verifique se o webhook está sendo enviado para a loja correta")
                else:
                    safe_print(f"[ITEM PROCESSOR] ❌ SKU '{sku}' NÃO EXISTE em nenhuma loja do sistema")
                
                safe_print(f"[ITEM PROCESSOR] ============================================")
                
                item_result['message'] = f"Produto com SKU '{sku}' não encontrado no estoque da loja '{loja_config.nome_loja if hasattr(loja_config, 'nome_loja') else 'N/A'}'"
                return item_result
            
            # Verificar se há estoque suficiente
            safe_print(f"[ITEM PROCESSOR] Verificando estoque suficiente...")
            safe_print(f"[ITEM PROCESSOR] Estoque disponível: {produto.estoque_atual}")
            safe_print(f"[ITEM PROCESSOR] Quantidade solicitada: {quantity}")
            
            if produto.estoque_atual < quantity:
                safe_print(f"[ITEM PROCESSOR] ERROR Estoque INSUFICIENTE!")
                item_result['message'] = f"Estoque insuficiente. Disponível: {produto.estoque_atual}, Solicitado: {quantity}"
                return item_result
            
            safe_print(f"[ITEM PROCESSOR] OK Estoque suficiente! Prosseguindo com remoção...")
            
            # Decrementar estoque
            estoque_anterior = produto.estoque_atual
            
            observacao = f"Venda Shopify - Pedido #{order_data.get('order_number')} - {item.get('title', 'Produto sem título')}"
            
            safe_print(f"[ITEM PROCESSOR] Chamando produto.remover_estoque()...")
            safe_print(f"[ITEM PROCESSOR] Parâmetros:")
            safe_print(f"[ITEM PROCESSOR]   - quantidade: {quantity}")
            safe_print(f"[ITEM PROCESSOR]   - observacao: {observacao}")
            safe_print(f"[ITEM PROCESSOR]   - pedido_shopify_id: {order_data.get('shopify_order_id')}")
            
            produto.remover_estoque(
                quantidade=quantity,
                observacao=observacao,
                pedido_shopify_id=order_data.get('shopify_order_id')
            )
            
            # CORREÇÃO: Verificar alertas automaticamente após movimentação webhook
            safe_print(f"[ITEM PROCESSOR] Verificando alertas após movimentação...")
            produto._check_and_resolve_alerts_after_adjustment()
            
            safe_print(f"[ITEM PROCESSOR] OK Estoque removido com sucesso!")
            safe_print(f"[ITEM PROCESSOR] Estoque anterior: {estoque_anterior}")
            safe_print(f"[ITEM PROCESSOR] Estoque atual: {produto.estoque_atual}")
            
            # Atualizar resultado
            item_result.update({
                'success': True,
                'message': 'Estoque decrementado com sucesso',
                'produto_id': produto.id,
                'estoque_anterior': estoque_anterior,
                'estoque_posterior': produto.estoque_atual
            })
            
            # Verificar se foram gerados alertas
            alertas_recentes = AlertaEstoque.objects.filter(
                produto=produto,
                data_criacao__gte=timezone.now().replace(second=0, microsecond=0)
            )
            
            for alerta in alertas_recentes:
                item_result['alertas_gerados'].append({
                    'tipo': alerta.tipo_alerta,
                    'titulo': alerta.titulo,
                    'prioridade': alerta.prioridade
                })
            
            logger.info(f"Estoque decrementado: SKU {sku}, Quantidade: {quantity}, Estoque: {estoque_anterior} → {produto.estoque_atual}")
            
            return item_result
            
        except Exception as e:
            logger.error(f"Erro ao processar item {item.get('sku', 'N/A')}: {str(e)}")
            item_result['message'] = f"Erro interno: {str(e)}"
            return item_result
    
    @staticmethod
    def criar_movimentacao_venda(produto: ProdutoEstoque, quantidade: int, order_data: Dict[str, Any], usuario=None):
        """
        Cria uma movimentação específica de venda (método auxiliar para casos especiais)
        
        Args:
            produto: Produto em estoque
            quantidade: Quantidade vendida
            order_data: Dados do pedido
            usuario: Usuário (opcional)
        """
        try:
            estoque_anterior = produto.estoque_atual + quantidade  # Estoque antes da venda
            
            MovimentacaoEstoque.objects.create(
                produto=produto,
                usuario=usuario,
                tipo_movimento='venda',
                quantidade=quantidade,
                estoque_anterior=estoque_anterior,
                estoque_posterior=produto.estoque_atual,
                observacoes=f"Venda Shopify - Pedido #{order_data.get('order_number')} - Cliente: {order_data.get('customer_email', 'N/A')}",
                pedido_shopify_id=order_data.get('shopify_order_id'),
                origem_sync='shopify_webhook',
                dados_sync={
                    'order_number': order_data.get('order_number'),
                    'financial_status': order_data.get('financial_status'),
                    'total_price': order_data.get('total_price'),
                    'currency': order_data.get('currency'),
                    'processed_at': timezone.now().isoformat()
                }
            )
            
            logger.info(f"Movimentação de venda criada para SKU {produto.sku}")
            
        except Exception as e:
            logger.error(f"Erro ao criar movimentação de venda: {str(e)}")
            raise
    
    @staticmethod
    def verificar_alertas_pos_venda(produto: ProdutoEstoque) -> List[AlertaEstoque]:
        """
        Verifica e cria alertas necessários após uma venda
        
        Args:
            produto: Produto que teve estoque alterado
            
        Returns:
            Lista de alertas criados
        """
        alertas_criados = []
        
        try:
            # Verificar estoque zerado
            if produto.estoque_atual == 0 and produto.alerta_estoque_zero:
                alerta = AlertaEstoque.gerar_alerta_estoque_zero(produto)
                if alerta:
                    alertas_criados.append(alerta)
            
            # Verificar estoque baixo
            elif produto.estoque_baixo and produto.alerta_estoque_baixo:
                alerta = AlertaEstoque.gerar_alerta_estoque_baixo(produto)
                if alerta:
                    alertas_criados.append(alerta)
            
            # Verificar estoque negativo (situação crítica)
            if produto.estoque_atual < 0:
                alerta = AlertaEstoque.objects.create(
                    produto=produto,
                    usuario_responsavel=produto.user,
                    tipo_alerta='estoque_negativo',
                    prioridade='critica',
                    titulo=f"CRÍTICO: Estoque negativo - {produto.sku}",
                    descricao=f"O produto {produto.nome} está com estoque NEGATIVO: {produto.estoque_atual}. "
                             f"Isso indica um problema no controle de estoque que precisa ser resolvido imediatamente.",
                    valor_atual=produto.estoque_atual,
                    valor_limite=0,
                    acao_sugerida="URGENTE: Verificar movimentações recentes e corrigir estoque manualmente.",
                    dados_contexto={
                        'sku': produto.sku,
                        'nome_produto': produto.nome,
                        'loja': produto.loja_config.nome_loja,
                        'situacao': 'estoque_negativo_critico'
                    }
                )
                alertas_criados.append(alerta)
            
            return alertas_criados
            
        except Exception as e:
            logger.error(f"Erro ao verificar alertas pós-venda: {str(e)}")
            return alertas_criados
    
    @staticmethod
    def obter_estatisticas_processamento(loja_config, data_inicio=None, data_fim=None) -> Dict[str, Any]:
        """
        Obtém estatísticas de processamento de vendas via webhook
        
        Args:
            loja_config: Configuração da loja
            data_inicio: Data inicial para filtro (opcional)
            data_fim: Data final para filtro (opcional)
            
        Returns:
            Dict com estatísticas
        """
        try:
            from django.db.models import Count, Sum
            
            # Filtros de data
            filtros = {
                'produto__loja_config': loja_config,
                'tipo_movimento': 'venda',
                'origem_sync': 'shopify_webhook'
            }
            
            if data_inicio:
                filtros['data_movimentacao__gte'] = data_inicio
            if data_fim:
                filtros['data_movimentacao__lte'] = data_fim
            
            # Consultas
            movimentacoes = MovimentacaoEstoque.objects.filter(**filtros)
            
            stats = {
                'total_vendas_processadas': movimentacoes.count(),
                'total_itens_vendidos': movimentacoes.aggregate(Sum('quantidade'))['quantidade__sum'] or 0,
                'produtos_impactados': movimentacoes.values('produto').distinct().count(),
                'periodo': {
                    'data_inicio': data_inicio.isoformat() if data_inicio else None,
                    'data_fim': data_fim.isoformat() if data_fim else None
                }
            }
            
            # Top produtos vendidos
            top_produtos = movimentacoes.values(
                'produto__sku', 'produto__nome'
            ).annotate(
                total_vendido=Sum('quantidade')
            ).order_by('-total_vendido')[:10]
            
            stats['top_produtos_vendidos'] = list(top_produtos)
            
            return stats
            
        except Exception as e:
            logger.error(f"Erro ao obter estatísticas de processamento: {str(e)}")
            return {'erro': str(e)}