import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { AppSidebar } from '../components/app-sidebar';
import AdminRoute from '../components/AdminRoute';
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
import LogsPage from '../features/ia/LogsPage';
import OpenAIAnalytics from '../features/ia/OpenAIAnalytics';
import PrimecodPage from '../features/metricas/PrimecodPage';
import EcomhubPage from '../features/metricas/EcomhubPage';
import EcomhubEfetividadeV2Page from '../features/metricas/EcomhubEfetividadeV2Page';
import DropiPage from '../features/metricas/DropiPage';
import N1ItaliaPage from '../features/metricas/N1ItaliaPage';
import EcomhubStatusPage from '../features/status/EcomhubStatusPage';
import EcomhubConfigPage from '../features/ecomhub/EcomhubConfigPage';
import EngajamentoPage from '../features/engajamento/EngajamentoPage';
import NoveltiesPage from '../features/novelties/NoveltiesPage';
import ProcessamentoPage from '../features/processamento/ProcessamentoPage';
import DetectorIPPage from '../features/processamento/DetectorIPPage';
import ControleEstoquePage from '../features/estoque/ControleEstoquePage';
import FeedbackButton from '../components/FeedbackButton';
import FeedbackNotificationButton from '../components/FeedbackNotificationButton';
import SimpleN8nWidget from '../components/SimpleN8nWidget';

// Mapeamento de breadcrumbs simplificado
const breadcrumbMap = {
  '/workspace/agenda': [{ label: 'HOME', href: '#' }, { label: 'Agenda da Empresa' }],
  '/workspace/mapa': [{ label: 'HOME', href: '#' }, { label: 'Mapa de Atuação' }],
  '/workspace/projetos': [{ label: 'IA & Automações', href: '#' }, { label: 'Projetos' }],
  '/workspace/logs': [{ label: 'IA & Automações', href: '#' }, { label: 'Logs de Erros' }],
  '/workspace/openai-analytics': [{ label: 'IA & Automações', href: '#' }, { label: 'OpenAI Analytics' }],
  '/workspace/metricas/primecod': [{ label: 'Efetividade', href: '#' }, { label: 'PRIMECOD' }],
  '/workspace/metricas/ecomhub': [{ label: 'ECOMHUB', href: '#' }, { label: 'Efetividade' }],
  '/workspace/metricas/ecomhub-v2': [{ label: 'ECOMHUB', href: '#' }, { label: 'Efetividade V2' }],
  '/workspace/metricas/dropi': [{ label: 'Efetividade', href: '#' }, { label: 'Dropi' }],
  '/workspace/metricas/n1italia': [{ label: 'Efetividade', href: '#' }, { label: 'N1 Itália' }],
  '/workspace/status/ecomhub': [{ label: 'ECOMHUB', href: '#' }, { label: 'Status' }],
  '/workspace/ecomhub/configuracoes': [{ label: 'ECOMHUB', href: '#' }, { label: 'Configurações' }],
  '/workspace/engajamento': [{ label: 'Operacional', href: '#' }, { label: 'Engajamento' }],
  '/workspace/novelties': [{ label: 'Operacional', href: '#' }, { label: 'Novelties' }],
  '/workspace/processamento': [{ label: 'Suporte', href: '#' }, { label: 'Processamento' }],
  '/workspace/detector-ip': [{ label: 'Suporte', href: '#' }, { label: 'Detector de IP' }],
  '/workspace/estoque': [{ label: 'Suporte', href: '#' }, { label: 'Controle de Estoque' }],
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
            <div className="ml-auto flex items-center gap-2">
              <FeedbackNotificationButton isAdmin={userData?.isAdmin} />
              <FeedbackButton />
            </div>
          </header>
          
          <main className="flex-1 overflow-auto p-4 max-w-full">
            <Routes>
              <Route path="agenda" element={<AgendaPage />} />
              <Route path="mapa" element={<MapaPage />} />
              <Route path="projetos" element={<ProjetoDashboard />} />
              <Route path="logs" element={<LogsPage />} />
              <Route path="openai-analytics" element={<AdminRoute><OpenAIAnalytics /></AdminRoute>} />
              <Route path="metricas/primecod" element={<AdminRoute><PrimecodPage /></AdminRoute>} />
              <Route path="metricas/ecomhub" element={<EcomhubPage />} />
              <Route path="metricas/ecomhub-v2" element={<EcomhubEfetividadeV2Page />} />
              <Route path="metricas/dropi" element={<AdminRoute><DropiPage /></AdminRoute>} />
              <Route path="metricas/n1italia" element={<N1ItaliaPage />} />
              <Route path="status/ecomhub" element={<EcomhubStatusPage />} />
              <Route path="ecomhub/configuracoes" element={<EcomhubConfigPage />} />
              <Route path="engajamento" element={<EngajamentoPage />} />
              <Route path="novelties" element={<NoveltiesPage />} />
              <Route path="processamento" element={<ProcessamentoPage />} />
              <Route path="detector-ip" element={<DetectorIPPage />} />
              <Route path="estoque" element={<ControleEstoquePage />} />
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

        {/* N8n Chat Widget - assistente IA SEMPRE VISÍVEL */}
        <SimpleN8nWidget />
      </div>
    </SidebarProvider>
  );
}

export default WorkspacePage;