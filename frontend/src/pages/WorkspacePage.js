import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { AppSidebar } from '../components/app-sidebar';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../components/ui/breadcrumb';
import { Separator } from '../components/ui/separator';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '../components/ui/sidebar';
import axios from 'axios';

// Importar as páginas  
import AgendaPage from '../features/agenda/AgendaPage';
import MapaPage from '../features/mapa/MapaPage';
import ProjetoDashboard from '../features/ia/ProjetoDashboard';
import RelatoriosProjetos from '../features/ia/RelatoriosProjetos';
import LogsPage from '../features/ia/LogsPage';
import NicochatPage from '../features/ia/NicochatPage';
import N8NPage from '../features/ia/N8NPage';
import PrimecodPage from '../features/metricas/PrimecodPage';
import EcomhubPage from '../features/metricas/EcomhubPage';
import DropiPage from '../features/metricas/DropiPage';
import EngajamentoPage from '../features/engajamento/EngajamentoPage';
import NoveltiesPage from '../features/novelties/NoveltiesPage';
import ProcessamentoPage from '../features/processamento/ProcessamentoPage';

// Mapeamento de breadcrumbs simplificado
const breadcrumbMap = {
  '/workspace/agenda': [{ label: 'HOME', href: '#' }, { label: 'Agenda da Empresa' }],
  '/workspace/mapa': [{ label: 'HOME', href: '#' }, { label: 'Mapa de Atuação' }],
  '/workspace/projetos': [{ label: 'IA & Automações', href: '#' }, { label: 'Projetos' }],
  '/workspace/relatorios': [{ label: 'IA & Automações', href: '#' }, { label: 'Relatórios' }],
  '/workspace/logs': [{ label: 'IA & Automações', href: '#' }, { label: 'Logs de Erros' }],
  '/workspace/nicochat': [{ label: 'IA & Automações', href: '#' }, { label: 'Nicochat' }],
  '/workspace/n8n': [{ label: 'IA & Automações', href: '#' }, { label: 'N8N' }],
  '/workspace/metricas/primecod': [{ label: 'Métricas', href: '#' }, { label: 'PRIMECOD' }],
  '/workspace/metricas/ecomhub': [{ label: 'Métricas', href: '#' }, { label: 'ECOMHUB' }],
  '/workspace/metricas/dropi': [{ label: 'Métricas', href: '#' }, { label: 'DROPI MX' }],
  '/workspace/engajamento': [{ label: 'Operacional', href: '#' }, { label: 'Engajamento' }],
  '/workspace/novelties': [{ label: 'Operacional', href: '#' }, { label: 'Novelties' }],
  '/workspace/processamento': [{ label: 'Suporte', href: '#' }, { label: 'Processamento' }],
  '/workspace/suporte': [{ label: 'Suporte', href: '#' }, { label: 'Suporte' }]
};

function WorkspacePage({ setIsLoggedIn }) {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await axios.get('/current-state/', { withCredentials: true });
        
        if (response.data.logged_in) {
          console.log('Dados do usuário:', response.data);
          setUserData({
            name: response.data.user_name || response.data.name || 'Usuário',
            email: response.data.user_email || response.data.email || '',
            isAdmin: response.data.is_admin || false
          });
        } else {
          setIsLoggedIn(false);
        }
      } catch (error) {
        console.error('Erro ao buscar dados do usuário:', error);
        setIsLoggedIn(false);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [setIsLoggedIn]);

  const handleLogout = async () => {
    try {
      await axios.post('/logout/', {}, { withCredentials: true });
      setIsLoggedIn(false);
    } catch (error) {
      console.error('Erro no logout:', error);
      setIsLoggedIn(false);
    }
  };

  // Obter breadcrumbs da página atual
  const currentBreadcrumbs = breadcrumbMap[location.pathname] || [{ label: 'Workspace' }];

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar 
          userName={userData?.name}
          userEmail={userData?.email}
          onLogout={handleLogout}
          isAdmin={userData?.isAdmin}
          navigate={navigate}
          location={location}
        />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
            <Breadcrumb>
              <BreadcrumbList>
                {currentBreadcrumbs.map((crumb, index) => (
                  <React.Fragment key={index}>
                    {index > 0 && <BreadcrumbSeparator className="hidden md:block" />}
                    <BreadcrumbItem className={index === 0 ? "hidden md:block" : ""}>
                      {crumb.href ? (
                        <BreadcrumbLink href={crumb.href}>
                          {crumb.label}
                        </BreadcrumbLink>
                      ) : (
                        <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                      )}
                    </BreadcrumbItem>
                  </React.Fragment>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          </header>
          
          <main className="flex-1 overflow-auto p-4">
            <Routes>
              <Route path="agenda" element={<AgendaPage />} />
              <Route path="mapa" element={<MapaPage />} />
              <Route path="projetos" element={<ProjetoDashboard />} />
              <Route path="relatorios" element={<RelatoriosProjetos />} />
              <Route path="logs" element={<LogsPage />} />
              <Route path="nicochat" element={<NicochatPage />} />
              <Route path="n8n" element={<N8NPage />} />
              <Route path="metricas/primecod" element={<PrimecodPage />} />
              <Route path="metricas/ecomhub" element={<EcomhubPage />} />
              <Route path="metricas/dropi" element={<DropiPage />} />
              <Route path="engajamento" element={<EngajamentoPage />} />
              <Route path="novelties" element={<NoveltiesPage />} />
              <Route path="processamento" element={<ProcessamentoPage />} />
              <Route path="*" element={
                <div className="flex h-full items-center justify-center">
                  <div className="text-center">
                    <h2 className="text-2xl font-bold">Bem-vindo ao Chegou Hub</h2>
                    <p className="text-muted-foreground">Selecione uma opção na barra lateral</p>
                  </div>
                </div>
              } />
            </Routes>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

export default WorkspacePage;