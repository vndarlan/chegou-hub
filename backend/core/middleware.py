class ForceCorsMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Processar a requisição antes de passá-la para o próximo middleware
        if request.method == 'OPTIONS':
            # Para requisições OPTIONS (preflight), respondemos imediatamente
            from django.http import HttpResponse
            response = HttpResponse()
            response.status_code = 200
            response["Access-Control-Allow-Origin"] = request.headers.get('Origin', '*')
            response["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
            response["Access-Control-Allow-Headers"] = "Content-Type, X-CSRFToken, Authorization"
            response["Access-Control-Allow-Credentials"] = "true"
            response["Access-Control-Max-Age"] = "86400"  # 24 horas
            return response
        else:
            # Para outras requisições, processamos normalmente
            response = self.get_response(request)
            
            # Adicionar cabeçalhos CORS após a resposta ser gerada
            response["Access-Control-Allow-Origin"] = request.headers.get('Origin', '*')
            response["Access-Control-Allow-Credentials"] = "true"
            response["Access-Control-Expose-Headers"] = "Content-Type, X-CSRFToken"
            
            return response