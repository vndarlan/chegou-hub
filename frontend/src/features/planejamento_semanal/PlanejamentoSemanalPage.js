// frontend/src/features/planejamento_semanal/PlanejamentoSemanalPage.js
import { useState, useEffect, useCallback } from 'react';
import { AlertCircle, Loader2, RefreshCw, Save, Calendar } from 'lucide-react';
import apiClient from '../../utils/axios';

// shadcn/ui components
import { Button } from '../../components/ui/button';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';

// Componentes customizados
import { UserSelector } from './components/UserSelector';
import { IssueSelector } from './components/IssueSelector';
import { DashboardGrid } from './components/DashboardGrid';

function PlanejamentoSemanalPage() {
  // Estados de usuarios
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Estados de issues
  const [issuesDisponiveis, setIssuesDisponiveis] = useState({});
  const [selectedIssues, setSelectedIssues] = useState([]);
  const [loadingIssues, setLoadingIssues] = useState(false);

  // Estados de planejamento
  const [planejamentoAtual, setPlanejamentoAtual] = useState(null);
  const [loadingPlanejamento, setLoadingPlanejamento] = useState(false);
  const [savingPlanejamento, setSavingPlanejamento] = useState(false);

  // Estados de dashboard
  const [dashboardData, setDashboardData] = useState(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);

  // Estados de erro
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Tab ativa
  const [activeTab, setActiveTab] = useState('meu-planejamento');

  // Calcular semana atual
  const getSemanaAtual = () => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((now - startOfYear) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
    return `${now.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
  };

  const semanaAtual = getSemanaAtual();

  // Buscar usuarios do Jira
  useEffect(() => {
    const fetchUsers = async () => {
      setLoadingUsers(true);
      setError(null);
      try {
        const response = await apiClient.get('/jira/users/');
        setUsers(response.data || []);
      } catch (err) {
        console.error('Erro ao buscar usuarios:', err);
        setError('Erro ao carregar lista de usuarios do Jira.');
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, []);

  // Buscar issues disponiveis quando usuario muda
  const fetchIssuesDisponiveis = useCallback(async (accountId) => {
    if (!accountId) {
      setIssuesDisponiveis({});
      return;
    }

    setLoadingIssues(true);
    setError(null);
    try {
      const response = await apiClient.get('/planejamento-semanal/issues-disponiveis/', {
        params: { jira_account_id: accountId }
      });
      setIssuesDisponiveis(response.data?.issues_by_status || {});
    } catch (err) {
      console.error('Erro ao buscar issues:', err);
      setError('Erro ao carregar issues disponiveis.');
      setIssuesDisponiveis({});
    } finally {
      setLoadingIssues(false);
    }
  }, []);

  // Buscar planejamento atual do usuario
  const fetchPlanejamentoAtual = useCallback(async (accountId) => {
    if (!accountId) {
      setPlanejamentoAtual(null);
      setSelectedIssues([]);
      return;
    }

    setLoadingPlanejamento(true);
    try {
      const response = await apiClient.get('/planejamento-semanal/semana-atual/', {
        params: { jira_account_id: accountId }
      });
      const planejamento = response.data;
      setPlanejamentoAtual(planejamento);

      // Carregar issues ja selecionadas
      if (planejamento?.itens) {
        setSelectedIssues(planejamento.itens.map(item => item.issue_key));
      } else {
        setSelectedIssues([]);
      }
    } catch (err) {
      console.error('Erro ao buscar planejamento:', err);
      setPlanejamentoAtual(null);
      setSelectedIssues([]);
    } finally {
      setLoadingPlanejamento(false);
    }
  }, []);

  // Buscar dashboard da equipe
  const fetchDashboard = useCallback(async () => {
    setLoadingDashboard(true);
    try {
      const response = await apiClient.get('/planejamento-semanal/dashboard/');
      setDashboardData(response.data);
    } catch (err) {
      console.error('Erro ao buscar dashboard:', err);
      setDashboardData(null);
    } finally {
      setLoadingDashboard(false);
    }
  }, []);

  // Quando usuario muda, buscar issues e planejamento
  useEffect(() => {
    if (selectedUser) {
      fetchIssuesDisponiveis(selectedUser);
      fetchPlanejamentoAtual(selectedUser);
    } else {
      setIssuesDisponiveis({});
      setPlanejamentoAtual(null);
      setSelectedIssues([]);
    }
  }, [selectedUser, fetchIssuesDisponiveis, fetchPlanejamentoAtual]);

  // Buscar dashboard quando tab muda
  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchDashboard();
    }
  }, [activeTab, fetchDashboard]);

  // Estado para guardar dados completos das issues selecionadas
  const [selectedIssuesData, setSelectedIssuesData] = useState({});

  // Toggle issue selecionada
  const handleToggleIssue = (issueKey, checked, issueData) => {
    setSelectedIssues(prev => {
      if (checked) {
        // Guardar dados completos da issue
        setSelectedIssuesData(prevData => ({
          ...prevData,
          [issueKey]: issueData
        }));
        return [...prev, issueKey];
      } else {
        // Remover dados da issue
        setSelectedIssuesData(prevData => {
          const newData = { ...prevData };
          delete newData[issueKey];
          return newData;
        });
        return prev.filter(key => key !== issueKey);
      }
    });
  };

  // Salvar planejamento
  const handleSalvar = async () => {
    if (!selectedUser) {
      setError('Selecione um usuario antes de salvar.');
      return;
    }

    setSavingPlanejamento(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Buscar nome do usuario selecionado
      const userObj = users.find(u => u.account_id === selectedUser);
      const displayName = userObj?.display_name || userObj?.displayName || 'Usuario';

      // Formatar itens no formato esperado pelo backend
      const itens = selectedIssues.map(issueKey => {
        const issueData = selectedIssuesData[issueKey] || {};
        return {
          issue_key: issueKey,
          issue_summary: issueData.summary || '',
          issue_status: issueData.status || ''
        };
      });

      await apiClient.post('/planejamento-semanal/salvar/', {
        jira_account_id: selectedUser,
        jira_display_name: displayName,
        itens: itens
      });

      setSuccessMessage('Planejamento salvo com sucesso!');

      // Atualizar planejamento atual
      await fetchPlanejamentoAtual(selectedUser);

      // Limpar mensagem apos 3 segundos
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Erro ao salvar planejamento:', err);
      setError(err.response?.data?.error || 'Erro ao salvar planejamento.');
    } finally {
      setSavingPlanejamento(false);
    }
  };

  // Handler para mudanca de usuario
  const handleUserChange = (accountId) => {
    setSelectedUser(accountId);
    setSelectedIssuesData({});
    setError(null);
    setSuccessMessage(null);
  };

  // Refresh dados
  const handleRefresh = () => {
    if (activeTab === 'meu-planejamento' && selectedUser) {
      fetchIssuesDisponiveis(selectedUser);
      fetchPlanejamentoAtual(selectedUser);
    } else if (activeTab === 'dashboard') {
      fetchDashboard();
    }
  };

  if (loadingUsers) {
    return (
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        <div className="flex h-32 items-center justify-center">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Carregando usuarios...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      {/* Cabecalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-lg font-semibold">Planejamento Semanal</h2>
            <p className="text-sm text-muted-foreground">
              Semana atual: {semanaAtual}
            </p>
          </div>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Mensagens de erro/sucesso */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
          <AlertDescription className="text-green-700 dark:text-green-400">
            {successMessage}
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="meu-planejamento">Meu Planejamento</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard da Equipe</TabsTrigger>
        </TabsList>

        {/* Tab: Meu Planejamento */}
        <TabsContent value="meu-planejamento" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configurar Planejamento</CardTitle>
              <CardDescription>
                Selecione o usuario e as issues que serao trabalhadas nesta semana.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Seletor de Usuario */}
              <UserSelector
                users={users}
                selectedUser={selectedUser}
                onUserChange={handleUserChange}
              />

              {/* Seletor de Issues */}
              {selectedUser && (
                <>
                  {loadingIssues || loadingPlanejamento ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <IssueSelector
                      issuesByStatus={issuesDisponiveis}
                      selectedIssues={selectedIssues}
                      onToggleIssue={handleToggleIssue}
                    />
                  )}

                  {/* Botao Salvar */}
                  <div className="flex justify-end">
                    <Button
                      onClick={handleSalvar}
                      disabled={savingPlanejamento || selectedIssues.length === 0}
                    >
                      {savingPlanejamento ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Salvar Planejamento ({selectedIssues.length} {selectedIssues.length === 1 ? 'item' : 'itens'})
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Dashboard da Equipe */}
        <TabsContent value="dashboard" className="space-y-4">
          {loadingDashboard ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <DashboardGrid data={dashboardData} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default PlanejamentoSemanalPage;
