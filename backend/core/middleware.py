class CORSMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Se for uma requisição OPTIONS, responderemos imediatamente
        if request.method == 'OPTIONS':
            from django.http import HttpResponse
            response = HttpResponse()
            # Permitir ambos os domínios
            origin = request.headers.get('Origin', '')
            allowed_origins = [
                "https://chegouhub.up.railway.app",
                "https://chegou-hubb-production.up.railway.app"
            ]
            
            # Verificar se a origem está na lista de permitidos
            if origin in allowed_origins:
                response["Access-Control-Allow-Origin"] = origin
            else:
                # Modo de desenvolvimento - permite todas as origens
                response["Access-Control-Allow-Origin"] = "*"
                
            response["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
            response["Access-Control-Allow-Headers"] = "*"
            response["Access-Control-Allow-Credentials"] = "true"
            response["Access-Control-Max-Age"] = "86400"
            return response
            
        # Caso contrário, processamos a requisição normalmente
        response = self.get_response(request)
        
        # E adicionamos os cabeçalhos CORS à resposta
        origin = request.headers.get('Origin', '')
        allowed_origins = [
            "https://chegouhub.up.railway.app",
            "https://chegou-hubb-production.up.railway.app"
        ]
        
        # Verificar se a origem está na lista de permitidos
        if origin in allowed_origins:
            response["Access-Control-Allow-Origin"] = origin
        else:
            # Modo de desenvolvimento - permite todas as origens
            response["Access-Control-Allow-Origin"] = "*"
            
        response["Access-Control-Allow-Credentials"] = "true"
        
        return response