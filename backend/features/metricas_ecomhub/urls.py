# backend/features/metricas_ecomhub/urls.py - VERSÃO SIMPLIFICADA
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AnaliseEcomhubViewSet

router = DefaultRouter()
router.register(r'analises', AnaliseEcomhubViewSet, basename='analise_ecomhub')

urlpatterns = [
    path('', include(router.urls)),
]