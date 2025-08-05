from django.urls import path
from . import views
import logging

app_name = 'chatbot_ia'

# Log para debugging em produção
logger = logging.getLogger(__name__)
logger.info("CHATBOT_IA URLs sendo carregadas")

urlpatterns = [
    path('ask/', views.ask_chatbot, name='ask_chatbot'),
    path('history/', views.chat_history, name='chat_history'),
    path('clear-cache/', views.clear_documents_cache, name='clear_documents_cache'),
    path('test/', views.test_endpoint, name='test_endpoint'),
]

logger.info(f"CHATBOT_IA URLs registradas: {len(urlpatterns)} endpoints")