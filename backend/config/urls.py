# backend/config/urls.py
from django.contrib import admin
from django.urls import path, include # <<< Adicionar include
from rest_framework.routers import DefaultRouter # <<< Adicionar router
from core.views import (
    SimpleLoginView,
    LogoutView,
    CurrentStateView,
    SelectAreaView,
    RegisterView,
    GenerateImageView, # View existente
    EditImageView,       # <<< Nova View
    CreateVariationView, # <<< Nova View
    ImageStyleViewSet    # <<< Novo ViewSet
)
from django.http import HttpResponse
from django.contrib.auth.models import User

# Adicione esta função depois dos imports
def create_admin(request):
    if not User.objects.filter(username="admin").exists():
        User.objects.create_superuser("admin", "admin@example.com", "Senha123!")
        return HttpResponse("Superusuário 'admin' criado com sucesso! Agora você pode fazer login no admin.")
    return HttpResponse("Superusuário 'admin' já existe!")

# Configuração do Router para a API de Estilos
router = DefaultRouter()
router.register(r'styles', ImageStyleViewSet, basename='imagestyle') # Endpoint /api/styles/

urlpatterns = [
    path('admin/', admin.site.urls),

    # API Endpoints Autenticação/Estado (existentes)
    path('api/login/', SimpleLoginView.as_view(), name='api_login'),
    path('api/logout/', LogoutView.as_view(), name='api_logout'),
    path('api/current-state/', CurrentStateView.as_view(), name='api_current_state'),
    path('api/register/', RegisterView.as_view(), name='api_register'),
    path('api/select-area/', SelectAreaView.as_view(), name='api_select_area'),
    path('setup-admin/', create_admin, name='setup_admin'),

    # API para Operacional (Imagens)
    path('api/operacional/generate-image/', GenerateImageView.as_view(), name='api_generate_image'),
    path('api/operacional/edit-image/', EditImageView.as_view(), name='api_edit_image'), # <<< Nova Rota
    path('api/operacional/create-variation/', CreateVariationView.as_view(), name='api_create_variation'), # <<< Nova Rota

    # API para Estilos (gerenciada pelo Router)
    path('api/', include(router.urls)), # <<< Inclui as URLs do router (/api/styles/, /api/styles/{pk}/, etc.)

]