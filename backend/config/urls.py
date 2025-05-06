# backend/config/urls.py
from django.contrib import admin
from django.urls import path, include
from core.views_debug import DebugCorsView
from rest_framework.routers import DefaultRouter
from core.views import (
    SimpleLoginView,
    LogoutView,
    CurrentStateView,
    SelectAreaView,
    RegisterView,
    GenerateImageView,
    EditImageView,
    ImageStyleViewSet,
    ManagedCalendarViewSet, 
    EnsureCSRFView,
    AIProjectViewSet,
    PrimeCODViewSet
)

# Configuração do Router para APIs
router = DefaultRouter()
router.register(r'styles', ImageStyleViewSet, basename='imagestyle') 
router.register(r'calendars', ManagedCalendarViewSet, basename='managedcalendar')
router.register(r'aiprojects', AIProjectViewSet, basename='aiproject')
router.register(r'prime-cod', PrimeCODViewSet, basename='prime-cod')

urlpatterns = [
    path('admin/', admin.site.urls),

    # API Endpoints Autenticação/Estado
    path('api/login/', SimpleLoginView.as_view(), name='api_login'),
    path('api/logout/', LogoutView.as_view(), name='api_logout'),
    path('api/current-state/', CurrentStateView.as_view(), name='api_current_state'),
    path('api/register/', RegisterView.as_view(), name='api_register'),
    path('api/select-area/', SelectAreaView.as_view(), name='api_select_area'),

    # API para Operacional (Imagens)
    path('api/operacional/generate-image/', GenerateImageView.as_view(), name='api_generate_image'),
    path('api/operacional/edit-image/', EditImageView.as_view(), name='api_edit_image'),
    path('api/ensure-csrf/', EnsureCSRFView.as_view(), name='ensure_csrf'),

    # Incluir todas as URLs registradas no router (Styles, Calendars, AIProjects)
    path('api/', include(router.urls)),
    path('api/debug/cors/', DebugCorsView.as_view(), name='debug_cors'),
    path('api/cors-debug/', core.views_debug.DebugCorsView.as_view(), name='cors_debug'),
]