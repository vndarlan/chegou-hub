// frontend/src/pages/NicochatPage.js
import React from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { MessageSquare, Home, Settings, BarChart3, Shield, AlertTriangle, Layers } from 'lucide-react';

// shadcn/ui imports
import { Button } from '../components/ui/button';
import { ScrollArea } from '../components/ui/scroll-area';

// Context
import { WorkspaceProvider, useWorkspace } from '../features/ia/contexts/WorkspaceContext';

// Components
import WorkspaceSelector from '../features/ia/components/WorkspaceSelector';

// Páginas
import NicochatMetricasPage from '../features/ia/NicochatMetricasPage';
import NicochatQualidadeContaPage from '../features/ia/NicochatQualidadeContaPage';
import NicochatWorkspacesPage from '../features/ia/NicochatWorkspacesPage';
import NicochatErrorLogsPage from '../features/ia/NicochatErrorLogsPage';
import NicochatEstruturaPage from '../features/ia/NicochatEstruturaPage';

function NicochatPageContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedWorkspace, setSelectedWorkspace } = useWorkspace();

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar lateral fixa */}
      <aside className="w-64 border-r bg-card flex flex-col">
        {/* Header da Sidebar */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-center">
            <div className="bg-[#3B4D9B] rounded-lg px-4 py-3 shadow-md">
              <div className="text-white">
                <div className="bg-white rounded px-2 py-1 inline-block mb-1">
                  <span className="text-[#3B4D9B] font-bold text-lg">Nico</span>
                </div>
                <div className="text-white font-bold text-2xl leading-tight">
                  Chat
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navegação vertical */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-2">
            <Button
              variant="ghost"
              className={`w-full justify-start ${
                location.pathname === '/nicochat/metricas'
                  ? 'bg-orange-500 hover:bg-orange-600 text-white'
                  : ''
              }`}
              onClick={() => navigate('/nicochat/metricas')}
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              Métricas
            </Button>
            <Button
              variant="ghost"
              className={`w-full justify-start ${
                location.pathname === '/nicochat/estrutura'
                  ? 'bg-orange-500 hover:bg-orange-600 text-white'
                  : ''
              }`}
              onClick={() => navigate('/nicochat/estrutura')}
            >
              <Layers className="mr-2 h-4 w-4" />
              Estrutura
            </Button>
            <Button
              variant="ghost"
              className={`w-full justify-start ${
                location.pathname === '/nicochat/qualidade-conta'
                  ? 'bg-orange-500 hover:bg-orange-600 text-white'
                  : ''
              }`}
              onClick={() => navigate('/nicochat/qualidade-conta')}
            >
              <Shield className="mr-2 h-4 w-4" />
              Qualidade da Conta
            </Button>
            <Button
              variant="ghost"
              className={`w-full justify-start ${
                location.pathname === '/nicochat/error-logs'
                  ? 'bg-orange-500 hover:bg-orange-600 text-white'
                  : ''
              }`}
              onClick={() => navigate('/nicochat/error-logs')}
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              Log de Erros
            </Button>
            <Button
              variant="ghost"
              className={`w-full justify-start ${
                location.pathname === '/nicochat/workspaces'
                  ? 'bg-orange-500 hover:bg-orange-600 text-white'
                  : ''
              }`}
              onClick={() => navigate('/nicochat/workspaces')}
            >
              <Settings className="mr-2 h-4 w-4" />
              Workspaces
            </Button>
          </div>
        </ScrollArea>

        {/* Footer com botão voltar */}
        <div className="p-4 border-t">
          <Button
            variant="outline"
            className="w-full justify-start hover:bg-accent hover:text-accent-foreground transition-colors"
            onClick={() => navigate('/workspace/agenda')}
          >
            <Home className="mr-2 h-4 w-4" />
            Voltar ao Hub
          </Button>
        </div>
      </aside>

      {/* Área de conteúdo principal */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Barra superior com Workspace Selector */}
        <div className="border-b bg-card p-4">
          <div className="max-w-7xl mx-auto">
            <WorkspaceSelector
              value={selectedWorkspace}
              onChange={setSelectedWorkspace}
              showLimiteAlert={true}
            />
          </div>
        </div>

        {/* Conteúdo das páginas */}
        <div className="flex-1 overflow-y-auto">
          <Routes>
            <Route index element={<Navigate to="metricas" replace />} />
            <Route path="metricas" element={<NicochatMetricasPage />} />
            <Route path="estrutura" element={<NicochatEstruturaPage />} />
            <Route path="qualidade-conta" element={<NicochatQualidadeContaPage />} />
            <Route path="error-logs" element={<NicochatErrorLogsPage />} />
            <Route path="workspaces" element={<NicochatWorkspacesPage />} />
            <Route path="*" element={<Navigate to="metricas" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

function NicochatPage() {
  return (
    <WorkspaceProvider>
      <NicochatPageContent />
    </WorkspaceProvider>
  );
}

export default NicochatPage;
