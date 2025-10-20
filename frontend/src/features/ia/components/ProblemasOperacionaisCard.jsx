import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import { RefreshCw, AlertTriangle, XCircle, Package, MapPin, MessageSquare } from 'lucide-react';

export default function ProblemasOperacionaisCard({ configId, onRefresh }) {
  const [problemas, setProblemas] = useState({
    cancelamento: 0,
    ofensas: 0,
    devolucao: 0,
    trocaEndereco: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (configId) {
      fetchProblemas();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configId]);

  const fetchProblemas = async (forceRefresh = false) => {
    if (!configId) {
      console.warn('ProblemasOperacionaisCard: configId não definido');
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

        // Buscar cada tag específica
        const tagCancelamento = tags.find(tag =>
          tag.name && (
            tag.name.toLowerCase().includes('cancelamento') &&
            tag.name.toLowerCase().includes('pedido')
          )
        );

        const tagOfensas = tags.find(tag =>
          tag.name && tag.name.toLowerCase().includes('ofenças')
        );

        const tagDevolucao = tags.find(tag =>
          tag.name && (
            tag.name.toLowerCase().includes('devolução') ||
            tag.name.toLowerCase().includes('devolucao')
          )
        );

        const tagTrocaEndereco = tags.find(tag =>
          tag.name && (
            (tag.name.toLowerCase().includes('troca') && tag.name.toLowerCase().includes('endereço')) ||
            (tag.name.toLowerCase().includes('troca') && tag.name.toLowerCase().includes('endereco'))
          )
        );

        setProblemas({
          cancelamento: tagCancelamento?.count || 0,
          ofensas: tagOfensas?.count || 0,
          devolucao: tagDevolucao?.count || 0,
          trocaEndereco: tagTrocaEndereco?.count || 0
        });
      }
    } catch (err) {
      console.error('Erro ao carregar problemas operacionais:', err);
      setError('Erro ao carregar dados de problemas operacionais');
    } finally {
      setLoading(false);
    }
  };

  const total = Object.values(problemas).reduce((acc, val) => acc + val, 0);

  const problemasData = [
    {
      key: 'cancelamento',
      label: 'Cancelamento de Pedido',
      icon: <XCircle className="h-4 w-4" />,
      color: 'red',
      bgColor: 'bg-red-500',
      textColor: 'text-red-600',
      badgeColor: 'bg-red-100 text-red-800 border-red-300'
    },
    {
      key: 'ofensas',
      label: 'Ofenças',
      icon: <AlertTriangle className="h-4 w-4" />,
      color: 'orange',
      bgColor: 'bg-orange-500',
      textColor: 'text-orange-600',
      badgeColor: 'bg-orange-100 text-orange-800 border-orange-300'
    },
    {
      key: 'devolucao',
      label: 'Devolução',
      icon: <Package className="h-4 w-4" />,
      color: 'yellow',
      bgColor: 'bg-yellow-500',
      textColor: 'text-yellow-600',
      badgeColor: 'bg-yellow-100 text-yellow-800 border-yellow-300'
    },
    {
      key: 'trocaEndereco',
      label: 'Troca de Endereço',
      icon: <MapPin className="h-4 w-4" />,
      color: 'blue',
      bgColor: 'bg-blue-500',
      textColor: 'text-blue-600',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-300'
    }
  ];

  return (
    <Card className="bg-gradient-to-b from-orange-50/50 to-orange-50 border-orange-200">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <span className="text-lg">Problemas Operacionais</span>
            {total > 0 && (
              <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
                {total}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchProblemas(true)}
            disabled={loading || !configId}
            title="Atualizar problemas"
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

        {loading && total === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 space-y-3">
            <RefreshCw className="h-8 w-8 animate-spin text-orange-600" />
            <p className="text-sm text-muted-foreground">Carregando problemas...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Total de Problemas */}
            <div className="text-center pb-3 border-b border-orange-200">
              <p className="text-sm text-muted-foreground mb-1">Total de Ocorrências</p>
              <p className="text-2xl font-bold text-orange-600">{total.toLocaleString('pt-BR')}</p>
            </div>

            {/* Lista de Problemas */}
            <div className="space-y-2">
              {problemasData.map((problema) => {
                const count = problemas[problema.key];
                const percentual = total > 0 ? ((count / total) * 100).toFixed(1) : 0;

                return (
                  <div key={problema.key} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={problema.textColor}>{problema.icon}</span>
                        <span className="text-sm font-medium">{problema.label}</span>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-bold ${problema.textColor}`}>
                          {count.toLocaleString('pt-BR')}
                        </p>
                        {total > 0 && (
                          <p className="text-xs text-muted-foreground">{percentual}%</p>
                        )}
                      </div>
                    </div>
                    {total > 0 && (
                      <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${problema.bgColor} transition-all duration-300`}
                          style={{ width: `${percentual}%` }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Badge de Status Geral */}
            {total > 0 && (
              <div className="pt-3 border-t border-orange-200 flex justify-center">
                {total >= 50 ? (
                  <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Atenção: Alto volume de problemas
                  </Badge>
                ) : total >= 20 ? (
                  <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                    Volume moderado de problemas
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                    Baixo volume de problemas
                  </Badge>
                )}
              </div>
            )}

            {total === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium">Nenhum problema registrado</p>
                <p className="text-xs mt-1">Excelente! Tudo funcionando bem</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
