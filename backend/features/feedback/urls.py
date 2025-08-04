from django.urls import path
from . import views

urlpatterns = [
    path('create/', views.FeedbackCreateView.as_view(), name='feedback-create'),
]