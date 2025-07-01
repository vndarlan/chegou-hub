# backend/core/urls.py - VERSÃO CORRIGIDA
from django.urls import path
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.utils.decorators import method_decorator
from django.views import View
import json

from .views import (
    SimpleLoginView,
    LogoutView,
    CurrentStateView,
    SelectAreaView,
    RegisterView,
    EnsureCSRFView,
)
from .views_debug import DebugCorsView

# ===== VIEWS TEMPORÁRIAS PARA IA =====

@csrf_exempt
@require_http_methods(["POST"])
def criar_log_temp(request):
    """View temporária para criar logs - PÚBLICO"""
    try:
        data = json.loads(request.body)
        print(f"[IA LOG] Recebido: {data}")
        
        # Validação básica
        required_fields = ['ferramenta', 'nivel', 'mensagem', 'pais']
        for field in required_fields:
            if field not in data:
                return JsonResponse({'error': f'Campo {field} é obrigatório'}, status=400)
        
        # Simular resposta de sucesso
        return JsonResponse({
            'status': 'success',
            'message': 'Log criado com sucesso',
            'id': 999,
            'data_recebida': data
        }, status=201)
        
    except json.JSONDecodeError:
        return JsonResponse({'error': 'JSON inválido'}, status=400)
    except Exception as e:
        print(f"[IA LOG] Erro: {str(e)}")
        return JsonResponse({'error': f'Erro interno: {str(e)}'}, status=500)

def dashboard_stats_temp(request):
    """Stats temporárias"""
    if request.method != 'GET':
        return JsonResponse({'error': 'Método não permitido'}, status=405)
    
    return JsonResponse({
        'resumo': {
            'total_logs': 42,
            'logs_24h': 15,
            'logs_nao_resolvidos': 3,
            'logs_criticos_7d': 1
        },
        'por_ferramenta': [
            {'ferramenta': 'Nicochat', 'total': 10, 'erros': 2, 'nao_resolvidos': 1},
            {'ferramenta': 'N8N', 'total': 5, 'erros': 1, 'nao_resolvidos': 2}
        ],
        'por_pais_nicochat': [
            {'pais': 'mexico', 'total': 8, 'erros': 1},
            {'pais': 'colombia', 'total': 2, 'erros': 1}
        ]
    })

def logs_temp(request):
    """Logs temporários"""
    if request.method != 'GET':
        return JsonResponse({'error': 'Método não permitido'}, status=405)
    
    # Lista vazia por enquanto
    return JsonResponse([])

# ===== URLs =====

urlpatterns = [
    # Autenticação/Estado
    path('login/', SimpleLoginView.as_view(), name='api_login'),
    path('logout/', LogoutView.as_view(), name='api_logout'),
    path('current-state/', CurrentStateView.as_view(), name='api_current_state'),
    path('register/', RegisterView.as_view(), name='api_register'),
    path('select-area/', SelectAreaView.as_view(), name='api_select_area'),
    path('ensure-csrf/', EnsureCSRFView.as_view(), name='ensure_csrf'),
    
    # Debug
    path('debug/cors/', DebugCorsView.as_view(), name='debug_cors'),
    path('cors-debug/', DebugCorsView.as_view(), name='cors_debug'),
    
    # ===== ROTAS TEMPORÁRIAS DA IA =====
    path('ia/criar-log/', criar_log_temp, name='criar_log_temp'),
    path('ia/dashboard-stats/', dashboard_stats_temp, name='dashboard_stats_temp'),
    path('ia/logs/', logs_temp, name='logs_temp'),
]