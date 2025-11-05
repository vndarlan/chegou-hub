import React, { useState, useEffect } from 'react';
import apiClient from '../../../utils/axios';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import { Button } from '../../../components/ui/button';
import { Mail, TrendingUp, MousePointerClick, RefreshCw, Info, MailOpen } from 'lucide-react';

export default function EmailMetricsCard({ workspaceId }) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedRange, setSelectedRange] = useState('last_7_days');

  useEffect(() => {
    if (workspaceId) {
      fetchMetrics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, selectedRange]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get(`/ia/nicochat-workspaces/${workspaceId}/email_metrics/`, {
        params: { range: selectedRange }
      });

      if (response.data.success) {
        setMetrics(response.data.data);
      } else {
        setError(response.data.error || 'Erro ao carregar métricas');
      }
    } catch (err) {
      console.error('Erro ao carregar métricas de email:', err);
      setError('Erro ao carregar métricas');
    } finally {
      setLoading(false);
    }
  };

  const rangeOptions = [
    { value: 'yesterday', label: 'Ontem' },
    { value: 'last_7_days', label: 'Últimos 7 dias' },
    { value: 'last_30_days', label: 'Últimos 30 dias' },
    { value: 'last_month', label: 'Mês passado' }
  ];

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
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Métricas de Email
            {metrics?.disponivel && (
              <Badge variant="secondary" className="ml-2">
                {rangeOptions.find(o => o.value === selectedRange)?.label}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {metrics?.disponivel && (
              <select
                value={selectedRange}
                onChange={(e) => setSelectedRange(e.target.value)}
                className="text-sm border rounded px-2 py-1"
              >
                {rangeOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={fetchMetrics}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
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
              {metrics?.message || 'Carregando métricas de email...'}
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="border rounded-lg p-4 bg-gradient-to-br from-blue-50 to-white">
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-muted-foreground">Enviados</span>
                </div>
                <p className="text-2xl font-bold text-blue-600">{metrics.emails_enviados || 0}</p>
              </div>

              <div className="border rounded-lg p-4 bg-gradient-to-br from-green-50 to-white">
                <div className="flex items-center gap-2 mb-2">
                  <MailOpen className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-muted-foreground">Abertos</span>
                </div>
                <p className="text-2xl font-bold text-green-600">{metrics.emails_abertos || 0}</p>
              </div>

              <div className="border rounded-lg p-4 bg-gradient-to-br from-purple-50 to-white">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                  <span className="text-sm text-muted-foreground">Taxa Abertura</span>
                </div>
                <p className="text-2xl font-bold text-purple-600">{metrics.taxa_abertura || 0}%</p>
              </div>
            </div>

            {metrics.flows_com_email > 0 && (
              <div className="text-xs text-muted-foreground text-center pt-2 border-t">
                {metrics.flows_com_email} de {metrics.total_flows} flows com envio de email
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
