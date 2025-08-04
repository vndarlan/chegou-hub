from django.urls import path
from . import views

urlpatterns = [
    path('create/', views.FeedbackCreateView.as_view(), name='feedback-create'),
    path('list/', views.FeedbackListView.as_view(), name='feedback-list'),
    path('update-status/<int:pk>/', views.FeedbackUpdateStatusView.as_view(), name='feedback-update-status'),
    path('stats/', views.feedback_stats, name='feedback-stats'),
]