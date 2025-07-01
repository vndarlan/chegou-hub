from django.contrib import admin
from django.urls import path, include
from core.views_debug import DebugCorsView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('mapa/', include('features.mapa.urls')),
    path('api/debug/cors/', DebugCorsView.as_view(), name='debug_cors'),
    path('api/', include('core.urls')),
    
    # URLs das Funcionalidades
    path('api/', include('features.agenda.urls')),
    path('api/', include('features.mapa.urls')),
    path('api/', include('features.engajamento.urls')),
    path('api/ia/', include('features.ia.urls')),  # ← NOVA ROTA DE IA
]