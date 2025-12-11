# backend/features/jira/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    JiraConfigViewSet,
    JiraUsersViewSet,
    JiraBoardsViewSet,
    JiraMetricsViewSet,
    JiraLeadTimeViewSet,
    JiraIssuesViewSet,
)

app_name = 'jira'

router = DefaultRouter()
router.register(r'config', JiraConfigViewSet, basename='config')
router.register(r'users', JiraUsersViewSet, basename='users')
router.register(r'boards', JiraBoardsViewSet, basename='boards')
router.register(r'metrics', JiraMetricsViewSet, basename='metrics')
router.register(r'lead-time', JiraLeadTimeViewSet, basename='lead-time')
router.register(r'issues', JiraIssuesViewSet, basename='issues')

urlpatterns = [
    path('', include(router.urls)),
]
