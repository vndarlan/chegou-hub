from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'status', views.StatusPaisViewSet)
router.register(r'paises', views.PaisViewSet)

urlpatterns = [
    path('', include(router.urls)),  # Remove o 'api/' daqui
    path('mapa-data/', views.mapa_data, name='mapa-data'),  # Remove o 'api/' daqui também
]