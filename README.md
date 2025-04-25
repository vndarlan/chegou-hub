## Resumo do Projeto: Portal Interno "Grupo Chegou" (Estado Atualizado)

**1. Objetivo:**

Criar um portal web interno e totalmente personalizado para a empresa "Grupo Chegou". Este portal visa centralizar diversas aplicações e ferramentas internas, oferecendo uma interface unificada e moderna para diferentes times.

**2. Tecnologias Utilizadas:**

*   **Back-end:** Python com o framework **Django**.
    *   **API:** Django REST Framework (DRF) para endpoints (`/api/login/`, `/api/logout/`, `/api/current-state/`, `/api/register/`).
    *   **Autenticação:** Utiliza `django.contrib.auth` (`User`, `Group`, `authenticate`, `login`, `logout`). Usuários são criados como inativos (`is_active=False`) via API de registro e requerem ativação manual pelo administrador através da interface do Django Admin (`/admin/`).
    *   **Autorização (Base):** Utiliza `django.contrib.auth.Group` para representar os "Times" da empresa (Diretoria, IA & Automação, etc.). Novos usuários são associados ao grupo selecionado no registro. (Verificação de permissões por página ainda pendente).
    *   **Sessões:** Mecanismo de sessão padrão do Django (backend de banco de dados - SQLite) para gerenciar o estado de login.
    *   **CORS:** `django-cors-headers` configurado para permitir requisições do front-end (`localhost:3000`).
*   **Front-end:** JavaScript com a biblioteca **React**.
    *   **UI Kit:** **Mantine UI** (`@mantine/core`, `@mantine/hooks`, etc.) para componentes, layout e theming. Estilização via **CSS Modules**.
    *   **Ícones:** **Tabler Icons** (`@tabler/icons-react`).
    *   **Mapas:** **React Leaflet** (`react-leaflet`, `leaflet`) para renderização de mapas interativos (Página Mapa).
    *   **Animação (Login):** **tsParticles** (`react-tsparticles`, `tsparticles-slim`) para fundo animado.
    *   **Criação:** `create-react-app`.
    *   **Roteamento:** `react-router-dom` (v6+) para gerenciar a navegação. Roteamento principal em `App.js`, com **rotas aninhadas** definidas e renderizadas dentro de `WorkspacePage.js` para o conteúdo das páginas internas.
    *   **Requisições HTTP:** `axios` para chamadas à API Django (com `withCredentials: true` para envio de cookies de sessão).
    *   **Gerenciamento de Estado (Básico):** Estado local (useState) e passagem de props (`isLoggedIn`, `setIsLoggedIn`).
*   **Banco de Dados (Desenvolvimento):** SQLite (padrão Django).
*   **Banco de Dados (Planejado):** PostgreSQL.
*   **Hospedagem (Planejada):** Railway.
*   **Comunicação:** API RESTful (JSON sobre HTTP).

**3. Estrutura do Projeto:**

*   `backend/`: Projeto Django (`config`, `core`, `manage.py`, etc.).
    *   `core/views.py`: Contém as APIViews para registro, login, logout e estado atual.
    *   `core/admin.py`: Configura a exibição do modelo `User` no Django Admin para facilitar ativação.
*   `frontend/`: Projeto React (`create-react-app`).
    *   `public/`: Arquivos estáticos (`index.html`, favicon, manifest). Favicon e título da aba personalizados.
    *   `src/`: Código fonte.
        *   `components/`: Componentes reutilizáveis.
            *   `NavbarNested/`: Layout de navegação lateral (`NavbarNested.js`, `LinksGroup.js`, `UserButton.js`, `Logo.js`, CSS Modules).
        *   `pages/`: Componentes de página de nível superior (`LoginPage.js`, `WorkspacePage.js`, `MapaPage.js`, `AgendaPage.js`).
        *   `App.js`: Componente principal (Router, MantineProvider, estado global `isLoggedIn`, rotas principais).
        *   `index.js`: Ponto de entrada.
    *   `package.json`: Dependências e scripts.

**4. Funcionalidade Atual Implementada (Fluxo):**

1.  **Registro:**
    *   Usuário acessa `/login`, clica em "Crie uma aqui".
    *   Preenche Nome Completo, Email, Time (selecionado de lista), Senha.
    *   Submissão chama `POST /api/register/`.
    *   Backend cria `User` com `is_active=False` e o associa ao `Group` correspondente ao Time.
    *   Frontend exibe notificação "Conta criada! Em breve vamos confirmar seu acesso..." e permanece na tela de registro (ou volta para login).
2.  **Aprovação:**
    *   Administrador acessa `/admin/` com conta superusuário.
    *   Navega até a lista de "Users".
    *   Encontra o usuário pendente (coluna "ACTIVE" desmarcada).
    *   Clica no usuário, marca a caixa "Active" e salva.
3.  **Login:**
    *   Usuário (após aprovação) acessa `/login`.
    *   Preenche Email e Senha.
    *   Submissão chama `POST /api/login/`.
    *   Backend usa `authenticate` (verifica email, senha e `is_active=True`).
    *   Se válido, `login` cria a sessão Django.
    *   Frontend (`App.js`) detecta a sessão via `/api/current-state/`, define `isLoggedIn=true` e redireciona para `/workspace`.
4.  **Workspace (`/workspace/*`):**
    *   Layout principal com `NavbarNested` à esquerda e área de conteúdo à direita.
    *   **Barra de Navegação (`NavbarNested`):**
        *   Exibe itens definidos (Agenda, Mapa, ADS, etc.).
        *   Itens com `link` direto (Agenda, Mapa) navegam usando `useNavigate` (via `LinksGroup`).
        *   Itens com `links` (ADS, etc.) são expansíveis.
        *   Destaque visual do item ativo é baseado na URL atual (`useLocation`).
        *   Botão para recolher/expandir a barra.
        *   Rodapé contém `UserButton`.
    *   **Botão de Usuário (`UserButton`):**
        *   Exibe Avatar, Nome Completo e Email do usuário (vindo de `/api/current-state/`).
        *   Clicável, abre um `Menu` Mantine com a opção "Logout".
    *   **Logout:**
        *   Opção no `UserButton` chama `handleLogout` em `WorkspacePage`.
        *   `handleLogout` chama `POST /api/logout/` (backend usa `django.contrib.auth.logout`).
        *   Frontend define `isLoggedIn=false` (em `App.js`), causando redirecionamento para `/login`.
    *   **Área de Conteúdo:**
        *   Gerenciada por `<Routes>` aninhadas dentro de `WorkspacePage.js`.
        *   Renderiza o componente da página correspondente à rota atual (ex: `/workspace/agenda` renderiza `AgendaPage`, `/workspace/mapa` renderiza `MapaPage`, outras rotas renderizam `PlaceholderPage`).
5.  **Página Agenda (`/workspace/agenda`):**
    *   Interface com abas (Visualizar/Gerenciar) usando Mantine `Tabs`.
    *   Visualizar: Permite selecionar um calendário (de uma lista mantida no estado React) ou ver todos combinados em um `<iframe>` do Google Calendar.
    *   Gerenciar: Permite adicionar/remover entradas de nome/email de calendário (dados atualmente armazenados e manipulados apenas no estado do componente React).
6.  **Página Mapa (`/workspace/mapa`):**
    *   Renderiza um mapa usando `react-leaflet`.
    *   Busca dados GeoJSON de países de uma URL externa.
    *   Colore os países e adiciona marcadores com base em dados definidos estaticamente no código (`COUNTRY_DATA`, `COUNTRY_COORDINATES`).
    *   Exibe legenda e listas de países por status.

**5. Como Rodar o Projeto (Ambiente de Desenvolvimento Atual):**

1.  **Terminal 1 (Back-end):** `cd backend`, `.\venv\Scripts\Activate.ps1` (ou `source venv/bin/activate`), `python manage.py runserver`. (Acessar `/admin/` em `http://localhost:8000/admin/` para gerenciar usuários/grupos).
2.  **Terminal 2 (Front-end):** `cd frontend`, `npm start`. (Acessar aplicação em `http://localhost:3000`).
3.  **Nota:** Para testar fluxo de usuário normal vs. admin, usar navegadores diferentes ou janelas anônimas para evitar conflito de sessão.

**6. Próximos Passos / Tarefas Pendentes:**

1.  **Persistência da Agenda:**
    *   **Back-end:** Criar Model (`Calendario`), Serializer (DRF) e Views/APIs no Django para CRUD (Create, Read, Update, Delete) de entradas da agenda.
    *   **Front-end:** Modificar `AgendaPage.js` para buscar/salvar/deletar dados via chamadas `axios` para a nova API, em vez de usar o estado local.
2.  **Implementação do Conteúdo das Páginas Restantes (ADS, Operacional, etc.):**
    *   Criar componentes React específicos para cada página/subpágina.
    *   Atualizar `WorkspacePage.js` para rotear para esses novos componentes.
    *   **Back-end:** Definir Models, Serializers e APIs necessárias para os dados de cada seção.
    *   Implementar chamadas `axios` nos componentes React.
    *   Usar componentes Mantine para exibir/interagir com os dados.
3.  **Configuração do Banco de Dados (PostgreSQL):**
    *   Configurar `settings.py` para PostgreSQL.
    *   Executar `python manage.py migrate`.
4.  **Refinamentos de UI/UX:** Adicionar logo real, melhorar placeholders/loading states, ajustar theming.
5.  **Error Handling e Feedback:** Melhorar tratamento de erros da API no frontend, feedback visual mais claro.
6.  **Testes:** Escrever testes unitários/integração (backend e frontend).
7.  **Deployment (Railway):** Configurar ambiente de produção.
8.  **(Opcional) Tarefas em Background (Celery):** Avaliar necessidade.
9. **(Opcional) Gerenciamento de Estado Avançado (Context/Zustand/Redux):** Avaliar se a complexidade aumenta.


---

**5. **Como Rodar o Projeto (Ambiente de Desenvolvimento Atual):**

1. **Abrir Terminal 1 (Back-end):**
    
    - Navegar para grupo_chegou_project/backend/.
        
    - (PowerShell) Ajustar política: Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process
        
    - Ativar ambiente virtual: .\ven\Scripts\Activate.ps1
        
    - Iniciar servidor Django: python manage.py runserver (Rodará em http://localhost:8000)
        
2. **Abrir Terminal 2 (Front-end):**
    
    - Navegar para grupo_chegou_project/frontend/.
        
    - (PowerShell) Ajustar política (se for uma nova janela): Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process
        
    - Iniciar servidor React: npm start (Rodará e abrirá http://localhost:3000 no navegador)
        
3. **Acessar:** Usar http://localhost:3000 no navegador.
