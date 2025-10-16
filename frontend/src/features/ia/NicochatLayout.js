import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { NicochatSidebar } from './components/NicochatSidebar';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../../components/ui/breadcrumb';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '../../components/ui/sidebar';

// Mapeamento de breadcrumbs do Nicochat
const nicochatBreadcrumbMap = {
  '/workspace/nicochat/dashboard': [{ label: 'Nicochat', href: '#' }, { label: 'Dashboard' }],
  '/workspace/nicochat/configuracoes': [{ label: 'Nicochat', href: '#' }, { label: 'Configurações' }],
  '/workspace/nicochat/fluxos': [{ label: 'Nicochat', href: '#' }, { label: 'Fluxos' }],
  '/workspace/nicochat/templates': [{ label: 'Nicochat', href: '#' }, { label: 'Templates' }],
};

function NicochatLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  // Obter breadcrumbs da página atual
  const currentBreadcrumbs = nicochatBreadcrumbMap[location.pathname] || [
    { label: 'Nicochat', href: '#' },
    { label: 'Dashboard' }
  ];

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <NicochatSidebar
          navigate={navigate}
          location={location}
        />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
            <SidebarTrigger className="-ml-1" />
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

          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

export default NicochatLayout;
