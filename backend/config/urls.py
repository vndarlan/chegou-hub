from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from core.views_debug import DebugCorsView

def simple_health(request):
    return JsonResponse({'status': 'ok', 'health': 'Railway OK'})

urlpatterns = [
    path('admin/', admin.site.urls),
    path('mapa/', include('features.mapa.urls')),
    path('health/', simple_health, name='simple_health'),
    path('api/debug/cors/', DebugCorsView.as_view(), name='debug_cors'),
    path('api/', include('core.urls')),
    
    # URLs das Funcionalidades Existentes
    path('api/', include('features.agenda.urls')),
    path('api/', include('features.mapa.urls')),
    path('api/', include('features.engajamento.urls')),
    path('api/ia/', include('features.ia.urls')),
    path('api/novelties/', include('features.novelties.urls')),
    
    # CORRIGIDO: URLs do Processamento COM /api/
    path('api/processamento/', include('features.processamento.urls')),
    
    # URLs das Métricas Separadas
    path('api/metricas/primecod/', include('features.metricas_primecod.urls')),
    path('api/metricas/ecomhub/', include('features.metricas_ecomhub.urls')),
    path('api/metricas/dropi/', include('features.metricas_dropi.urls')),
    
    # URLs do Sistema de Feedback
    path('api/feedback/', include('features.feedback.urls')),
]

# Servir arquivos de media em desenvolvimento
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)