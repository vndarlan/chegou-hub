// frontend/src/pages/NicochatPage.js
import React from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { MessageSquare, LayoutDashboard, Home, Settings, BarChart3 } from 'lucide-react';

// shadcn/ui imports
import { Button } from '../components/ui/button';
import { ScrollArea } from '../components/ui/scroll-area';

// Importar páginas
import NicochatDashboard from '../features/ia/NicochatDashboard';
import NicochatConfigPage from '../features/ia/NicochatConfigPage';
import NicochatMetricasPage from '../features/ia/NicochatMetricasPage';

function NicochatPage() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar lateral fixa */}
      <aside className="w-64 border-r bg-card flex flex-col">
        {/* Header da Sidebar */}
        <div className="p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-green-600">
              <MessageSquare className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Nicochat</h1>
              <p className="text-xs text-muted-foreground">WhatsApp Business</p>
            </div>
          </div>
        </div>

        {/* Navegação vertical */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-2">
            <Button
              variant={location.pathname === '/nicochat/dashboard' ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => navigate('/nicochat/dashboard')}
            >
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
            <Button
              variant={location.pathname === '/nicochat/config' ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => navigate('/nicochat/config')}
            >
              <Settings className="mr-2 h-4 w-4" />
              Configuração
            </Button>
            <Button
              variant={location.pathname === '/nicochat/metricas' ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => navigate('/nicochat/metricas')}
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              Métricas
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
        <Routes>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<NicochatDashboard />} />
          <Route path="config" element={<NicochatConfigPage />} />
          <Route path="metricas" element={<NicochatMetricasPage />} />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default NicochatPage;
