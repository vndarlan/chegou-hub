// frontend/src/features/planejamento_semanal/components/SlideDashboard.jsx
import React, { useState, useEffect } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import apiClient from '../../../utils/axios';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import { DashboardGrid } from './DashboardGrid';

/**
 * Slide do Dashboard para apresentacao
 * Reutiliza o DashboardGrid existente
 * @param {number} semanaId - ID da semana para buscar dados
 */
export function SlideDashboard({ semanaId }) {
  const [dashboardData, setDashboardData] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Buscar dados do dashboard e usuarios
  useEffect(() => {
    const fetchData = async () => {
      if (!semanaId) {
        setError('Nenhuma semana selecionada');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Buscar dados em paralelo
        const [dashboardResponse, usersResponse] = await Promise.all([
          apiClient.get(`/planejamento-semanal/dashboard/?semana_id=${semanaId}`),
          apiClient.get('/jira/users/')
        ]);

        setDashboardData(dashboardResponse.data);
        setUsers(usersResponse.data);

      } catch (err) {
        console.error("Erro ao carregar dados:", err);
        setError(`Erro ao carregar dados: ${err.response?.data?.detail || err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [semanaId]);

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-background">
        <div className="flex items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-lg text-muted-foreground">Carregando dashboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-background p-8">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-background p-6 overflow-auto">
      <DashboardGrid data={dashboardData} users={users} />
    </div>
  );
}

export default SlideDashboard;
