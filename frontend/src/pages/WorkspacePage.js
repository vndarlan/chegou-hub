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

// Mapeamento de breadcrumbs atualizado
const breadcrumbMap = {
  // GESTÃO EMPRESARIAL
  '/gestao/agenda': [{ label: 'GESTÃO EMPRESARIAL', href: '#' }, { label: 'Agenda da Empresa' }],
  '/gestao/mapa': [{ label: 'GESTÃO EMPRESARIAL', href: '#' }, { label: 'Mapa de Atuação' }],

  // FORNECEDORES > EUROPA
  '/fornecedores/europa/ecomhub/efetividade': [
    { label: 'FORNECEDORES', href: '#' },
    { label: 'EUROPA', href: '#' },
    { label: 'ECOMHUB', href: '#' },
    { label: 'Análise de Efetividade' }
  ],
  '/fornecedores/europa/ecomhub/efetividade-v2': [
    { label: 'FORNECEDORES', href: '#' },
    { label: 'EUROPA', href: '#' },
    { label: 'ECOMHUB', href: '#' },
    { label: 'Análise Avançada V2' }
  ],
  '/fornecedores/europa/ecomhub/status': [
    { label: 'FORNECEDORES', href: '#' },
    { label: 'EUROPA', href: '#' },
    { label: 'ECOMHUB', href: '#' },
    { label: 'Status Tracking' }
  ],
  '/fornecedores/europa/ecomhub/configuracoes': [
    { label: 'FORNECEDORES', href: '#' },
    { label: 'EUROPA', href: '#' },
    { label: 'ECOMHUB', href: '#' },
    { label: 'Configurações' }
  ],
  '/fornecedores/europa/n1/efetividade': [
    { label: 'FORNECEDORES', href: '#' },
    { label: 'EUROPA', href: '#' },
    { label: 'N1', href: '#' },
    { label: 'Efetividade' }
  ],
  '/fornecedores/europa/primecod/efetividade': [
    { label: 'FORNECEDORES', href: '#' },
    { label: 'EUROPA', href: '#' },
    { label: 'PRIMECOD', href: '#' },
    { label: 'Efetividade' }
  ],

  // FORNECEDORES > LATAM
  '/fornecedores/latam/dropi/efetividade': [
    { label: 'FORNECEDORES', href: '#' },
    { label: 'LATAM', href: '#' },
    { label: 'DROPI', href: '#' },
    { label: 'Efetividade' }
  ],
  '/fornecedores/latam/dropi/novelties': [
    { label: 'FORNECEDORES', href: '#' },
    { label: 'LATAM', href: '#' },
    { label: 'DROPI', href: '#' },
    { label: 'Novelties' }
  ],

  // SHOPIFY
  '/shopify/estoque': [{ label: 'SHOPIFY', href: '#' }, { label: 'Controle de Estoque' }],
  '/shopify/processamento': [{ label: 'SHOPIFY', href: '#' }, { label: 'Pedidos Duplicados' }],
  '/shopify/detector-ip': [{ label: 'SHOPIFY', href: '#' }, { label: 'Detector de IP' }],

  // PLATAFORMAS DE ANÚNCIO
  '/anuncios/facebook/engajamento': [
    { label: 'PLATAFORMAS DE ANÚNCIO', href: '#' },
    { label: 'Facebook', href: '#' },
    { label: 'Engajamento' }
  ],

  // IA & CHATBOTS
  '/ia/nicochat': [{ label: 'IA & CHATBOTS', href: '#' }, { label: 'Nicochat' }],

  // FERRAMENTAS INTERNAS
  '/interno/projetos': [{ label: 'FERRAMENTAS INTERNAS', href: '#' }, { label: 'Projetos' }],
  '/interno/logs': [{ label: 'FERRAMENTAS INTERNAS', href: '#' }, { label: 'Logs de Erros' }],
  '/interno/openai-analytics': [{ label: 'FERRAMENTAS INTERNAS', href: '#' }, { label: 'OpenAI Analytics' }],

  // Nicochat
  '/nicochat': [{ label: 'IA & CHATBOTS', href: '#' }, { label: 'Nicochat' }],
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
              {/* GESTÃO EMPRESARIAL */}
              <Route path="gestao/agenda" element={<AgendaPage />} />
              <Route path="gestao/mapa" element={<MapaPage />} />

              {/* FORNECEDORES > EUROPA */}
              <Route path="fornecedores/europa/ecomhub/efetividade" element={<EcomhubPage />} />
              <Route path="fornecedores/europa/ecomhub/efetividade-v2" element={<EcomhubEfetividadeV2Page />} />
              <Route path="fornecedores/europa/ecomhub/status" element={<EcomhubStatusPage />} />
              <Route path="fornecedores/europa/ecomhub/configuracoes" element={<EcomhubConfigPage />} />
              <Route path="fornecedores/europa/n1/efetividade" element={<N1ItaliaPage />} />
              <Route path="fornecedores/europa/primecod/efetividade" element={<AdminRoute><PrimecodPage /></AdminRoute>} />

              {/* FORNECEDORES > LATAM */}
              <Route path="fornecedores/latam/dropi/efetividade" element={<AdminRoute><DropiPage /></AdminRoute>} />
              <Route path="fornecedores/latam/dropi/novelties" element={<NoveltiesPage />} />

              {/* SHOPIFY */}
              <Route path="shopify/estoque" element={<ControleEstoquePage />} />
              <Route path="shopify/processamento" element={<ProcessamentoPage />} />
              <Route path="shopify/detector-ip" element={<DetectorIPPage />} />

              {/* PLATAFORMAS DE ANÚNCIO */}
              <Route path="anuncios/facebook/engajamento" element={<EngajamentoPage />} />

              {/* IA & CHATBOTS */}
              <Route path="ia/nicochat" element={<Navigate to="/nicochat" replace />} />

              {/* FERRAMENTAS INTERNAS */}
              <Route path="interno/projetos" element={<ProjetoDashboard />} />
              <Route path="interno/logs" element={<LogsPage />} />
              <Route path="interno/openai-analytics" element={<AdminRoute><OpenAIAnalytics /></AdminRoute>} />

              {/* REDIRECTS - Rotas antigas para novas */}
              <Route path="agenda" element={<Navigate to="/gestao/agenda" replace />} />
              <Route path="mapa" element={<Navigate to="/gestao/mapa" replace />} />
              <Route path="metricas/ecomhub" element={<Navigate to="/fornecedores/europa/ecomhub/efetividade" replace />} />
              <Route path="metricas/ecomhub-v2" element={<Navigate to="/fornecedores/europa/ecomhub/efetividade-v2" replace />} />
              <Route path="status/ecomhub" element={<Navigate to="/fornecedores/europa/ecomhub/status" replace />} />
              <Route path="ecomhub/configuracoes" element={<Navigate to="/fornecedores/europa/ecomhub/configuracoes" replace />} />
              <Route path="metricas/n1italia" element={<Navigate to="/fornecedores/europa/n1/efetividade" replace />} />
              <Route path="metricas/primecod" element={<Navigate to="/fornecedores/europa/primecod/efetividade" replace />} />
              <Route path="metricas/dropi" element={<Navigate to="/fornecedores/latam/dropi/efetividade" replace />} />
              <Route path="novelties" element={<Navigate to="/fornecedores/latam/dropi/novelties" replace />} />
              <Route path="estoque" element={<Navigate to="/shopify/estoque" replace />} />
              <Route path="processamento" element={<Navigate to="/shopify/processamento" replace />} />
              <Route path="detector-ip" element={<Navigate to="/shopify/detector-ip" replace />} />
              <Route path="engajamento" element={<Navigate to="/anuncios/facebook/engajamento" replace />} />
              <Route path="projetos" element={<Navigate to="/interno/projetos" replace />} />
              <Route path="logs" element={<Navigate to="/interno/logs" replace />} />
              <Route path="openai-analytics" element={<Navigate to="/interno/openai-analytics" replace />} />

              {/* Página padrão */}
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