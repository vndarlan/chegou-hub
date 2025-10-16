import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { InfoIcon, GitBranch, Workflow, Bot } from 'lucide-react';

const NicochatFluxosPage = () => {
  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">Fluxos de Conversação</h1>
          <p className="text-muted-foreground">
            Crie e gerencie fluxos de conversa automatizados para o WhatsApp
          </p>
        </div>

        {/* Alert Informativo */}
        <Alert>
          <InfoIcon className="h-4 w-4" />
          <AlertDescription>
            Esta funcionalidade está em desenvolvimento. Em breve você poderá criar e gerenciar fluxos de conversação automatizados.
          </AlertDescription>
        </Alert>

        {/* Cards de Features Placeholder */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

          {/* Fluxos de Atendimento */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5" />
                Fluxos de Atendimento
              </CardTitle>
              <CardDescription>
                Automação de respostas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Configure fluxos de conversa para automatizar respostas baseadas em palavras-chave e contexto.
              </p>
            </CardContent>
          </Card>

          {/* Editor Visual de Fluxos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Workflow className="h-5 w-5" />
                Editor Visual
              </CardTitle>
              <CardDescription>
                Crie fluxos visualmente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Use o editor visual drag-and-drop para criar fluxos de conversação complexos sem código.
              </p>
            </CardContent>
          </Card>

          {/* IA Conversacional */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                IA Conversacional
              </CardTitle>
              <CardDescription>
                Respostas inteligentes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Integre IA conversacional para respostas mais naturais e contextuais aos seus clientes.
              </p>
            </CardContent>
          </Card>

        </div>

      </div>
    </div>
  );
};

export default NicochatFluxosPage;
