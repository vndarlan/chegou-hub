// frontend/src/features/planejamento_semanal/components/SlideDashboard.jsx
import React, { useState, useEffect } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import apiClient from '../../../utils/axios';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import { DashboardGrid } from './DashboardGrid';

/**
 * Slide do Dashboard para apresentacao
 * Sempre busca e mostra a semana atual (is_current_week)
 * Reutiliza o DashboardGrid existente
 */
export function SlideDashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Buscar semana atual e dados do dashboard
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Primeiro buscar a semana atual
        const semanasResponse = await apiClient.get('/planejamento-semanal/semanas/');
        const semanas = semanasResponse.data?.semanas || [];

        if (semanas.length === 0) {
          setError('Nenhuma semana cadastrada');
          setLoading(false);
          return;
        }

        // Pegar a semana atual (is_current_week) ou a mais recente
        const semanaAtual = semanas.find(s => s.is_current_week) || semanas[0];

        // Buscar dados do dashboard e usuarios em paralelo
        const [dashboardResponse, usersResponse] = await Promise.all([
          apiClient.get(`/planejamento-semanal/dashboard/?semana_id=${semanaAtual.id}`),
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
  }, []);

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
