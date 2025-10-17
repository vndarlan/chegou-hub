import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getCSRFToken } from '../../utils/csrf';

// shadcn/ui imports
import { Button } from '../../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { ScrollArea } from '../../components/ui/scroll-area';

// Ícones
import { RefreshCw, FileX, Package, MapPin, Users, MessageCircle, CheckCircle } from 'lucide-react';

// Componentes locais
import {
  NicochatCard,
  SubflowsList,
  FormularioTable,
  LoadingSpinner,
  ErrorAlert,
  StatsCard,
  WhatsAppTemplatesCard,
  AllTagsCard
} from './components';

export default function NicochatMetricasPage() {
  // Estados de dados
  const [configs, setConfigs] = useState([]);
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [subfluxos, setSubfluxos] = useState([]);
  const [userFields, setUserFields] = useState([]);
  const [botUsersCount, setBotUsersCount] = useState({ open: 0, done: 0, total: 0 });

  // Estados de loading/erro
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadingSubfluxos, setLoadingSubfluxos] = useState(false);
  const [loadingFields, setLoadingFields] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);

  // Estados do modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedFormulario, setSelectedFormulario] = useState(null);

  // Constantes
  const FLOW_ID = 'f108059';

  // Carregar configurações ao montar
  useEffect(() => {
    fetchConfigs();
  }, []);

  // Carregar dados quando a configuração for selecionada
  useEffect(() => {
    if (selectedConfig) {
      fetchAllData();
    }
  }, [selectedConfig]);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get('/ia/nicochat-configs/');
      const configsList = response.data.results || response.data;
      setConfigs(configsList);

      // Selecionar a primeira config ativa automaticamente
      const activeConfig = configsList.find(c => c.ativo);
      if (activeConfig) {
        setSelectedConfig(activeConfig.id);
      }
    } catch (err) {
      console.error('Erro ao carregar configurações:', err);
      setError('Erro ao carregar configurações. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubfluxos = async () => {
    try {
      setLoadingSubfluxos(true);

      const response = await axios.get('/ia/nicochat/subflows/', {
        params: { flow_id: FLOW_ID, config_id: selectedConfig }
      });

      setSubfluxos(response.data.data || []);
    } catch (err) {
      console.error('Erro ao carregar subfluxos:', err);
    } finally {
      setLoadingSubfluxos(false);
    }
  };

  const fetchUserFields = async () => {
    try {
      setLoadingFields(true);

      const response = await axios.get('/ia/nicochat/user-fields/', {
        params: { flow_id: FLOW_ID, config_id: selectedConfig }
      });

      setUserFields(response.data.data || []);
    } catch (err) {
      console.error('Erro ao carregar campos de usuário:', err);
    } finally {
      setLoadingFields(false);
    }
  };

  const fetchBotUsersCount = async () => {
    try {
      setLoadingStats(true);

      const response = await axios.get('/ia/nicochat/bot-users-count/', {
        params: { config_id: selectedConfig }
      });

      const data = response.data.data || [];
      const done = data.find(d => d.status === 'done')?.num || 0;
      const open = data.find(d => d.status === 'open')?.num || 0;

      setBotUsersCount({ open, done, total: open + done });
    } catch (err) {
      console.error('Erro ao buscar estatísticas de usuários:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchAllData = async () => {
    await Promise.all([
      fetchSubfluxos(),
      fetchUserFields(),
      fetchBotUsersCount()
    ]);
  };

  const handleRefresh = () => {
    if (selectedConfig) {
      fetchAllData();
    }
  };

  const handleViewDetails = (formulario) => {
    setSelectedFormulario(formulario);
    setModalOpen(true);
  };

  // Filtrar dados por tipo de formulário
  const getCancelamentos = () => {
    return userFields.filter(field => field.nome && field.telefone && field.formsCancelarPedido);
  };

  const getDevolucoes = () => {
    return userFields.filter(field => field.nome && field.telefone && field.formsDevolucao);
  };

  const getTrocasEndereco = () => {
    return userFields.filter(field => field.nome && field.telefone && field.formsTrocaDeEndereco);
  };

  // Preparar dados para a tabela
  const prepareTableData = (data, fieldKey) => {
    return data.map(item => ({
      nome: item.nome || 'N/A',
      telefone: item.telefone || 'N/A',
      formulario: item[fieldKey],
      rawData: item
    }));
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <LoadingSpinner message="Carregando dashboard..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <ErrorAlert message={error} onRetry={fetchConfigs} />
        </div>
      </div>
    );
  }

  if (configs.length === 0) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <ErrorAlert
            message="Nenhuma configuração encontrada. Configure uma API Key primeiro."
            onRetry={null}
          />
        </div>
      </div>
    );
  }

  const cancelamentos = getCancelamentos();
  const devolucoes = getDevolucoes();
  const trocasEndereco = getTrocasEndereco();

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header com seletor */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Dashboard NicoChat</h1>
            <p className="text-muted-foreground">
              Métricas e automações do seu WhatsApp Business
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedConfig?.toString()} onValueChange={(val) => setSelectedConfig(parseInt(val))}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Selecione uma configuração" />
              </SelectTrigger>
              <SelectContent>
                {configs.map((config) => (
                  <SelectItem key={config.id} value={config.id.toString()}>
                    {config.nome} {config.ativo ? '(Ativa)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleRefresh} disabled={!selectedConfig}>
              <RefreshCw className={`h-4 w-4 ${(loadingSubfluxos || loadingFields) ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {!selectedConfig ? (
          <ErrorAlert message="Selecione uma configuração para visualizar os dados" />
        ) : (
          <>
            {/* ROW 1: Cards de Estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatsCard
                title="Total de Contatos"
                value={botUsersCount.total}
                icon={<Users className="h-5 w-5" />}
                color="blue"
                loading={loadingStats}
              />
              <StatsCard
                title="Conversas Abertas"
                value={botUsersCount.open}
                icon={<MessageCircle className="h-5 w-5" />}
                color="green"
                loading={loadingStats}
              />
              <StatsCard
                title="Conversas Concluídas"
                value={botUsersCount.done}
                icon={<CheckCircle className="h-5 w-5" />}
                color="gray"
                loading={loadingStats}
              />
            </div>

            {/* ROW 2: Tags e Templates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <AllTagsCard
                configId={selectedConfig}
                onRefresh={handleRefresh}
              />

              <WhatsAppTemplatesCard
                configId={selectedConfig}
                onRefresh={handleRefresh}
              />
            </div>

            {/* ROW 3: Automações */}
            <div className="grid grid-cols-1 gap-6">
              <NicochatCard
                title="Automações Ativas"
                badge={subfluxos.length}
              >
                {loadingSubfluxos ? (
                  <LoadingSpinner message="Carregando automações..." />
                ) : (
                  <SubflowsList subfluxos={subfluxos} />
                )}
              </NicochatCard>
            </div>

            {/* ROW 4: Formulários */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card: Cancelamentos */}
              <NicochatCard
                title="Cancelamentos de Pedido"
                badge={cancelamentos.length}
              >
                {loadingFields ? (
                  <LoadingSpinner message="Carregando cancelamentos..." />
                ) : (
                  <FormularioTable
                    data={prepareTableData(cancelamentos, 'formsCancelarPedido')}
                    onViewDetails={handleViewDetails}
                    loading={loadingFields}
                  />
                )}
              </NicochatCard>

              {/* Card: Devoluções */}
              <NicochatCard
                title="Devoluções"
                badge={devolucoes.length}
              >
                {loadingFields ? (
                  <LoadingSpinner message="Carregando devoluções..." />
                ) : (
                  <FormularioTable
                    data={prepareTableData(devolucoes, 'formsDevolucao')}
                    onViewDetails={handleViewDetails}
                    loading={loadingFields}
                  />
                )}
              </NicochatCard>

              {/* Card: Troca de Endereço */}
              <NicochatCard
                title="Troca de Endereço"
                badge={trocasEndereco.length}
              >
                {loadingFields ? (
                  <LoadingSpinner message="Carregando trocas..." />
                ) : (
                  <FormularioTable
                    data={prepareTableData(trocasEndereco, 'formsTrocaDeEndereco')}
                    onViewDetails={handleViewDetails}
                    loading={loadingFields}
                  />
                )}
              </NicochatCard>
            </div>
          </>
        )}

        {/* Modal de Detalhes */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalhes do Formulário</DialogTitle>
              <DialogDescription>
                Informações detalhadas do cliente
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[500px] pr-4">
              {selectedFormulario && (
                <div className="space-y-4">
                  {/* Informações do Cliente */}
                  <div className="border rounded-lg p-4 bg-muted/50">
                    <h3 className="font-semibold mb-3">Informações do Cliente</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Nome:</span>
                        <p className="font-medium">{selectedFormulario.nome || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Telefone:</span>
                        <p className="font-medium font-mono">{selectedFormulario.telefone || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Dados do Formulário */}
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-3">Dados do Formulário</h3>
                    <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                      {JSON.stringify(selectedFormulario.formulario || selectedFormulario.rawData, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
