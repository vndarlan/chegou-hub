// frontend/src/features/ecomhub/EcomhubConfigPage.jsx
import React, { useState, useEffect } from 'react';
import {
  Settings,
  Plus,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Store
} from 'lucide-react';
import axios from 'axios';
import { getCSRFToken } from '../../utils/csrf';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Alert, AlertDescription } from '../../components/ui/alert';

import StoreCard from './components/StoreCard';
import AddStoreModal from './components/AddStoreModal';
import EditStoreModal from './components/EditStoreModal';

function EcomhubConfigPage() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalAdd, setModalAdd] = useState(false);
  const [modalEdit, setModalEdit] = useState(false);
  const [storeToEdit, setStoreToEdit] = useState(null);
  const [notification, setNotification] = useState(null);
  const [testingStore, setTestingStore] = useState(null);

  // Buscar lojas ao montar componente
  useEffect(() => {
    fetchStores();
  }, []);

  // ======================== FUNÇÕES DE API ========================

  const fetchStores = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/metricas/ecomhub/stores/', {
        headers: { 'X-CSRFToken': getCSRFToken() }
      });
      setStores(response.data);
    } catch (error) {
      console.error('Erro ao buscar lojas:', error);
      showNotification('error', 'Erro ao carregar lojas');
    } finally {
      setLoading(false);
    }
  };

  const deleteStore = async (store) => {
    if (!window.confirm(`Tem certeza que deseja deletar a loja "${store.name}"?\n\nEsta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      await axios.delete(`/metricas/ecomhub/stores/${store.id}/`, {
        headers: { 'X-CSRFToken': getCSRFToken() }
      });
      showNotification('success', `Loja "${store.name}" deletada com sucesso!`);
      fetchStores();
    } catch (error) {
      console.error('Erro ao deletar loja:', error);
      showNotification('error', error.response?.data?.error || 'Erro ao deletar loja');
    }
  };

  const toggleActiveStore = async (store) => {
    const newStatus = !store.is_active;
    const action = newStatus ? 'ativar' : 'desativar';

    try {
      await axios.put(
        `/metricas/ecomhub/stores/${store.id}/`,
        {
          name: store.name,
          token: store.token,
          secret: store.secret,
          is_active: newStatus
        },
        {
          headers: { 'X-CSRFToken': getCSRFToken() }
        }
      );
      showNotification('success', `Loja "${store.name}" ${action === 'ativar' ? 'ativada' : 'desativada'} com sucesso!`);
      fetchStores();
    } catch (error) {
      console.error(`Erro ao ${action} loja:`, error);
      showNotification('error', `Erro ao ${action} loja`);
    }
  };

  const testStoreConnection = async (store) => {
    setTestingStore(store.id);

    try {
      const response = await axios.post(
        '/metricas/ecomhub/stores/test_connection/',
        {
          token: store.token,
          secret: store.secret
        },
        {
          headers: { 'X-CSRFToken': getCSRFToken() }
        }
      );

      if (response.data.success) {
        showNotification('success', `Conexão OK! País: ${response.data.country}, Store ID: ${response.data.store_id}`);
      } else {
        showNotification('error', response.data.error || 'Erro ao testar conexão');
      }
    } catch (error) {
      console.error('Erro ao testar conexão:', error);
      showNotification('error', error.response?.data?.error || 'Erro ao conectar com API');
    } finally {
      setTestingStore(null);
    }
  };

  // ======================== FUNÇÕES AUXILIARES ========================

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleEdit = (store) => {
    setStoreToEdit(store);
    setModalEdit(true);
  };

  const handleAddSuccess = (message) => {
    showNotification('success', message);
    fetchStores();
  };

  const handleEditSuccess = (message) => {
    showNotification('success', message);
    fetchStores();
  };

  // ======================== RENDERIZAÇÃO ========================

  return (
    <div className="flex-1 space-y-4 p-6 min-h-screen bg-background">
      {/* Notificações */}
      {notification && (
        <Alert
          variant={notification.type === 'error' ? 'destructive' : 'default'}
          className={`mb-4 ${
            notification.type === 'success'
              ? 'border-green-300 bg-green-50 dark:bg-green-900/20'
              : 'border-red-300'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription
            className={
              notification.type === 'success'
                ? 'text-green-800 dark:text-green-300'
                : ''
            }
          >
            {notification.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Configuração ECOMHUB
            </h1>
            <p className="text-sm text-muted-foreground">
              Gerencie suas lojas e credenciais da API ECOMHUB
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchStores}
            disabled={loading}
            className="border-border bg-background text-foreground hover:bg-accent"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Atualizar
          </Button>

          <Button
            size="sm"
            onClick={() => setModalAdd(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Nova Loja
          </Button>
        </div>
      </div>

      {/* Lista de Lojas */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-card-foreground">Lojas Cadastradas</CardTitle>
          <CardDescription className="text-muted-foreground">
            {stores.length} {stores.length === 1 ? 'loja configurada' : 'lojas configuradas'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : stores.length === 0 ? (
            <div className="text-center py-12">
              <Store className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Nenhuma loja cadastrada
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Adicione sua primeira loja ECOMHUB para começar
              </p>
              <Button
                onClick={() => setModalAdd(true)}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Primeira Loja
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {stores.map((store) => (
                <div key={store.id} className="relative">
                  {testingStore === store.id && (
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  )}
                  <StoreCard
                    store={store}
                    onEdit={handleEdit}
                    onDelete={deleteStore}
                    onToggleActive={toggleActiveStore}
                    onTest={testStoreConnection}
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Informações Adicionais */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-sm text-card-foreground">
            Informações sobre Credenciais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs text-muted-foreground">
          <p>
            • <strong>Token</strong> e <strong>Secret</strong> são fornecidos pela API ECOMHUB
          </p>
          <p>
            • Use o botão <strong>"Testar"</strong> para verificar se as credenciais estão corretas
          </p>
          <p>
            • Lojas <strong>inativas</strong> não serão usadas nas sincronizações automáticas
          </p>
          <p>
            • O sistema detecta automaticamente o país e Store ID baseado nas credenciais
          </p>
          <p>
            • Mantenha suas credenciais seguras e não as compartilhe
          </p>
        </CardContent>
      </Card>

      {/* Modais */}
      <AddStoreModal
        open={modalAdd}
        onClose={() => setModalAdd(false)}
        onSuccess={handleAddSuccess}
      />

      <EditStoreModal
        open={modalEdit}
        onClose={() => {
          setModalEdit(false);
          setStoreToEdit(null);
        }}
        onSuccess={handleEditSuccess}
        store={storeToEdit}
      />
    </div>
  );
}

export default EcomhubConfigPage;
