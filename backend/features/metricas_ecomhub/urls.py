from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AnaliseEcomhubViewSet, StatusMappingEcomhubViewSet

router = DefaultRouter()
router.register(r'analises', AnaliseEcomhubViewSet, basename='analise_ecomhub')
router.register(r'status-mapping', StatusMappingEcomhubViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
