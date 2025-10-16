import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { InfoIcon, FileText, CheckCircle, MessageSquare } from 'lucide-react';

const NicochatTemplatesPage = () => {
  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">Templates de Mensagens</h1>
          <p className="text-muted-foreground">
            Gerencie templates de mensagens aprovados pelo WhatsApp Business
          </p>
        </div>

        {/* Alert Informativo */}
        <Alert>
          <InfoIcon className="h-4 w-4" />
          <AlertDescription>
            Esta funcionalidade está em desenvolvimento. Em breve você poderá criar, visualizar e gerenciar templates de mensagens WhatsApp.
          </AlertDescription>
        </Alert>

        {/* Cards de Features Placeholder */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

          {/* Templates Aprovados */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Templates Aprovados
              </CardTitle>
              <CardDescription>
                Mensagens pré-aprovadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Visualize e gerencie todos os templates de mensagem aprovados pelo WhatsApp Business.
              </p>
            </CardContent>
          </Card>

          {/* Criar Template */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Criar Template
              </CardTitle>
              <CardDescription>
                Novos templates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Crie novos templates de mensagem para submeter à aprovação do WhatsApp Business.
              </p>
            </CardContent>
          </Card>

          {/* Histórico de Uso */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Histórico de Uso
              </CardTitle>
              <CardDescription>
                Analytics de templates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Acompanhe o uso, taxa de entrega e engajamento de cada template de mensagem.
              </p>
            </CardContent>
          </Card>

        </div>

      </div>
    </div>
  );
};

export default NicochatTemplatesPage;
