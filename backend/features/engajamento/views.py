# backend/features/engajamento/views.py
import requests
import os
import json
from rest_framework import viewsets, status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from .models import Engajamento, PedidoEngajamento, ItemPedido
from .serializers import (
    EngajamentoSerializer, PedidoEngajamentoSerializer, CriarPedidoSerializer
)

# Configurações da API
API_KEY = os.getenv('SMMRAJA_API_KEY')
API_URL = "https://www.smmraja.com/api/v3"

class EngajamentoViewSet(viewsets.ModelViewSet):
    queryset = Engajamento.objects.filter(ativo=True)
    serializer_class = EngajamentoSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        tipo = self.request.query_params.get('tipo')
        funcionando = self.request.query_params.get('funcionando')
        
        if tipo:
            queryset = queryset.filter(tipo=tipo)
        if funcionando is not None:
            funcionando_bool = funcionando.lower() == 'true'
            queryset = queryset.filter(funcionando=funcionando_bool)
            
        return queryset

class PedidoEngajamentoViewSet(viewsets.ModelViewSet):
    serializer_class = PedidoEngajamentoSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Retorna todos os pedidos de todos os usuários ordenados por data de criação
        return PedidoEngajamento.objects.all().order_by('-data_criacao')

def consultar_saldo_api():
    """Consulta saldo na API"""
    try:
        payload = {
            "key": API_KEY,
            "action": "balance"
        }
        
        response = requests.post(API_URL, data=payload, timeout=10)
        data = response.json()
        
        if "error" in data:
            return None, f"Erro: {data['error']}"
        elif "balance" in data:
            saldo = data.get("balance", "N/A")
            currency = data.get("currency", "BRL")
            return {"saldo": saldo, "moeda": currency}, None
        else:
            return None, "Resposta da API não contém campos esperados"
    except Exception as e:
        return None, f"Erro ao consultar saldo: {str(e)}"

@api_view(['GET'])
def saldo_api(request):
    """Endpoint para consultar saldo"""
    saldo_info, erro = consultar_saldo_api()
    if saldo_info:
        return Response(saldo_info)
    else:
        return Response({"error": erro}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
def criar_pedido_engajamento(request):
    """Endpoint para criar pedidos de engajamento"""
    serializer = CriarPedidoSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    urls_text = serializer.validated_data['urls']
    engajamentos_data = serializer.validated_data['engajamentos']
    
    urls = [linha.strip() for linha in urls_text.split('\n') if linha.strip()]
    
    if not urls:
        return Response({"error": "Nenhuma URL fornecida"}, status=status.HTTP_400_BAD_REQUEST)
    
    if not engajamentos_data:
        return Response({"error": "Nenhum engajamento selecionado"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        with transaction.atomic():
            # Criar pedido
            pedido = PedidoEngajamento.objects.create(
                urls=urls_text,
                total_links=len(urls),
                criado_por=request.user,
                status='processando'
            )
            
            resultados_api = []
            
            # Processar cada engajamento
            for eng_data in engajamentos_data:
                try:
                    engajamento = Engajamento.objects.get(
                        id=eng_data['id'], 
                        ativo=True, 
                        funcionando=True
                    )
                    quantidade = int(eng_data['quantidade'])
                    
                    # Criar item do pedido
                    item = ItemPedido.objects.create(
                        pedido=pedido,
                        engajamento=engajamento,
                        quantidade=quantidade
                    )
                    
                    # Enviar para API para cada URL
                    for url in urls:
                        payload = {
                            "key": API_KEY,
                            "action": "add",
                            "service": engajamento.engajamento_id,
                            "link": url,
                            "quantity": quantidade
                        }
                        
                        try:
                            response = requests.post(API_URL, data=payload, timeout=15)
                            response_data = response.json()
                            
                            resultado = {
                                "engajamento": engajamento.nome,
                                "tipo": engajamento.tipo,
                                "url": url,
                                "quantidade": quantidade,
                                "resposta_api": response_data
                            }
                            
                            if "order" in response_data:
                                resultado["status"] = "sucesso"
                                resultado["ordem_api"] = response_data["order"]
                                item.ordem_api = response_data["order"]
                                item.status = "concluido"
                            else:
                                resultado["status"] = "erro"
                                resultado["erro"] = response_data.get("error", "Erro desconhecido")
                                item.status = "erro"
                            
                            item.save()
                            resultados_api.append(resultado)
                            
                        except Exception as e:
                            resultado = {
                                "engajamento": engajamento.nome,
                                "tipo": engajamento.tipo,
                                "url": url,
                                "quantidade": quantidade,
                                "status": "erro",
                                "erro": str(e)
                            }
                            resultados_api.append(resultado)
                            item.status = "erro"
                            item.save()
                
                except Engajamento.DoesNotExist:
                    resultados_api.append({
                        "erro": f"Engajamento ID {eng_data['id']} não encontrado"
                    })
                except ValueError:
                    resultados_api.append({
                        "erro": f"Quantidade inválida: {eng_data['quantidade']}"
                    })
            
            # Atualizar pedido com resultados
            pedido.resultado_api = resultados_api
            pedido.status = 'concluido'
            pedido.save()
            
            return Response({
                "pedido_id": pedido.id,
                "status": "concluido",
                "total_links": len(urls),
                "total_engajamentos": len(engajamentos_data),
                "resultados": resultados_api
            })
    
    except Exception as e:
        return Response(
            {"error": f"Erro ao processar pedido: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )