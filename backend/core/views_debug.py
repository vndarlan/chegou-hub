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
            'cors_debug': True,
            'headers_received': dict(request.headers),
            'origin_detected': request.headers.get('Origin', 'Nenhuma origem detectada'),
            'method': request.method,
            'cookies': request.COOKIES,
        })
        
        # Força cabeçalhos CORS garantidos
        origin = request.headers.get('Origin', '')
        if origin and "chegouhub" in origin:
            response["Access-Control-Allow-Origin"] = origin
        else:
            response["Access-Control-Allow-Origin"] = "*"
            
        response["Access-Control-Allow-Credentials"] = "true"
        response["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        response["Access-Control-Allow-Headers"] = "*"
        
        return response