from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AnaliseEfetividadeViewSet, StatusMappingViewSet

router = DefaultRouter()
router.register(r'analises', AnaliseEfetividadeViewSet, basename='analise')
router.register(r'status-mapping', StatusMappingViewSet)

urlpatterns = [
    path('', include(router.urls)),
]