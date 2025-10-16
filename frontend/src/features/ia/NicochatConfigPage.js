import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getCSRFToken } from '../../utils/csrf';

// shadcn/ui imports
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';

// Ícones
import { RefreshCw, AlertTriangle, Check, X, Eye, EyeOff, Plus, Trash2, Power } from 'lucide-react';

// Componentes locais
import { LoadingSpinner, ErrorAlert } from './components';

export default function NicochatConfigPage() {
  // Estados do formulário
  const [formData, setFormData] = useState({
    nome: '',
    api_key: ''
  });
  const [showApiKey, setShowApiKey] = useState(false);

  // Estados da lista de configurações
  const [configs, setConfigs] = useState([]);

  // Estados de loading/erro
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [testingConnection, setTestingConnection] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Carregar configurações existentes
  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      setLoadingList(true);
      setError(null);

      const response = await axios.get('/ia/nicochat-configs/');
      setConfigs(response.data.results || response.data);
    } catch (err) {
      console.error('Erro ao carregar configurações:', err);
      setError('Erro ao carregar configurações');
    } finally {
      setLoadingList(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleTestConnection = async () => {
    if (!formData.api_key) {
      setError('Por favor, insira uma API Key');
      return;
    }

    try {
      setTestingConnection(true);
      setError(null);
      setSuccess(null);

      const response = await axios.post(
        '/ia/nicochat/testar-conexao/',
        { api_key: formData.api_key },
        { headers: { 'X-CSRFToken': getCSRFToken() } }
      );

      if (response.data.success) {
        setSuccess('Conexão testada com sucesso!');
      } else {
        setError(response.data.error || 'Erro ao testar conexão');
      }
    } catch (err) {
      console.error('Erro ao testar conexão:', err);
      setError(err.response?.data?.error || 'Erro ao testar conexão');
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.nome || !formData.api_key) {
      setError('Preencha todos os campos');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      await axios.post(
        '/ia/nicochat-configs/',
        formData,
        { headers: { 'X-CSRFToken': getCSRFToken() } }
      );

      setSuccess('Configuração salva com sucesso!');
      setFormData({ nome: '', api_key: '' });
      fetchConfigs();
    } catch (err) {
      console.error('Erro ao salvar configuração:', err);
      setError(err.response?.data?.error || 'Erro ao salvar configuração');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (configId, currentStatus) => {
    try {
      await axios.put(
        `/ia/nicochat-configs/${configId}/`,
        { ativo: !currentStatus },
        { headers: { 'X-CSRFToken': getCSRFToken() } }
      );

      fetchConfigs();
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      setError('Erro ao atualizar status da configuração');
    }
  };

  const handleDelete = async (configId) => {
    if (!window.confirm('Tem certeza que deseja excluir esta configuração?')) {
      return;
    }

    try {
      await axios.delete(
        `/ia/nicochat-configs/${configId}/`,
        { headers: { 'X-CSRFToken': getCSRFToken() } }
      );

      setSuccess('Configuração excluída com sucesso!');
      fetchConfigs();
    } catch (err) {
      console.error('Erro ao excluir configuração:', err);
      setError('Erro ao excluir configuração');
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">Configurações NicoChat</h1>
          <p className="text-muted-foreground">
            Gerencie suas API Keys e configurações do NicoChat
          </p>
        </div>

        {/* Formulário de Nova Configuração */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Adicionar Nova Configuração
            </CardTitle>
            <CardDescription>
              Configure uma nova API Key para integração com o NicoChat
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nome */}
              <div className="space-y-2">
                <Label htmlFor="nome">Nome da Configuração</Label>
                <Input
                  id="nome"
                  name="nome"
                  type="text"
                  placeholder="Ex: Configuração Principal"
                  value={formData.nome}
                  onChange={handleInputChange}
                  disabled={loading}
                />
              </div>

              {/* API Key */}
              <div className="space-y-2">
                <Label htmlFor="api_key">API Key</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="api_key"
                      name="api_key"
                      type={showApiKey ? 'text' : 'password'}
                      placeholder="Cole sua API Key aqui"
                      value={formData.api_key}
                      onChange={handleInputChange}
                      disabled={loading}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleTestConnection}
                    disabled={testingConnection || !formData.api_key}
                  >
                    {testingConnection ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Testando...
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Testar Conexão
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Alertas */}
              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="border-green-500 bg-green-50">
                  <Check className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-600">{success}</AlertDescription>
                </Alert>
              )}

              {/* Botões */}
              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Salvar Configuração
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setFormData({ nome: '', api_key: '' });
                    setError(null);
                    setSuccess(null);
                  }}
                  disabled={loading}
                >
                  Limpar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Lista de Configurações */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Configurações Existentes</span>
              <Button variant="outline" size="sm" onClick={fetchConfigs} disabled={loadingList}>
                <RefreshCw className={`h-4 w-4 ${loadingList ? 'animate-spin' : ''}`} />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingList ? (
              <LoadingSpinner message="Carregando configurações..." />
            ) : configs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Nenhuma configuração cadastrada</p>
              </div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data de Criação</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {configs.map((config) => (
                      <TableRow key={config.id}>
                        <TableCell className="font-medium">{config.nome}</TableCell>
                        <TableCell>
                          {config.ativo ? (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                              <Check className="mr-1 h-3 w-3" />
                              Ativa
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <X className="mr-1 h-3 w-3" />
                              Inativa
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(config.criado_em).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleActive(config.id, config.ativo)}
                            >
                              <Power className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(config.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
