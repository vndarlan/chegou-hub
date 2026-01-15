# backend/features/planejamento_semanal/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PlanejamentoSemanalViewSet

router = DefaultRouter()
router.register(r'', PlanejamentoSemanalViewSet, basename='planejamento-semanal')

urlpatterns = [
    path('', include(router.urls)),
]
