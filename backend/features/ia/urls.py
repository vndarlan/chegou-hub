# backend/features/ia/urls.py - VERSÃO ATUALIZADA COM PROJETOS
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'logs', views.LogEntryViewSet, basename='logentry')
router.register(r'projetos', views.ProjetoIAViewSet, basename='projeto-ia')

# WhatsApp Business routers
router.register(r'business-managers', views.BusinessManagerViewSet, basename='business-manager')
router.register(r'whatsapp-numeros', views.WhatsAppPhoneNumberViewSet, basename='whatsapp-numero')
router.register(r'quality-history', views.QualityHistoryViewSet, basename='quality-history')
router.register(r'quality-alerts', views.QualityAlertViewSet, basename='quality-alert')

urlpatterns = [
    path('', include(router.urls)),
    
    # === ENDPOINTS DE LOGS ===
    path('criar-log/', views.criar_log_publico, name='criar-log-publico'),
    path('dashboard-logs-stats/', views.dashboard_logs_stats, name='dashboard-logs-stats'),
    
    # === ENDPOINTS DE PROJETOS ===
    path('dashboard-stats/', views.dashboard_stats, name='dashboard-projetos-stats'),
    path('opcoes-formulario/', views.opcoes_formulario, name='opcoes-formulario'),
    path('verificar-permissoes/', views.verificar_permissoes, name='verificar-permissoes'),
    
    # === ENDPOINTS DE WHATSAPP BUSINESS ===
    path('sincronizar-meta-api/', views.sincronizar_meta_api, name='sincronizar-meta-api'),
    path('dashboard-whatsapp-stats/', views.dashboard_whatsapp_stats, name='dashboard-whatsapp-stats'),
    path('verificar-mudancas-qualidade/', views.verificar_mudancas_qualidade, name='verificar-mudancas-qualidade'),
    
    # === ENDPOINTS TEMPORÁRIOS - REMOVER APÓS USO ===
    path('fix-whatsapp-tokens-temp/', views.fix_whatsapp_tokens_temp, name='fix-whatsapp-tokens-temp'),
    path('apply-migrations-temp/', views.apply_migrations_temp, name='apply-migrations-temp'),
]