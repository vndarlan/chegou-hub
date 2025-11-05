import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Bell, Clock, AlertTriangle, User, Calendar, MessageSquare, Check, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useToast } from './ui/use-toast';
import apiClient from '../utils/axios';
import { getCSRFToken } from '../utils/csrf';

const FeedbackNotificationButton = ({ isAdmin }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingFeedbacks, setPendingFeedbacks] = useState([]);
  const [feedbackNotifications, setFeedbackNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [count, setCount] = useState(0);
  const [notificationsCount, setNotificationsCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const { toast } = useToast();


  // Buscar apenas a contagem de feedbacks pendentes (mais rápido)
  const fetchPendingCount = async () => {
    if (!isAdmin) return;
    
    try {
      const response = await apiClient.get('/feedback/pending/count/', {
        headers: {
          'X-CSRFToken': getCSRFToken(),
        }
      });
      const pendingCount = response.data?.count || 0;
      setCount(pendingCount);
      updateTotalCount(pendingCount, notificationsCount);
    } catch (error) {
      console.error('Erro ao buscar contagem de feedbacks pendentes:', error);
      setCount(0);
      updateTotalCount(0, notificationsCount);
    }
  };

  // Buscar contagem de notificações de feedbacks
  const fetchNotificationsCount = async () => {
    if (!isAdmin) return;
    
    try {
      const response = await apiClient.get('/feedback/notifications/', {
        headers: {
          'X-CSRFToken': getCSRFToken(),
        }
      });
      const notifCount = response.data?.count || 0;
      setNotificationsCount(notifCount);
      updateTotalCount(count, notifCount);
    } catch (error) {
      console.error('Erro ao buscar contagem de notificações:', error);
      setNotificationsCount(0);
      updateTotalCount(count, 0);
    }
  };

  // Atualizar contagem total
  const updateTotalCount = (pendingCount, notifCount) => {
    setTotalCount(Math.max(pendingCount, notifCount)); // Usar o maior valor para evitar duplicação
  };

  // Função para atualizar status do feedback
  const updateFeedbackStatus = async (feedbackId, newStatus) => {
    try {
      const response = await apiClient.patch(`/feedback/${feedbackId}/update-status/`, {
        status: newStatus
      }, {
        headers: {
          'X-CSRFToken': getCSRFToken(),
        }
      });

      // Atualizar a lista local de feedbacks
      setPendingFeedbacks(prev => 
        prev.map(feedback => 
          feedback.id === feedbackId 
            ? { ...feedback, status: newStatus }
            : feedback
        ).filter(feedback => {
          // Se o status mudou para 'resolvido', remover da lista de pendentes
          if (newStatus === 'resolvido') {
            return feedback.id !== feedbackId;
          }
          return true;
        })
      );

      // Atualizar contagens
      fetchPendingCount();
      fetchNotificationsCount();

      // Mostrar toast de sucesso
      toast({
        title: "Status atualizado",
        description: response.data.message,
        variant: "default",
      });

    } catch (error) {
      console.error('Erro ao atualizar status do feedback:', error);
      
      let errorMessage = 'Erro ao atualizar status do feedback.';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }

      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };
  
  // Buscar feedbacks completos (apenas quando modal abrir)
  const fetchPendingFeedbacks = async () => {
    if (!isAdmin) return;
    
    try {
      setLoading(true);
      const response = await apiClient.get('/feedback/pending/', {
        headers: {
          'X-CSRFToken': getCSRFToken(),
        }
      });
      setPendingFeedbacks(response.data || []);
      setCount(response.data?.length || 0);
    } catch (error) {
      console.error('Erro ao buscar feedbacks pendentes:', error);
      setPendingFeedbacks([]);
      setCount(0);
    } finally {
      setLoading(false);
    }
  };

  // Buscar notificações de feedbacks completas (apenas quando modal abrir)
  const fetchFeedbackNotifications = async () => {
    if (!isAdmin) return;
    
    try {
      setNotificationsLoading(true);
      const response = await apiClient.get('/feedback/notifications/', {
        headers: {
          'X-CSRFToken': getCSRFToken(),
        }
      });
      setFeedbackNotifications(response.data?.results || []);
      setNotificationsCount(response.data?.count || 0);
    } catch (error) {
      console.error('Erro ao buscar notificações de feedbacks:', error);
      setFeedbackNotifications([]);
      setNotificationsCount(0);
    } finally {
      setNotificationsLoading(false);
    }
  };

  // Buscar dados quando o modal for aberto
  useEffect(() => {
    if (isOpen && isAdmin) {
      fetchPendingFeedbacks();
      fetchFeedbackNotifications();
    }
  }, [isOpen, isAdmin]);

  // Buscar contagens iniciais quando o componente montar
  useEffect(() => {
    if (isAdmin) {
      fetchPendingCount();
      fetchNotificationsCount();
    }
  }, [isAdmin]);
  
  // Atualizar periodicamente apenas as contagens (a cada 30 segundos)
  useEffect(() => {
    if (!isAdmin) return;
    
    const interval = setInterval(() => {
      fetchPendingCount();
      fetchNotificationsCount();
    }, 30000); // 30 segundos
    
    return () => clearInterval(interval);
  }, [isAdmin, count, notificationsCount]);

  // Não renderizar nada se não for admin
  if (!isAdmin) {
    return null;
  }

  const getPrioridadeColor = (prioridade) => {
    switch (prioridade) {
      case 'alta': return 'text-red-600 bg-red-50';
      case 'media': return 'text-orange-600 bg-orange-50';
      case 'baixa': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getPrioridadeLabel = (prioridade) => {
    switch (prioridade) {
      case 'alta': return 'Alta';
      case 'media': return 'Média';
      case 'baixa': return 'Baixa';
      default: return prioridade;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pendente': return 'Pendente';
      case 'em_analise': return 'Em análise';
      case 'resolvido': return 'Resolvido';
      default: return status;
    }
  };

  const getCategoriaLabel = (categoria) => {
    switch (categoria) {
      case 'bug': return 'Bug/Erro';
      case 'melhoria': return 'Sugestão de melhoria';
      case 'outro': return 'Outro';
      default: return categoria;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 hover:bg-accent text-foreground hover:text-foreground relative"
          title={`Notificações (${totalCount})`}
        >
          <Bell className="h-4 w-4" />
          {totalCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-xs"
            >
              {totalCount > 99 ? '99+' : totalCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Central de Notificações
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="notifications" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Notificações ({notificationsCount})
            </TabsTrigger>
            <TabsTrigger value="feedbacks" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Feedbacks Detalhados ({count})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="notifications" className="space-y-4 mt-4">
            {notificationsLoading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : feedbackNotifications.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma notificação de feedback!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {feedbackNotifications.map((notification) => (
                  <Card key={notification.id} className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => {
                          // Aqui poderia implementar navegação para detalhes do feedback
                          console.log('Clicked notification:', notification);
                        }}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base font-medium truncate">
                            Feedback: {notification.title}
                          </CardTitle>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {notification.user}
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(notification.created_at)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline" 
                            className={getPrioridadeColor(notification.priority)}
                          >
                            {notification.priority === 'alta' && <AlertTriangle className="h-3 w-3 mr-1" />}
                            {getPrioridadeLabel(notification.priority)}
                          </Badge>
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {getCategoriaLabel(notification.category)}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="feedbacks" className="space-y-4 mt-4">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : pendingFeedbacks.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum feedback pendente!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingFeedbacks.map((feedback) => (
                  <Card key={feedback.id} className="border-l-4 border-l-orange-500">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base font-medium truncate">
                            {feedback.titulo}
                          </CardTitle>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {feedback.usuario_nome}
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(feedback.data_criacao)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline" 
                            className={getPrioridadeColor(feedback.prioridade)}
                          >
                            {feedback.prioridade === 'alta' && <AlertTriangle className="h-3 w-3 mr-1" />}
                            {getPrioridadeLabel(feedback.prioridade)}
                          </Badge>
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {getCategoriaLabel(feedback.categoria)}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <span className="text-sm font-medium text-muted-foreground">
                              Status: 
                            </span>
                            <span className="text-sm ml-2">
                              {getStatusLabel(feedback.status)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-muted-foreground">
                              Alterar status:
                            </span>
                            <Select
                              value={feedback.status}
                              onValueChange={(newStatus) => updateFeedbackStatus(feedback.id, newStatus)}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pendente">
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3 text-orange-500" />
                                    Pendente
                                  </div>
                                </SelectItem>
                                <SelectItem value="em_analise">
                                  <div className="flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3 text-blue-500" />
                                    Em análise
                                  </div>
                                </SelectItem>
                                <SelectItem value="resolvido">
                                  <div className="flex items-center gap-1">
                                    <Check className="h-3 w-3 text-green-500" />
                                    Resolvido
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        {feedback.url_pagina && (
                          <div>
                            <span className="text-sm font-medium text-muted-foreground">
                              Página: 
                            </span>
                            <span className="text-sm ml-2 text-blue-600 hover:underline">
                              <a 
                                href={feedback.url_pagina} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="break-all"
                              >
                                {feedback.url_pagina}
                              </a>
                            </span>
                          </div>
                        )}
                        
                        <Separator className="my-2" />
                        
                        <div>
                          <span className="text-sm font-medium text-muted-foreground block mb-1">
                            Descrição:
                          </span>
                          <p className="text-sm whitespace-pre-wrap break-words">
                            {feedback.descricao}
                          </p>
                        </div>
                        
                        {feedback.imagem_url && (
                          <div>
                            <span className="text-sm font-medium text-muted-foreground block mb-2">
                              Imagem:
                            </span>
                            <img 
                              src={feedback.imagem_url} 
                              alt="Screenshot do feedback"
                              className="max-w-full h-auto rounded border"
                              style={{ maxHeight: '200px' }}
                            />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-end items-center">
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                fetchPendingFeedbacks();
                fetchFeedbackNotifications();
              }}
              disabled={loading || notificationsLoading}
            >
              {(loading || notificationsLoading) ? 'Atualizando...' : 'Atualizar Tudo'}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setIsOpen(false)}
            >
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FeedbackNotificationButton;