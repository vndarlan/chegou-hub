from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'status', views.StatusPaisViewSet)
router.register(r'paises', views.PaisViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('mapa-data/', views.mapa_data, name='mapa-data'),
    path('check-permissions/', views.check_mapa_permissions, name='check-mapa-permissions'),
    path('available-countries/', views.available_countries, name='available-countries'),
    path('add-pais/', views.add_pais_simple, name='add-pais-simple'),
    path('debug-user/', views.debug_user_info, name='debug-user'),
    path('status-list/', views.status_list, name='status-list'),
]