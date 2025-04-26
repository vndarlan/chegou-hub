# backend/config/urls.py
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from core.views import (
    SimpleLoginView,
    LogoutView,
    CurrentStateView,
    SelectAreaView,
    RegisterView,
    GenerateImageView,
    EditImageView,  # Mantida
    # CreateVariationView,  # Removida, não suportada pelo gpt-image-1
    ImageStyleViewSet,
    ManagedCalendarViewSet
)
from django.http import HttpResponse
from django.contrib.auth.models import User

# Configuração do Router para APIs
router = DefaultRouter()
router.register(r'styles', ImageStyleViewSet, basename='imagestyle')
router.register(r'calendars', ManagedCalendarViewSet, basename='managedcalendar') 

urlpatterns = [
    path('admin/', admin.site.urls),

    # API Endpoints Autenticação/Estado (existentes)
    path('api/login/', SimpleLoginView.as_view(), name='api_login'),
    path('api/logout/', LogoutView.as_view(), name='api_logout'),
    path('api/current-state/', CurrentStateView.as_view(), name='api_current_state'),
    path('api/register/', RegisterView.as_view(), name='api_register'),
    path('api/select-area/', SelectAreaView.as_view(), name='api_select_area'),

    # API para Operacional (Imagens)
    path('api/operacional/generate-image/', GenerateImageView.as_view(), name='api_generate_image'),
    path('api/operacional/edit-image/', EditImageView.as_view(), name='api_edit_image'),
    # Rota de variação removida por não ser compatível com gpt-image-1
    # path('api/operacional/create-variation/', CreateVariationView.as_view(), name='api_create_variation'),

    # API para Estilos (gerenciada pelo Router)
    path('api/', include(router.urls)),
]