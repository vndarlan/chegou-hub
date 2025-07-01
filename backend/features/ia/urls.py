# backend/features/ia/urls.py - VERSÃO ATUALIZADA COM PROJETOS
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'logs', views.LogEntryViewSet, basename='logentry')
router.register(r'projetos', views.ProjetoIAViewSet, basename='projeto-ia')

urlpatterns = [
    path('', include(router.urls)),
    
    # === ENDPOINTS DE LOGS ===
    path('criar-log/', views.criar_log_publico, name='criar-log-publico'),
    path('dashboard-logs-stats/', views.dashboard_logs_stats, name='dashboard-logs-stats'),
    
    # === ENDPOINTS DE PROJETOS ===
    path('dashboard-stats/', views.dashboard_stats, name='dashboard-projetos-stats'),
    path('opcoes-formulario/', views.opcoes_formulario, name='opcoes-formulario'),
    path('verificar-permissoes/', views.verificar_permissoes, name='verificar-permissoes'),
]