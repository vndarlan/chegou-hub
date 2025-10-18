import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '../../components/ui/alert';
import {
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import axios from 'axios';
import { useWorkspace } from './contexts/WorkspaceContext';

// Importar componentes necessários
import PhoneNumberTable from './components/PhoneNumberTable';
import AddPhoneNumberModal from './components/AddPhoneNumberModal';
import WhatsAppTemplatesCard from './components/WhatsAppTemplatesCard';

const NicochatQualidadeContaPage = () => {
  const { selectedWorkspace } = useWorkspace();
  // Estados principais
  const [phoneNumbers, setPhoneNumbers] = useState([]);

  // Estados de loading
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estado do modal
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Função para buscar números WhatsApp
  const fetchPhoneNumbers = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await axios.get('/ia/whatsapp-numeros/');
      setPhoneNumbers(response.data.results || response.data);

    } catch (err) {
      console.error('❌ Erro ao carregar números:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message,
        url: err.config?.url
      });

      if (err.response?.status === 404) {
        setError('Endpoint da API não encontrado. Verifique se o backend está rodando.');
      } else if (err.response?.status === 403) {
        setError('Acesso negado. Faça login novamente.');
      } else if (err.response?.status === 500) {
        setError('Erro interno do servidor. Contate o suporte técnico.');
      } else if (!err.response) {
        setError('Erro de conexão. Verifique sua internet e se o backend está ativo.');
      } else {
        setError('Erro ao carregar dados. Tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Carregar dados na inicialização
  useEffect(() => {
    fetchPhoneNumbers();
  }, []);

  // Manipuladores do modal
  const handleOpenModal = () => setIsModalOpen(true);
  const handleCloseModal = () => setIsModalOpen(false);

  const handleNumberAdded = (newNumber) => {
    // Refresh da lista após adicionar
    fetchPhoneNumbers();
  };


  // Loading inicial
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span>Carregando dashboard...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">Qualidade da Conta</h1>
          <p className="text-muted-foreground">
            Gerenciamento de números WhatsApp Business e templates
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* ROW 1: Templates WhatsApp */}
        {selectedWorkspace && (
          <WhatsAppTemplatesCard
            configId={selectedWorkspace}
            onRefresh={fetchPhoneNumbers}
          />
        )}

        {/* ROW 2: Tabela de Números WhatsApp */}
        <PhoneNumberTable
          phoneNumbers={phoneNumbers}
          onRefresh={fetchPhoneNumbers}
          isLoading={isLoading}
          onAddNumber={handleOpenModal}
        />

        {/* Modal para Adicionar Número */}
        <AddPhoneNumberModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSuccess={handleNumberAdded}
        />

      </div>
    </div>
  );
};

export default NicochatQualidadeContaPage;
