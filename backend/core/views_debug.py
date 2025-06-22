# backend/core/views_debug.py
from django.http import JsonResponse
from django.views import View
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt

@method_decorator(csrf_exempt, name='dispatch')
class DebugCorsView(View):
    def get(self, request):
        return JsonResponse({
            'status': 'ok',
            'message': 'Backend is running',
            'debug': True
        })
    
    def post(self, request):
        return JsonResponse({
            'status': 'ok',
            'message': 'POST works'
        })