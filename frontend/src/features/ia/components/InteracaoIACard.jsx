import React, { useState, useEffect } from 'react';
import apiClient from '../../../utils/axios';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import { RefreshCw, Bot, Users } from 'lucide-react';

export default function InteracaoIACard({ configId, totalContatos, onRefresh }) {
  const [contatosIA, setContatosIA] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (configId) {
      fetchInteracoes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configId]);

  const fetchInteracoes = async (forceRefresh = false) => {
    if (!configId) {
      console.warn('InteracaoIACard: configId não definido');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = { config_id: configId };
      if (forceRefresh) {
        params.force_refresh = 'true';
      }

      const response = await apiClient.get('/ia/nicochat/subscribers/tags-stats/', {
        params
      });

      if (response.data.success) {
        const tags = response.data.tags || [];

        // Buscar tag "Interagil" (com variações de escrita)
        const tagInteragil = tags.find(tag =>
          tag.name && (
            tag.name.toLowerCase().includes('interagil') ||
            tag.name.toLowerCase().includes('interágil')
          )
        );

        setContatosIA(tagInteragil?.count || 0);
      }
    } catch (err) {
      console.error('Erro ao carregar interações com IA:', err);
      setError('Erro ao carregar dados de interação com IA');
    } finally {
      setLoading(false);
    }
  };

  const totalContatosUsado = totalContatos || 0;
  const contatosSemIA = totalContatosUsado - contatosIA;
  const percentualIA = totalContatosUsado > 0 ? ((contatosIA / totalContatosUsado) * 100).toFixed(1) : 0;
  const percentualSemIA = totalContatosUsado > 0 ? ((contatosSemIA / totalContatosUsado) * 100).toFixed(1) : 0;

  return (
    <Card className="bg-gradient-to-b from-blue-50/50 to-blue-50 border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-blue-600" />
            <span className="text-lg">Interação com IA</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchInteracoes(true)}
            disabled={loading || !configId}
            title="Atualizar dados de IA"
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

        {loading && contatosIA === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 space-y-3">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-sm text-muted-foreground">Carregando dados de IA...</p>
          </div>
        ) : totalContatosUsado === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="font-medium">Sem dados de contatos</p>
            <p className="text-sm mt-1">Aguardando contatos para análise</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Total de Contatos */}
            <div className="text-center pb-4 border-b border-blue-200">
              <p className="text-sm text-muted-foreground mb-1">Total de Contatos</p>
              <p className="text-3xl font-bold text-blue-600">{totalContatosUsado.toLocaleString('pt-BR')}</p>
            </div>

            {/* Métricas de IA */}
            <div className="space-y-3">
              {/* Conversaram com IA */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">Interagiram com IA</span>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-blue-600">
                      {contatosIA.toLocaleString('pt-BR')}
                    </p>
                    <p className="text-xs text-muted-foreground">{percentualIA}%</p>
                  </div>
                </div>
                <div className="relative h-3 bg-blue-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${percentualIA}%` }}
                  />
                </div>
              </div>

              {/* Não interagiram */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium">Sem Interação</span>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-600">
                      {contatosSemIA.toLocaleString('pt-BR')}
                    </p>
                    <p className="text-xs text-muted-foreground">{percentualSemIA}%</p>
                  </div>
                </div>
                <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gray-400 transition-all duration-300"
                    style={{ width: `${percentualSemIA}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Badge de Status */}
            <div className="pt-4 border-t border-blue-200 flex justify-center">
              {percentualIA >= 50 ? (
                <Badge className="bg-blue-100 text-blue-800 border-blue-300">
                  <Bot className="h-3 w-3 mr-1" />
                  Ótima adoção da IA
                </Badge>
              ) : percentualIA >= 25 ? (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                  <Bot className="h-3 w-3 mr-1" />
                  Boa adoção da IA
                </Badge>
              ) : percentualIA > 0 ? (
                <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                  Adoção em crescimento
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-300">
                  IA não utilizada
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
