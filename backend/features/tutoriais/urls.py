# backend/features/tutoriais/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'categorias', views.CategoriaAulaViewSet)
router.register(r'aulas', views.AulaViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
