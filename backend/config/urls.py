# backend/config/urls.py
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # URLs do Core (autenticação, debug, etc.)
    path('api/', include('core.urls')),
    
    # URLs das Funcionalidades
    path('api/', include('features.agenda.urls')),
    path('api/', include('features.mapa.urls')),
]