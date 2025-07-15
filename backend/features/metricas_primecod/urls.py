from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AnalisePrimeCODViewSet, StatusMappingPrimeCODViewSet

router = DefaultRouter()
router.register(r'analises', AnalisePrimeCODViewSet, basename='analise_primecod')
router.register(r'status-mapping', StatusMappingPrimeCODViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
