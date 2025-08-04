# backend/core/views_debug.py
from django.http import JsonResponse
from django.views import View
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt

@method_decorator(csrf_exempt, name='dispatch')
class DebugCorsView(View):
    def get(self, request):
        try:
            # Testar se as apps estão carregadas corretamente
            from django.apps import apps
            feedback_app = apps.is_installed('features.feedback')
            
            return JsonResponse({
                'status': 'ok',
                'message': 'Backend is running',
                'debug': True,
                'feedback_app_loaded': feedback_app
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