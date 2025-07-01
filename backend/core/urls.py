# backend/core/urls.py - VERSÃO FINAL CORRIGIDA
from django.urls import path
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
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

# ===== VIEWS TEMPORÁRIAS PARA IA (SEM DADOS FAKE) =====

@csrf_exempt
def criar_log_temp(request):
    """View temporária para criar logs - PÚBLICO"""
    if request.method != 'POST':
        return JsonResponse({'error': 'Método não permitido'}, status=405)
    
    try:
        data = json.loads(request.body)
        print(f"[IA LOG] Recebido: {data}")
        
        # Validação básica
        required_fields = ['ferramenta', 'nivel', 'mensagem', 'pais']
        for field in required_fields:
            if field not in data:
                return JsonResponse({'error': f'Campo {field} é obrigatório'}, status=400)
        
        # Validar valores permitidos
        valid_ferramentas = ['Nicochat', 'N8N']
        valid_niveis = ['info', 'warning', 'error', 'critical']
        valid_paises = ['colombia', 'chile', 'mexico', 'polonia', 'romenia', 'espanha', 'italia']
        
        if data['ferramenta'] not in valid_ferramentas:
            return JsonResponse({'error': 'Ferramenta inválida'}, status=400)
        
        if data['nivel'] not in valid_niveis:
            return JsonResponse({'error': 'Nível inválido'}, status=400)
        
        if data.get('pais') and data['pais'] not in valid_paises:
            return JsonResponse({'error': 'País inválido'}, status=400)
        
        # Log recebido com sucesso
        print(f"[SUCCESS] Log do {data['ferramenta']} - {data['pais']} - {data['nivel']}: {data['mensagem']}")
        
        # Resposta de sucesso
        return JsonResponse({
            'id': 1,
            'ferramenta': data['ferramenta'],
            'nivel': data['nivel'],
            'mensagem': data['mensagem'],
            'pais': data.get('pais'),
            'timestamp': '2025-07-01T13:30:00Z',
            'resolvido': False
        }, status=201)
        
    except json.JSONDecodeError:
        return JsonResponse({'error': 'JSON inválido'}, status=400)
    except Exception as e:
        print(f"[IA LOG] Erro: {str(e)}")
        return JsonResponse({'error': f'Erro interno: {str(e)}'}, status=500)

def dashboard_stats_temp(request):
    """Stats vazias - SEM DADOS FAKE"""
    if request.method != 'GET':
        return JsonResponse({'error': 'Método não permitido'}, status=405)
    
    # DADOS VAZIOS - sem fake data
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
    """Lista vazia de logs"""
    if request.method != 'GET':
        return JsonResponse({'error': 'Método não permitido'}, status=405)
    
    try:
        # Retorna lista vazia por enquanto
        return JsonResponse([], safe=False)
    except Exception as e:
        print(f"[LOGS] Erro: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)

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