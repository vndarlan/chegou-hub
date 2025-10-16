import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { InfoIcon, Key, Webhook, Clock } from 'lucide-react';

const NicochatConfigPage = () => {
  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">Configurações do Nicochat</h1>
          <p className="text-muted-foreground">
            Gerencie as configurações do WhatsApp Business e integrações
          </p>
        </div>

        {/* Alert Informativo */}
        <Alert>
          <InfoIcon className="h-4 w-4" />
          <AlertDescription>
            Esta seção está em desenvolvimento. Em breve você poderá configurar API keys, webhooks e outras integrações.
          </AlertDescription>
        </Alert>

        {/* Cards de Configurações Placeholder */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

          {/* API Keys do WhatsApp Business */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                API Keys
              </CardTitle>
              <CardDescription>
                Credenciais do WhatsApp Business
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Configure as chaves de acesso da API do WhatsApp Business Cloud.
              </p>
            </CardContent>
          </Card>

          {/* Webhooks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="h-5 w-5" />
                Webhooks
              </CardTitle>
              <CardDescription>
                Notificações em tempo real
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Gerencie os webhooks para receber eventos e mensagens do WhatsApp.
              </p>
            </CardContent>
          </Card>

          {/* Configurações de Timeout */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Timeouts
              </CardTitle>
              <CardDescription>
                Limites de tempo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Configure os timeouts para respostas automáticas e sessões de conversa.
              </p>
            </CardContent>
          </Card>

        </div>

      </div>
    </div>
  );
};

export default NicochatConfigPage;
