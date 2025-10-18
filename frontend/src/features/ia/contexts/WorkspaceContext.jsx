import React, { createContext, useContext, useState, useEffect } from 'react';

const WorkspaceContext = createContext();

export function WorkspaceProvider({ children }) {
  const [selectedWorkspace, setSelectedWorkspace] = useState(() => {
    // Tentar recuperar do localStorage
    const saved = localStorage.getItem('nicochat_selected_workspace');
    return saved ? parseInt(saved) : null;
  });

  useEffect(() => {
    // Salvar no localStorage quando mudar
    if (selectedWorkspace) {
      localStorage.setItem('nicochat_selected_workspace', selectedWorkspace.toString());
    }
  }, [selectedWorkspace]);

  return (
    <WorkspaceContext.Provider value={{ selectedWorkspace, setSelectedWorkspace }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace deve ser usado dentro de WorkspaceProvider');
  }
  return context;
}
