import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import { RefreshCw, CheckCircle2, XCircle } from 'lucide-react';

export default function ConfirmacaoMetricsCard({ configId, onRefresh }) {
  const [confirmados, setConfirmados] = useState(0);
  const [naoConfirmados, setNaoConfirmados] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (configId) {
      fetchConfirmacoes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configId]);

  const fetchConfirmacoes = async (forceRefresh = false) => {
    if (!configId) {
      console.warn('ConfirmacaoMetricsCard: configId não definido');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = { config_id: configId };
      if (forceRefresh) {
        params.force_refresh = 'true';
      }

      const response = await axios.get('/ia/nicochat/subscribers/tags-stats/', {
        params
      });

      if (response.data.success) {
        const tags = response.data.tags || [];

        // Buscar tags "Confirmado" e "Não Confirmado"
        const tagConfirmado = tags.find(tag =>
          tag.name && tag.name.toLowerCase().includes('confirmado') &&
          !tag.name.toLowerCase().includes('não') &&
          !tag.name.toLowerCase().includes('nao')
        );

        const tagNaoConfirmado = tags.find(tag =>
          tag.name && (
            tag.name.toLowerCase().includes('não confirmado') ||
            tag.name.toLowerCase().includes('nao confirmado')
          )
        );

        setConfirmados(tagConfirmado?.count || 0);
        setNaoConfirmados(tagNaoConfirmado?.count || 0);
      }
    } catch (err) {
      console.error('Erro ao carregar confirmações:', err);
      setError('Erro ao carregar dados de confirmação');
    } finally {
      setLoading(false);
    }
  };

  const total = confirmados + naoConfirmados;
  const percentualConfirmados = total > 0 ? ((confirmados / total) * 100).toFixed(1) : 0;
  const percentualNaoConfirmados = total > 0 ? ((naoConfirmados / total) * 100).toFixed(1) : 0;

  return (
    <Card className="bg-gradient-to-b from-muted/50 to-muted border-border">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <span className="text-lg">Status de Confirmação</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchConfirmacoes(true)}
            disabled={loading || !configId}
            title="Atualizar confirmações"
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

        {loading && confirmados === 0 && naoConfirmados === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 space-y-3">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Carregando confirmações...</p>
          </div>
        ) : total === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <XCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="font-medium">Sem dados de confirmação</p>
            <p className="text-sm mt-1">Nenhum pedido confirmado ou não confirmado ainda</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Total de Pedidos */}
            <div className="text-center pb-4 border-b">
              <p className="text-sm text-muted-foreground mb-1">Total de Pedidos</p>
              <p className="text-3xl font-bold text-foreground">{total.toLocaleString('pt-BR')}</p>
            </div>

            {/* Métricas Confirmados */}
            <div className="space-y-3">
              {/* Confirmados */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">Confirmados</span>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">
                      {confirmados.toLocaleString('pt-BR')}
                    </p>
                    <p className="text-xs text-muted-foreground">{percentualConfirmados}%</p>
                  </div>
                </div>
                <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all duration-300"
                    style={{ width: `${percentualConfirmados}%` }}
                  />
                </div>
              </div>

              {/* Não Confirmados */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium">Não Confirmados</span>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-orange-600">
                      {naoConfirmados.toLocaleString('pt-BR')}
                    </p>
                    <p className="text-xs text-muted-foreground">{percentualNaoConfirmados}%</p>
                  </div>
                </div>
                <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500 transition-all duration-300"
                    style={{ width: `${percentualNaoConfirmados}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Badge de Status */}
            <div className="pt-4 border-t flex justify-center">
              {percentualConfirmados >= 70 ? (
                <Badge className="bg-green-100 text-green-800 border-green-300">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Ótima taxa de confirmação
                </Badge>
              ) : percentualConfirmados >= 50 ? (
                <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                  Taxa moderada
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
                  Melhorar confirmações
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
