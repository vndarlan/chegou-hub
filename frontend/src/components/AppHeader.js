// frontend/src/components/AppHeader.js
import React from 'react';
import ThemeToggle from './ThemeToggle';

function AppHeader() {
  return (
    <header className="h-16 px-6 border-b border-border bg-background">
      <div className="flex justify-between items-center h-full">
        <div className="flex items-center gap-4">
          {/* Logo e outros itens do lado esquerdo */}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Outros botões/controles do cabeçalho */}
          <ThemeToggle /> {/* Adicione o botão de alternância aqui */}
        </div>
      </div>
    </header>
  );
}

export default AppHeader;