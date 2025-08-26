# backend/features/processamento/urls.py
from django.urls import path
from . import views
from . import views_cached

# Forçar recarregamento para resolver problema da URL buscar-ips-duplicados-simples

app_name = 'processamento'

urlpatterns = [
    # Endpoints existentes
    path('lojas/', views.lojas_config, name='lojas_config'),
    path('test-connection/', views.test_connection, name='test_connection'),
    path('buscar-duplicatas/', views.buscar_duplicatas, name='buscar_duplicatas'),
    path('buscar-duplicatas-simples/', views.buscar_duplicatas, name='buscar_duplicatas_simples'),
    path('buscar-ips-duplicados/', views.buscar_pedidos_mesmo_ip, name='buscar_pedidos_mesmo_ip'),
    path('detalhar-ip/', views.detalhar_pedidos_ip, name='detalhar_pedidos_ip'),
    path('detalhar-pedidos-ip/', views.detalhar_pedidos_ip, name='detalhar_pedidos_ip_new'),
    # path('test-detalhar-ip/', views.test_detalhar_ip, name='test_detalhar_ip'), # REMOVIDO - era endpoint de teste com dados fictícios
    path('test-simple/', views.test_simple_endpoint, name='test_simple_endpoint'),
    path('debug-detector/', views.debug_detector_ip, name='debug_detector_ip'),
    path('cancelar-pedido/', views.cancelar_pedido, name='cancelar_pedido'),
    path('cancelar-lote/', views.cancelar_lote, name='cancelar_lote'),
    path('historico-logs/', views.historico_logs, name='historico_logs'),
    path('status-lojas/', views.status_lojas_shopify, name='status_lojas_shopify'),
    
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
    
    # === 🚀 ENDPOINTS OTIMIZADOS COM CACHE REDIS ===
    # Novos endpoints principais com cache (substituem os antigos para melhor performance)
    path('buscar-ips-duplicados-cached/', views_cached.buscar_ips_duplicados_cached, name='buscar_ips_duplicados_cached'),
    path('detalhar-ip-cached/', views_cached.detalhar_ip_cached, name='detalhar_ip_cached'),
    
    # Endpoints de gestão de cache
    path('cache/stats/', views_cached.cache_stats, name='cache_stats'),
    path('cache/invalidate-store/', views_cached.invalidate_cache_by_store, name='invalidate_cache_by_store'),
    path('cache/clear-all/', views_cached.clear_all_cache, name='clear_all_cache'),
    path('cache/warmup-store/', views_cached.warmup_cache_for_store, name='warmup_cache_for_store'),
    path('cache/health-check/', views_cached.cache_health_check, name='cache_health_check'),
    
    # Endpoints de fallback (compatibilidade)
    path('buscar-ips-duplicados-fallback/', views_cached.buscar_pedidos_mesmo_ip_fallback, name='buscar_pedidos_mesmo_ip_fallback'),
    path('detalhar-ip-fallback/', views_cached.detalhar_pedidos_ip_fallback, name='detalhar_pedidos_ip_fallback'),
    
    # === 🔥 NOVOS ENDPOINTS OTIMIZADOS PARA RESOLVER ERRO 499 ===
    path('buscar-ips-otimizado/', views.buscar_ips_otimizado, name='buscar_ips_otimizado'),
    path('async-status/<str:job_id>/', views.check_async_status, name='check_async_status'),
    path('optimization-metrics/', views.get_optimization_metrics, name='optimization_metrics'),
    
    # ENDPOINT MOVIDO PARA FINAL PARA DEBUG
    path('buscar-ips-duplicados-simples/', views.buscar_ips_duplicados_simples, name='buscar_ips_duplicados_simples'),
    
    # Endpoint de debug para IP específico
    path('debug-ip-especifico/', views.debug_buscar_ip_especifico, name='debug_buscar_ip_especifico'),
    
    # Endpoint de debug temporário para diagnosticar erro 400 no detector de IP
    path('debug-detector-ip-user-data/', views.debug_detector_ip_user_data, name='debug_detector_ip_user_data'),
    
    # === ENDPOINTS PARA SISTEMA DE IPs RESOLVIDOS ===
    path('marcar-ip-resolvido/', views.marcar_ip_resolvido, name='marcar_ip_resolvido'),
    path('listar-ips-resolvidos/', views.listar_ips_resolvidos, name='listar_ips_resolvidos'),
    path('desmarcar-ip-resolvido/', views.desmarcar_ip_resolvido, name='desmarcar_ip_resolvido'),
]