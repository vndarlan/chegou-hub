# 🎨 Estrutura Frontend - React + shadcn/ui

## O que faz

O frontend é uma aplicação React moderna que usa shadcn/ui para interface e se conecta com a API Django via HTTPS. Oferece navegação fluida, temas claro/escuro e componentes reutilizáveis.

## Como funciona

A aplicação é organizada em:
- **Páginas principais** (Login, Workspace)
- **Features específicas** (Agenda, IA, Métricas, etc.)
- **Componentes compartilhados** (UI, navegação, feedback)
- **Sistema de roteamento** para navegação

## Stack Tecnológico

### Core
- **React 19.1** - Framework principal
- **React Router DOM** - Roteamento de páginas
- **Axios** - Cliente HTTP com CSRF
- **shadcn/ui** - Biblioteca de componentes

### Estilização
- **Tailwind CSS** - Utility-first CSS
- **PostCSS** - Processamento CSS
- **CSS Variables** - Sistema de temas

### Gerenciamento de Estado
- **React Context API** - Estados globais
- **React Hooks** - Estados locais e lógica

## Estrutura de Diretórios

```
frontend/src/
├── 📄 App.js                    # Componente principal da aplicação
├── 📄 globals.css               # Estilos globais e variáveis CSS
├── 📄 index.js                  # Ponto de entrada da aplicação
├── 📁 components/               # Componentes compartilhados
│   ├── 📁 ui/                   # Componentes shadcn/ui base
│   │   ├── alert.jsx
│   │   ├── button.jsx
│   │   ├── card.jsx
│   │   ├── dialog.jsx
│   │   ├── input.jsx
│   │   ├── sidebar.jsx
│   │   ├── table.jsx
│   │   └── [outros componentes]
│   ├── app-sidebar.jsx          # Barra lateral principal
│   ├── CSRFManager.js          # Gerenciador de tokens CSRF
│   ├── FeedbackButton.jsx      # Botão de feedback flutuante
│   ├── theme-provider.jsx      # Provedor de temas
│   └── [outros componentes]
├── 📁 features/                 # Componentes por funcionalidade
│   ├── 📁 agenda/
│   │   └── AgendaPage.js
│   ├── 📁 engajamento/
│   │   └── EngajamentoPage.js
│   ├── 📁 ia/
│   │   ├── ProjetoDashboard.js
│   │   ├── RelatoriosProjetos.js
│   │   ├── LogsPage.js
│   │   └── NicochatPage.js
│   ├── 📁 mapa/
│   │   └── MapaPage.js
│   ├── 📁 metricas/
│   │   ├── PrimecodPage.js
│   │   ├── EcomhubPage.js
│   │   └── DropiPage.js
│   ├── 📁 novelties/
│   │   └── NoveltiesPage.js
│   └── 📁 processamento/
│       └── ProcessamentoPage.js
├── 📁 pages/                    # Páginas principais
│   ├── LoginPage.js             # Página de autenticação
│   └── WorkspacePage.js         # Página principal (layout)
├── 📁 hooks/                    # React hooks customizados
│   └── useCSRF.js              # Hook para gerenciar CSRF
├── 📁 utils/                    # Utilitários
│   └── csrf.js                 # Funções para tokens CSRF
└── 📁 lib/                     # Configurações de bibliotecas
    └── utils.js                # Utilitários do shadcn/ui
```

## Componentes Principais

### App.js - Componente Raiz
```jsx
function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Verifica status de autenticação na inicialização
  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const response = await axios.get('/current-state/', { withCredentials: true });
        setIsLoggedIn(response.data.logged_in);
      } catch (error) {
        setIsLoggedIn(false);
      } finally {
        setIsLoading(false);
      }
    };
    checkLoginStatus();
  }, []);

  return (
    <ThemeProvider defaultTheme="light" storageKey="chegou-hub-theme">
      <CSRFManager>
        <Toaster position="top-right" />
        <Router>
          <Routes>
            <Route path="/login" element={!isLoggedIn ? <LoginPage /> : <Navigate to="/workspace/agenda" />} />
            <Route path="/workspace/*" element={isLoggedIn ? <WorkspacePage /> : <Navigate to="/login" />} />
            <Route path="/" element={<Navigate to={isLoggedIn ? "/workspace/agenda" : "/login"} />} />
          </Routes>
        </Router>
      </CSRFManager>
    </ThemeProvider>
  );
}
```

**Funcionalidades:**
- Gerenciamento global de autenticação
- Roteamento proteção de rotas
- Tema claro/escuro
- Notificações (toast)
- Gerenciamento CSRF

### WorkspacePage.js - Layout Principal
```jsx
function WorkspacePage({ setIsLoggedIn }) {
  const [userData, setUserData] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar 
          userName={userData?.name}
          userEmail={userData?.email}
          onLogout={handleLogout}
          navigate={navigate}
          location={location}
        />
        <SidebarInset>
          <header className="flex h-16 items-center gap-2 border-b px-4">
            <Breadcrumb>
              {/* Breadcrumbs automáticos por rota */}
            </Breadcrumb>
            <FeedbackButton />
          </header>
          <main className="flex-1 overflow-auto p-4">
            <Routes>
              <Route path="agenda" element={<AgendaPage />} />
              <Route path="mapa" element={<MapaPage />} />
              <Route path="projetos" element={<ProjetoDashboard />} />
              {/* Outras rotas... */}
            </Routes>
          </main>
        </SidebarInset>
        <ChatbotWidget />
      </div>
    </SidebarProvider>
  );
}
```

**Funcionalidades:**
- Layout responsivo com sidebar
- Sistema de breadcrumbs
- Roteamento interno do workspace
- Botão de feedback sempre visível
- Chatbot integrado

## Sistema de Navegação

### AppSidebar - Navegação Principal
```jsx
// Estrutura da navegação organizada por categoria
const data = {
  teams: [
    { name: "HOME", logo: Calendar, plan: "Calendários e eventos" },
    { name: "IA & Automações", logo: Bot, plan: "Projetos e logs de IA" },
    { name: "Métricas", logo: TrendingUp, plan: "Dashboards e relatórios" },
    { name: "Operacional", logo: Users, plan: "Gestão e engajamento" },
    { name: "Suporte", logo: Settings, plan: "Ferramentas e utilidades" }
  ],
  navMain: [
    {
      title: "HOME",
      url: "#",
      icon: Calendar,
      items: [
        { title: "Agenda da Empresa", url: "/workspace/agenda", icon: Calendar }
      ]
    },
    {
      title: "IA & Automações", 
      url: "#",
      icon: Bot,
      items: [
        { title: "Projetos", url: "/workspace/projetos", icon: FolderOpen },
        { title: "Relatórios", url: "/workspace/relatorios", icon: BarChart3 },
        { title: "Logs de Erros", url: "/workspace/logs", icon: AlertCircle },
        { title: "Nicochat", url: "/workspace/nicochat", icon: MessageCircle }
      ]
    }
    // Outras categorias...
  ]
};
```

**Categorias de Navegação:**
- **HOME** - Agenda da empresa
- **IA & Automações** - Projetos, relatórios, logs, Nicochat
- **Métricas** - PRIMECOD, ECOMHUB, DROPI MX
- **Operacional** - Engajamento, Novelties
- **Suporte** - Processamento de dados

## Sistema de Temas

### ThemeProvider
```jsx
const ThemeProvider = ({ children, defaultTheme = "system", storageKey = "vite-ui-theme", ...props }) => {
  const [theme, setTheme] = useState(() => 
    localStorage.getItem(storageKey) || defaultTheme
  );

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches 
        ? "dark" : "light";
      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme);
  }, [theme]);

  return (
    <ThemeProviderContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeProviderContext.Provider>
  );
};
```

**Temas Disponíveis:**
- **Light** - Tema claro (padrão)
- **Dark** - Tema escuro
- **System** - Segue preferência do sistema

### Variáveis CSS (globals.css)
```css
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 240 10% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 240 10% 3.9%;
    --primary: 240 5.9% 10%;
    --primary-foreground: 0 0% 98%;
    /* Outras variáveis... */
  }
 
  .dark {
    --background: 240 10% 3.9%;
    --foreground: 0 0% 98%;
    --card: 240 10% 3.9%;
    --card-foreground: 0 0% 98%;
    /* Outras variáveis dark... */
  }
}
```

## Gerenciamento de Estado

### CSRFManager - Tokens CSRF
```jsx
const CSRFManager = ({ children }) => {
  useEffect(() => {
    const setupCSRF = async () => {
      try {
        // Busca token CSRF do backend
        const response = await axios.get('/csrf-token/');
        const token = response.data.csrfToken;
        
        // Define token para todas as requisições
        axios.defaults.headers.common['X-CSRFToken'] = token;
      } catch (error) {
        console.error('Erro ao configurar CSRF:', error);
      }
    };

    setupCSRF();
  }, []);

  return children;
};
```

### useCSRF Hook
```jsx
const useCSRF = () => {
  const [csrfToken, setCsrfToken] = useState(null);

  const fetchCSRFToken = async () => {
    try {
      const response = await axios.get('/csrf-token/', { withCredentials: true });
      const token = response.data.csrfToken;
      setCsrfToken(token);
      axios.defaults.headers.common['X-CSRFToken'] = token;
      return token;
    } catch (error) {
      console.error('Erro ao buscar token CSRF:', error);
      return null;
    }
  };

  return { csrfToken, fetchCSRFToken };
};
```

## Componentes shadcn/ui

### Componentes Base Disponíveis
```jsx
// Componentes de interface mais usados
import { Button } from './components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Input } from './components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './components/ui/table';
import { Badge } from './components/ui/badge';
import { Alert, AlertDescription } from './components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
```

### Exemplo de Uso
```jsx
function MeuComponente() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Título do Card</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input placeholder="Digite algo..." />
        <Button className="w-full">
          Clique aqui
        </Button>
        <Badge variant="outline">
          Status
        </Badge>
      </CardContent>
    </Card>
  );
}
```

## Comunicação com API

### Padrão de Requisições
```jsx
// ✅ BOM - Padrão recomendado
const carregarDados = async () => {
  setLoading(true);
  try {
    const response = await axios.get('/api/endpoint/', {
      withCredentials: true  // OBRIGATÓRIO para CSRF
    });
    setDados(response.data);
    setErro(null);
  } catch (error) {
    console.error('Erro na requisição:', error);
    setErro('Falha ao carregar dados');
  } finally {
    setLoading(false);
  }
};
```

### Estados de Loading
```jsx
function ComponenteComLoading() {
  const [dados, setDados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Error state
  if (erro) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{erro}</AlertDescription>
      </Alert>
    );
  }

  // Success state
  return (
    <div>
      {/* Renderizar dados */}
    </div>
  );
}
```

## Responsividade

### Classes Tailwind Responsivas
```jsx
// Design mobile-first
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <Card className="p-4 sm:p-6">
    <CardTitle className="text-lg sm:text-xl md:text-2xl">
      Título Responsivo
    </CardTitle>
  </Card>
</div>

// Navegação responsiva
<nav className="hidden md:block">
  {/* Menu desktop */}
</nav>
<nav className="block md:hidden">
  {/* Menu mobile */}
</nav>
```

### Breakpoints Tailwind
- **sm**: 640px+
- **md**: 768px+
- **lg**: 1024px+
- **xl**: 1280px+
- **2xl**: 1536px+

## Build e Deploy

### Desenvolvimento
```bash
cd frontend
npm start           # Servidor de desenvolvimento (http://localhost:3000)
npm test           # Executar testes
npm run build      # Build para produção
```

### Produção
O build de produção é automaticamente:
1. Compilado pelo Railway
2. Servido pelo Django via WhiteNoise
3. Otimizado com compressão

### Configurações (package.json)
```json
{
  "name": "chegou-hub-frontend",
  "version": "0.1.0",
  "dependencies": {
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "react-router-dom": "^6.0.0",
    "axios": "^1.0.0",
    "@radix-ui/react-*": "^1.0.0",
    "tailwindcss": "^3.0.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "lucide-react": "^0.400.0",
    "tailwind-merge": "^2.0.0"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  }
}
```

## Problemas Comuns

### CORS Issues
```jsx
// ❌ Erro: "CORS policy: No 'Access-Control-Allow-Origin'"
// ✅ Solução: Sempre usar withCredentials
axios.get('/api/dados/', { withCredentials: true })
```

### CSRF Issues
```jsx
// ❌ Erro: "CSRF token missing"
// ✅ Solução: CSRFManager deve estar no App.js
<CSRFManager>
  <Router>
    {/* Sua aplicação */}
  </Router>
</CSRFManager>
```

### Routing Issues
```jsx
// ❌ Erro: Rotas não funcionam após build
// ✅ Solução: Configurar fallback no servidor
// Django já está configurado para servir index.html em rotas não encontradas
```

### Styling Issues
```jsx
// ❌ Erro: Classes Tailwind não aplicam
// ✅ Solução: Verificar se globals.css está importado em index.js
import './globals.css';
```

## Próximos Passos

1. 📱 Explore [Páginas do Sistema](pages/) - Documentação de cada página
2. 🧩 Veja [Componentes](components/) - Componentes importantes
3. 🔧 Entenda [Features Backend](../backend/features/) - APIs consumidas
4. 📖 Leia [Guias de Uso](../user-guides/) - Como usar cada funcionalidade

---

**Esta estrutura garante uma aplicação React moderna, performática e fácil de manter, com excelente experiência do usuário.**