import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import { Mail, TrendingUp, MousePointerClick, RefreshCw, Info } from 'lucide-react';

export default function EmailMetricsCard({ workspaceId }) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (workspaceId) {
      fetchMetrics();
    }
  }, [workspaceId]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get('/ia/nicochat/email-metrics/', {
        params: { workspace_id: workspaceId }
      });

      setMetrics(response.data.data);
    } catch (err) {
      console.error('Erro ao carregar métricas de email:', err);
      setError('Erro ao carregar métricas');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Métricas de Email
          </span>
          {!metrics?.disponivel && (
            <Badge variant="secondary">Em Breve</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!metrics?.disponivel ? (
          <Alert className="border-blue-200 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              {metrics?.message || 'Métricas de email não disponíveis no momento'}
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Emails Enviados</span>
              </div>
              <p className="text-2xl font-bold">{metrics.emails_enviados || 0}</p>
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Taxa de Abertura</span>
              </div>
              <p className="text-2xl font-bold">{metrics.taxa_abertura || 0}%</p>
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <MousePointerClick className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Taxa de Clique</span>
              </div>
              <p className="text-2xl font-bold">{metrics.taxa_clique || 0}%</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
