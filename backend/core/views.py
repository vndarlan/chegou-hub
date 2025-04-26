# backend/core/views.py
import os
import openai # Importa a biblioteca OpenAI
import base64 # Para decodificar imagens de referência em edit (se necessário)
from django.conf import settings # Para pegar a chave API
from django.contrib.auth.models import User, Group
from django.db import transaction
from django.contrib.auth import authenticate, login, logout
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, viewsets, permissions
from rest_framework.permissions import AllowAny, IsAuthenticated # Importa permissões
from rest_framework.parsers import MultiPartParser, FormParser # Para lidar com upload de arquivos
from django.views.decorators.csrf import ensure_csrf_cookie
from django.utils.decorators import method_decorator
from openai import OpenAI # Importa a classe principal da OpenAI

# Importar modelos e serializers locais
from .models import ImageStyle, ManagedCalendar # Adicione ManagedCalendar
from .serializers import ImageStyleSerializer, ManagedCalendarSerializer

# --- Views de Autenticação e Estado (já existentes - SEM MUDANÇAS AQUI) ---
class SimpleLoginView(APIView):
    permission_classes = [AllowAny]
    def post(self, request, *args, **kwargs):
        # ... (código existente sem mudanças) ...
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
        # ... (código existente sem mudanças) ...
        user_email = request.user.email if request.user.is_authenticated else 'N/A (deslogado ou sessão inválida)'
        print(f"Tentativa de logout para usuário: {user_email}")
        logout(request) # Função do Django para invalidar a sessão
        print(f"Logout realizado.")
        return Response({'message': 'Logout successful'}, status=status.HTTP_200_OK)

@method_decorator(ensure_csrf_cookie, name='dispatch')
class CurrentStateView(APIView):
    permission_classes = [AllowAny]
    def get(self, request, *args, **kwargs):
         # ... (código existente sem mudanças) ...
        is_authenticated = request.user.is_authenticated
        if is_authenticated:
            user = request.user
            user_groups = list(user.groups.values_list('name', flat=True))
            current_area = request.session.get('current_area', None)
            print(f"Verificação de estado (com ensure_csrf_cookie): Usuário={user.email}, Logged in=True") # Log opcional
            return Response({
                'logged_in': True,
                'email': user.email,
                'name': user.get_full_name() or user.username,
                'groups': user_groups,
                'current_area': current_area,
            }, status=status.HTTP_200_OK)
        else:
            print(f"Verificação de estado (com ensure_csrf_cookie): Usuário não autenticado.") # Log opcional
            return Response({
                'logged_in': False, 'email': None, 'name': None, 'groups': [], 'current_area': None,
            }, status=status.HTTP_200_OK)

class SelectAreaView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request, *args, **kwargs):
         # ... (código existente sem mudanças) ...
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
        # ... (código existente sem mudanças) ...
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

# --- ViewSet para CRUD de Estilos de Imagem ---

class ImageStyleViewSet(viewsets.ModelViewSet):
    """
    API endpoint que permite aos usuários criar, ler, atualizar e deletar
    seus próprios estilos de imagem.
    """
    serializer_class = ImageStyleSerializer
    permission_classes = [permissions.IsAuthenticated] # Requer autenticação

    def get_queryset(self):
        """ Retorna apenas os estilos pertencentes ao usuário logado. """
        # Certifica-se de que request.user está disponível e é um usuário autenticado
        if self.request.user and self.request.user.is_authenticated:
            return ImageStyle.objects.filter(user=self.request.user).order_by('name')
        return ImageStyle.objects.none() # Retorna queryset vazio se não autenticado

    def perform_create(self, serializer):
        """ Associa o usuário logado automaticamente ao criar um novo estilo. """
        serializer.save(user=self.request.user)

    # O ModelViewSet já fornece os métodos list, create, retrieve, update, partial_update, destroy.
    # A lógica de permissão (só o próprio usuário) é garantida pelo get_queryset.

# --- Views Operacionais (Geração, Edição, Variação) ---

# Função auxiliar para tratar erros da API OpenAI
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
        # Erro genérico
        import traceback
        traceback.print_exc()
        return Response({'error': f'Ocorreu um erro interno inesperado no servidor durante a {context}.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class GenerateImageView(APIView):
    """ Endpoint para gerar imagens usando a API da OpenAI com opções extras. """
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        user = request.user
        user_prompt = request.data.get('prompt')
        style_id = request.data.get('style_id') # ID do estilo selecionado (opcional)

        print(f"Recebida requisição POST em /api/operacional/generate-image/ por {user.email}")
        print(f"Prompt usuário: '{user_prompt}', Style ID: {style_id}")

        # 1. Validação do Prompt do Usuário
        if not user_prompt or not isinstance(user_prompt, str) or not user_prompt.strip():
            return Response({'error': 'O prompt do usuário é obrigatório.'}, status=status.HTTP_400_BAD_REQUEST)

        # 2. Buscar e Prependenciar Instruções do Estilo (se style_id for fornecido)
        final_prompt = user_prompt.strip()
        if style_id:
            try:
                style_instance = ImageStyle.objects.get(pk=style_id, user=user)
                final_prompt = f"{style_instance.instructions}\n\n{user_prompt.strip()}"
                print(f"Estilo '{style_instance.name}' aplicado. Prompt final: '{final_prompt[:100]}...'")
            except ImageStyle.DoesNotExist:
                print(f"Aviso: Estilo com ID {style_id} não encontrado para o usuário {user.email}. Usando prompt original.")
                # Não retorna erro, apenas ignora o estilo inválido
            except Exception as e:
                print(f"Erro ao buscar estilo ID {style_id}: {e}. Usando prompt original.")


        # 3. Obter outros parâmetros da requisição com defaults
        try:
            n_images = int(request.data.get('n', 1)) # Número de imagens (default 1)
            if not (1 <= n_images <= 10):
                 raise ValueError("Número de imagens deve ser entre 1 e 10.")
        except (ValueError, TypeError):
             return Response({'error': 'Número de imagens inválido. Use um inteiro entre 1 e 10.'}, status=status.HTTP_400_BAD_REQUEST)

        selected_model = request.data.get('model', 'dall-e-3')
        selected_size = request.data.get('size', '1024x1024')
        selected_quality = request.data.get('quality', 'standard') # 'standard' ou 'hd' para DALL-E, 'low','medium','high','auto' para GPT
        # response_format será sempre b64_json na chamada da API
        # selected_background = request.data.get('background', 'opaque') # Para GPT-Image

        # Ajustar qualidade se for modelo GPT e não for uma das opções válidas
        # if selected_model == 'gpt-image-1' and selected_quality not in ['low', 'medium', 'high', 'auto']:
        #    selected_quality = 'auto' # Ou 'medium' como default?
        # elif selected_model != 'gpt-image-1' and selected_quality not in ['standard', 'hd']:
        #    selected_quality = 'standard'

        print(f"Opções - N: {n_images}, Modelo: {selected_model}, Tamanho: {selected_size}, Qualidade: {selected_quality}")

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

        # 5. Chamada à API OpenAI
        try:
            print(f"Enviando prompt final para OpenAI...")
            response = client.images.generate(
                model=selected_model,
                prompt=final_prompt,
                n=n_images,
                size=selected_size,
                quality=selected_quality,
                response_format="b64_json", # Sempre pedir base64
                # style="vivid", # Opcional DALL-E 3: "vivid" ou "natural"
                # background=selected_background # Apenas para GPT-Image
                user=str(user.id) # Passar ID do usuário ajuda a OpenAI a monitorar abusos
            )
            # Extrair todas as imagens base64 da resposta
            images_b64 = [img_data.b64_json for img_data in response.data if img_data.b64_json]
            print(f"{len(images_b64)} imagem(ns) gerada(s) com sucesso.")

            if not images_b64:
                 return Response({'error': 'A API não retornou imagens válidas.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            # 6. Retorna a lista de base64 para o Frontend
            return Response({'images_b64': images_b64}, status=status.HTTP_200_OK)

        except Exception as e:
            return handle_openai_error(e, context="geração")


class EditImageView(APIView):
    """ Endpoint para editar imagens usando a API da OpenAI. """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser] # Habilita receber arquivos

    def post(self, request, *args, **kwargs):
        user = request.user
        print(f"Recebida requisição POST em /api/operacional/edit-image/ por {user.email}")

        # 1. Obter dados do formulário multipart
        prompt = request.data.get('prompt')
        image_files = request.FILES.getlist('image') # Pode receber múltiplas imagens base
        mask_file = request.FILES.get('mask')       # Máscara opcional

        # Validações básicas
        if not prompt or not isinstance(prompt, str) or not prompt.strip():
            return Response({'error': 'O prompt de edição é obrigatório.'}, status=status.HTTP_400_BAD_REQUEST)
        if not image_files:
            return Response({'error': 'Pelo menos uma imagem base é obrigatória para edição.'}, status=status.HTTP_400_BAD_REQUEST)

        # 2. Obter outros parâmetros
        try:
            n_images = int(request.data.get('n', 1))
            if not (1 <= n_images <= 10): raise ValueError()
        except (ValueError, TypeError):
             return Response({'error': 'Número de imagens inválido (1-10).'}, status=status.HTTP_400_BAD_REQUEST)

        selected_model = request.data.get('model', 'gpt-image-1') # GPT-Image é bom para edição, DALL-E 2 também suporta
        selected_size = request.data.get('size', '1024x1024') # Tamanho da imagem de SAÍDA

        print(f"Edição - Prompt: '{prompt[:50]}...', Imagens base: {len(image_files)}, Máscara: {'Sim' if mask_file else 'Não'}")
        print(f"Opções - N: {n_images}, Modelo: {selected_model}, Tamanho Saída: {selected_size}")

        # 3. Validação da Chave API e Inicialização do Cliente
        api_key = settings.OPENAI_API_KEY
        if not api_key:
             return Response({'error': 'Erro de configuração no servidor [API Key].'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        try:
            client = OpenAI(api_key=api_key)
        except Exception as e:
            return Response({'error': 'Erro ao inicializar o serviço de edição [Client Init].'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # 4. Preparar argumentos para a API
        api_args = {
            "model": selected_model,
            "prompt": prompt.strip(),
            "n": n_images,
            "size": selected_size,
            "response_format": "b64_json",
            "user": str(user.id)
        }

        # Ler bytes das imagens e adicionar aos argumentos
        # A API espera os bytes diretamente
        image_byte_list = []
        for img_file in image_files:
            # Validação de tamanho/tipo pode ser adicionada aqui
            if img_file.size > 4 * 1024 * 1024: # Exemplo: limite de 4MB
                return Response({'error': f'Imagem "{img_file.name}" excede o limite de 4MB.'}, status=status.HTTP_400_BAD_REQUEST)
            image_byte_list.append(img_file.read()) # Lê o conteúdo do arquivo

        # A API aceita uma lista de bytes diretamente para 'image' (a partir de openai>=1.1.0)
        # Ou para versões anteriores, pode ser necessário passar apenas a primeira imagem ou
        # usar outra abordagem dependendo do modelo e da versão da biblioteca.
        # Ver documentação específica para client.images.edit com múltiplas imagens base.
        # Assumindo que a versão recente aceita uma lista de bytes (ou o primeiro é usado):
        if not image_byte_list:
             return Response({'error': 'Falha ao ler arquivos de imagem.'}, status=status.HTTP_400_BAD_REQUEST)
        api_args["image"] = image_byte_list[0] # Passa a primeira imagem (DALL-E 2 só usa a primeira com mask)
        # Se GPT-Image suportar múltiplas referências, a API pode mudar
        # api_args["image"] = image_byte_list # Passaria a lista toda se suportado

        if mask_file:
             if mask_file.size > 4 * 1024 * 1024:
                 return Response({'error': f'Máscara excede o limite de 4MB.'}, status=status.HTTP_400_BAD_REQUEST)
             api_args["mask"] = mask_file.read() # Adiciona bytes da máscara

        # 5. Chamada à API OpenAI
        try:
            print(f"Enviando pedido de edição para OpenAI...")
            response = client.images.edit(**api_args) # Desempacota os argumentos

            images_b64 = [img_data.b64_json for img_data in response.data if img_data.b64_json]
            print(f"{len(images_b64)} imagem(ns) editada(s) com sucesso.")

            if not images_b64:
                 return Response({'error': 'A API não retornou imagens editadas válidas.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            return Response({'images_b64': images_b64}, status=status.HTTP_200_OK)

        except Exception as e:
            return handle_openai_error(e, context="edição")


class CreateVariationView(APIView):
    """ Endpoint para criar variações de uma imagem usando a API da OpenAI (DALL-E 2). """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, *args, **kwargs):
        user = request.user
        print(f"Recebida requisição POST em /api/operacional/create-variation/ por {user.email}")

        # 1. Obter dados
        image_file = request.FILES.get('image')
        if not image_file:
            return Response({'error': 'Uma imagem base é obrigatória para criar variações.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            n_variations = int(request.data.get('n', 1))
            if not (1 <= n_variations <= 10): raise ValueError()
        except (ValueError, TypeError):
             return Response({'error': 'Número de variações inválido (1-10).'}, status=status.HTTP_400_BAD_REQUEST)

        selected_size = request.data.get('size', '1024x1024')
        # Modelo é implicitamente DALL-E 2 para create_variation
        selected_model = 'dall-e-2'

        print(f"Variação - Imagem base: {image_file.name}, N: {n_variations}, Tamanho Saída: {selected_size}")

        # 2. Validação da Chave API e Inicialização do Cliente
        api_key = settings.OPENAI_API_KEY
        if not api_key:
             return Response({'error': 'Erro de configuração no servidor [API Key].'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        try:
            client = OpenAI(api_key=api_key)
        except Exception as e:
            return Response({'error': 'Erro ao inicializar o serviço de variação [Client Init].'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # 3. Preparar argumentos e chamada à API
        try:
             if image_file.size > 4 * 1024 * 1024:
                 return Response({'error': f'Imagem "{image_file.name}" excede o limite de 4MB.'}, status=status.HTTP_400_BAD_REQUEST)
             image_bytes = image_file.read()

             print(f"Enviando pedido de variação para OpenAI...")
             response = client.images.create_variation(
                 image=image_bytes, # Passa os bytes da imagem
                 n=n_variations,
                 size=selected_size,
                 response_format="b64_json",
                 model=selected_model, # Embora implícito, pode ser passado
                 user=str(user.id)
             )

             images_b64 = [img_data.b64_json for img_data in response.data if img_data.b64_json]
             print(f"{len(images_b64)} variação(ões) criada(s) com sucesso.")

             if not images_b64:
                 return Response({'error': 'A API não retornou variações válidas.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

             return Response({'images_b64': images_b64}, status=status.HTTP_200_OK)

        except Exception as e:
            return handle_openai_error(e, context="variação")
        
class ManagedCalendarViewSet(viewsets.ModelViewSet):
    """
    API endpoint para listar, criar e deletar Calendários Gerenciados.
    """
    queryset = ManagedCalendar.objects.all().order_by('name')
    serializer_class = ManagedCalendarSerializer
    permission_classes = [permissions.IsAuthenticated] # Apenas usuários logados podem gerenciar