import React, { createContext, useContext } from 'react';
import { useOrganization } from '../hooks/useOrganization';

/**
 * Context para dados da organização
 * Disponibiliza os dados da organização em toda a aplicação
 */
const OrganizationContext = createContext(null);

/**
 * Hook para acessar o context da organização
 * @returns {Object} Dados da organização do useOrganization hook
 */
export const useOrgContext = () => {
    const context = useContext(OrganizationContext);
    if (!context) {
        throw new Error('useOrgContext deve ser usado dentro de OrganizationProvider');
    }
    return context;
};

/**
 * Provider que envolve a aplicação com dados da organização
 * Suporta múltiplas organizações por usuário
 */
export const OrganizationProvider = ({ children }) => {
    const orgData = useOrganization();

    // Expor setOrganization para permitir troca de organização
    // Nota: useOrganization retorna organization e refetch, mas não setOrganization
    // O OrganizationSwitcher usa o endpoint backend + reload para garantir sincronia

    return (
        <OrganizationContext.Provider value={orgData}>
            {children}
        </OrganizationContext.Provider>
    );
};
