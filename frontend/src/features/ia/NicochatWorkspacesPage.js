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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';

// Ícones
import { RefreshCw, AlertTriangle, Check, X, Eye, EyeOff, Plus, Trash2, Power } from 'lucide-react';

// Componentes locais
import { LoadingSpinner, ErrorAlert } from './components';

export default function NicochatWorkspacesPage() {
  // Estados do formulário
  const [formData, setFormData] = useState({
    nome: '',
    api_key: '',
    tipo_whatsapp: '',
    limite_contatos: 1000
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

      const response = await axios.get('/ia/nicochat-workspaces/');
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

    if (!formData.nome || !formData.api_key || !formData.limite_contatos) {
      setError('Preencha todos os campos');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      await axios.post(
        '/ia/nicochat-workspaces/',
        formData,
        { headers: { 'X-CSRFToken': getCSRFToken() } }
      );

      setSuccess('Workspace salvo com sucesso!');
      setFormData({ nome: '', api_key: '', limite_contatos: 1000 });
      fetchConfigs();
    } catch (err) {
      console.error('Erro ao salvar workspace:', err);
      setError(err.response?.data?.error || 'Erro ao salvar workspace');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (configId, currentStatus) => {
    try {
      await axios.put(
        `/ia/nicochat-workspaces/${configId}/`,
        { ativo: !currentStatus },
        { headers: { 'X-CSRFToken': getCSRFToken() } }
      );

      fetchConfigs();
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      setError('Erro ao atualizar status do workspace');
    }
  };

  const handleDelete = async (configId) => {
    if (!window.confirm('Tem certeza que deseja excluir este workspace?')) {
      return;
    }

    try {
      await axios.delete(
        `/ia/nicochat-workspaces/${configId}/`,
        { headers: { 'X-CSRFToken': getCSRFToken() } }
      );

      setSuccess('Workspace excluído com sucesso!');
      fetchConfigs();
    } catch (err) {
      console.error('Erro ao excluir workspace:', err);
      setError('Erro ao excluir workspace');
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">Workspaces</h1>
          <p className="text-muted-foreground">
            Gerencie seus workspaces e API Keys do NicoChat
          </p>
        </div>

        {/* Formulário de Novo Workspace */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Adicionar Novo Workspace
            </CardTitle>
            <CardDescription>
              Configure um novo workspace com sua API Key do NicoChat
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nome */}
              <div className="space-y-2">
                <Label htmlFor="nome">Nome do Workspace</Label>
                <Input
                  id="nome"
                  name="nome"
                  type="text"
                  placeholder="Ex: Workspace Principal"
                  value={formData.nome}
                  onChange={handleInputChange}
                  disabled={loading}
                />
              </div>

              {/* Tipo de WhatsApp */}
              <div className="space-y-2">
                <Label htmlFor="tipo_whatsapp">Tipo de WhatsApp</Label>
                <Select
                  value={formData.tipo_whatsapp}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, tipo_whatsapp: value }))}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo de conexão" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cloud">WhatsApp Cloud API</SelectItem>
                    <SelectItem value="qr_code">WhatsApp QR Code</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Tipo de conexão do WhatsApp (Cloud API ou QR Code)
                </p>
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

              {/* Limite de Contatos */}
              <div className="space-y-2">
                <Label htmlFor="limite_contatos">Limite de Contatos</Label>
                <Input
                  id="limite_contatos"
                  name="limite_contatos"
                  type="number"
                  min="1"
                  placeholder="Ex: 1000"
                  value={formData.limite_contatos}
                  onChange={handleInputChange}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Número máximo de contatos permitidos neste workspace
                </p>
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
                      Salvar Workspace
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setFormData({ nome: '', api_key: '', tipo_whatsapp: '', limite_contatos: 1000 });
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

        {/* Lista de Workspaces */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Workspaces Existentes</span>
              <Button variant="outline" size="sm" onClick={fetchConfigs} disabled={loadingList}>
                <RefreshCw className={`h-4 w-4 ${loadingList ? 'animate-spin' : ''}`} />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingList ? (
              <LoadingSpinner message="Carregando workspaces..." />
            ) : configs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Nenhum workspace cadastrado</p>
              </div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Contatos</TableHead>
                      <TableHead>Limite</TableHead>
                      <TableHead>Utilização</TableHead>
                      <TableHead>Data de Criação</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {configs.map((config) => (
                      <TableRow key={config.id}>
                        <TableCell className="font-medium">{config.nome}</TableCell>
                        <TableCell>
                          {config.tipo_whatsapp === 'cloud' ? (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                              Cloud API
                            </Badge>
                          ) : config.tipo_whatsapp === 'qr_code' ? (
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300">
                              QR Code
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-300">
                              Não definido
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {config.ativo ? (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                              <Check className="mr-1 h-3 w-3" />
                              Ativo
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <X className="mr-1 h-3 w-3" />
                              Inativo
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {config.contatos_atuais || 0}
                        </TableCell>
                        <TableCell className="text-sm">
                          {config.limite_contatos || 'N/A'}
                        </TableCell>
                        <TableCell>
                          {config.limite_atingido ? (
                            <Badge variant="destructive">
                              <AlertTriangle className="mr-1 h-3 w-3" />
                              Limite Atingido
                            </Badge>
                          ) : config.percentual_utilizado >= 90 ? (
                            <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                              {config.percentual_utilizado?.toFixed(1)}%
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                              {config.percentual_utilizado?.toFixed(1)}%
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
