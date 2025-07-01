# backend/core/urls.py - VERSÃO TEMPORÁRIA COM IA
from django.urls import path
from .views import (
    SimpleLoginView,
    LogoutView,
    CurrentStateView,
    SelectAreaView,
    RegisterView,
    EnsureCSRFView,
)
from .views_debug import DebugCorsView

# VIEWS TEMPORÁRIAS PARA IA
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json

@csrf_exempt
@require_http_methods(["POST"])
def criar_log_temp(request):
    """View temporária para criar logs"""
    try:
        data = json.loads(request.body)
        print(f"Log recebido: {data}")  # Debug
        return JsonResponse({
            'status': 'ok',
            'message': 'Log recebido com sucesso',
            'id': 1
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

def dashboard_stats_temp(request):
    """Stats temporárias"""
    return JsonResponse({
        'resumo': {
            'total_logs': 0,
            'logs_24h': 0,
            'logs_nao_resolvidos': 0,
            'logs_criticos_7d': 0
        },
        'por_ferramenta': [],
        'por_pais_nicochat': []
    })

def logs_temp(request):
    """Logs temporários"""
    return JsonResponse([])

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
    
    # ROTAS TEMPORÁRIAS DA IA
    path('ia/criar-log/', criar_log_temp, name='criar_log_temp'),
    path('ia/dashboard-stats/', dashboard_stats_temp, name='dashboard_stats_temp'),
    path('ia/logs/', logs_temp, name='logs_temp'),
]