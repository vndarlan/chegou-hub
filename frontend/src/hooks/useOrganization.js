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
    const [retryCount, setRetryCount] = useState(0);
    const MAX_RETRIES = 3;

    const fetchOrganization = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await apiClient.get('/current-state/');

            if (response.data.logged_in && response.data.organization) {
                setOrganization(response.data.organization);
                setRole(response.data.organization_role);
                setRetryCount(0); // Resetar contador em caso de sucesso
            } else {
                // Incrementar contador de retry usando função
                setRetryCount(prev => {
                    const newCount = prev + 1;
                    if (newCount <= MAX_RETRIES) {
                        console.warn(`⚠️ [useOrganization] Nenhuma organização retornada (tentativa ${newCount}/${MAX_RETRIES})`);
                    }
                    return newCount;
                });
                setOrganization(null);
                setRole(null);
            }
        } catch (err) {
            console.error('Erro ao buscar organização:', err);
            setError(err.message);
            setRetryCount(prev => {
                const newCount = prev + 1;
                if (newCount <= MAX_RETRIES) {
                    console.warn(`⚠️ [useOrganization] Erro na tentativa ${newCount}/${MAX_RETRIES}`);
                }
                return newCount;
            });
            setOrganization(null);
            setRole(null);
        } finally {
            setLoading(false);
        }
    }, []); // ✅ SEM DEPENDÊNCIAS - evita loop infinito!

    // useEffect separado para verificar limite
    useEffect(() => {
        if (retryCount >= MAX_RETRIES) {
            console.error(
                '❌ [useOrganization] Limite de tentativas atingido!\n' +
                'Possíveis causas:\n' +
                '1. Usuário não pertence a nenhuma organização\n' +
                '2. Todas as organizações do usuário foram desativadas\n' +
                '3. Problema de conectividade com o backend'
            );
            setLoading(false);
        }
    }, [retryCount]);

    // useEffect principal para chamar fetchOrganization
    useEffect(() => {
        if (retryCount < MAX_RETRIES) {
            fetchOrganization();
        }
    }, [retryCount, fetchOrganization]); // ✅ Agora fetchOrganization não muda mais

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
