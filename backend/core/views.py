# backend/core/views.py
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User, Group
from django.middleware.csrf import get_token
from django.views.decorators.csrf import ensure_csrf_cookie
from django.utils.decorators import method_decorator
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

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
            return Response({
                'logged_in': True,
                'name': request.user.get_full_name() or request.user.username,
                'email': request.user.email,
                'is_admin': request.user.is_staff or request.user.is_superuser,
                'csrf_token': csrf_token
            })
        return Response({'logged_in': False, 'csrf_token': csrf_token})

class RegisterView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        name = request.data.get('name', '').strip()
        email = request.data.get('email', '').strip().lower()
        area = request.data.get('area', '').strip()
        password = request.data.get('password', '')
        
        if not all([name, email, area, password]):
            return Response({'error': 'Todos os campos são obrigatórios.'}, status=status.HTTP_400_BAD_REQUEST)
        
        if User.objects.filter(email=email).exists():
            return Response({'error': 'Já existe uma conta com este email.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Criar usuário inativo
        user = User.objects.create_user(
            username=email,
            email=email,
            password=password,
            first_name=name.split()[0] if name else '',
            last_name=' '.join(name.split()[1:]) if len(name.split()) > 1 else '',
            is_active=False
        )
        
        # Adicionar ao grupo/área
        try:
            group = Group.objects.get(name=area)
            user.groups.add(group)
        except Group.DoesNotExist:
            pass
        
        return Response({'message': 'Conta criada! Aguarde aprovação do administrador.'}, status=status.HTTP_201_CREATED)

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