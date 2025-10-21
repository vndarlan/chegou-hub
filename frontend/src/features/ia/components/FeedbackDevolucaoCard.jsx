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

  useEffect(() => {
    if (configId) {
      fetchFeedbacks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configId]);

  const fetchFeedbacks = async () => {
    if (!configId) {
      console.warn('FeedbackDevolucaoCard: configId não definido');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Usar o novo endpoint que retorna subscribers com user_fields
      const response = await axios.get('/ia/nicochat/subscribers/', {
        params: {
          config_id: configId,
          limit: 100  // Buscar até 100 subscribers por vez
        }
      });

      if (response.data.success) {
        const subscribers = response.data.data || [];
        console.log('🔍 FeedbackDevolucaoCard: Total de subscribers recebidos:', subscribers.length);

        // Processar subscribers para extrair formsdevolucao
        const feedbacksData = [];

        for (const subscriber of subscribers) {
          // Buscar dentro de user_fields array
          const userFieldsArray = subscriber.user_fields || [];

          console.log('📋 Subscriber:', subscriber.name || subscriber.id, '- Total de user_fields:', userFieldsArray.length);

          // Mostrar todos os campos disponíveis (apenas os primeiros 5 subscribers para não poluir)
          if (feedbacksData.length < 5) {
            console.log('   Campos disponíveis:', userFieldsArray.map(f => ({ name: f.name, var_ns: f.var_ns })));
          }

          // Procurar o campo formsdevolucao (tentar várias variações)
          const formsDevolucaoField = userFieldsArray.find(
            field =>
              field.name?.toLowerCase() === 'formsdevolucao' ||
              field.name?.toLowerCase() === 'formsdevolução' ||
              field.name?.toLowerCase().includes('devolucao') ||
              field.name?.toLowerCase().includes('devolução') ||
              field.var_ns === 'f108059v5901303'
          );

          if (formsDevolucaoField) {
            console.log('✅ Campo formsdevolucao encontrado!', formsDevolucaoField);

            if (formsDevolucaoField.value) {
              try {
                // Parse do JSON do campo formsdevolucao
                const devolucaoData = typeof formsDevolucaoField.value === 'string'
                  ? JSON.parse(formsDevolucaoField.value)
                  : formsDevolucaoField.value;

                console.log('📦 Dados parseados:', devolucaoData);

                // Apenas adicionar se tiver feedback preenchido
                if (devolucaoData.feedback && devolucaoData.feedback.trim() !== '') {
                  console.log('💬 Feedback válido encontrado:', devolucaoData.feedback);
                  feedbacksData.push({
                    nombre: devolucaoData.nombre || subscriber.name || 'N/A',
                    feedback: devolucaoData.feedback,
                    numerodopedido: devolucaoData.numerodopedido || '',
                    email: devolucaoData.email || subscriber.email || ''
                  });
                } else {
                  console.log('⚠️ Campo feedback vazio ou não encontrado');
                }
              } catch (err) {
                console.error('❌ Erro ao parsear formsdevolucao:', err, formsDevolucaoField.value);
              }
            } else {
              console.log('⚠️ Campo formsdevolucao encontrado mas sem valor');
            }
          }
        }

        console.log('📊 Total de feedbacks processados:', feedbacksData.length);
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
