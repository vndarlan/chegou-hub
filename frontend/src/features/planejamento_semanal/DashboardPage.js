// frontend/src/features/planejamento_semanal/DashboardPage.js
import { useState, useEffect, useCallback } from 'react';
import { Loader2, RefreshCw, LayoutDashboard } from 'lucide-react';
import apiClient from '../../utils/axios';

// shadcn/ui components
import { Button } from '../../components/ui/button';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { AlertCircle } from 'lucide-react';

// Componentes customizados
import { DashboardGrid } from './components/DashboardGrid';
import { WeekSelector } from './components/WeekSelector';

function DashboardPage() {
  // Estados de semanas
  const [semanas, setSemanas] = useState([]);
  const [selectedSemana, setSelectedSemana] = useState(null);
  const [loadingSemanas, setLoadingSemanas] = useState(true);

  // Estados de usuarios (para fotos)
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Estados de dashboard
  const [dashboardData, setDashboardData] = useState(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);

  // Estados de erro
  const [error, setError] = useState(null);

  // Formatar label da semana para exibicao
  const formatSemanaLabel = (semana) => {
    if (!semana) return '-';
    if (semana.label) return semana.label;
    if (semana.data_inicio && semana.data_fim) {
      const inicio = new Date(semana.data_inicio + 'T00:00:00').toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit'
      });
      const fim = new Date(semana.data_fim + 'T00:00:00').toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit'
      });
      return `${inicio} - ${fim}`;
    }
    return '-';
  };

  // Buscar lista de semanas disponiveis
  const fetchSemanas = useCallback(async () => {
    setLoadingSemanas(true);
    try {
      const response = await apiClient.get('/planejamento-semanal/semanas/');
      const semanasData = response.data?.semanas || [];
      setSemanas(semanasData);

      // Selecionar a primeira semana (mais recente) se nenhuma selecionada
      setSelectedSemana(prev => {
        if (semanasData.length > 0 && !prev) {
          return semanasData[0];
        }
        return prev;
      });
    } catch (err) {
      console.error('Erro ao buscar semanas:', err);
      setError('Erro ao carregar lista de semanas.');
    } finally {
      setLoadingSemanas(false);
    }
  }, []);

  // Handler para mudanca de semana
  const handleSemanaChange = (semana) => {
    setSelectedSemana(semana);
    setDashboardData(null);
  };

  // Buscar semanas na inicializacao
  useEffect(() => {
    fetchSemanas();
  }, [fetchSemanas]);

  // Buscar usuarios do Jira (para fotos)
  useEffect(() => {
    const fetchUsers = async () => {
      setLoadingUsers(true);
      try {
        const response = await apiClient.get('/jira/users/');
        setUsers(response.data || []);
      } catch (err) {
        console.error('Erro ao buscar usuarios:', err);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, []);

  // Buscar dashboard da equipe
  const fetchDashboard = useCallback(async (semanaId) => {
    setLoadingDashboard(true);
    setError(null);
    try {
      const params = {};
      if (semanaId) {
        params.semana_id = semanaId;
      }

      const response = await apiClient.get('/planejamento-semanal/dashboard/', {
        params
      });
      setDashboardData(response.data);
    } catch (err) {
      console.error('Erro ao buscar dashboard:', err);
      setError('Erro ao carregar dashboard.');
      setDashboardData(null);
    } finally {
      setLoadingDashboard(false);
    }
  }, []);

  // Buscar dashboard quando semana muda
  useEffect(() => {
    if (selectedSemana) {
      fetchDashboard(selectedSemana.id);
    }
  }, [selectedSemana, fetchDashboard]);

  // Refresh dados
  const handleRefresh = () => {
    fetchSemanas();
    if (selectedSemana) {
      fetchDashboard(selectedSemana.id);
    }
  };

  if (loadingUsers || loadingSemanas) {
    return (
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        <div className="flex h-32 items-center justify-center">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">
              {loadingSemanas ? 'Carregando semanas...' : 'Carregando dados...'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      {/* Cabecalho */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-lg font-semibold">Dashboard</h2>
            <p className="text-sm text-muted-foreground">
              Semana: {formatSemanaLabel(selectedSemana)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <WeekSelector
            semanas={semanas}
            selectedSemana={selectedSemana}
            onSemanaChange={handleSemanaChange}
            loading={loadingSemanas}
          />
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Mensagens de erro */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Dashboard */}
      {loadingDashboard ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <DashboardGrid data={dashboardData} users={users} />
      )}
    </div>
  );
}

export default DashboardPage;
