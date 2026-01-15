// frontend/src/features/planejamento_semanal/PlanejamentoSemanalPage.js
import { useState, useEffect, useCallback } from 'react';
import { AlertCircle, Loader2, RefreshCw, Save, Calendar, Search } from 'lucide-react';
import apiClient from '../../utils/axios';
import { useOrganization } from '../../hooks/useOrganization';

// shadcn/ui components
import { Button } from '../../components/ui/button';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Input } from '../../components/ui/input';

// Componentes customizados
import { UserSelector } from './components/UserSelector';
import { IssueSelector } from './components/IssueSelector';
import { WeekSelector } from './components/WeekSelector';

function PlanejamentoSemanalPage() {
  // Hook de organizacao para verificar permissoes
  const { isAdmin } = useOrganization();

  // Estados de semanas
  const [semanas, setSemanas] = useState([]);
  const [selectedSemana, setSelectedSemana] = useState(null);
  const [loadingSemanas, setLoadingSemanas] = useState(true);
  const [creatingSemana, setCreatingSemana] = useState(false);
  const [deletingSemana, setDeletingSemana] = useState(false);

  // Estados de usuarios
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Estados de issues
  const [issuesDisponiveis, setIssuesDisponiveis] = useState({});
  const [selectedIssues, setSelectedIssues] = useState([]);
  const [selectedIssuesData, setSelectedIssuesData] = useState({});
  const [loadingIssues, setLoadingIssues] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Estados de planejamento
  const [planejamentoAtual, setPlanejamentoAtual] = useState(null);
  const [loadingPlanejamento, setLoadingPlanejamento] = useState(false);
  const [savingPlanejamento, setSavingPlanejamento] = useState(false);

  // Estados de erro
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

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

  // Criar nova semana (apenas admins)
  const handleCriarSemana = async () => {
    setCreatingSemana(true);
    setError(null);
    try {
      const response = await apiClient.post('/planejamento-semanal/criar-semana/');
      const novaSemana = response.data?.semana;

      if (novaSemana) {
        // Adicionar nova semana no inicio da lista
        setSemanas(prev => [novaSemana, ...prev]);
        setSelectedSemana(novaSemana);
        setSuccessMessage('Nova semana criada com sucesso!');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err) {
      console.error('Erro ao criar semana:', err);
      if (err.response?.status === 409) {
        setError('Ja existe uma semana para esse periodo.');
      } else if (err.response?.status === 403) {
        setError('Apenas administradores podem criar novas semanas.');
      } else {
        setError(err.response?.data?.error || 'Erro ao criar nova semana.');
      }
    } finally {
      setCreatingSemana(false);
    }
  };

  // Deletar semana (apenas admins)
  const handleDeletarSemana = async () => {
    if (!selectedSemana) return;

    // Confirmar antes de deletar
    if (!window.confirm(`Tem certeza que deseja deletar a semana ${formatSemanaLabel(selectedSemana)}? Todos os planejamentos desta semana serao perdidos.`)) {
      return;
    }

    setDeletingSemana(true);
    setError(null);
    try {
      await apiClient.delete(`/planejamento-semanal/deletar-semana/?semana_id=${selectedSemana.id}`);

      // Remover semana da lista
      setSemanas(prev => prev.filter(s => s.id !== selectedSemana.id));

      // Selecionar proxima semana disponivel
      const semanasRestantes = semanas.filter(s => s.id !== selectedSemana.id);
      setSelectedSemana(semanasRestantes.length > 0 ? semanasRestantes[0] : null);

      setSuccessMessage('Semana deletada com sucesso!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Erro ao deletar semana:', err);
      if (err.response?.status === 403) {
        setError('Apenas administradores podem deletar semanas.');
      } else {
        setError(err.response?.data?.error || 'Erro ao deletar semana.');
      }
    } finally {
      setDeletingSemana(false);
    }
  };

  // Handler para mudanca de semana
  const handleSemanaChange = (semana) => {
    setSelectedSemana(semana);
    // Limpar dados ao trocar de semana
    setPlanejamentoAtual(null);
    setSelectedIssues([]);
    setSelectedIssuesData({});
  };

  // Buscar semanas na inicializacao
  useEffect(() => {
    fetchSemanas();
  }, [fetchSemanas]);

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
  const fetchIssuesDisponiveis = useCallback(async (accountId, search = '') => {
    if (!accountId) {
      setIssuesDisponiveis({});
      return;
    }

    setLoadingIssues(true);
    setError(null);
    try {
      const params = { jira_account_id: accountId };
      if (search.trim()) {
        params.search = search.trim();
      }
      const response = await apiClient.get('/planejamento-semanal/issues-disponiveis/', {
        params
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

  // Handler para pesquisar
  const handleSearch = () => {
    if (selectedUser) {
      fetchIssuesDisponiveis(selectedUser, searchQuery);
    }
  };

  // Handler para limpar pesquisa
  const handleClearSearch = () => {
    setSearchQuery('');
    if (selectedUser) {
      fetchIssuesDisponiveis(selectedUser, '');
    }
  };

  // Buscar planejamento do usuario para a semana selecionada
  const fetchPlanejamentoAtual = useCallback(async (accountId, semanaId) => {
    if (!accountId) {
      setPlanejamentoAtual(null);
      setSelectedIssues([]);
      return;
    }

    setLoadingPlanejamento(true);
    try {
      const params = { jira_account_id: accountId };
      if (semanaId) {
        params.semana_id = semanaId;
      }

      const response = await apiClient.get('/planejamento-semanal/semana-atual/', {
        params
      });
      const planejamento = response.data?.planejamento;
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

  // Quando usuario ou semana muda, buscar issues e planejamento
  useEffect(() => {
    if (selectedUser && selectedSemana) {
      fetchIssuesDisponiveis(selectedUser);
      fetchPlanejamentoAtual(selectedUser, selectedSemana.id);
    } else if (selectedUser && !selectedSemana) {
      fetchIssuesDisponiveis(selectedUser);
      fetchPlanejamentoAtual(selectedUser);
    } else {
      setIssuesDisponiveis({});
      setPlanejamentoAtual(null);
      setSelectedIssues([]);
    }
  }, [selectedUser, selectedSemana, fetchIssuesDisponiveis, fetchPlanejamentoAtual]);

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

      const payload = {
        jira_account_id: selectedUser,
        jira_display_name: displayName,
        itens: itens
      };

      // Adicionar semana_id se tiver semana selecionada
      if (selectedSemana?.id) {
        payload.semana_id = selectedSemana.id;
      }

      await apiClient.post('/planejamento-semanal/salvar/', payload);

      setSuccessMessage('Planejamento salvo com sucesso!');

      // Atualizar planejamento atual
      await fetchPlanejamentoAtual(selectedUser, selectedSemana?.id);

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
    setSearchQuery('');
    setError(null);
    setSuccessMessage(null);
  };

  // Refresh dados
  const handleRefresh = () => {
    fetchSemanas();
    if (selectedUser) {
      fetchIssuesDisponiveis(selectedUser);
      fetchPlanejamentoAtual(selectedUser, selectedSemana?.id);
    }
  };

  if (loadingUsers || loadingSemanas) {
    return (
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        <div className="flex h-32 items-center justify-center">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">
              {loadingSemanas ? 'Carregando semanas...' : 'Carregando usuarios...'}
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
          <Calendar className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-lg font-semibold">Configurar Semana</h2>
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
            onNovaSemana={isAdmin ? handleCriarSemana : null}
            onDeletarSemana={isAdmin ? handleDeletarSemana : null}
            isAdmin={isAdmin}
            loading={loadingSemanas}
            creating={creatingSemana}
            deleting={deletingSemana}
          />
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
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

      {/* Card de Configuracao */}
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
              {/* Campo de Pesquisa */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Pesquisar por código (ex: CHEGOU-123) ou título..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="pl-9"
                  />
                </div>
                <Button onClick={handleSearch} variant="secondary" disabled={loadingIssues}>
                  {loadingIssues ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
                {searchQuery && (
                  <Button onClick={handleClearSearch} variant="outline" size="sm">
                    Limpar
                  </Button>
                )}
              </div>

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
                  disabled={savingPlanejamento}
                >
                  {savingPlanejamento ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {selectedIssues.length === 0
                        ? 'Limpar Planejamento'
                        : `Salvar Planejamento (${selectedIssues.length} ${selectedIssues.length === 1 ? 'item' : 'itens'})`
                      }
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default PlanejamentoSemanalPage;
