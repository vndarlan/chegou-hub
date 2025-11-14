# backend/core/views.py
import logging
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User, Group
from django.middleware.csrf import get_token
from django.views.decorators.csrf import ensure_csrf_cookie
from django.utils.decorators import method_decorator
from django.db.models import Q
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from core.models import OrganizationMember

logger = logging.getLogger(__name__)

class SimpleLoginView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        password = request.data.get('password', '')
        
        if not email or not password:
            return Response({'error': 'Email e senha são obrigatórios.'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(email=email)
            if not user.is_active:
                return Response({'error': 'Conta inativa. Contate o administrador.'}, status=status.HTTP_401_UNAUTHORIZED)
        except User.DoesNotExist:
            return Response({'error': 'Credenciais inválidas.'}, status=status.HTTP_401_UNAUTHORIZED)
        
        user = authenticate(request, username=user.username, password=password)
        if user:
            login(request, user)
            return Response({
                'message': 'Login realizado com sucesso.',
                'user': {'name': user.get_full_name() or user.username, 'email': user.email}
            })
        
        return Response({'error': 'Credenciais inválidas.'}, status=status.HTTP_401_UNAUTHORIZED)

class LogoutView(APIView):
    def post(self, request):
        logout(request)
        return Response({'message': 'Logout realizado com sucesso.'})

@method_decorator(ensure_csrf_cookie, name='dispatch')
class CurrentStateView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        csrf_token = get_token(request)
        if request.user.is_authenticated:
            organization_data = None
            organization_role = None

            # Tentar pegar do middleware primeiro
            if hasattr(request, 'organization') and request.organization:
                organization_data = {
                    'id': request.organization.id,
                    'nome': request.organization.nome,
                    'plano': request.organization.plano,
                    'limite_membros': request.organization.limite_membros
                }
                organization_role = request.organization_role
            else:
                # FALLBACK: Buscar primeira organização diretamente
                # Isso resolve race conditions onde o middleware ainda não processou
                member = OrganizationMember.objects.select_related('organization').filter(
                    Q(user=request.user) &
                    Q(ativo=True) &
                    Q(organization__ativo=True) &
                    # Aceitar approved OU NULL (organizações antigas sem migration)
                    (Q(organization__status='approved') | Q(organization__status__isnull=True))
                ).first()

                if member:
                    organization_data = {
                        'id': member.organization.id,
                        'nome': member.organization.nome,
                        'plano': member.organization.plano,
                        'limite_membros': member.organization.limite_membros
                    }
                    organization_role = member.role
                    # Salvar na sessão para próximas requisições
                    request.session['active_organization_id'] = member.organization.id

                    logger.info(f"✅ Fallback: Organização {member.organization.nome} definida para {request.user.email}")

            return Response({
                'logged_in': True,
                'name': request.user.get_full_name() or request.user.username,
                'email': request.user.email,
                'is_admin': request.user.is_staff or request.user.is_superuser,
                'organization': organization_data,
                'organization_role': organization_role,
                'csrf_token': csrf_token
            })
        return Response({'logged_in': False, 'csrf_token': csrf_token})

class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        name = request.data.get('name', '').strip()
        email = request.data.get('email', '').strip().lower()
        password = request.data.get('password', '')

        if not all([name, email, password]):
            return Response({'error': 'Todos os campos são obrigatórios.'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(email=email).exists():
            return Response({'error': 'Já existe uma conta com este email.'}, status=status.HTTP_400_BAD_REQUEST)

        # Criar usuário ativo (não precisa mais de aprovação de admin)
        user = User.objects.create_user(
            username=email,
            email=email,
            password=password,
            first_name=name.split()[0] if name else '',
            last_name=' '.join(name.split()[1:]) if len(name.split()) > 1 else '',
            is_active=True  # Usuário já nasce ativo
        )

        return Response({'message': 'Conta criada com sucesso! Faça login para continuar.'}, status=status.HTTP_201_CREATED)

class SelectAreaView(APIView):
    def post(self, request):
        area = request.data.get('area', '').strip()
        if not area:
            return Response({'error': 'Área é obrigatória.'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            group = Group.objects.get(name=area)
            request.user.groups.clear()
            request.user.groups.add(group)
            return Response({'message': f'Área alterada para {area} com sucesso.'})
        except Group.DoesNotExist:
            return Response({'error': 'Área não encontrada.'}, status=status.HTTP_400_BAD_REQUEST)

@method_decorator(ensure_csrf_cookie, name='dispatch')
class EnsureCSRFView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({'csrf_token': get_token(request)})

class UpdateUserProfileView(APIView):
    """View para gerenciar o perfil do usuário"""

    def get(self, request):
        """Retorna os dados atuais do usuário"""
        if not request.user.is_authenticated:
            return Response({'error': 'Não autenticado.'}, status=status.HTTP_401_UNAUTHORIZED)

        return Response({
            'name': request.user.get_full_name() or request.user.username,
            'email': request.user.email,
            'first_name': request.user.first_name,
            'last_name': request.user.last_name
        })

    def put(self, request):
        """Atualiza os dados do perfil do usuário"""
        if not request.user.is_authenticated:
            return Response({'error': 'Não autenticado.'}, status=status.HTTP_401_UNAUTHORIZED)

        user = request.user
        data = request.data

        # Atualizar nome
        if 'first_name' in data:
            user.first_name = data.get('first_name', '').strip()
        if 'last_name' in data:
            user.last_name = data.get('last_name', '').strip()

        # Atualizar email (também atualiza username pois usamos email como username)
        if 'email' in data:
            new_email = data.get('email', '').strip().lower()

            # Validar se o email já existe para outro usuário
            if User.objects.filter(email=new_email).exclude(id=user.id).exists():
                return Response({'error': 'Este email já está em uso por outro usuário.'},
                              status=status.HTTP_400_BAD_REQUEST)

            user.email = new_email
            user.username = new_email

        try:
            user.save()
            return Response({
                'message': 'Perfil atualizado com sucesso.',
                'user': {
                    'name': user.get_full_name() or user.username,
                    'email': user.email
                }
            })
        except Exception as e:
            return Response({'error': f'Erro ao atualizar perfil: {str(e)}'},
                          status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ChangePasswordView(APIView):
    """View para alterar a senha do usuário"""

    def post(self, request):
        """Altera a senha do usuário"""
        if not request.user.is_authenticated:
            return Response({'error': 'Não autenticado.'}, status=status.HTTP_401_UNAUTHORIZED)

        user = request.user
        current_password = request.data.get('current_password', '')
        new_password = request.data.get('new_password', '')
        confirm_password = request.data.get('confirm_password', '')

        # Validações
        if not all([current_password, new_password, confirm_password]):
            return Response({'error': 'Todos os campos são obrigatórios.'},
                          status=status.HTTP_400_BAD_REQUEST)

        # Verificar se a senha atual está correta
        if not user.check_password(current_password):
            return Response({'error': 'Senha atual incorreta.'},
                          status=status.HTTP_400_BAD_REQUEST)

        # Verificar se as novas senhas coincidem
        if new_password != confirm_password:
            return Response({'error': 'As novas senhas não coincidem.'},
                          status=status.HTTP_400_BAD_REQUEST)

        # Validar força da senha (mínimo 8 caracteres)
        if len(new_password) < 8:
            return Response({'error': 'A senha deve ter no mínimo 8 caracteres.'},
                          status=status.HTTP_400_BAD_REQUEST)

        try:
            user.set_password(new_password)
            user.save()

            # Fazer login novamente com a nova senha para manter a sessão
            login(request, user)

            return Response({'message': 'Senha alterada com sucesso.'})
        except Exception as e:
            return Response({'error': f'Erro ao alterar senha: {str(e)}'},
                          status=status.HTTP_500_INTERNAL_SERVER_ERROR)