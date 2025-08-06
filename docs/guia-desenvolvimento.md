# 🛠️ Guia de Desenvolvimento - Chegou Hub

## Como começar a desenvolver

Este guia ensina tudo que você precisa para configurar o ambiente de desenvolvimento e trabalhar no projeto Chegou Hub.

## Pré-requisitos

### Ferramentas Necessárias
- **Python 3.11+** - Para o backend Django
- **Node.js 18+** - Para o frontend React
- **Git** - Para versionamento
- **VS Code** (recomendado) - Editor com extensões Python e React

### Opcional (para features avançadas)
- **Redis** - Para processamento em background
- **PostgreSQL** - Para usar o mesmo banco da produção

## Setup Inicial

### 1. Clone o Repositório
```bash
git clone <url-do-repositorio>
cd chegou-hub
```

### 2. Configure o Backend
```bash
cd backend

# Crie ambiente virtual
python -m venv venv

# Ative o ambiente (Windows)
venv\Scripts\activate
# ou (Linux/Mac)
source venv/bin/activate

# Instale dependências
pip install -r requirements.txt

# Execute migrações
python manage.py migrate

# Crie superusuário (opcional)
python manage.py createsuperuser
```

### 3. Configure o Frontend
```bash
cd frontend

# Instale dependências
npm install
```

### 4. Configure Variáveis de Ambiente (Opcional)

Crie arquivo `.env` na pasta `backend/`:
```env
# Para desenvolvimento local (opcional)
DEBUG=True
DJANGO_SECRET_KEY=sua-chave-secreta-aqui
DATABASE_URL=postgresql://user:pass@localhost/dbname
REDIS_URL=redis://localhost:6379/0
```

## Comandos de Desenvolvimento

### Backend (Django + DRF)

#### Servidor de Desenvolvimento
```bash
cd backend
python manage.py runserver
# Acesse: http://localhost:8000
```

#### Banco de Dados
```bash
# Criar migrações após mudanças nos models
python manage.py makemigrations

# Aplicar migrações
python manage.py migrate

# Verificar conexão com banco
python manage.py check_db
```

#### Django Admin
```bash
# Criar superusuário
python manage.py createsuperuser
# Acesse: http://localhost:8000/admin
```

#### Workers RQ (Background Tasks)
```bash
# Iniciar worker
python manage.py rqworker

# Ver status da fila
python manage.py rq_status

# Limpar jobs antigos
python manage.py clear_rq_jobs
```

#### Utilitários
```bash
# Shell Django interativo
python manage.py shell

# Coletar arquivos estáticos
python manage.py collectstatic
```

### Frontend (React + shadcn/ui)

#### Servidor de Desenvolvimento
```bash
cd frontend
npm start
# Acesse: http://localhost:3000
```

#### Build e Testes
```bash
# Build para produção
npm run build

# Executar testes
npm test

# Instalar nova dependência
npm install nome-do-pacote
```

## Estrutura de Features

### Como Criar Nova Feature

#### 1. Backend (Django App)
```bash
cd backend

# Criar nova app Django
python manage.py startapp features/nova_feature

# Adicionar em settings.py
# INSTALLED_APPS = [
#     'features.nova_feature',
# ]
```

#### 2. Estrutura Padrão da Feature
```
backend/features/nova_feature/
├── __init__.py
├── admin.py         # Configuração Django admin
├── apps.py          # Configuração da app
├── models.py        # Modelos do banco de dados
├── serializers.py   # Serializers DRF
├── urls.py          # URLs da feature
├── views.py         # ViewSets e APIViews
└── migrations/      # Migrações do banco
```

#### 3. Frontend (Componente React)
```
frontend/src/features/nova_feature/
├── NovaFeaturePage.js    # Página principal
├── components/           # Componentes específicos
│   ├── ListaItens.jsx
│   └── FormularioItem.jsx
└── hooks/               # Hooks específicos (opcional)
    └── useNovaFeature.js
```

### Exemplo Prático: Feature "Tarefas"

#### Backend
```python
# backend/features/tarefas/models.py
from django.db import models
from django.contrib.auth.models import User

class Tarefa(models.Model):
    titulo = models.CharField(max_length=200)
    descricao = models.TextField(blank=True)
    concluida = models.BooleanField(default=False)
    usuario = models.ForeignKey(User, on_delete=models.CASCADE)
    criada_em = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Tarefa"
        verbose_name_plural = "Tarefas"
        ordering = ['-criada_em']
```

```python
# backend/features/tarefas/serializers.py
from rest_framework import serializers
from .models import Tarefa

class TarefaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tarefa
        fields = ['id', 'titulo', 'descricao', 'concluida', 'criada_em']
```

```python
# backend/features/tarefas/views.py
from rest_framework import viewsets
from .models import Tarefa
from .serializers import TarefaSerializer

class TarefaViewSet(viewsets.ModelViewSet):
    serializer_class = TarefaSerializer
    
    def get_queryset(self):
        return Tarefa.objects.filter(usuario=self.request.user)
```

#### Frontend
```jsx
// frontend/src/features/tarefas/TarefasPage.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';

function TarefasPage() {
    const [tarefas, setTarefas] = useState([]);
    
    useEffect(() => {
        const carregarTarefas = async () => {
            try {
                const response = await axios.get('/api/tarefas/', 
                    { withCredentials: true });
                setTarefas(response.data);
            } catch (error) {
                console.error('Erro ao carregar tarefas:', error);
            }
        };
        
        carregarTarefas();
    }, []);
    
    return (
        <div className="space-y-4">
            <h1 className="text-2xl font-bold">Minhas Tarefas</h1>
            {tarefas.map(tarefa => (
                <div key={tarefa.id} className="border p-4 rounded">
                    <h3 className="font-semibold">{tarefa.titulo}</h3>
                    <p className="text-muted-foreground">{tarefa.descricao}</p>
                </div>
            ))}
        </div>
    );
}

export default TarefasPage;
```

## Boas Práticas

### Backend

#### Modelos de Dados
```python
# ✅ BOM - Campos descritivos com validação
class Produto(models.Model):
    nome = models.CharField(
        max_length=200, 
        verbose_name="Nome do Produto",
        help_text="Nome que aparece para o cliente"
    )
    preco = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    
    class Meta:
        verbose_name = "Produto"
        verbose_name_plural = "Produtos"
        ordering = ['nome']
```

#### API Views
```python
# ✅ BOM - ViewSet com validações e permissões
class ProdutoViewSet(viewsets.ModelViewSet):
    serializer_class = ProdutoSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Filtrar por usuário quando necessário
        return Produto.objects.filter(ativo=True)
    
    def perform_create(self, serializer):
        # Definir usuário automaticamente
        serializer.save(criado_por=self.request.user)
```

### Frontend

#### Componentes React
```jsx
// ✅ BOM - Componente limpo com hooks
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

function MeuComponente({ titulo, dados }) {
    const [loading, setLoading] = useState(true);
    const [erro, setErro] = useState(null);
    
    useEffect(() => {
        // Lógica de carregamento
    }, []);
    
    if (loading) return <div>Carregando...</div>;
    if (erro) return <div>Erro: {erro}</div>;
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>{titulo}</CardTitle>
            </CardHeader>
            <CardContent>
                {/* Conteúdo aqui */}
            </CardContent>
        </Card>
    );
}
```

#### Chamadas de API
```jsx
// ✅ BOM - Async/await com tratamento de erro
const carregarDados = async () => {
    setLoading(true);
    try {
        const response = await axios.get('/api/dados/', {
            withCredentials: true  // SEMPRE incluir para CSRF
        });
        setDados(response.data);
        setErro(null);
    } catch (error) {
        console.error('Erro:', error);
        setErro('Falha ao carregar dados');
    } finally {
        setLoading(false);
    }
};
```

## Debugging e Troubleshooting

### Backend
```bash
# Ver logs do servidor
cd backend
python manage.py runserver --verbosity=2

# Debug no shell Django
python manage.py shell
>>> from features.minha_app.models import MeuModel
>>> MeuModel.objects.all()

# Ver migrações pendentes
python manage.py showmigrations
```

### Frontend
```bash
# Ver logs detalhados
cd frontend
npm start

# Build de produção para debug
npm run build
```

### Problemas Comuns

#### "CSRF Token Missing"
```jsx
// ✅ Solução: Sempre usar withCredentials
axios.get('/api/dados/', { withCredentials: true })
```

#### "Module Not Found"
```bash
# Backend: Verificar se app está em INSTALLED_APPS
# Frontend: Verificar se componente foi importado corretamente
```

#### "Migration Error"
```bash
cd backend
# Reset das migrações (cuidado em produção!)
python manage.py migrate --fake features.minha_app zero
python manage.py migrate features.minha_app
```

## Deploy

### Desenvolvimento → Produção
O deploy é automático via Railway quando você faz push para a branch principal.

### Preparação para Deploy
```bash
# Certificar que tudo funciona localmente
cd backend
python manage.py check
python manage.py collectstatic --noinput

cd ../frontend  
npm run build
```

## Próximos Passos

1. 📖 Leia [Configurações Backend](backend/configuracoes.md)
2. 🎨 Entenda [Estrutura Frontend](frontend/estrutura-frontend.md)  
3. 🔧 Explore [Features Existentes](backend/features/)
4. 📱 Veja [Páginas do Sistema](frontend/pages/)

---

**Com este guia, você está pronto para desenvolver novas features e contribuir com o projeto Chegou Hub!**