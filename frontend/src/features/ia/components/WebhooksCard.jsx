import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import { ScrollArea } from '../../../components/ui/scroll-area';
import { Loader2, RefreshCw, Webhook, Copy, Check, AlertTriangle } from 'lucide-react';

export default function WebhooksCard({ configId, onRefresh }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [copiedUrl, setCopiedUrl] = useState(null);

  const fetchWebhooks = async () => {
    if (!configId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await axios.get('/ia/nicochat/inbound-webhooks/', {
        params: { config_id: configId }
      });

      if (response.data.success) {
        setData(response.data);
      } else {
        setError(response.data.error || 'Erro ao carregar webhooks');
      }
    } catch (err) {
      console.error('Erro ao buscar webhooks:', err);
      setError(
        err.response?.data?.error ||
        'Erro ao conectar com o servidor'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWebhooks();
  }, [configId]);

  const handleRefresh = () => {
    fetchWebhooks();
    if (onRefresh) onRefresh();
  };

  const handleCopyUrl = (url, hookUid) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(hookUid);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const getStatusBadge = (status) => {
    if (status === 'active') {
      return (
        <Badge variant="default" className="bg-green-500 hover:bg-green-600">
          <span className="mr-1">●</span> Ativo
        </Badge>
      );
    }
    return (
      <Badge variant="secondary">
        <span className="mr-1">●</span> Inativo
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Webhooks Configurados</CardTitle>
          <CardDescription>Carregando webhooks...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Webhooks Configurados</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={handleRefresh}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar Novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  const webhooks = data?.data || [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle>Webhooks Configurados</CardTitle>
          <CardDescription>
            {webhooks.length} webhook{webhooks.length !== 1 ? 's' : ''} encontrado{webhooks.length !== 1 ? 's' : ''}
          </CardDescription>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>

      <CardContent>
        {webhooks.length === 0 ? (
          <Alert>
            <Webhook className="h-4 w-4" />
            <AlertDescription>
              Nenhum webhook configurado neste workspace.
            </AlertDescription>
          </Alert>
        ) : (
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-3">
              {webhooks.map((webhook) => (
                <div
                  key={webhook.hook_uid}
                  className="flex flex-col gap-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  {/* Header do webhook */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2 flex-1">
                      <Webhook className="h-4 w-4 mt-1 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{webhook.name}</h4>
                        <p className="text-xs text-muted-foreground">
                          Subfluxo: {webhook.sub_flow_ns}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(webhook.status)}
                  </div>

                  {/* URL do webhook com botão copiar */}
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 bg-muted rounded px-2 py-1 text-xs font-mono truncate">
                      {webhook.url}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => handleCopyUrl(webhook.url, webhook.hook_uid)}
                    >
                      {copiedUrl === webhook.hook_uid ? (
                        <Check className="h-3 w-3 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Estatísticas */}
        {webhooks.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {webhooks.filter(w => w.status === 'active').length}
                </div>
                <div className="text-xs text-muted-foreground">Ativos</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-600">
                  {webhooks.filter(w => w.status === 'inactive').length}
                </div>
                <div className="text-xs text-muted-foreground">Inativos</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
