import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  MessageSquare,
  LayoutDashboard,
  Settings,
  GitBranch,
  FileText
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { cn } from '../../lib/utils';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../../components/ui/breadcrumb';
import FeedbackButton from '../../components/FeedbackButton';
import FeedbackNotificationButton from '../../components/FeedbackNotificationButton';

// Mapeamento de breadcrumbs do Nicochat
const nicochatBreadcrumbMap = {
  '/workspace/nicochat/dashboard': [{ label: 'Nicochat', href: '#' }, { label: 'Dashboard' }],
  '/workspace/nicochat/configuracoes': [{ label: 'Nicochat', href: '#' }, { label: 'Configurações' }],
  '/workspace/nicochat/fluxos': [{ label: 'Nicochat', href: '#' }, { label: 'Fluxos' }],
  '/workspace/nicochat/templates': [{ label: 'Nicochat', href: '#' }, { label: 'Templates' }],
};

// Componente TabButton para navegação horizontal
function TabButton({ to, icon: Icon, isActive, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
        isActive
          ? "border-primary text-primary"
          : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
      )}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}

function NicochatLayout({ isAdmin = false }) {
  const location = useLocation();
  const navigate = useNavigate();

  // Obter breadcrumbs da página atual
  const currentBreadcrumbs = nicochatBreadcrumbMap[location.pathname] || [
    { label: 'Nicochat', href: '#' },
    { label: 'Dashboard' }
  ];

  // Menu items para navegação horizontal
  const menuItems = [
    {
      title: "Dashboard",
      path: "/workspace/nicochat/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Configurações",
      path: "/workspace/nicochat/configuracoes",
      icon: Settings,
    },
    {
      title: "Fluxos",
      path: "/workspace/nicochat/fluxos",
      icon: GitBranch,
    },
    {
      title: "Templates",
      path: "/workspace/nicochat/templates",
      icon: FileText,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header fixo */}
      <header className="sticky top-0 z-50 border-b bg-background">
        <div className="flex h-16 items-center gap-4 px-6">
          {/* Botão Voltar */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/workspace/agenda')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Voltar ao Hub</span>
          </Button>

          {/* Título */}
          <div className="flex items-center gap-2">
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-green-600">
              <MessageSquare className="size-4 text-white" />
            </div>
            <h1 className="text-xl font-semibold hidden sm:block">Nicochat</h1>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Breadcrumbs */}
          <Breadcrumb className="hidden md:block">
            <BreadcrumbList>
              {currentBreadcrumbs.map((crumb, index) => (
                <React.Fragment key={index}>
                  {index > 0 && <BreadcrumbSeparator />}
                  <BreadcrumbItem>
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

          {/* Botões de ação */}
          <div className="flex items-center gap-2">
            <FeedbackNotificationButton isAdmin={isAdmin} />
            <FeedbackButton />
          </div>
        </div>

        {/* Tabs de navegação horizontal */}
        <div className="border-t overflow-x-auto">
          <nav className="flex gap-1 px-6 min-w-max">
            {menuItems.map((item) => (
              <TabButton
                key={item.path}
                to={item.path}
                icon={item.icon}
                isActive={location.pathname === item.path}
                onClick={() => navigate(item.path)}
              >
                {item.title}
              </TabButton>
            ))}
          </nav>
        </div>
      </header>

      {/* Conteúdo principal */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}

export default NicochatLayout;
