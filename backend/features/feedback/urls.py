from django.urls import path
from . import views

urlpatterns = [
    path('', views.FeedbackListView.as_view(), name='feedback-list'),
    path('pending/', views.FeedbackPendingView.as_view(), name='feedback-pending'),
    path('pending/count/', views.feedback_pending_count, name='feedback-pending-count'),
    path('create/', views.FeedbackCreateView.as_view(), name='feedback-create'),
    path('notifications/', views.FeedbackNotificationsView.as_view(), name='feedback-notifications'),
    path('<int:feedback_id>/update-status/', views.FeedbackUpdateStatusView.as_view(), name='feedback-update-status'),
]