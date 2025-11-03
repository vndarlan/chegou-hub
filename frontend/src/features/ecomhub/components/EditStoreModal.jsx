// frontend/src/features/ecomhub/components/EditStoreModal.jsx
import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { getCSRFToken } from '../../../utils/csrf';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import { Badge } from '../../../components/ui/badge';

function EditStoreModal({ open, onClose, onSuccess, store }) {
  const [formData, setFormData] = useState({
    name: '',
    token: '',
    secret: ''
  });

  const [showToken, setShowToken] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [credentialsChanged, setCredentialsChanged] = useState(false);

  // Preencher formulário quando abrir modal
  useEffect(() => {
    if (store && open) {
      setFormData({
        name: store.name || '',
        token: store.token || '',
        secret: store.secret || ''
      });
      setTestResult({
        success: true,
        country: store.country,
        store_id: store.store_id
      });
      setCredentialsChanged(false);
    }
  }, [store, open]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Se alterar token ou secret, marcar como alterado e limpar teste
    if (field === 'token' || field === 'secret') {
      if (value !== store[field]) {
        setCredentialsChanged(true);
        setTestResult(null);
      } else {
        // Se voltou ao valor original, restaurar teste
        const tokenMatch = field === 'token' ? value === store.token : formData.token === store.token;
        const secretMatch = field === 'secret' ? value === store.secret : formData.secret === store.secret;

        if (tokenMatch && secretMatch) {
          setCredentialsChanged(false);
          setTestResult({
            success: true,
            country: store.country,
            store_id: store.store_id
          });
        }
      }
    }
  };

  const handleTestConnection = async () => {
    if (!formData.token || !formData.secret) {
      setError('Token e Secret são obrigatórios');
      return;
    }

    setTesting(true);
    setError(null);
    setTestResult(null);

    try {
      const response = await axios.post(
        '/metricas/ecomhub/stores/test_connection/',
        {
          token: formData.token,
          secret: formData.secret
        },
        {
          headers: { 'X-CSRFToken': getCSRFToken() }
        }
      );

      if (response.data.valid) {
        setTestResult({
          success: true,
          country: response.data.country?.name || 'País não detectado (sem pedidos)',
          store_id: response.data.store_id,
          message: response.data.message
        });
        setCredentialsChanged(false);
      } else {
        setError(response.data.error || 'Erro ao testar conexão');
      }
    } catch (err) {
      console.error('Erro ao testar conexão:', err);
      setError(err.response?.data?.error || 'Erro ao conectar com API ECOMHUB');
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.token || !formData.secret) {
      setError('Todos os campos são obrigatórios');
      return;
    }

    if (!testResult?.success) {
      setError('É necessário testar a conexão antes de salvar');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await axios.put(
        `/metricas/ecomhub/stores/${store.id}/`,
        formData,
        {
          headers: { 'X-CSRFToken': getCSRFToken() }
        }
      );

      if (response.data.id) {
        onSuccess('Loja atualizada com sucesso!');
        handleClose();
      }
    } catch (err) {
      console.error('Erro ao atualizar loja:', err);
      setError(err.response?.data?.error || 'Erro ao atualizar loja');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setFormData({ name: '', token: '', secret: '' });
    setShowToken(false);
    setShowSecret(false);
    setTesting(false);
    setTestResult(null);
    setSaving(false);
    setError(null);
    setCredentialsChanged(false);
    onClose();
  };

  if (!store) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md border-border bg-popover">
        <DialogHeader>
          <DialogTitle className="text-popover-foreground">Editar Loja</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Atualize as credenciais da loja ECOMHUB
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Info atual da loja */}
          <div className="p-3 border border-border rounded-md bg-muted/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">Dados Atuais</span>
              <Badge variant={store.is_active ? "default" : "secondary"} className="text-xs">
                {store.is_active ? 'Ativa' : 'Inativa'}
              </Badge>
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <div>País: <strong className="text-foreground">{store.country || 'N/A'}</strong></div>
              <div>Store ID: <strong className="text-foreground font-mono">{store.store_id || 'N/A'}</strong></div>
            </div>
          </div>

          {/* Nome da Loja */}
          <div className="space-y-2">
            <Label htmlFor="edit-name" className="text-foreground">
              Nome da Loja *
            </Label>
            <Input
              id="edit-name"
              placeholder="Ex: Loja Espanha Principal"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              disabled={testing || saving}
              className="border-border bg-background text-foreground"
            />
          </div>

          {/* Token */}
          <div className="space-y-2">
            <Label htmlFor="edit-token" className="text-foreground">
              Token API *
            </Label>
            <div className="relative">
              <Input
                id="edit-token"
                type={showToken ? "text" : "password"}
                placeholder="Token da API ECOMHUB"
                value={formData.token}
                onChange={(e) => handleChange('token', e.target.value)}
                disabled={testing || saving}
                className="border-border bg-background text-foreground pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowToken(!showToken)}
                disabled={testing || saving}
              >
                {showToken ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>

          {/* Secret */}
          <div className="space-y-2">
            <Label htmlFor="edit-secret" className="text-foreground">
              Secret *
            </Label>
            <div className="relative">
              <Input
                id="edit-secret"
                type={showSecret ? "text" : "password"}
                placeholder="Secret da API ECOMHUB"
                value={formData.secret}
                onChange={(e) => handleChange('secret', e.target.value)}
                disabled={testing || saving}
                className="border-border bg-background text-foreground pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowSecret(!showSecret)}
                disabled={testing || saving}
              >
                {showSecret ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>

          {/* Aviso de credenciais alteradas */}
          {credentialsChanged && (
            <Alert className="border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800 dark:text-yellow-300 text-sm">
                Credenciais alteradas. Teste a conexão novamente antes de salvar.
              </AlertDescription>
            </Alert>
          )}

          {/* Botão Testar Conexão */}
          <Button
            variant="outline"
            onClick={handleTestConnection}
            disabled={!formData.token || !formData.secret || testing || saving}
            className="w-full border-blue-300 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
          >
            {testing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Testando Conexão...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {credentialsChanged ? 'Testar Novamente' : 'Testar Conexão'}
              </>
            )}
          </Button>

          {/* Resultado do Teste */}
          {testResult && !credentialsChanged && (
            <Alert className="border-green-300 bg-green-50 dark:bg-green-900/20">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-300">
                <strong>Conexão verificada!</strong>
                <div className="mt-2 space-y-1 text-sm">
                  <div>País: <strong>{testResult.country}</strong></div>
                  <div>Store ID: <strong>{testResult.store_id}</strong></div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Erro */}
          {error && (
            <Alert variant="destructive" className="border-red-300">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={testing || saving}
            className="border-border bg-background text-foreground hover:bg-accent"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={!testResult?.success || credentialsChanged || saving || testing}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar Alterações'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default EditStoreModal;
