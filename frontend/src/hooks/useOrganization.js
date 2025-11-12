import { useState, useEffect, useCallback } from 'react';
import apiClient from '../utils/axios';

/**
 * Hook para gerenciar dados da organização do usuário
 *
 * @returns {Object} Dados e funções da organização
 * @property {Object|null} organization - Dados da organização
 * @property {string|null} role - Role do usuário (owner/admin/member)
 * @property {boolean} isOwner - Se é owner
 * @property {boolean} isAdmin - Se é admin ou owner
 * @property {boolean} isMember - Se é apenas member
 * @property {boolean} loading - Estado de carregamento
 * @property {Function} refetch - Recarrega dados da organização
 * @property {Function} hasModuleAccess - Verifica acesso a um módulo
 */
export const useOrganization = () => {
    const [organization, setOrganization] = useState(null);
    const [role, setRole] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [allowedModules, setAllowedModules] = useState(null);
    const [loadingModules, setLoadingModules] = useState(false);

    const fetchOrganization = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await apiClient.get('/current-state/');

            if (response.data.logged_in) {
                setOrganization(response.data.organization);
                setRole(response.data.organization_role);
            } else {
                setOrganization(null);
                setRole(null);
            }
        } catch (err) {
            console.error('Erro ao buscar organização:', err);
            setError(err.message);
            setOrganization(null);
            setRole(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchOrganization();
    }, [fetchOrganization]);

    // Buscar módulos permitidos quando organização carregar
    useEffect(() => {
        const fetchModules = async () => {
            if (!organization || !role) {
                setAllowedModules(null);
                return;
            }

            // Owner e Admin têm acesso a tudo
            if (role === 'owner' || role === 'admin') {
                setAllowedModules('all');
                return;
            }

            // Member: buscar módulos permitidos
            try {
                setLoadingModules(true);
                const response = await apiClient.get(`/organizations/${organization.id}/meus_modulos/`);

                // Backend retorna: { role: 'member', modulos: ['agenda', 'mapa'] }
                setAllowedModules(response.data.modulos || []);
            } catch (err) {
                console.error('Erro ao buscar módulos:', err);
                setAllowedModules([]);
            } finally {
                setLoadingModules(false);
            }
        };

        fetchModules();
    }, [organization, role]);

    // Helpers de role
    const isOwner = role === 'owner';
    const isAdmin = role === 'admin' || role === 'owner';
    const isMember = role === 'member';

    /**
     * Verifica se o usuário tem acesso a um módulo específico
     * @param {string} moduleKey - Chave do módulo
     * @returns {boolean} Se tem acesso
     */
    const hasModuleAccess = useCallback((moduleKey) => {
        if (!organization || !role || !moduleKey) return false;

        // Owner e Admin têm acesso a tudo
        if (allowedModules === 'all') return true;

        // Member: verificar no array de módulos permitidos
        if (Array.isArray(allowedModules)) {
            return allowedModules.includes(moduleKey);
        }

        return false;
    }, [organization, role, allowedModules]);

    return {
        organization,
        role,
        isOwner,
        isAdmin,
        isMember,
        loading,
        error,
        refetch: fetchOrganization,
        hasModuleAccess,
        allowedModules,
        loadingModules
    };
};
