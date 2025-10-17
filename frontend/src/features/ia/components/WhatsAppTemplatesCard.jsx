import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getCSRFToken } from '../../../utils/csrf';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import { RefreshCw, CheckCircle, Clock, XCircle, FileText } from 'lucide-react';

export default function WhatsAppTemplatesCard({ configId, onRefresh }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (configId) {
      fetchTemplates();
    }
  }, [configId]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.post(
        '/ia/nicochat/whatsapp-templates/',
        { config_id: configId },
        {
          headers: {
            'X-CSRFToken': getCSRFToken(),
            'Content-Type': 'application/json',
          }
        }
      );

      setTemplates(response.data.data || []);
    } catch (err) {
      console.error('Erro ao carregar templates:', err);
      setError('Erro ao carregar templates WhatsApp');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      setError(null);

      await axios.post(
        '/ia/nicochat/whatsapp-templates/sync/',
        { config_id: configId },
        {
          headers: {
            'X-CSRFToken': getCSRFToken(),
            'Content-Type': 'application/json',
          }
        }
      );

      // Recarregar templates após sincronização
      await fetchTemplates();

      if (onRefresh) {
        onRefresh();
      }
    } catch (err) {
      console.error('Erro ao sincronizar templates:', err);
      setError('Erro ao sincronizar templates');
    } finally {
      setSyncing(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      APPROVED: {
        className: 'bg-green-100 text-green-800 border-green-200',
        icon: <CheckCircle className="h-3 w-3" />,
        label: 'Aprovado'
      },
      PENDING: {
        className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        icon: <Clock className="h-3 w-3" />,
        label: 'Pendente'
      },
      REJECTED: {
        className: 'bg-red-100 text-red-800 border-red-200',
        icon: <XCircle className="h-3 w-3" />,
        label: 'Rejeitado'
      }
    };

    const config = statusConfig[status] || statusConfig.PENDING;

    return (
      <Badge variant="outline" className={config.className}>
        <span className="flex items-center gap-1">
          {config.icon}
          {config.label}
        </span>
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Templates WhatsApp
          </span>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{templates.length}</Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={syncing || loading}
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum template encontrado</p>
            <p className="text-sm mt-1">Clique em sincronizar para buscar templates</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {templates.map((template, index) => (
              <div
                key={template.id || index}
                className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm">{template.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {template.category || 'N/A'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {template.language || 'pt_BR'}
                      </span>
                    </div>
                  </div>
                  {getStatusBadge(template.status)}
                </div>

                {template.components && template.components.length > 0 && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    {template.components.length} componente(s)
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
