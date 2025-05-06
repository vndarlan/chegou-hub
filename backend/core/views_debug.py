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
            'origin': request.headers.get('Origin', 'Sem origem')
        })
        
        # Forçar cabeçalhos CORS
        response["Access-Control-Allow-Origin"] = "https://chegouhub.up.railway.app"
        response["Access-Control-Allow-Credentials"] = "true"
        
        return response
        
    def options(self, request, *args, **kwargs):
        response = JsonResponse({'status': 'preflight_success'})
        response["Access-Control-Allow-Origin"] = "https://chegouhub.up.railway.app"
        response["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        response["Access-Control-Allow-Headers"] = "*"
        response["Access-Control-Allow-Credentials"] = "true"
        return response