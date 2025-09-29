from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from django.views.generic import TemplateView
from django.views.static import serve
from core.views_debug import DebugCorsView, N8nConnectivityTestView
from django.utils import timezone
import os

def simple_health(request):
    try:
        # Teste básico de conectividade com banco de dados
        from django.db import connection
        from django.core.cache import cache

        status_info = {
            'status': 'ok',
            'health': 'Railway OK',
            'timestamp': timezone.now().isoformat()
        }

        # Teste de conexão com banco
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                status_info['database'] = 'connected'
        except Exception as db_error:
            status_info['database'] = f'error: {str(db_error)}'
            status_info['status'] = 'partial'

        # Teste de cache (Redis ou LocMem)
        try:
            cache.set('health_check', 'ok', 10)
            if cache.get('health_check') == 'ok':
                status_info['cache'] = 'connected'
            else:
                status_info['cache'] = 'not_working'
        except Exception as cache_error:
            status_info['cache'] = f'error: {str(cache_error)}'

        return JsonResponse(status_info)

    except Exception as e:
        return JsonResponse({
            'status': 'error',
            'health': 'Railway ERROR',
            'error': str(e),
            'timestamp': timezone.now().isoformat()
        }, status=500)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('mapa/', include('features.mapa.urls')),
    path('health/', simple_health, name='simple_health'),
    path('api/debug/cors/', DebugCorsView.as_view(), name='debug_cors'),
    path('api/debug/n8n/', N8nConnectivityTestView.as_view(), name='debug_n8n'),
    path('api/', include('core.urls')),
    
    # URLs das Funcionalidades Existentes
    path('api/', include('features.agenda.urls')),
    path('api/', include('features.mapa.urls')),
    path('api/', include('features.engajamento.urls')),
    path('api/ia/', include('features.ia.urls')),
    path('api/novelties/', include('features.novelties.urls')),
    
    # CORRIGIDO: URLs do Processamento COM /api/
    path('api/processamento/', include('features.processamento.urls')),
    
    # URLs do Sistema de Estoque
    path('api/estoque/', include('features.estoque.urls')),
    
    # URLs da Sincronização em Tempo Real
    path('api/sync-realtime/', include('features.sync_realtime.urls')),
    
    # URLs das Métricas Separadas
    path('api/metricas/primecod/', include('features.metricas_primecod.urls')),
    path('api/metricas/ecomhub/', include('features.metricas_ecomhub.urls')),
    path('api/metricas/dropi/', include('features.metricas_dropi.urls')),
    path('api/metricas/n1italia/', include('features.metricas_n1italia.urls')),
    
    # URLs do Sistema de Feedback
    path('api/feedback/', include('features.feedback.urls')),
    
    
    # URLs do API Monitoring
    path('api/monitoring/', include('features.api_monitoring.urls')),
]

# Servir arquivos de media
if settings.DEBUG:
    # Em desenvolvimento, usar serving nativo do Django
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
else:
    # Em produção, usar view de serving customizada para media files
    # WhiteNoise NÃO serve media files por padrão, só static files
    # No Railway, media files são salvos dentro de staticfiles/media
    media_root_production = settings.MEDIA_ROOT
    urlpatterns += [
        re_path(r'^media/(?P<path>.*)$', serve, {
            'document_root': media_root_production,
        }),
    ]

# Servir frontend React em produção
if not settings.DEBUG:
    # Servir arquivos estáticos do frontend
    frontend_static_path = os.path.join(settings.STATIC_ROOT, 'frontend', 'static')
    if os.path.exists(frontend_static_path):
        urlpatterns += [
            re_path(r'^static/(?P<path>.*)$', serve, {
                'document_root': frontend_static_path,
            }),
        ]
    
    # Servir index.html para todas as rotas que não são da API
    frontend_index_path = os.path.join(settings.STATIC_ROOT, 'frontend', 'index.html')
    if os.path.exists(frontend_index_path):
        urlpatterns += [
            re_path(r'^(?!api/|admin/|health/|static/|media/).*$', 
                   TemplateView.as_view(template_name='frontend/index.html')),
        ]