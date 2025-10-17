import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { ScrollArea } from '../../../components/ui/scroll-area';
import { Progress } from '../../../components/ui/progress';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import { RefreshCw, Tag } from 'lucide-react';

export default function AllTagsCard({ configId, onRefresh }) {
  const [tags, setTags] = useState([]);
  const [totalSubscribers, setTotalSubscribers] = useState(0);
  const [totalTagsFound, setTotalTagsFound] = useState(0);
  const [cacheInfo, setCacheInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (configId) {
      fetchTags();
    }
  }, [configId]);

  const fetchTags = async (forceRefresh = false) => {
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
        setTags(response.data.tags || []);
        setTotalSubscribers(response.data.total_subscribers || 0);
        setTotalTagsFound(response.data.total_tags_found || 0);
        setCacheInfo({
          cache_hit: response.data.cache_hit,
          cached_at: response.data.cached_at
        });
      }
    } catch (err) {
      console.error('Erro ao carregar tags:', err);
      setError(err.response?.data?.error || 'Erro ao carregar tags dos contatos');
    } finally {
      setLoading(false);
    }
  };

  const getColorByPercentage = (percentage) => {
    if (percentage > 10) return 'bg-green-500';
    if (percentage > 5) return 'bg-blue-500';
    if (percentage > 2) return 'bg-yellow-500';
    return 'bg-gray-400';
  };

  const getTextColorByPercentage = (percentage) => {
    if (percentage > 10) return 'text-green-600';
    if (percentage > 5) return 'text-blue-600';
    if (percentage > 2) return 'text-yellow-600';
    return 'text-gray-600';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Tags de Contatos
            {totalTagsFound > 0 && (
              <Badge variant="secondary">{totalTagsFound} tags</Badge>
            )}
            {cacheInfo?.cache_hit && (
              <Badge variant="outline" className="text-xs">
                Cache
              </Badge>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchTags(true)}
            disabled={loading || !configId}
            title="Atualizar tags"
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

        {loading && tags.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 space-y-3">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Carregando tags...</p>
              <p className="text-xs text-muted-foreground mt-1">
                Primeira carga pode levar até 15 segundos
              </p>
            </div>
          </div>
        ) : tags.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Tag className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhuma tag encontrada</p>
            <p className="text-sm mt-1">Os contatos não possuem tags atribuídas</p>
          </div>
        ) : (
          <div className="space-y-1">
            {/* Informação do total */}
            <div className="text-xs text-muted-foreground mb-4 pb-3 border-b">
              Total de {totalSubscribers.toLocaleString('pt-BR')} contatos com tags
            </div>

            {/* Lista de tags com scroll */}
            <ScrollArea className="h-[400px] pr-3">
              <div className="space-y-4">
                {tags.map((tag, index) => (
                  <div
                    key={tag.tag_ns || index}
                    className="space-y-2 pb-3 border-b last:border-b-0"
                  >
                    {/* Nome e contagem */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" title={tag.name}>
                          {tag.name}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {tag.tag_ns}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-sm font-semibold ${getTextColorByPercentage(tag.percentage)}`}>
                          {tag.count.toLocaleString('pt-BR')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {tag.percentage.toFixed(2)}%
                        </p>
                      </div>
                    </div>

                    {/* Barra de progresso */}
                    <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${getColorByPercentage(tag.percentage)}`}
                        style={{ width: `${Math.min(tag.percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Footer com informação de cache */}
            {cacheInfo?.cached_at && (
              <div className="text-xs text-muted-foreground mt-4 pt-3 border-t">
                Última atualização: {new Date(cacheInfo.cached_at).toLocaleString('pt-BR')}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
