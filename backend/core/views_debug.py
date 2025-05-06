from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny

@method_decorator(csrf_exempt, name='dispatch')
class DebugCorsView(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request, format=None):
        response = JsonResponse({
            'status': 'success',
            'message': 'Debug CORS funcionando!',
            'origin': request.headers.get('Origin', 'Sem origem'),
            'request_headers': dict(request.headers)
        })
        
        # Forçar cabeçalhos CORS
        response["Access-Control-Allow-Origin"] = request.headers.get('Origin', '*')
        response["Access-Control-Allow-Credentials"] = "true"
        
        return response
        
    def options(self, request, *args, **kwargs):
        response = JsonResponse({'status': 'preflight_success'})
        response["Access-Control-Allow-Origin"] = request.headers.get('Origin', '*')
        response["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type, X-CSRFToken, Authorization"
        response["Access-Control-Allow-Credentials"] = "true"
        return response