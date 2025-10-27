# backend/features/metricas_ecomhub/services/__init__.py
"""
Services do ECOMHUB Tracking System

Estrutura:
- sync_service.py: Nova lógica de sincronização automática (Sprint 2)
- store_utils.py: Utilitários para validação de lojas
- services.py (raiz): StatusTrackingService original (compatibilidade)
"""

from .sync_service import sync_all_stores, sync_store
from .store_utils import test_ecomhub_connection, get_store_country

# Import do StatusTrackingService original do services.py da raiz
# Mantido por compatibilidade com views existentes
import sys
import os
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

# Importar do services.py original na raiz do metricas_ecomhub
try:
    from ..services import status_tracking_service
except ImportError:
    # Fallback: se não encontrar, será None
    status_tracking_service = None

__all__ = [
    'sync_all_stores',
    'sync_store',
    'test_ecomhub_connection',
    'get_store_country',
    'status_tracking_service'
]
