# backend/features/engajamento/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'engajamentos', views.EngajamentoViewSet)
router.register(r'pedidos', views.PedidoEngajamentoViewSet, basename='pedido')

urlpatterns = [
    path('', include(router.urls)),
    path('saldo/', views.saldo_api, name='saldo-api'),
    path('criar-pedido/', views.criar_pedido_engajamento, name='criar-pedido'),
]