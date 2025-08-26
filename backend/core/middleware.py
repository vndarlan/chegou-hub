class CORSMiddleware:
    # Atributo obrigatório para compatibilidade com Django
    async_mode = False
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.allowed_origins = [
            "https://chegouhub.up.railway.app",
            "https://chegou-hubb-production.up.railway.app",
        ]

    def __call__(self, request):
        origin = request.headers.get("Origin", "")
        
        # Se for uma requisição OPTIONS, responderemos imediatamente
        if request.method == 'OPTIONS':
            from django.http import HttpResponse
            response = HttpResponse()
            
            # Sempre permitir a origem da requisição se ela estiver na lista
            if origin in self.allowed_origins:
                response["Access-Control-Allow-Origin"] = origin
            else:
                # Modo de desenvolvimento - permitir qualquer origem
                response["Access-Control-Allow-Origin"] = "*"
                
            response["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
            response["Access-Control-Allow-Headers"] = "X-Requested-With, Content-Type, X-CSRFToken, Authorization, Accept"
            response["Access-Control-Allow-Credentials"] = "true"
            response["Access-Control-Max-Age"] = "86400"
            return response
            
        # Caso contrário, processamos a requisição normalmente
        response = self.get_response(request)
        
        # Para qualquer resposta não-OPTIONS, ainda adicionar cabeçalhos CORS
        if origin in self.allowed_origins:
            response["Access-Control-Allow-Origin"] = origin
        else:
            response["Access-Control-Allow-Origin"] = "*"
            
        response["Access-Control-Allow-Credentials"] = "true"
        
        return response