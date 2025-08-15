# backend/features/processamento/urls.py
from django.urls import path
from . import views

app_name = 'processamento'

urlpatterns = [
    # Endpoints existentes
    path('lojas/', views.lojas_config, name='lojas_config'),
    path('test-connection/', views.test_connection, name='test_connection'),
    path('buscar-duplicatas/', views.buscar_duplicatas, name='buscar_duplicatas'),
    path('buscar-ips-duplicados/', views.buscar_pedidos_mesmo_ip, name='buscar_pedidos_mesmo_ip'),
    path('detalhar-ip/', views.detalhar_pedidos_ip, name='detalhar_pedidos_ip'),
    path('test-detalhar-ip/', views.test_detalhar_ip, name='test_detalhar_ip'),
    path('cancelar-pedido/', views.cancelar_pedido, name='cancelar_pedido'),
    path('cancelar-lote/', views.cancelar_lote, name='cancelar_lote'),
    path('historico-logs/', views.historico_logs, name='historico_logs'),
    # Endpoints temporários de debug
    path('debug-shopify-data/', views.debug_shopify_data, name='debug_shopify_data'),
    path('debug-detalhar-ip/', views.debug_detalhar_pedidos_ip, name='debug_detalhar_pedidos_ip'),
    
    # Novos endpoints para métodos alternativos de captura de IP
    path('analyze-ip-alternative/', views.analyze_order_ip_alternative, name='analyze_order_ip_alternative'),
    path('batch-analyze-ips/', views.batch_analyze_ips, name='batch_analyze_ips'),
    path('analyze-ip-quality/', views.analyze_ip_quality, name='analyze_ip_quality'),
    path('geolocation-status/', views.get_geolocation_status, name='get_geolocation_status'),
    path('test-geolocation-api/', views.test_geolocation_api, name='test_geolocation_api'),
    
    # === ENDPOINTS APRIMORADOS COM LOGGING ESTRUTURADO ===
    path('buscar-ips-duplicados-enhanced/', views.buscar_pedidos_mesmo_ip_enhanced, name='buscar_pedidos_mesmo_ip_enhanced'),
    path('analyze-single-order-ip/', views.analyze_single_order_ip_enhanced, name='analyze_single_order_ip_enhanced'),
    path('system-diagnostics/', views.get_system_diagnostics, name='get_system_diagnostics'),
]