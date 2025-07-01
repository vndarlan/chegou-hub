from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'logs', views.LogEntryViewSet, basename='logentry')

urlpatterns = [
    path('', include(router.urls)),
    path('criar-log/', views.criar_log_publico, name='criar-log-publico'),
    path('dashboard-stats/', views.dashboard_stats, name='dashboard-stats'),
]