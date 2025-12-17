// frontend/src/features/jira/JiraPage.js - Métricas Jira
import { useState, useEffect, useCallback } from 'react';
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import apiClient from '../../utils/axios';

// shadcn/ui components
import { Button } from '../../components/ui/button';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';

// Componentes customizados
import { JiraPeriodFilter } from './components/JiraPeriodFilter';
import { JiraUserFilter } from './components/JiraUserFilter';
import { AtividadesResolvidasChart } from './components/AtividadesResolvidasChart';
import { CriadoVsResolvidoChart } from './components/CriadoVsResolvidoChart';
import { StatusCardsPanel } from './components/StatusCardsPanel';
import { TimesheetPanel } from './components/TimesheetPanel';
import { LeadTimeTable } from './components/LeadTimeTable';

function JiraPage() {
  // Estados de configuração
  const [config, setConfig] = useState(null);
  const [users, setUsers] = useState([]);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [configError, setConfigError] = useState(null);

  // Estados de filtros
  const [period, setPeriod] = useState('30d');
  const [dateRange, setDateRange] = useState(null);
  const [selectedUser, setSelectedUser] = useState('all');

  // Estados de dados
  const [atividadesResolvidas, setAtividadesResolvidas] = useState([]);
  const [criadoVsResolvido, setCriadoVsResolvido] = useState([]);
  const [statusData, setStatusData] = useState([]);
  const [timesheetData, setTimesheetData] = useState(null);
  const [leadTimeData, setLeadTimeData] = useState([]);

  // Estados de loading por tab
  const [loadingResolvidas, setLoadingResolvidas] = useState(false);
  const [loadingCriadoVsResolvido, setLoadingCriadoVsResolvido] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [loadingTimesheet, setLoadingTimesheet] = useState(false);
  const [loadingLeadTime, setLoadingLeadTime] = useState(false);

  // Estados de erro por tab
  const [errorResolvidas, setErrorResolvidas] = useState(null);
  const [errorCriadoVsResolvido, setErrorCriadoVsResolvido] = useState(null);
  const [errorStatus, setErrorStatus] = useState(null);
  const [errorTimesheet, setErrorTimesheet] = useState(null);
  const [errorLeadTime, setErrorLeadTime] = useState(null);

  const [activeTab, setActiveTab] = useState('resolvidas');

  // Buscar configuração inicial
  useEffect(() => {
    const fetchConfig = async () => {
      setLoadingConfig(true);
      setConfigError(null);
      try {
        const [configRes, usersRes] = await Promise.all([
          apiClient.get('/jira/config/'),
          apiClient.get('/jira/users/'),
        ]);

        setConfig(configRes.data);
        setUsers(usersRes.data);

        // DIAGNÓSTICO: Logging detalhado
        console.log('[JIRA DEBUG] Config recebida:', configRes.data);
        console.log('[JIRA DEBUG] Users recebidos:', usersRes.data);

        // Validar configuração
        const config = configRes.data;
        if (!config.jira_url || !config.jira_email || !config.jira_project_key) {
          setConfigError('Configuração Jira incompleta. Verifique URL, email e chave do projeto.');
          return;
        }
        if (!config.ativo) {
          setConfigError('Configuração Jira está inativa. Ative nas configurações.');
          return;
        }
      } catch (error) {
        console.error('[JIRA ERROR] Erro ao buscar configuração:', error);
        console.error('[JIRA ERROR] Response:', error.response?.data);
        console.error('[JIRA ERROR] Status:', error.response?.status);

        // Tentar diagnóstico automático
        try {
          const diagRes = await apiClient.get('/jira/config/diagnostico/');
          console.error('[JIRA DIAGNÓSTICO]', diagRes.data);

          const checks = diagRes.data.checks || {};
          let errorDetails = [];

          if (checks.env_vars?.status === 'error') {
            errorDetails.push('Variáveis de ambiente não configuradas');
          }
          if (checks.config_banco?.status === 'error') {
            errorDetails.push('Configuração no banco não encontrada');
          }
          if (checks.conexao_jira?.status === 'error') {
            errorDetails.push(`Erro de conexão: ${checks.conexao_jira.message}`);
          }

          setConfigError(
            errorDetails.length > 0
              ? errorDetails.join('. ')
              : 'Erro ao carregar configurações do Jira.'
          );
        } catch (diagError) {
          setConfigError(
            error.response?.status === 404
              ? 'Configuração do Jira não encontrada. Configure o módulo Jira nas configurações.'
              : 'Erro ao carregar configurações do Jira.'
          );
        }
      } finally {
        setLoadingConfig(false);
      }
    };

    fetchConfig();
  }, []);

  // Construir params para API
  const buildParams = useCallback(() => {
    const params = new URLSearchParams();

    if (period === 'custom' && dateRange?.from && dateRange?.to) {
      params.append('start_date', dateRange.from.toISOString().split('T')[0]);
      params.append('end_date', dateRange.to.toISOString().split('T')[0]);
    } else {
      params.append('period', period);
    }

    if (selectedUser !== 'all') {
      params.append('assignee', selectedUser);
    }

    return params;
  }, [period, dateRange, selectedUser]);

  // Buscar atividades resolvidas
  const fetchAtividadesResolvidas = useCallback(async () => {
    setLoadingResolvidas(true);
    setErrorResolvidas(null);
    try {
      const params = buildParams();
      const response = await apiClient.get(`/jira/metrics/resolved/?${params}`);
      // Backend retorna {status, data: [{assignee, count}], total, period}
      // Chart espera [{name, count}]
      const rawData = response.data?.data || [];
      const chartData = rawData.map(item => ({
        name: item.assignee,
        count: item.count
      }));
      setAtividadesResolvidas(chartData);
    } catch (error) {
      console.error('[JIRA ERROR] Erro ao buscar atividades resolvidas:', error);
      console.error('[JIRA ERROR] Response:', JSON.stringify(error.response?.data, null, 2));
      console.error('[JIRA ERROR] Status:', error.response?.status);

      if (error.response?.status === 401 || error.response?.status === 403) {
        setErrorResolvidas('Token de autenticação Jira inválido ou expirado. Reconfigure nas configurações.');
      } else {
        const errorMsg = error.response?.data?.error || error.response?.data?.detail || error.response?.data?.message || error.message;
        setErrorResolvidas(`Erro ao carregar dados: ${errorMsg}`);
      }

      setAtividadesResolvidas([]);
    } finally {
      setLoadingResolvidas(false);
    }
  }, [buildParams]);

  // Buscar criado vs resolvido
  const fetchCriadoVsResolvido = useCallback(async () => {
    setLoadingCriadoVsResolvido(true);
    setErrorCriadoVsResolvido(null);
    try {
      const params = buildParams();
      const response = await apiClient.get(`/jira/metrics/created-vs-resolved/?${params}`);
      // Backend retorna {status, data: [{user, created, resolved, delta}], period}
      // Chart espera [{period, created, resolved}]
      const rawData = response.data?.data || [];
      const chartData = rawData.map(item => ({
        period: item.user,
        created: item.created,
        resolved: item.resolved
      }));
      setCriadoVsResolvido(chartData);
    } catch (error) {
      console.error('[JIRA ERROR] Erro ao buscar criado vs resolvido:', error);
      console.error('[JIRA ERROR] Response:', JSON.stringify(error.response?.data, null, 2));
      console.error('[JIRA ERROR] Status:', error.response?.status);

      if (error.response?.status === 401 || error.response?.status === 403) {
        setErrorCriadoVsResolvido('Token de autenticação Jira inválido ou expirado. Reconfigure nas configurações.');
      } else {
        const errorMsg = error.response?.data?.error || error.response?.data?.detail || error.response?.data?.message || error.message;
        setErrorCriadoVsResolvido(`Erro ao carregar dados: ${errorMsg}`);
      }

      setCriadoVsResolvido([]);
    } finally {
      setLoadingCriadoVsResolvido(false);
    }
  }, [buildParams]);

  // Buscar por status
  const fetchByStatus = useCallback(async () => {
    setLoadingStatus(true);
    setErrorStatus(null);
    try {
      const params = buildParams();
      const response = await apiClient.get(`/jira/metrics/by-status/?${params}`);
      // Backend retorna {status: 'success', data: [{status, count}], total}
      // Panel espera [{name, count}]
      const rawData = response.data?.data || [];
      const panelData = rawData.map(item => ({
        name: item.status,
        count: item.count
      }));
      setStatusData(panelData);
    } catch (error) {
      console.error('[JIRA ERROR] Erro ao buscar por status:', error);
      console.error('[JIRA ERROR] Response:', JSON.stringify(error.response?.data, null, 2));
      console.error('[JIRA ERROR] Status:', error.response?.status);

      if (error.response?.status === 401 || error.response?.status === 403) {
        setErrorStatus('Token de autenticação Jira inválido ou expirado. Reconfigure nas configurações.');
      } else {
        const errorMsg = error.response?.data?.error || error.response?.data?.detail || error.response?.data?.message || error.message;
        setErrorStatus(`Erro ao carregar dados: ${errorMsg}`);
      }

      setStatusData([]);
    } finally {
      setLoadingStatus(false);
    }
  }, [buildParams]);

  // Buscar timesheet
  const fetchTimesheet = useCallback(async () => {
    if (selectedUser === 'all') {
      setTimesheetData(null);
      setErrorTimesheet(null);
      return;
    }

    setLoadingTimesheet(true);
    setErrorTimesheet(null);
    try {
      const params = buildParams();
      const response = await apiClient.get(`/jira/metrics/timesheet/?${params}`);
      // Backend retorna {status, data: {total_seconds, total_hours, issues}, period}
      // Panel espera {total_hours, issues: [{key, summary, hours}]}
      const rawData = response.data?.data || {};
      const panelData = {
        total_hours: rawData.total_hours || 0,
        issues: rawData.issues || []  // Backend já retorna no formato correto
      };
      setTimesheetData(panelData);
    } catch (error) {
      console.error('[JIRA ERROR] Erro ao buscar timesheet:', error);
      console.error('[JIRA ERROR] Response:', JSON.stringify(error.response?.data, null, 2));
      console.error('[JIRA ERROR] Status:', error.response?.status);

      if (error.response?.status === 401 || error.response?.status === 403) {
        setErrorTimesheet('Token de autenticação Jira inválido ou expirado. Reconfigure nas configurações.');
      } else {
        const errorMsg = error.response?.data?.error || error.response?.data?.detail || error.response?.data?.message || error.message;
        setErrorTimesheet(`Erro ao carregar dados: ${errorMsg}`);
      }

      setTimesheetData({ total_hours: 0, issues: [] });
    } finally {
      setLoadingTimesheet(false);
    }
  }, [buildParams, selectedUser]);

  // Buscar lead time
  const fetchLeadTime = useCallback(async () => {
    setLoadingLeadTime(true);
    setErrorLeadTime(null);
    try {
      const params = buildParams();
      const response = await apiClient.get(`/jira/lead-time/?${params}`);
      // Backend retorna {status, data: {average_total_days, average_by_column, issues_analyzed, details}, period}
      // Table espera array de issues: [{key, summary, assignee, created, resolved, lead_time_hours}]
      const rawData = response.data?.data || {};
      const details = rawData.details || [];
      const tableData = details.map(item => ({
        key: item.issue_key,
        summary: item.summary,
        assignee: item.assignee || 'Não atribuído',
        created: item.created,
        resolved: item.resolved,
        lead_time_hours: (item.total_days || 0) * 24,
        breakdown: item.breakdown || {}  // Adicionar breakdown por coluna
      }));
      setLeadTimeData(tableData);
    } catch (error) {
      console.error('[JIRA ERROR] Erro ao buscar lead time:', error);
      console.error('[JIRA ERROR] Response:', JSON.stringify(error.response?.data, null, 2));
      console.error('[JIRA ERROR] Status:', error.response?.status);

      if (error.response?.status === 401 || error.response?.status === 403) {
        setErrorLeadTime('Token de autenticação Jira inválido ou expirado. Reconfigure nas configurações.');
      } else {
        const errorMsg = error.response?.data?.error || error.response?.data?.detail || error.response?.data?.message || error.message;
        setErrorLeadTime(`Erro ao carregar dados: ${errorMsg}`);
      }

      setLeadTimeData([]);
    } finally {
      setLoadingLeadTime(false);
    }
  }, [buildParams]);

  // Buscar dados da tab ativa
  useEffect(() => {
    if (loadingConfig || configError) return;

    switch (activeTab) {
      case 'resolvidas':
        fetchAtividadesResolvidas();
        break;
      case 'criado-vs-resolvido':
        fetchCriadoVsResolvido();
        break;
      case 'status':
        fetchByStatus();
        break;
      case 'timesheet':
        fetchTimesheet();
        break;
      case 'lead-time':
        fetchLeadTime();
        break;
      default:
        break;
    }
  }, [
    activeTab,
    period,
    dateRange,
    selectedUser,
    loadingConfig,
    configError,
    fetchAtividadesResolvidas,
    fetchCriadoVsResolvido,
    fetchByStatus,
    fetchTimesheet,
    fetchLeadTime,
  ]);

  // Atualizar tudo
  const handleRefreshAll = () => {
    fetchAtividadesResolvidas();
    fetchCriadoVsResolvido();
    fetchByStatus();
    fetchTimesheet();
    fetchLeadTime();
  };

  if (loadingConfig) {
    return (
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        <div className="flex h-32 items-center justify-center">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Carregando configurações...</span>
          </div>
        </div>
      </div>
    );
  }

  if (configError) {
    return (
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{configError}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground">
          Análise de atividades e performance do time
        </p>
        <Button onClick={handleRefreshAll} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar Tudo
        </Button>
      </div>

      {/* Filtros */}
      <div className="grid gap-4 md:grid-cols-2">
        <JiraPeriodFilter
          period={period}
          onPeriodChange={setPeriod}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
        />
        <JiraUserFilter
          user={selectedUser}
          onUserChange={setSelectedUser}
          users={users}
        />
      </div>

      {/* Tabs com Métricas */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="resolvidas">Atividades Resolvidas</TabsTrigger>
          <TabsTrigger value="criado-vs-resolvido">Criado vs Resolvido</TabsTrigger>
          <TabsTrigger value="status">Por Status</TabsTrigger>
          <TabsTrigger value="timesheet">Timesheet</TabsTrigger>
          <TabsTrigger value="lead-time">Lead Time</TabsTrigger>
        </TabsList>

        <TabsContent value="resolvidas" className="space-y-4">
          {errorResolvidas && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorResolvidas}</AlertDescription>
            </Alert>
          )}
          <AtividadesResolvidasChart data={atividadesResolvidas} loading={loadingResolvidas} />
        </TabsContent>

        <TabsContent value="criado-vs-resolvido" className="space-y-4">
          {errorCriadoVsResolvido && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorCriadoVsResolvido}</AlertDescription>
            </Alert>
          )}
          <CriadoVsResolvidoChart data={criadoVsResolvido} loading={loadingCriadoVsResolvido} />
        </TabsContent>

        <TabsContent value="status" className="space-y-4">
          {errorStatus && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorStatus}</AlertDescription>
            </Alert>
          )}
          <StatusCardsPanel
            data={statusData}
            loading={loadingStatus}
            filters={{ period, dateRange, selectedUser }}
          />
        </TabsContent>

        <TabsContent value="timesheet" className="space-y-4">
          {errorTimesheet && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorTimesheet}</AlertDescription>
            </Alert>
          )}
          <TimesheetPanel
            data={timesheetData}
            loading={loadingTimesheet}
            selectedUser={selectedUser}
          />
        </TabsContent>

        <TabsContent value="lead-time" className="space-y-4">
          {errorLeadTime && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorLeadTime}</AlertDescription>
            </Alert>
          )}
          <LeadTimeTable data={leadTimeData} loading={loadingLeadTime} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default JiraPage;
