# backend/features/metricas_dropi/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AnaliseDropiViewSet

router = DefaultRouter()
router.register(r'analises', AnaliseDropiViewSet, basename='analise_dropi')

urlpatterns = [
    path('', include(router.urls)),
]