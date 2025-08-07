import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Bell, Clock, AlertTriangle, User, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';
import axios from 'axios';
import { getCSRFToken } from '../utils/csrf';

const FeedbackNotificationButton = ({ isAdmin }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingFeedbacks, setPendingFeedbacks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState(0);


  // Buscar apenas a contagem (mais rápido)
  const fetchPendingCount = async () => {
    if (!isAdmin) return;
    
    try {
      const response = await axios.get('/api/feedback/pending/count/', {
        withCredentials: true,
        headers: {
          'X-CSRFToken': getCSRFToken(),
        }
      });
      setCount(response.data?.count || 0);
    } catch (error) {
      console.error('Erro ao buscar contagem de feedbacks pendentes:', error);
      setCount(0);
    }
  };
  
  // Buscar feedbacks completos (apenas quando modal abrir)
  const fetchPendingFeedbacks = async () => {
    if (!isAdmin) return;
    
    try {
      setLoading(true);
      const response = await axios.get('/api/feedback/pending/', {
        withCredentials: true,
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

  // Buscar feedbacks quando o modal for aberto
  useEffect(() => {
    if (isOpen && isAdmin) {
      fetchPendingFeedbacks();
    }
  }, [isOpen, isAdmin]);

  // Buscar contagem inicial quando o componente montar
  useEffect(() => {
    if (isAdmin) {
      fetchPendingCount();
    }
  }, [isAdmin]);
  
  // Atualizar periodicamente apenas a contagem (a cada 30 segundos)
  useEffect(() => {
    if (!isAdmin) return;
    
    const interval = setInterval(() => {
      fetchPendingCount();
    }, 30000); // 30 segundos
    
    return () => clearInterval(interval);
  }, [isAdmin]);

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
          title={`Feedbacks pendentes (${count})`}
        >
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-xs"
            >
              {count > 99 ? '99+' : count}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Feedbacks Pendentes ({count})
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
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
                          <Clock className="h-3 w-3" />
                          {getStatusLabel(feedback.status)}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">
                          Categoria: 
                        </span>
                        <span className="text-sm ml-2">
                          {getCategoriaLabel(feedback.categoria)}
                        </span>
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
        </div>
        
        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            Atualizado automaticamente a cada 30 segundos
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={fetchPendingFeedbacks}
              disabled={loading}
            >
              {loading ? 'Atualizando...' : 'Atualizar'}
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