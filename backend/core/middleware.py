# backend/core/middleware.py
class CustomCorsMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        
        # Adicionar cabeçalhos CORS diretamente em todas as respostas
        response["Access-Control-Allow-Origin"] = "https://chegouhub.up.railway.app"
        response["Access-Control-Allow-Credentials"] = "true"
        response["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type, X-CSRFToken, Authorization"
        response["Access-Control-Expose-Headers"] = "Content-Type, X-CSRFToken"
        
        return response