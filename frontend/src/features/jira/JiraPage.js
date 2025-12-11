// frontend/src/features/jira/JiraPage.js - Métricas Jira
import React, { useState, useEffect, useCallback } from 'react';
import { BarChart3, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import apiClient from '../../utils/axios';

// shadcn/ui components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';

// Componentes customizados
import { JiraPeriodFilter } from './components/JiraPeriodFilter';
import { JiraBoardFilter } from './components/JiraBoardFilter';
import { JiraUserFilter } from './components/JiraUserFilter';
import { AtividadesResolvidasChart } from './components/AtividadesResolvidasChart';
import { CriadoVsResolvidoChart } from './components/CriadoVsResolvidoChart';
import { StatusCardsPanel } from './components/StatusCardsPanel';
import { TimesheetPanel } from './components/TimesheetPanel';
import { LeadTimeTable } from './components/LeadTimeTable';

function JiraPage() {
  // Estados de configuração
  const [config, setConfig] = useState(null);
  const [boards, setBoards] = useState([]);
  const [users, setUsers] = useState([]);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [configError, setConfigError] = useState(null);

  // Estados de filtros
  const [period, setPeriod] = useState('30d');
  const [dateRange, setDateRange] = useState(null);
  const [selectedBoard, setSelectedBoard] = useState('all');
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

  const [activeTab, setActiveTab] = useState('resolvidas');

  // Buscar configuração inicial
  useEffect(() => {
    const fetchConfig = async () => {
      setLoadingConfig(true);
      setConfigError(null);
      try {
        const [configRes, boardsRes, usersRes] = await Promise.all([
          apiClient.get('/api/jira/config/'),
          apiClient.get('/api/jira/boards/'),
          apiClient.get('/api/jira/users/'),
        ]);

        setConfig(configRes.data);
        setBoards(boardsRes.data);
        setUsers(usersRes.data);
      } catch (error) {
        console.error('Erro ao buscar configuração Jira:', error);
        setConfigError(
          error.response?.status === 404
            ? 'Configuração do Jira não encontrada. Configure o módulo Jira nas configurações.'
            : 'Erro ao carregar configurações do Jira.'
        );
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

    if (selectedBoard !== 'all') {
      params.append('board_id', selectedBoard);
    }

    if (selectedUser !== 'all') {
      params.append('user_id', selectedUser);
    }

    return params;
  }, [period, dateRange, selectedBoard, selectedUser]);

  // Buscar atividades resolvidas
  const fetchAtividadesResolvidas = useCallback(async () => {
    setLoadingResolvidas(true);
    try {
      const params = buildParams();
      const response = await apiClient.get(`/api/jira/metrics/resolved/?${params}`);
      setAtividadesResolvidas(response.data);
    } catch (error) {
      console.error('Erro ao buscar atividades resolvidas:', error);
    } finally {
      setLoadingResolvidas(false);
    }
  }, [buildParams]);

  // Buscar criado vs resolvido
  const fetchCriadoVsResolvido = useCallback(async () => {
    setLoadingCriadoVsResolvido(true);
    try {
      const params = buildParams();
      const response = await apiClient.get(`/api/jira/metrics/created-vs-resolved/?${params}`);
      setCriadoVsResolvido(response.data);
    } catch (error) {
      console.error('Erro ao buscar criado vs resolvido:', error);
    } finally {
      setLoadingCriadoVsResolvido(false);
    }
  }, [buildParams]);

  // Buscar por status
  const fetchByStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const params = buildParams();
      const response = await apiClient.get(`/api/jira/metrics/by-status/?${params}`);
      setStatusData(response.data);
    } catch (error) {
      console.error('Erro ao buscar por status:', error);
    } finally {
      setLoadingStatus(false);
    }
  }, [buildParams]);

  // Buscar timesheet
  const fetchTimesheet = useCallback(async () => {
    if (selectedUser === 'all') {
      setTimesheetData(null);
      return;
    }

    setLoadingTimesheet(true);
    try {
      const params = buildParams();
      const response = await apiClient.get(`/api/jira/timesheet/?${params}`);
      setTimesheetData(response.data);
    } catch (error) {
      console.error('Erro ao buscar timesheet:', error);
    } finally {
      setLoadingTimesheet(false);
    }
  }, [buildParams, selectedUser]);

  // Buscar lead time
  const fetchLeadTime = useCallback(async () => {
    setLoadingLeadTime(true);
    try {
      const params = buildParams();
      const response = await apiClient.get(`/api/jira/lead-time/?${params}`);
      setLeadTimeData(response.data);
    } catch (error) {
      console.error('Erro ao buscar lead time:', error);
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
    selectedBoard,
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
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Métricas Jira</h1>
          <p className="text-muted-foreground">
            Análise de atividades e performance do time
          </p>
        </div>
        <Button onClick={handleRefreshAll} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar Tudo
        </Button>
      </div>

      {/* Filtros Globais */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Selecione os critérios para análise</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <JiraPeriodFilter
              period={period}
              onPeriodChange={setPeriod}
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
            />
            <JiraBoardFilter
              board={selectedBoard}
              onBoardChange={setSelectedBoard}
              boards={boards}
            />
            <JiraUserFilter
              user={selectedUser}
              onUserChange={setSelectedUser}
              users={users}
            />
          </div>
        </CardContent>
      </Card>

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
          <AtividadesResolvidasChart data={atividadesResolvidas} loading={loadingResolvidas} />
        </TabsContent>

        <TabsContent value="criado-vs-resolvido" className="space-y-4">
          <CriadoVsResolvidoChart data={criadoVsResolvido} loading={loadingCriadoVsResolvido} />
        </TabsContent>

        <TabsContent value="status" className="space-y-4">
          <StatusCardsPanel data={statusData} loading={loadingStatus} />
        </TabsContent>

        <TabsContent value="timesheet" className="space-y-4">
          <TimesheetPanel
            data={timesheetData}
            loading={loadingTimesheet}
            selectedUser={selectedUser}
          />
        </TabsContent>

        <TabsContent value="lead-time" className="space-y-4">
          <LeadTimeTable data={leadTimeData} loading={loadingLeadTime} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default JiraPage;
