import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const WorkspaceContext = createContext();

export function WorkspaceProvider({ children }) {
  const [selectedWorkspace, setSelectedWorkspace] = useState(() => {
    // Tentar recuperar do localStorage
    const saved = localStorage.getItem('nicochat_selected_workspace');
    return saved ? parseInt(saved) : null;
  });

  const [validationError, setValidationError] = useState(false);

  useEffect(() => {
    if (selectedWorkspace) {
      // Validar se workspace ainda existe
      axios.get(`/ia/nicochat-workspaces/${selectedWorkspace}/`)
        .then(() => {
          // Workspace existe, salvar no localStorage
          localStorage.setItem('nicochat_selected_workspace', selectedWorkspace.toString());
          setValidationError(false);
        })
        .catch((error) => {
          // Workspace não existe mais ou está inativo
          console.warn(`⚠️ Workspace ${selectedWorkspace} não encontrado ou inativo, limpando seleção`);
          localStorage.removeItem('nicochat_selected_workspace');
          setSelectedWorkspace(null);
          setValidationError(true);
        });
    }
  }, [selectedWorkspace]);

  return (
    <WorkspaceContext.Provider value={{ selectedWorkspace, setSelectedWorkspace, validationError }}>
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
