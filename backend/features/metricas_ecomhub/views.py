# backend/features/metricas_ecomhub/views.py - VERSÃO COMPLETA COM ASYNC + MÉTODOS EXISTENTES
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.http import StreamingHttpResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
import django_rq
import json
import tempfile
import os
import uuid
import logging

from .models import (
    AnaliseEcomhub, StatusMappingEcomhub, LojaShopify, 
    CacheProdutoShopify, ProcessamentoJob, ProcessamentoChunk
)
from .serializers import (
    AnaliseEcomhubSerializer, 
    CSVUploadEcomhubSerializer, 
    ProcessarAnaliseEcomhubSerializer,
    StatusMappingEcomhubSerializer,
    LojaShopifySerializer,
    CacheProdutoShopifySerializer,
    TestarConexaoShopifySerializer
)
from .utils import EcomhubProcessor
from .shopify_client import ShopifyClient
from .background_worker import processar_ecomhub_job
import pandas as pd

logger = logging.getLogger(__name__)

class ProcessamentoJobViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet para gerenciar jobs de processamento"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return ProcessamentoJob.objects.filter(criado_por=self.request.user).order_by('-criado_em')
    
    def retrieve(self, request, pk=None):
        """Busca job específico com progresso"""
        job = get_object_or_404(self.get_queryset(), job_id=pk)
        
        data = {
            'job_id': job.job_id,
            'nome': job.nome,
            'status': job.status,
            'progresso_atual': job.progresso_atual,
            'progresso_total': job.progresso_total,
            'progresso_porcentagem': job.progresso_porcentagem,
            'mensagem_atual': job.mensagem_atual,
            'erro_detalhes': job.erro_detalhes,
            'dados_resultado': job.dados_resultado,
            'estatisticas': job.estatisticas,
            'produtos_nao_encontrados': job.produtos_nao_encontrados[:10] if job.produtos_nao_encontrados else [],
            'cache_hits': job.cache_hits,
            'api_calls': job.api_calls,
            'duracao': str(job.duracao) if job.duracao else None,
            'pode_cancelar': job.pode_cancelar,
            'esta_finalizado': job.esta_finalizado,
            'tipo_metrica': job.tipo_metrica,
            'loja_shopify_nome': job.loja_shopify.nome if job.loja_shopify else None,
            'criado_em': job.criado_em,
            'atualizado_em': job.atualizado_em,
        }
        
        return Response(data)
    
    @action(detail=True, methods=['post'])
    def cancelar(self, request, pk=None):
        """Cancela job em andamento"""
        job = get_object_or_404(self.get_queryset(), job_id=pk)
        
        if not job.pode_cancelar:
            return Response({
                'error': 'Job não pode ser cancelado no status atual'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        job.cancelar()
        
        return Response({
            'message': 'Job cancelado com sucesso',
            'status': job.status
        })
    
    @action(detail=True, methods=['delete'])
    def deletar(self, request, pk=None):
        """Deleta job e seus dados"""
        job = get_object_or_404(self.get_queryset(), job_id=pk)
        
        if job.status == 'processing':
            return Response({
                'error': 'Não é possível deletar job em processamento'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        job.delete()
        
        return Response({
            'message': 'Job deletado com sucesso'
        })
    
    @action(detail=False, methods=['get'])
    def ativos(self, request):
        """Lista jobs ativos (pendentes ou processando)"""
        jobs_ativos = self.get_queryset().filter(
            status__in=['pending', 'processing']
        )
        
        data = []
        for job in jobs_ativos:
            data.append({
                'job_id': job.job_id,
                'nome': job.nome,
                'status': job.status,
                'progresso_porcentagem': job.progresso_porcentagem,
                'mensagem_atual': job.mensagem_atual,
                'tipo_metrica': job.tipo_metrica,
                'criado_em': job.criado_em,
            })
        
        return Response(data)

class LojaShopifyViewSet(viewsets.ModelViewSet):
    """ViewSet para gerenciar lojas Shopify"""
    serializer_class = LojaShopifySerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return LojaShopify.objects.filter(ativo=True).order_by('nome')
    
    @action(detail=True, methods=['post'])
    def testar_conexao(self, request, pk=None):
        """Testa conexão com loja Shopify"""
        loja = get_object_or_404(LojaShopify, pk=pk, ativo=True)
        
        try:
            success, result = loja.test_connection()
            
            if success:
                loja.testado_em = timezone.now()
                loja.ultimo_erro = None
                loja.save()
                
                return Response({
                    'status': 'success',
                    'message': 'Conexão estabelecida com sucesso!',
                    'shop_info': {
                        'name': result.get('name', ''),
                        'domain': result.get('domain', ''),
                        'currency': result.get('currency', ''),
                        'country': result.get('country_name', '')
                    }
                })
            else:
                return Response({
                    'status': 'error',
                    'message': f'Falha na conexão: {result}'
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Erro ao testar conexão: {e}")
            return Response({
                'status': 'error',
                'message': f'Erro inesperado: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'])
    def limpar_cache(self, request, pk=None):
        """Limpa cache de produtos da loja"""
        loja = get_object_or_404(LojaShopify, pk=pk, ativo=True)
        
        try:
            client = ShopifyClient(loja)
            deleted_count = client.clear_cache()
            
            return Response({
                'status': 'success',
                'message': f'Cache limpo: {deleted_count} produtos removidos'
            })
            
        except Exception as e:
            logger.error(f"Erro ao limpar cache: {e}")
            return Response({
                'status': 'error',
                'message': f'Erro ao limpar cache: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def lojas_ativas(self, request):
        """Lista apenas lojas ativas para seleção"""
        lojas = LojaShopify.objects.filter(ativo=True).order_by('nome')
        serializer = self.get_serializer(lojas, many=True)
        return Response(serializer.data)

class AnaliseEcomhubViewSet(viewsets.ModelViewSet):
    serializer_class = AnaliseEcomhubSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return AnaliseEcomhub.objects.all().order_by('-atualizado_em')
    
    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def upload_csv(self, request):
        """Upload e processamento SÍNCRONO de CSV (método original mantido)"""
        serializer = CSVUploadEcomhubSerializer(data=request.data)
        if serializer.is_valid():
            try:
                df = serializer.process_csv()
                modo = serializer.validated_data.get('modo_processamento', 'produto')
                loja_shopify = serializer.validated_data.get('loja_shopify')
                
                logger.info(f"Processando arquivo em modo: {modo}")
                
                resultado = EcomhubProcessor.process_ecomhub_file(df, modo, loja_shopify)
                
                response_data = {
                    'status': 'success',
                    'tipo': 'ecomhub',
                    'modo_processamento': modo,
                    'dados_processados': resultado['dados'],
                    'estatisticas': resultado['stats']
                }
                
                # Adicionar informações específicas do modo produto
                if modo == 'produto' and loja_shopify:
                    response_data['loja_shopify'] = {
                        'id': loja_shopify.id,
                        'nome': loja_shopify.nome
                    }
                    
                    if 'produtos_nao_encontrados' in resultado:
                        response_data['produtos_nao_encontrados'] = resultado['produtos_nao_encontrados']
                
                return Response(response_data)
                
            except Exception as e:
                logger.error(f"Erro no processamento: {e}")
                return Response({
                    'status': 'error',
                    'message': f"Erro no processamento: {str(e)}"
                }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def upload_csv_async(self, request):
        """Upload e processamento ASSÍNCRONO de CSV (novo método)"""
        arquivo = request.FILES.get('arquivo')
        modo_processamento = request.data.get('modo_processamento', 'produto')
        loja_shopify_id = request.data.get('loja_shopify_id')
        nome_job = request.data.get('nome_job', f'Processamento {timezone.now().strftime("%d/%m/%Y %H:%M")}')
        
        if not arquivo:
            return Response({
                'error': 'Arquivo é obrigatório'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if not arquivo.name.endswith('.csv'):
            return Response({
                'error': 'Apenas arquivos CSV são permitidos'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if arquivo.size > 50 * 1024 * 1024:  # 50MB
            return Response({
                'error': 'Arquivo muito grande. Máximo 50MB'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if modo_processamento == 'produto' and not loja_shopify_id:
            return Response({
                'error': 'Para processamento por produto, selecione uma loja Shopify'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validar loja Shopify se necessário
        loja_shopify = None
        if loja_shopify_id:
            try:
                loja_shopify = LojaShopify.objects.get(id=loja_shopify_id, ativo=True)
            except LojaShopify.DoesNotExist:
                return Response({
                    'error': 'Loja Shopify não encontrada ou inativa'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Salvar arquivo temporário
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.csv')
            for chunk in arquivo.chunks():
                temp_file.write(chunk)
            temp_file.close()
            
            # Criar job
            job_id = str(uuid.uuid4())
            job = ProcessamentoJob.objects.create(
                job_id=job_id,
                nome=nome_job,
                tipo_metrica=modo_processamento,
                loja_shopify=loja_shopify,
                arquivo_nome=arquivo.name,
                arquivo_path=temp_file.name,
                criado_por=request.user
            )
            
            # Enfileirar job
            queue = django_rq.get_queue('default')
            queue.enqueue(processar_ecomhub_job, job_id, timeout=3600)  # 1 hora timeout
            
            return Response({
                'status': 'success',
                'job_id': job_id,
                'message': 'Processamento iniciado! Acompanhe o progresso.',
                'nome_job': nome_job,
                'modo_processamento': modo_processamento,
                'loja_shopify': loja_shopify.nome if loja_shopify else None
            })
            
        except Exception as e:
            logger.error(f"Erro ao criar job: {e}")
            return Response({
                'error': f'Erro ao iniciar processamento: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'])
    def processar_analise(self, request):
        """Processa dados e salva análise completa (método original mantido)"""
        serializer = ProcessarAnaliseEcomhubSerializer(data=request.data)
        if serializer.is_valid():
            try:
                data = serializer.validated_data
                
                # Salvar análise
                analise = AnaliseEcomhub.objects.create(
                    nome=data['nome_analise'],
                    dados_efetividade=data['dados_ecomhub'],
                    tipo_metrica=data.get('tipo_metrica', 'produto'),
                    loja_shopify=data.get('loja_shopify'),
                    criado_por=request.user
                )
                
                response_data = {
                    'status': 'success',
                    'analise_id': analise.id,
                    'message': f"Análise '{analise.nome}' salva com sucesso!"
                }
                
                # Adicionar informações da loja se aplicável
                if analise.loja_shopify:
                    response_data['loja_shopify'] = analise.loja_shopify.nome
                
                return Response(response_data)
                
            except Exception as e:
                logger.error(f"Erro ao processar análise: {e}")
                return Response({
                    'status': 'error',
                    'message': f"Erro ao processar análise: {str(e)}"
                }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def salvar_de_job(self, request):
        """Salva análise a partir de um job concluído (novo método)"""
        job_id = request.data.get('job_id')
        nome_analise = request.data.get('nome_analise')
        
        if not job_id or not nome_analise:
            return Response({
                'error': 'job_id e nome_analise são obrigatórios'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            job = ProcessamentoJob.objects.get(
                job_id=job_id, 
                criado_por=request.user,
                status='completed'
            )
        except ProcessamentoJob.DoesNotExist:
            return Response({
                'error': 'Job não encontrado ou não concluído'
            }, status=status.HTTP_404_NOT_FOUND)
        
        if not job.dados_resultado:
            return Response({
                'error': 'Job não possui dados de resultado'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Criar análise baseada no job
            analise = AnaliseEcomhub.objects.create(
                nome=nome_analise,
                dados_efetividade=job.dados_resultado,
                tipo_metrica=job.tipo_metrica,
                loja_shopify=job.loja_shopify,
                criado_por=request.user
            )
            
            return Response({
                'status': 'success',
                'analise_id': analise.id,
                'message': f"Análise '{analise.nome}' salva com sucesso!"
            })
            
        except Exception as e:
            logger.error(f"Erro ao salvar análise: {e}")
            return Response({
                'error': f'Erro ao salvar análise: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def por_tipo(self, request):
        """Lista análises filtradas por tipo de métrica"""
        tipo = request.query_params.get('tipo', 'produto')
        analises = self.get_queryset().filter(tipo_metrica=tipo)
        serializer = self.get_serializer(analises, many=True)
        return Response(serializer.data)

class StatusMappingEcomhubViewSet(viewsets.ModelViewSet):
    queryset = StatusMappingEcomhub.objects.all()
    serializer_class = StatusMappingEcomhubSerializer
    permission_classes = [permissions.IsAuthenticated]

class CacheProdutoShopifyViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet somente leitura para cache de produtos"""
    serializer_class = CacheProdutoShopifySerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        loja_id = self.request.query_params.get('loja_id')
        queryset = CacheProdutoShopify.objects.all()
        
        if loja_id:
            queryset = queryset.filter(loja_shopify_id=loja_id)
        
        return queryset.order_by('-atualizado_em')
    
    @action(detail=False, methods=['get'])
    def estatisticas(self, request):
        """Estatísticas do cache"""
        loja_id = request.query_params.get('loja_id')
        queryset = self.get_queryset()
        
        if loja_id:
            queryset = queryset.filter(loja_shopify_id=loja_id)
        
        total_cache = queryset.count()
        lojas_com_cache = queryset.values('loja_shopify__nome').distinct().count()
        
        return Response({
            'total_produtos_cache': total_cache,
            'lojas_com_cache': lojas_com_cache,
            'ultima_atualizacao': queryset.first().atualizado_em if queryset.exists() else None
        })

# Server-Sent Events para progresso em tempo real
@method_decorator(csrf_exempt, name='dispatch')
@require_http_methods(["GET"])
def job_progress_stream(request, job_id):
    """Stream de progresso via Server-Sent Events"""
    
    def event_stream():
        try:
            job = ProcessamentoJob.objects.get(job_id=job_id)
            
            # Verificar se o usuário tem permissão
            if request.user != job.criado_por:
                yield f"data: {json.dumps({'error': 'Acesso negado'})}\n\n"
                return
            
            last_update = timezone.now()
            
            while not job.esta_finalizado:
                job.refresh_from_db()
                
                # Enviar dados do progresso
                data = {
                    'job_id': job.job_id,
                    'status': job.status,
                    'progresso_atual': job.progresso_atual,
                    'progresso_total': job.progresso_total,
                    'progresso_porcentagem': job.progresso_porcentagem,
                    'mensagem_atual': job.mensagem_atual,
                    'erro_detalhes': job.erro_detalhes,
                    'cache_hits': job.cache_hits,
                    'api_calls': job.api_calls,
                    'duracao': str(job.duracao) if job.duracao else None,
                    'timestamp': timezone.now().isoformat()
                }
                
                yield f"data: {json.dumps(data)}\n\n"
                
                # Break se job finalizou
                if job.esta_finalizado:
                    break
                
                # Aguardar antes da próxima verificação
                import time
                time.sleep(2)
            
            # Enviar dados finais
            job.refresh_from_db()
            final_data = {
                'job_id': job.job_id,
                'status': job.status,
                'progresso_porcentagem': job.progresso_porcentagem,
                'mensagem_atual': job.mensagem_atual,
                'erro_detalhes': job.erro_detalhes,
                'dados_resultado': job.dados_resultado,
                'estatisticas': job.estatisticas,
                'produtos_nao_encontrados': job.produtos_nao_encontrados[:10] if job.produtos_nao_encontrados else [],
                'duracao': str(job.duracao) if job.duracao else None,
                'finalizado': True,
                'timestamp': timezone.now().isoformat()
            }
            
            yield f"data: {json.dumps(final_data)}\n\n"
            
        except ProcessamentoJob.DoesNotExist:
            yield f"data: {json.dumps({'error': 'Job não encontrado'})}\n\n"
        except Exception as e:
            logger.error(f"Erro no stream: {e}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
    
    response = StreamingHttpResponse(
        event_stream(),
        content_type='text/event-stream'
    )
    response['Cache-Control'] = 'no-cache'
    response['Connection'] = 'keep-alive'
    response['Access-Control-Allow-Origin'] = '*'
    response['Access-Control-Allow-Headers'] = 'Cache-Control'
    
    return response