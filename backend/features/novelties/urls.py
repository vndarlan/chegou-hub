# backend/features/novelties/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'executions', views.NoveltyExecutionViewSet)

urlpatterns = [
    path('', include(router.urls)),
    
    # Endpoint para Chile Bot enviar dados
    path('chile-bot/execution/', views.receive_execution_data, name='chile-bot-execution'),
    
    # Endpoints para dashboard
    path('check-permissions/', views.check_novelties_permissions, name='check-novelties-permissions'),
    path('recent/', views.recent_executions, name='recent-executions'),
    path('trends/', views.execution_trends, name='execution-trends'),
]