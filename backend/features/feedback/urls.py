from django.urls import path
from . import views

urlpatterns = [
    path('', views.FeedbackListView.as_view(), name='feedback-list'),
    path('create/', views.FeedbackCreateView.as_view(), name='feedback-create'),
]