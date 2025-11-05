import React, { useState, useEffect } from 'react';
import apiClient from '../../../utils/axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import { ScrollArea } from '../../../components/ui/scroll-area';
import { Loader2, RefreshCw, Radio, PhoneCall, Globe, MessageSquare, AlertTriangle } from 'lucide-react';

export default function ChannelStatusCard({ configId, onRefresh }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const fetchChannelStatus = async () => {
    if (!configId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get('/ia/nicochat/channel-status/', {
        params: { config_id: configId }
      });

      if (response.data.success) {
        setData(response.data);
      } else {
        setError(response.data.error || 'Erro ao carregar status dos canais');
      }
    } catch (err) {
      console.error('Erro ao buscar status de canais:', err);
      setError(
        err.response?.data?.error ||
        'Erro ao conectar com o servidor'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChannelStatus();
  }, [configId]);

  const handleRefresh = () => {
    fetchChannelStatus();
    if (onRefresh) onRefresh();
  };

  const getChannelIcon = (type) => {
    const icons = {
      'waapi': <PhoneCall className="h-4 w-4" />,
      'web': <Globe className="h-4 w-4" />,
      'telegram': <MessageSquare className="h-4 w-4" />,
      'instagram': <MessageSquare className="h-4 w-4" />,
      'facebook': <MessageSquare className="h-4 w-4" />,
    };
    return icons[type] || <Radio className="h-4 w-4" />;
  };

  const getStatusBadge = (channelStatus) => {
    if (channelStatus === 'connected') {
      return (
        <Badge variant="default" className="bg-green-500 hover:bg-green-600">
          <span className="mr-1">●</span> Conectado
        </Badge>
      );
    }
    return (
      <Badge variant="destructive">
        <span className="mr-1">●</span> Desconectado
      </Badge>
    );
  };

  // NÃO RENDERIZAR se o workspace for WhatsApp Cloud API (só para QR Code)
  if (data && data.tipo_whatsapp === 'cloud') {
    return null; // Não mostra o card para Cloud API
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Status dos Canais</CardTitle>
          <CardDescription>Verificando canais conectados...</CardDescription>
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
          <CardTitle>Status dos Canais</CardTitle>
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

  if (!data || !data.flows || data.flows.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>Status dos Canais</CardTitle>
            <CardDescription>Nenhum canal encontrado</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              Nenhum fluxo foi encontrado neste workspace.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const { flows, stats } = data;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle>Status dos Canais</CardTitle>
          <CardDescription>
            {stats.connected} de {stats.total} canais conectados
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
        {/* Estatísticas gerais */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
          <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.connected}</div>
            <div className="text-xs text-muted-foreground">Conectados</div>
          </div>
          <div className="text-center p-3 bg-red-50 dark:bg-red-950 rounded-lg">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.disconnected}</div>
            <div className="text-xs text-muted-foreground">Desconectados</div>
          </div>
        </div>

        {/* Lista de canais */}
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-3">
            {flows.map((flow) => (
              <div
                key={flow.id}
                className="flex items-start justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start gap-3 flex-1">
                  <div className="mt-1">
                    {getChannelIcon(flow.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium truncate">{flow.name}</h4>
                      {getStatusBadge(flow.channel_status)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {flow.type_display}
                      {flow.linked_label && (
                        <span className="ml-2 font-mono text-xs">
                          {flow.linked_label}
                        </span>
                      )}
                    </p>
                    {!flow.linked_label && flow.channel_status === 'disconnected' && (
                      <p className="text-xs text-red-500 mt-1">
                        Nenhum número vinculado
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Tipos de canal */}
        {Object.keys(stats.by_type).length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="text-sm font-medium mb-2">Tipos de Canal</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.by_type).map(([type, count]) => (
                <Badge key={type} variant="outline">
                  {type.toUpperCase()}: {count}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
