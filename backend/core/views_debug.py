# backend/core/views_debug.py
import os
import requests
from django.http import JsonResponse
from django.views import View
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings

@method_decorator(csrf_exempt, name='dispatch')
class DebugCorsView(View):
    def get(self, request):
        try:
            # Testar se as apps estão carregadas corretamente
            from django.apps import apps
            feedback_app = apps.is_installed('features.feedback')

            # Verificar configurações CORS/CSRF para N8N
            n8n_domain = "https://n8ngc.up.railway.app"
            cors_ok = n8n_domain in settings.CORS_ALLOWED_ORIGINS
            csrf_ok = n8n_domain in settings.CSRF_TRUSTED_ORIGINS

            return JsonResponse({
                'status': 'ok',
                'message': 'Backend is running',
                'debug': True,
                'feedback_app_loaded': feedback_app,
                'n8n_config': {
                    'cors_configured': cors_ok,
                    'csrf_configured': csrf_ok,
                    'x_frame_options': getattr(settings, 'X_FRAME_OPTIONS', 'Not set'),
                    'cors_allowed_origins_count': len(settings.CORS_ALLOWED_ORIGINS),
                }
            })
        except Exception as e:
            return JsonResponse({
                'status': 'error',
                'message': f'Error: {str(e)}',
                'debug': True
            }, status=500)

    def post(self, request):
        return JsonResponse({
            'status': 'ok',
            'message': 'POST works'
        })

@method_decorator(csrf_exempt, name='dispatch')
class N8nConnectivityTestView(View):
    """Testar conectividade com o webhook N8N"""

    def get(self, request):
        try:
            n8n_webhook_url = "https://n8ngc.up.railway.app/webhook/11fb9f8b-76b6-4b14-9bb9-a04c2229efd8/chat"

            # Teste simples de conectividade
            response = requests.get(
                n8n_webhook_url,
                timeout=10,
                headers={'User-Agent': 'ChegouHub-Backend-Test/1.0'}
            )

            return JsonResponse({
                'status': 'ok',
                'n8n_webhook_accessible': True,
                'n8n_response_status': response.status_code,
                'n8n_webhook_url': n8n_webhook_url,
                'cors_configured': "https://n8ngc.up.railway.app" in settings.CORS_ALLOWED_ORIGINS
            })

        except requests.exceptions.RequestException as e:
            return JsonResponse({
                'status': 'warning',
                'n8n_webhook_accessible': False,
                'error': str(e),
                'n8n_webhook_url': n8n_webhook_url,
                'cors_configured': "https://n8ngc.up.railway.app" in settings.CORS_ALLOWED_ORIGINS
            })
        except Exception as e:
            return JsonResponse({
                'status': 'error',
                'message': f'Error testing N8N connectivity: {str(e)}',
            }, status=500)