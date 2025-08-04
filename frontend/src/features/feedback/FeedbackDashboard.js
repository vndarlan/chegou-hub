import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Bug, 
  Lightbulb, 
  Users, 
  MoreHorizontal,
  Eye,
  RefreshCw
} from 'lucide-react';
import axios from 'axios';

const FeedbackDashboard = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    categoria: 'all',
    prioridade: 'all'
  });

  const statusColors = {
    'pendente': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'em_analise': 'bg-blue-100 text-blue-800 border-blue-200',
    'resolvido': 'bg-green-100 text-green-800 border-green-200'
  };

  const prioridadeColors = {
    'baixa': 'bg-gray-100 text-gray-800 border-gray-200',
    'media': 'bg-orange-100 text-orange-800 border-orange-200',
    'alta': 'bg-red-100 text-red-800 border-red-200'
  };

  const categoriaIcons = {
    'bug': Bug,
    'melhoria': Lightbulb,
    'usabilidade': Users,
    'outro': MoreHorizontal
  };

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [feedbacksRes, statsRes] = await Promise.all([
        axios.get('/feedback/list/', { 
          params: {
            status: filters.status === 'all' ? undefined : filters.status,
            categoria: filters.categoria === 'all' ? undefined : filters.categoria,
            prioridade: filters.prioridade === 'all' ? undefined : filters.prioridade
          },
          withCredentials: true 
        }),
        axios.get('/feedback/stats/', { withCredentials: true })
      ]);

      setFeedbacks(feedbacksRes.data);
      setStats(statsRes.data);
      setError('');
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setError('Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (feedbackId, newStatus) => {
    try {
      await axios.patch(`/feedback/update-status/${feedbackId}/`, {
        status: newStatus
      }, { withCredentials: true });
      
      fetchData(); // Recarregar dados
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      setError('Erro ao atualizar status');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-6 w-6 animate-spin" />
        <span className="ml-2">Carregando...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard de Feedback</h1>
          <p className="text-muted-foreground">Gerencie feedbacks e relatórios de bugs dos usuários</p>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {error && (
        <Alert className="border-destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-destructive">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendentes || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Análise</CardTitle>
            <AlertTriangle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.em_analise || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolvidos</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.resolvidos || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">Lista de Feedbacks</TabsTrigger>
          <TabsTrigger value="stats">Estatísticas</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          {/* Filtros */}
          <Card>
            <CardHeader>
              <CardTitle>Filtros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="em_analise">Em Análise</SelectItem>
                      <SelectItem value="resolvido">Resolvido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Categoria</label>
                  <Select value={filters.categoria} onValueChange={(value) => setFilters(prev => ({ ...prev, categoria: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="bug">Bug/Erro</SelectItem>
                      <SelectItem value="melhoria">Sugestão de melhoria</SelectItem>
                      <SelectItem value="usabilidade">Problema de usabilidade</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Prioridade</label>
                  <Select value={filters.prioridade} onValueChange={(value) => setFilters(prev => ({ ...prev, prioridade: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="media">Média</SelectItem>
                      <SelectItem value="baixa">Baixa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabela de Feedbacks */}
          <Card>
            <CardHeader>
              <CardTitle>Feedbacks ({feedbacks.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {feedbacks.map((feedback) => {
                    const IconComponent = categoriaIcons[feedback.categoria] || MoreHorizontal;
                    return (
                      <TableRow key={feedback.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center space-x-2">
                            <IconComponent className="h-4 w-4" />
                            <span>{feedback.titulo}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{feedback.categoria_display}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={prioridadeColors[feedback.prioridade]}>
                            {feedback.prioridade_display}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Select 
                            value={feedback.status} 
                            onValueChange={(value) => updateStatus(feedback.id, value)}
                          >
                            <SelectTrigger className="w-[130px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pendente">Pendente</SelectItem>
                              <SelectItem value="em_analise">Em Análise</SelectItem>
                              <SelectItem value="resolvido">Resolvido</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>{feedback.usuario_nome}</TableCell>
                        <TableCell>{formatDate(feedback.data_criacao)}</TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setSelectedFeedback(feedback)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>{feedback.titulo}</DialogTitle>
                              </DialogHeader>
                              {selectedFeedback && (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <label className="text-sm font-medium">Categoria</label>
                                      <p>{selectedFeedback.categoria_display}</p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Prioridade</label>
                                      <p>{selectedFeedback.prioridade_display}</p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Status</label>
                                      <p>{selectedFeedback.status_display}</p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Usuário</label>
                                      <p>{selectedFeedback.usuario_nome}</p>
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <label className="text-sm font-medium">Descrição</label>
                                    <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                                      {selectedFeedback.descricao}
                                    </p>
                                  </div>
                                  
                                  <div>
                                    <label className="text-sm font-medium">URL da Página</label>
                                    <p className="mt-1 text-sm text-blue-600 break-all">
                                      {selectedFeedback.url_pagina}
                                    </p>
                                  </div>
                                  
                                  {selectedFeedback.imagem && (
                                    <div>
                                      <label className="text-sm font-medium">Imagem Anexada</label>
                                      <img 
                                        src={selectedFeedback.imagem} 
                                        alt="Anexo do feedback"
                                        className="mt-2 max-w-full h-auto rounded border"
                                      />
                                    </div>
                                  )}
                                  
                                  <div>
                                    <label className="text-sm font-medium">Data de Criação</label>
                                    <p>{formatDate(selectedFeedback.data_criacao)}</p>
                                  </div>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Por Categoria</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.por_categoria && Object.entries(stats.por_categoria).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center">
                      <span className="text-sm">{key === 'bug' ? 'Bug/Erro' : key === 'melhoria' ? 'Sugestão de melhoria' : key === 'usabilidade' ? 'Problema de usabilidade' : 'Outro'}</span>
                      <Badge variant="outline">{value}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Por Prioridade</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.por_prioridade && Object.entries(stats.por_prioridade).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center">
                      <span className="text-sm capitalize">{key === 'alta' ? 'Alta' : key === 'media' ? 'Média' : 'Baixa'}</span>
                      <Badge variant="outline">{value}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FeedbackDashboard;