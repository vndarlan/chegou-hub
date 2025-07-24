# backend/features/processamento/urls.py
from django.urls import path
from . import views

app_name = 'processamento'

urlpatterns = [
    path('lojas/', views.lojas_config, name='lojas_config'),
    path('test-connection/', views.test_connection, name='test_connection'),
    path('buscar-duplicatas/', views.buscar_duplicatas, name='buscar_duplicatas'),
    path('cancelar-pedido/', views.cancelar_pedido, name='cancelar_pedido'),
    path('cancelar-lote/', views.cancelar_lote, name='cancelar_lote'),
    path('historico-logs/', views.historico_logs, name='historico_logs'),
]