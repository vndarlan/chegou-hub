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
 */
export const OrganizationProvider = ({ children }) => {
    const orgData = useOrganization();

    return (
        <OrganizationContext.Provider value={orgData}>
            {children}
        </OrganizationContext.Provider>
    );
};
