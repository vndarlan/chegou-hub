# backend/core/views.py
import os
import openai
import base64
from django.conf import settings
from django.contrib.auth.models import User, Group
from django.db import transaction
from django.contrib.auth import authenticate, login, logout
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, viewsets, permissions
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from django.views.decorators.csrf import ensure_csrf_cookie
from django.utils.decorators import method_decorator
from openai import OpenAI
from django.http import JsonResponse
from .models import ManagedCalendar # Mantido (ImageStyle removido)
from .serializers import ManagedCalendarSerializer # Mantido (ImageStyleSerializer removido)
from .models import AIProject # Importe o novo modelo
from .serializers import AIProjectSerializer 

# --- Views de Autenticação e Estado (sem mudanças, apenas colapsadas para clareza) ---
class SimpleLoginView(APIView):
    permission_classes = [AllowAny]
    def post(self, request, *args, **kwargs):
        email = request.data.get('email')
        password = request.data.get('password')
        print(f"Tentativa de login recebida: Email={email}")
        user = authenticate(request, username=email, password=password)
        if user is not None:
            login(request, user)
            request.session.pop('current_area', None)
            print(f"Login bem-sucedido para: {email}")
            return Response({'message': 'Login successful'}, status=status.HTTP_200_OK)
        else:
            request.session.flush()
            print(f"Falha no login para: {email} (inválido ou inativo)")
            return Response({'error': 'Credenciais inválidas ou conta inativa.'}, status=status.HTTP_401_UNAUTHORIZED)

class LogoutView(APIView):
    permission_classes = [AllowAny]
    def post(self, request, *args, **kwargs):
        user_email = request.user.email if request.user.is_authenticated else 'N/A (deslogado ou sessão inválida)'
        print(f"Tentativa de logout para usuário: {user_email}")
        logout(request)
        print(f"Logout realizado.")
        return Response({'message': 'Logout successful'}, status=status.HTTP_200_OK)

@method_decorator(ensure_csrf_cookie, name='dispatch')
class CurrentStateView(APIView):
    permission_classes = [AllowAny]
    def get(self, request, *args, **kwargs):
        is_authenticated = request.user.is_authenticated
        if is_authenticated:
            user = request.user
            user_groups = list(user.groups.values_list('name', flat=True))
            current_area = request.session.get('current_area', None)
            print(f"Verificação de estado (com ensure_csrf_cookie): Usuário={user.email}, Logged in=True")
            return Response({
                'logged_in': True,
                'email': user.email,
                'name': user.get_full_name() or user.username,
                'groups': user_groups,
                'current_area': current_area,
            }, status=status.HTTP_200_OK)
        else:
            print(f"Verificação de estado (com ensure_csrf_cookie): Usuário não autenticado.")
            return Response({
                'logged_in': False, 'email': None, 'name': None, 'groups': [], 'current_area': None,
            }, status=status.HTTP_200_OK)

class SelectAreaView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request, *args, **kwargs):
         area = request.data.get('area')
         AREAS_PERMITIDAS = ['ADS', 'Operacional', 'Métricas do Negócio', 'Métricas de Vendas']
         print(f"Tentativa de selecionar área: {area} por {request.user.email}")
         if area and area in AREAS_PERMITIDAS:
             request.session['current_area'] = area
             print(f"Área definida para '{area}' na sessão.")
             return Response({'message': f'Area set to {area}'}, status=status.HTTP_200_OK)
         elif area:
              print(f"Área inválida recebida: {area}")
              return Response({'error': 'Invalid area'}, status=status.HTTP_400_BAD_REQUEST)
         else:
              print("Nenhuma área fornecida na requisição.")
              return Response({'error': 'Area not provided'}, status=status.HTTP_400_BAD_REQUEST)

class RegisterView(APIView):
    permission_classes = [AllowAny]
    @transaction.atomic
    def post(self, request, *args, **kwargs):
        name = request.data.get('name')
        email = request.data.get('email')
        area_atuacao = request.data.get('area')
        password = request.data.get('password')
        if not all([name, email, area_atuacao, password]):
            return Response({'error': 'Todos os campos são obrigatórios.'}, status=status.HTTP_400_BAD_REQUEST)
        if User.objects.filter(username=email).exists():
            return Response({'error': 'Este email já está em uso.'}, status=status.HTTP_400_BAD_REQUEST)
        first_name = name.split(' ')[0]
        last_name = ' '.join(name.split(' ')[1:]) if len(name.split(' ')) > 1 else ''
        try:
            group = Group.objects.get(name=area_atuacao)
        except Group.DoesNotExist:
            return Response({'error': f'Área de atuação "{area_atuacao}" inválida.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            user = User.objects.create_user(
                username=email, email=email, password=password, first_name=first_name,
                last_name=last_name, is_active=False # Começa inativo
            )
            user.groups.add(group)
            print(f"Usuário {email} criado (INATIVO) e adicionado ao grupo {area_atuacao}.")
            return Response(
                {'message': 'Conta criada! Aguardando aprovação do administrador.'},
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            print(f"Erro ao criar usuário {email}: {e}")
            return Response({'error': 'Erro ao criar a conta.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# --- Função auxiliar para tratar erros da API OpenAI (Mantida) ---
def handle_openai_error(e, context="geração"):
    print(f"Erro OpenAI no contexto de {context}: {type(e).__name__}: {e}")
    if isinstance(e, openai.APIConnectionError):
        return Response({'error': f'Não foi possível conectar ao serviço de {context} da OpenAI.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    elif isinstance(e, openai.RateLimitError):
        return Response({'error': f'Limite de uso da API OpenAI atingido para {context}. Tente mais tarde.'}, status=status.HTTP_429_TOO_MANY_REQUESTS)
    elif isinstance(e, openai.AuthenticationError):
        return Response({'error': f'Erro de autenticação com o serviço de {context} [Auth]. Verifique a chave API.'}, status=status.HTTP_401_UNAUTHORIZED)
    elif isinstance(e, openai.BadRequestError):
        error_detail = str(e)
        if "content policy" in error_detail.lower() or "safety system" in error_detail.lower():
            user_message = f"Seu prompt/imagem foi bloqueado pela política de conteúdo da OpenAI durante a {context}."
        elif "Invalid size" in error_detail:
            user_message = f"Tamanho de imagem inválido para o modelo selecionado durante a {context}."
        elif "Invalid image format" in error_detail:
            user_message = f"Formato de imagem inválido enviado para {context}."
        else:
            try:
                error_body = e.response.json()
                user_message = error_body.get("error", {}).get("message", f"O pedido de {context} foi rejeitado pela OpenAI (Bad Request).")
            except:
                user_message = f"O pedido de {context} foi rejeitado pela OpenAI (Bad Request)."
        return Response({'error': user_message}, status=status.HTTP_400_BAD_REQUEST)
    elif isinstance(e, openai.APIStatusError):
        return Response({'error': f'O serviço de {context} da OpenAI retornou um erro (Status: {e.status_code}).'}, status=e.status_code if e.status_code else status.HTTP_500_INTERNAL_SERVER_ERROR)
    else:
        import traceback
        traceback.print_exc()
        return Response({'error': f'Ocorreu um erro interno inesperado no servidor durante a {context}.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# --- Views Operacionais para GPT Image 1 (Sem Estilos) ---
class GenerateImageView(APIView):
    """ Endpoint para gerar imagens usando apenas o modelo gpt-image-1 da OpenAI """
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        user = request.user
        user_prompt = request.data.get('prompt')
        # REMOVIDO: style_id não é mais lido da requisição

        print(f"Recebida requisição POST em /api/operacional/generate-image/ por {user.email}")
        print(f"Prompt usuário: '{user_prompt}'") # Log sem style_id

        # 1. Validação do Prompt do Usuário
        if not user_prompt or not isinstance(user_prompt, str) or not user_prompt.strip():
            return Response({'error': 'O prompt do usuário é obrigatório.'}, status=status.HTTP_400_BAD_REQUEST)

        # 2. Prompt final é apenas o prompt do usuário
        final_prompt = user_prompt.strip()
        # REMOVIDO: Bloco de código que aplicava estilo ao prompt

        # 3. Obter parâmetros da requisição específicos do gpt-image-1
        try:
            n_images = int(request.data.get('n', 1))
            if not (1 <= n_images <= 10):
                 raise ValueError("Número de imagens deve ser entre 1 e 10.")
        except (ValueError, TypeError):
             return Response({'error': 'Número de imagens inválido. Use um inteiro entre 1 e 10.'}, status=status.HTTP_400_BAD_REQUEST)

        selected_size = request.data.get('size', 'auto')
        selected_quality = request.data.get('quality', 'auto')
        selected_background = request.data.get('background', 'auto')
        selected_output_format = request.data.get('output_format', 'png')
        selected_moderation = request.data.get('moderation', 'auto')

        output_compression = None
        if selected_output_format in ['jpeg', 'webp']:
            try:
                output_compression = int(request.data.get('output_compression', 100))
                if not (0 <= output_compression <= 100):
                    output_compression = 100
            except (ValueError, TypeError):
                output_compression = 100

        print(f"Opções GPT Image - N: {n_images}, Tamanho: {selected_size}, Qualidade: {selected_quality}")
        print(f"Background: {selected_background}, Formato: {selected_output_format}, Moderação: {selected_moderation}")
        if output_compression is not None:
            print(f"Compressão: {output_compression}%")

        # 4. Validação da Chave API e Inicialização do Cliente
        api_key = settings.OPENAI_API_KEY
        if not api_key:
            print("Erro Crítico: Chave da API OpenAI não encontrada.")
            return Response({'error': 'Erro de configuração no servidor [API Key].'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        try:
            client = OpenAI(api_key=api_key)
        except Exception as e:
            print(f"Erro ao inicializar cliente OpenAI: {e}")
            return Response({'error': 'Erro ao inicializar o serviço de geração [Client Init].'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # 5. Preparar argumentos para a API
        api_args = {
            "model": "gpt-image-1",
            "prompt": final_prompt, # Usa o prompt direto
            "n": n_images,
            "size": selected_size,
            "quality": selected_quality,
            "background": selected_background,
            "output_format": selected_output_format,
            "moderation": selected_moderation,
            "user": str(user.id)
        }

        if output_compression is not None:
            api_args["output_compression"] = output_compression

        # 6. Chamada à API OpenAI
        try:
            print(f"Enviando prompt final para OpenAI com modelo gpt-image-1...")
            response = client.images.generate(**api_args)

            images_b64 = [img_data.b64_json for img_data in response.data if hasattr(img_data, 'b64_json') and img_data.b64_json]
            print(f"{len(images_b64)} imagem(ns) gerada(s) com sucesso.")

            if not images_b64:
                return Response({'error': 'A API não retornou imagens válidas.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            return Response({'images_b64': images_b64}, status=status.HTTP_200_OK)

        except Exception as e:
            return handle_openai_error(e, context="geração")


class EditImageView(APIView):
    """ Endpoint para editar imagens usando o modelo gpt-image-1 da OpenAI """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser] # Necessário para upload de arquivos

    def post(self, request, *args, **kwargs):
        user = request.user
        print(f"Recebida requisição POST em /api/operacional/edit-image/ por {user.email}")

        # 1. Obter dados do formulário multipart
        prompt = request.data.get('prompt')
        image_files = request.FILES.getlist('image') # Pega lista de arquivos 'image'
        mask_file = request.FILES.get('mask') # Pega arquivo 'mask' (opcional)

        # Validações básicas
        if not prompt or not isinstance(prompt, str) or not prompt.strip():
            return Response({'error': 'O prompt de edição é obrigatório.'}, status=status.HTTP_400_BAD_REQUEST)
        if not image_files:
            return Response({'error': 'Pelo menos uma imagem base é obrigatória para edição.'}, status=status.HTTP_400_BAD_REQUEST)

        # 2. Obter outros parâmetros específicos do gpt-image-1
        try:
            n_images = int(request.data.get('n', 1))
            if not (1 <= n_images <= 10):
                raise ValueError("Número de imagens deve ser entre 1 e 10.")
        except (ValueError, TypeError):
             return Response({'error': 'Número de imagens inválido (1-10).'}, status=status.HTTP_400_BAD_REQUEST)

        selected_size = request.data.get('size', 'auto')
        selected_quality = request.data.get('quality', 'auto')

        print(f"Edição - Prompt: '{prompt[:50]}...', Imagens base: {len(image_files)}, Máscara: {'Sim' if mask_file else 'Não'}")
        print(f"Opções - N: {n_images}, Tamanho: {selected_size}, Qualidade: {selected_quality}")

        # 3. Validação da Chave API e Inicialização do Cliente
        api_key = settings.OPENAI_API_KEY
        if not api_key:
             return Response({'error': 'Erro de configuração no servidor [API Key].'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        try:
            client = OpenAI(api_key=api_key)
        except Exception as e:
            return Response({'error': 'Erro ao inicializar o serviço de edição [Client Init].'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # 4. Validar e preparar imagens (ler bytes)
        image_byte_list = []
        for img_file in image_files:
            if img_file.size > 25 * 1024 * 1024: # Limite de 25MB
                return Response({'error': f'Imagem "{img_file.name}" excede o limite de 25MB.'}, status=status.HTTP_400_BAD_REQUEST)
            filename = img_file.name.lower()
            if not (filename.endswith('.png') or filename.endswith('.jpg') or filename.endswith('.jpeg') or filename.endswith('.webp')):
                return Response({'error': f'Imagem "{img_file.name}" deve ser png, jpg ou webp.'}, status=status.HTTP_400_BAD_REQUEST)
            image_byte_list.append(img_file.read()) # Lê os bytes do arquivo

        # 5. Preparar argumentos para a API
        api_args = {
            "model": "gpt-image-1",
            "prompt": prompt.strip(),
            "n": n_images,
            "size": selected_size,
            "quality": selected_quality,
            "user": str(user.id)
        }

        # Passa a lista de bytes das imagens
        if image_byte_list:
            api_args["image"] = image_byte_list

        # Adicionar máscara se fornecida (ler bytes)
        if mask_file:
            if mask_file.size > 25 * 1024 * 1024:
                return Response({'error': f'Máscara excede o limite de 25MB.'}, status=status.HTTP_400_BAD_REQUEST)
            if not mask_file.name.lower().endswith('.png'):
                return Response({'error': 'A máscara deve ser um arquivo PNG.'}, status=status.HTTP_400_BAD_REQUEST)
            api_args["mask"] = mask_file.read() # Lê os bytes da máscara

        # 6. Chamada à API OpenAI
        try:
            print(f"Enviando pedido de edição para OpenAI com modelo gpt-image-1...")
            response = client.images.edit(**api_args)

            images_b64 = [img_data.b64_json for img_data in response.data if hasattr(img_data, 'b64_json') and img_data.b64_json]
            print(f"{len(images_b64)} imagem(ns) editada(s) com sucesso.")

            if not images_b64:
                 return Response({'error': 'A API não retornou imagens editadas válidas.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            return Response({'images_b64': images_b64}, status=status.HTTP_200_OK)

        except Exception as e:
            return handle_openai_error(e, context="edição")

# ViewSet para Calendários (Mantido)
class ManagedCalendarViewSet(viewsets.ModelViewSet):
    """
    API endpoint para listar, criar e deletar Calendários Gerenciados.
    """
    queryset = ManagedCalendar.objects.all().order_by('name')
    serializer_class = ManagedCalendarSerializer
    permission_classes = [permissions.IsAuthenticated] # Garante que só usuários logados podem acessar

# View para garantir o Cookie CSRF (Mantida)
class EnsureCSRFView(APIView):
    """
    Endpoint específico para garantir que o cookie CSRF seja enviado.
    """
    permission_classes = [AllowAny] # Permite acesso mesmo sem login

    @method_decorator(ensure_csrf_cookie)
    def get(self, request, *args, **kwargs):
        # A simples chamada a esta view com o decorator já garante que o cookie será setado na resposta
        return JsonResponse({
            'success': True,
            'message': 'CSRF cookie check/set complete.'
            # Não podemos verificar o cookie aqui diretamente no backend de forma fácil
        })
    
class AIProjectViewSet(viewsets.ModelViewSet):
    """
    API endpoint para listar, criar, atualizar e deletar Projetos de IA.
    """
    queryset = AIProject.objects.all().order_by('-creation_date', 'name')
    serializer_class = AIProjectSerializer
    permission_classes = [permissions.IsAuthenticated] # Somente usuários logados

    def perform_create(self, serializer):
        """
        Associa o usuário logado como o 'creator' ao criar um novo projeto via API.
        """
        serializer.save(creator=self.request.user)