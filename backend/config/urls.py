# backend/config/urls.py
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('mapa/', include('features.mapa.urls')),
    path('api/debug/cors/', health_check),
    path('api/', include('core.urls')),
    
    # URLs das Funcionalidades
    path('api/', include('features.agenda.urls')),
    path('api/', include('features.mapa.urls')),
]