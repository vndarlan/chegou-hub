# backend/core/urls.py - VERSÃO CORRIGIDA SEM ROTAS TEMPORÁRIAS
from django.urls import path, include
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from rest_framework.routers import DefaultRouter
import json

from .views import (
    SimpleLoginView,
    LogoutView,
    CurrentStateView,
    SelectAreaView,
    RegisterView,
    EnsureCSRFView,
    UpdateUserProfileView,
    ChangePasswordView,
)
from .views_debug import DebugCorsView, CrossDomainAuthTestView
from .views_organizations import OrganizationViewSet, InviteViewSet, debug_csrf_view
from features.feedback.views import FeedbackNotificationsView
from .debug_views import debug_user_organizations, debug_all_organizations

# Router para APIs de organizações
router = DefaultRouter()
router.register('organizations', OrganizationViewSet, basename='organization')
router.register('invites', InviteViewSet, basename='invite')

urlpatterns = [
    # Autenticação/Estado
    path('login/', SimpleLoginView.as_view(), name='api_login'),
    path('logout/', LogoutView.as_view(), name='api_logout'),
    path('current-state/', CurrentStateView.as_view(), name='api_current_state'),
    path('register/', RegisterView.as_view(), name='api_register'),
    path('select-area/', SelectAreaView.as_view(), name='api_select_area'),
    path('ensure-csrf/', EnsureCSRFView.as_view(), name='ensure_csrf'),

    # Gerenciamento de Perfil
    path('user/profile/', UpdateUserProfileView.as_view(), name='api_user_profile'),
    path('user/change-password/', ChangePasswordView.as_view(), name='api_change_password'),

    # APIs de Organizações
    path('', include(router.urls)),

    # Debug
    path('debug/cors/', DebugCorsView.as_view(), name='debug_cors'),
    path('cors-debug/', DebugCorsView.as_view(), name='cors_debug'),
    path('debug/cross-domain-auth/', CrossDomainAuthTestView.as_view(), name='debug_cross_domain_auth'),
    path('debug-csrf/', debug_csrf_view, name='debug_csrf'),
    # DEBUG TEMPORÁRIO - REMOVER APÓS USO
    path('debug/user-organizations/', debug_user_organizations, name='debug_user_organizations'),
    path('debug/all-organizations/', debug_all_organizations, name='debug_all_organizations'),

    # Notificações centralizadas
    path('notifications/feedbacks/', FeedbackNotificationsView.as_view(), name='notifications_feedbacks'),

    # ===== ROTAS TEMPORÁRIAS REMOVIDAS =====
    # Agora usa apenas features.ia.urls
]