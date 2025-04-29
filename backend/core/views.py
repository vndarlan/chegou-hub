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
from .models import ManagedCalendar, AIProject, ImageStyle, PrimeCODProduct, PrimeCODOrder, PrimeCODApiConfig
from .serializers import ManagedCalendarSerializer # Mantido (ImageStyleSerializer removido)
from .serializers import (
    ManagedCalendarSerializer, 
    AIProjectSerializer, 
    ImageStyleSerializer, 
    PrimeCODProductSerializer,
    PrimeCODOrderSerializer,
    PrimeCODMetricsSerializer
)
import requests
from datetime import datetime
from django.db.models import Count, Sum, F, Case, When, Value, IntegerField
from rest_framework.decorators import action
from rest_framework.response import Response

class ImageStyleViewSet(viewsets.ModelViewSet):
    """
    API endpoint para listar, criar, atualizar e deletar Estilos de Imagem.
    """
    queryset = ImageStyle.objects.all().order_by('name')
    serializer_class = ImageStyleSerializer
    permission_classes = [permissions.IsAuthenticated] # Somente usuários logados

    def perform_create(self, serializer):
        """
        Associa o usuário logado como o 'creator' ao criar um novo estilo via API.
        """
        serializer.save(creator=self.request.user)

    def perform_update(self, serializer):
        """
        Atualiza o estilo. Pode-se adicionar lógica extra aqui se necessário.
        """
        serializer.save() # Por padrão, não muda o criador na atualização

    def perform_destroy(self, instance):
        """
        Deleta o estilo. Pode-se adicionar lógica extra aqui se necessário.
        """
        instance.delete()

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
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, *args, **kwargs):
        user = request.user
        print(f"Recebida requisição POST em /api/operacional/edit-image/ por {user.email}")

        # 1. Obter dados do formulário multipart
        prompt = request.data.get('prompt')  # IMPORTANTE: Nome correto da variável
        image_files = request.FILES.getlist('image')
        mask_file = request.FILES.get('mask')

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

        # 3. Obter API key e inicializar cliente
        api_key = settings.OPENAI_API_KEY
        if not api_key:
            return Response({'error': 'Erro de configuração no servidor [API Key].'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        try:
            client = OpenAI(api_key=api_key)
        except Exception as e:
            return Response({'error': 'Erro ao inicializar o serviço de edição [Client Init].'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # 4. Validar e preparar imagens (trabalhando com tuplas para cada imagem)
        image_tuples = []
        for img_file in image_files:
            if img_file.size > 25 * 1024 * 1024:
                return Response({'error': f'Imagem "{img_file.name}" excede o limite de 25MB.'}, status=status.HTTP_400_BAD_REQUEST)
            
            filename = img_file.name.lower()
            if not (filename.endswith('.png') or filename.endswith('.jpg') or filename.endswith('.jpeg') or filename.endswith('.webp')):
                return Response({'error': f'Imagem "{img_file.name}" deve ser png, jpg ou webp.'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Determinar o mimetype correto baseado na extensão
            mimetype = None
            if filename.endswith('.png'):
                mimetype = 'image/png'
            elif filename.endswith('.jpg') or filename.endswith('.jpeg'):
                mimetype = 'image/jpeg'
            elif filename.endswith('.webp'):
                mimetype = 'image/webp'
            
            # Criar uma tupla no formato (nome, bytes, mimetype)
            image_tuples.append((img_file.name, img_file.read(), mimetype))

        # 5. Preparar argumentos para a API
        api_args = {
            "model": "gpt-image-1",
            "prompt": prompt.strip(),  # IMPORTANTE: Usar prompt.strip() e não finalEditPrompt
            "n": n_images,
            "size": selected_size,
            "quality": selected_quality,
            "user": str(user.id)
        }

        # Passa a lista de tuplas das imagens (apenas a primeira em caso de múltiplas)
        if image_tuples:
            api_args["image"] = image_tuples[0] if len(image_tuples) == 1 else image_tuples

        # Tratar máscara da mesma forma
        if mask_file:
            if mask_file.size > 25 * 1024 * 1024:
                return Response({'error': f'Máscara excede o limite de 25MB.'}, status=status.HTTP_400_BAD_REQUEST)
            
            if not mask_file.name.lower().endswith('.png'):
                return Response({'error': 'A máscara deve ser um arquivo PNG.'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Tupla para a máscara (nome, bytes, mimetype)
            api_args["mask"] = (mask_file.name, mask_file.read(), 'image/png')

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
    Também verifica se o cookie está sendo enviado corretamente.
    """
    permission_classes = [AllowAny]  # Permite acesso mesmo sem login

    @method_decorator(ensure_csrf_cookie)
    def get(self, request, *args, **kwargs):
        # Verifica se o cookie CSRF está presente na requisição
        csrf_token = request.META.get('CSRF_COOKIE', None)
        
        # Identifica o domínio do cliente
        referer = request.META.get('HTTP_REFERER', 'unknown')
        origin = request.META.get('HTTP_ORIGIN', 'unknown')
        
        # Log para debug em produção
        print(f"CSRF View acessada. Referer: {referer}, Origin: {origin}")
        print(f"CSRF cookie definido: {csrf_token is not None}")
        
        # Lista os primeiros cabeçalhos para debug
        headers = dict(request.headers.items())
        print(f"Cabeçalhos da requisição: {str(headers)[:200]}...")
        
        # Lista cookies para debug
        cookies = dict(request.COOKIES.items())
        print(f"Cookies da requisição: {str(cookies)[:200]}...")
        
        return JsonResponse({
            'success': True,
            'message': 'CSRF cookie set successfully.',
            'has_csrf_cookie': csrf_token is not None,
            'client_info': {
                'referer': referer,
                'origin': origin
            }
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

class PrimeCODViewSet(viewsets.ModelViewSet):
    """
    API endpoint para dados da Prime COD.
    """
    queryset = PrimeCODProduct.objects.all()
    serializer_class = PrimeCODProductSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def metrics(self, request):
        country = request.query_params.get('country', None)
        start_date = request.query_params.get('start_date', None)
        end_date = request.query_params.get('end_date', None)
        
        # First get all products for the selected country
        products = PrimeCODProduct.objects.all()
        if country:
            products = products.filter(country_code=country)
        
        # Filter orders
        orders = PrimeCODOrder.objects.all()
        if country:
            orders = orders.filter(country_code=country)
        
        # Apply date filters to orders
        if start_date or end_date:
            from datetime import datetime, timezone
            
            if start_date:
                try:
                    start_date_obj = datetime.strptime(start_date, '%Y-%m-%d')
                    start_date_obj = start_date_obj.replace(tzinfo=timezone.utc)
                    orders = orders.filter(order_date__gte=start_date_obj)
                except ValueError:
                    return Response({"error": "Formato de data inicial inválido"}, status=400)
            
            if end_date:
                try:
                    end_date_obj = datetime.strptime(end_date, '%Y-%m-%d')
                    end_date_obj = end_date_obj.replace(tzinfo=timezone.utc)
                    orders = orders.filter(order_date__lte=end_date_obj)
                except ValueError:
                    return Response({"error": "Formato de data final inválido"}, status=400)
        
        # Generate metrics
        metrics = []
        for product in products:
            product_orders = orders.filter(product=product)
            
            pedidos = product_orders.count()
            pedidos_enviados = product_orders.filter(status='shipped').count()
            pedidos_entregues = product_orders.filter(status='delivered').count()
            em_transito = product_orders.filter(status='shipped').count()
            recusados = product_orders.filter(status__in=['wrong', 'no_answer']).count()
            devolvidos = product_orders.filter(status='returned').count()
            outros_status = product_orders.exclude(
                status__in=['shipped', 'delivered', 'wrong', 'no_answer', 'returned']
            ).count()
            
            # Calculate effectiveness (avoid division by zero)
            efetividade = (pedidos_entregues / pedidos * 100) if pedidos > 0 else 0
            
            # Revenue
            receita_liquida = product_orders.filter(
                status='delivered'
            ).aggregate(total=Sum('total_price'))['total'] or 0
            
            metrics.append({
                'product': product.name,
                'pedidos': pedidos,
                'pedidos_enviados': pedidos_enviados,
                'pedidos_entregues': pedidos_entregues,
                'efetividade': round(efetividade, 2),
                'em_transito': em_transito,
                'recusados': recusados,
                'devolvidos': devolvidos,
                'outros_status': outros_status,
                'receita_liquida': receita_liquida
            })
        
        # Add total row if we have metrics
        if metrics:
            total = {
                'product': 'TOTAL',
                'pedidos': sum(m['pedidos'] for m in metrics),
                'pedidos_enviados': sum(m['pedidos_enviados'] for m in metrics),
                'pedidos_entregues': sum(m['pedidos_entregues'] for m in metrics),
                'efetividade': round(sum(m['pedidos_entregues'] for m in metrics) / 
                            sum(m['pedidos'] for m in metrics) * 100, 2) 
                            if sum(m['pedidos'] for m in metrics) > 0 else 0,
                'em_transito': sum(m['em_transito'] for m in metrics),
                'recusados': sum(m['recusados'] for m in metrics),
                'devolvidos': sum(m['devolvidos'] for m in metrics),
                'outros_status': sum(m['outros_status'] for m in metrics),
                'receita_liquida': sum(m['receita_liquida'] for m in metrics)
            }
            metrics.append(total)
        
        return Response(metrics)
    
    @action(detail=False, methods=['get'])
    def sync_data(self, request):
        """
        Sincroniza dados da API Prime COD.
        """
        try:
            from .services.primecod_service import PrimeCODService
            
            # Sincronizar produtos
            PrimeCODService.sync_products()
            
            # Obter datas do filtro
            start_date = request.query_params.get('start_date', None)
            end_date = request.query_params.get('end_date', None)
            
            if start_date and end_date:
                try:
                    start_date = datetime.strptime(start_date, '%Y-%m-%d')
                    end_date = datetime.strptime(end_date, '%Y-%m-%d')
                except ValueError:
                    return Response({"error": "Formato de data inválido"}, status=400)
            
            # Sincronizar pedidos
            PrimeCODService.sync_orders(start_date, end_date)
            
            return Response({"message": "Dados sincronizados com sucesso"})
            
        except Exception as e:
            # Adicionar log detalhado do erro
            import traceback
            traceback.print_exc()
            print(f"Erro na sincronização: {str(e)}")
            return Response({"error": str(e)}, status=500)