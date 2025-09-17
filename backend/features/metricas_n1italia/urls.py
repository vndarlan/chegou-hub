# backend/features/metricas_n1italia/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AnaliseN1ItaliaViewSet

# Router para endpoints REST
router = DefaultRouter()
router.register(r'analise-n1italia', AnaliseN1ItaliaViewSet, basename='analise-n1italia')

urlpatterns = [
    path('', include(router.urls)),
]