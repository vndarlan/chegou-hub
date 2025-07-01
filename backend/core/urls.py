# backend/core/urls.py - VERSÃO CORRIGIDA SEM ROTAS TEMPORÁRIAS
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
    
    # ===== ROTAS TEMPORÁRIAS REMOVIDAS =====
    # Agora usa apenas features.ia.urls
]