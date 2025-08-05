from django.urls import path
from . import views

app_name = 'chatbot_ia'

urlpatterns = [
    path('ask/', views.ask_chatbot, name='ask_chatbot'),
    path('history/', views.chat_history, name='chat_history'),
    path('clear-cache/', views.clear_documents_cache, name='clear_documents_cache'),
]