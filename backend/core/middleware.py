# Middleware original comentado para ser desativado
"""
class CORSMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Se for uma requisição OPTIONS, responderemos imediatamente
        if request.method == 'OPTIONS':
            from django.http import HttpResponse
            response = HttpResponse()
            response["Access-Control-Allow-Origin"] = "https://chegouhub.up.railway.app"
            response["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
            response["Access-Control-Allow-Headers"] = "*"
            response["Access-Control-Allow-Credentials"] = "true"
            response["Access-Control-Max-Age"] = "86400"
            return response
            
        # Caso contrário, processamos a requisição normalmente
        response = self.get_response(request)
        
        # E adicionamos os cabeçalhos CORS à resposta
        response["Access-Control-Allow-Origin"] = "https://chegouhub.up.railway.app"
        response["Access-Control-Allow-Credentials"] = "true"
        
        return response
"""

# Não é necessário criar um novo middleware, pois vamos usar o do django-cors-headers
# Deixe este arquivo apenas com o código comentado para referência