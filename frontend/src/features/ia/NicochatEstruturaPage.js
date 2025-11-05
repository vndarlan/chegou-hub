import React, { useState, useEffect } from 'react';
import apiClient from '../../utils/axios';
import { useWorkspace } from './contexts/WorkspaceContext';

// shadcn/ui imports
import { Button } from '../../components/ui/button';
import { Alert, AlertDescription } from '../../components/ui/alert';

// Ícones
import { RefreshCw, AlertTriangle } from 'lucide-react';

// Componentes locais
import {
  NicochatCard,
  SubflowsList,
  LoadingSpinner,
  ErrorAlert,
  AllTagsCard,
  WebhooksCard
} from './components';

export default function NicochatEstruturaPage() {
  const { selectedWorkspace, validationError } = useWorkspace();

  // Estados de dados
  const [subfluxos, setSubfluxos] = useState([]);

  // Estados de loading/erro
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadingSubfluxos, setLoadingSubfluxos] = useState(false);

  // Constantes
  const FLOW_ID = 'f108059';

  // Carregar dados quando o workspace for selecionado
  useEffect(() => {
    if (selectedWorkspace) {
      fetchAllData();
    }
  }, [selectedWorkspace]);

  const fetchSubfluxos = async () => {
    try {
      setLoadingSubfluxos(true);

      const response = await apiClient.get('/ia/nicochat/subflows/', {
        params: { flow_id: FLOW_ID, config_id: selectedWorkspace }
      });

      setSubfluxos(response.data.data || []);
    } catch (err) {
      console.error('Erro ao carregar subfluxos:', err);
    } finally {
      setLoadingSubfluxos(false);
    }
  };

  const fetchAllData = async () => {
    try {
      setLoading(true);
      await fetchSubfluxos();
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setError('Erro ao carregar dados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    if (selectedWorkspace) {
      fetchAllData();
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <LoadingSpinner message="Carregando estrutura..." />
        </div>
      </div>
    );
  }

  if (validationError) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              O workspace selecionado não existe mais ou foi desativado.
              Por favor, selecione outro workspace na barra superior.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (!selectedWorkspace) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Selecione um workspace na barra superior para visualizar a estrutura.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Estrutura</h1>
            <p className="text-muted-foreground">
              Visualize as tags e automações do seu workspace
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleRefresh} disabled={!selectedWorkspace}>
              <RefreshCw className={`h-4 w-4 ${loadingSubfluxos ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {!selectedWorkspace ? (
          <ErrorAlert message="Selecione um workspace na barra superior para visualizar os dados" />
        ) : (
          <>
            {/* ROW 1: Tags e Automações */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card: Todas as Tags */}
              <AllTagsCard
                configId={selectedWorkspace}
                onRefresh={handleRefresh}
              />

              {/* Card: Automações Ativas */}
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

            {/* ROW 2: Webhooks */}
            <WebhooksCard
              configId={selectedWorkspace}
              onRefresh={handleRefresh}
            />
          </>
        )}
      </div>
    </div>
  );
}
