import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { ScrollArea } from '../../../components/ui/scroll-area';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import { RefreshCw, Package } from 'lucide-react';

export default function FeedbackDevolucaoCard({ configId, onRefresh }) {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const FLOW_ID = 'f108059';

  useEffect(() => {
    if (configId) {
      fetchFeedbacks();
    }
  }, [configId]);

  const fetchFeedbacks = async () => {
    if (!configId) {
      console.warn('FeedbackDevolucaoCard: configId não definido');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await axios.get('/ia/nicochat/user-fields/', {
        params: {
          flow_id: FLOW_ID,
          config_id: configId
        }
      });

      if (response.data.success) {
        const userFields = response.data.data || [];

        console.log('🔍 FeedbackDevolucaoCard: Total de userFields:', userFields.length);

        // Log de todos os campos do primeiro registro para debug
        if (userFields.length > 0) {
          console.log('🔍 Campos disponíveis no primeiro registro:', Object.keys(userFields[0]));
          console.log('🔍 Primeiro registro completo:', userFields[0]);
        }

        // Filtrar apenas registros que têm formsDevolucao (testando variações)
        const feedbacksData = userFields
          .filter(user => {
            const temFormsDevolucao = user.formsDevolucao || user.formsdevolucao || user.formsDevolucao || user.Formsdevolucao;
            if (temFormsDevolucao) {
              console.log('✅ Encontrado formsDevolucao em:', user.nome || user.telefone);
            }
            return temFormsDevolucao;
          })
          .map(user => {
            // Tentar várias variações do nome do campo
            const formsDevolucaoRaw = user.formsDevolucao || user.formsdevolucao || user.formsDevolucao || user.Formsdevolucao;
            try {
              // Parse do JSON do campo formsDevolucao
              const devolucaoData = typeof formsDevolucaoRaw === 'string'
                ? JSON.parse(formsDevolucaoRaw)
                : formsDevolucaoRaw;

              console.log('📦 Dados de devolução parseados:', devolucaoData);

              // Retornar apenas se tiver feedback preenchido
              if (devolucaoData.feedback && devolucaoData.feedback.trim() !== '') {
                return {
                  nombre: devolucaoData.nombre || user.nome || 'N/A',
                  feedback: devolucaoData.feedback,
                  numerodopedido: devolucaoData.numerodopedido || '',
                  email: devolucaoData.email || ''
                };
              }
              return null;
            } catch (err) {
              console.error('Erro ao parsear formsDevolucao:', err);
              return null;
            }
          })
          .filter(item => item !== null); // Remover itens nulos

        setFeedbacks(feedbacksData);
      }
    } catch (err) {
      console.error('Erro ao carregar feedbacks de devolução:', err);
      setError(err.response?.data?.error || 'Erro ao carregar feedbacks de devolução');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchFeedbacks();
    if (onRefresh) {
      onRefresh();
    }
  };

  return (
    <Card className="bg-gradient-to-b from-yellow-50/50 to-yellow-50 border-yellow-200">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-yellow-600" />
            Feedback de Devoluções
            {feedbacks.length > 0 && (
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                {feedbacks.length}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={loading || !configId}
            title="Atualizar feedbacks"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading && feedbacks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 space-y-3">
            <RefreshCw className="h-8 w-8 animate-spin text-yellow-600" />
            <p className="text-sm text-muted-foreground">Carregando feedbacks...</p>
          </div>
        ) : feedbacks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-2 opacity-50 text-yellow-600" />
            <p>Nenhum feedback de devolução registrado</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-3">
            <div className="space-y-3">
              {feedbacks.map((item, index) => (
                <div
                  key={index}
                  className="border-l-4 border-yellow-500 bg-muted/30 p-3 rounded"
                >
                  <p className="font-medium text-sm mb-1">{item.nombre}</p>
                  <p className="text-xs text-muted-foreground italic">"{item.feedback}"</p>
                  {item.numerodopedido && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Pedido: {item.numerodopedido}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
