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

            # Verificar configurações cross-domain para Railway
            frontend_url = "https://chegouhubteste.up.railway.app"
            cross_domain_cors = frontend_url in settings.CORS_ALLOWED_ORIGINS
            cross_domain_csrf = frontend_url in settings.CSRF_TRUSTED_ORIGINS

            return JsonResponse({
                'status': 'ok',
                'message': 'Backend is running',
                'debug': True,
                'feedback_app_loaded': feedback_app,
                'cross_domain_config': {
                    'frontend_url': frontend_url,
                    'cors_configured': cross_domain_cors,
                    'csrf_configured': cross_domain_csrf,
                    'session_cookie_samesite': getattr(settings, 'SESSION_COOKIE_SAMESITE', 'Not set'),
                    'session_cookie_secure': getattr(settings, 'SESSION_COOKIE_SECURE', 'Not set'),
                    'csrf_cookie_samesite': getattr(settings, 'CSRF_COOKIE_SAMESITE', 'Not set'),
                    'csrf_cookie_secure': getattr(settings, 'CSRF_COOKIE_SECURE', 'Not set'),
                },
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

class CrossDomainAuthTestView(View):
    """Testar autenticação cross-domain Railway"""

    def get(self, request):
        """Verificar estado da sessão cross-domain"""
        from django.middleware.csrf import get_token

        csrf_token = get_token(request)

        # Verificar headers importantes
        origin = request.headers.get('Origin', 'Not provided')
        referer = request.headers.get('Referer', 'Not provided')
        user_agent = request.headers.get('User-Agent', 'Not provided')

        return JsonResponse({
            'status': 'cross_domain_test',
            'authenticated': request.user.is_authenticated,
            'user': {
                'username': request.user.username if request.user.is_authenticated else None,
                'email': request.user.email if request.user.is_authenticated else None,
            },
            'csrf_token': csrf_token,
            'session_key': request.session.session_key,
            'headers': {
                'origin': origin,
                'referer': referer,
                'user_agent': user_agent[:100] + '...' if len(user_agent) > 100 else user_agent,
            },
            'cookies': {
                'sessionid_present': 'sessionid' in request.COOKIES,
                'csrftoken_present': 'csrftoken' in request.COOKIES,
                'session_cookie_age': getattr(settings, 'SESSION_COOKIE_AGE', 'Not set'),
            }
        })

    def post(self, request):
        """Testar login cross-domain"""
        email = request.data.get('email') if hasattr(request, 'data') else request.POST.get('email')
        password = request.data.get('password') if hasattr(request, 'data') else request.POST.get('password')

        if email == 'test@cross.domain' and password == 'test123':
            # Login simulado apenas para teste
            return JsonResponse({
                'status': 'success',
                'message': 'Cross-domain auth test successful',
                'test_mode': True
            })

        return JsonResponse({
            'status': 'error',
            'message': 'Use test@cross.domain / test123 for testing',
            'test_mode': True
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