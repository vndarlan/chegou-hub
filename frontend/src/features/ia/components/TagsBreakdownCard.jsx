import React from 'react';
import { Card, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Tag, TrendingUp } from 'lucide-react';
import { RefreshCw } from 'lucide-react';

export default function TagsBreakdownCard({ tags = [], loading = false }) {
  // Processar tags: contar ocorrências e ordenar
  const processedTags = React.useMemo(() => {
    if (!tags || tags.length === 0) return [];

    // Criar mapa de contagem de tags
    const tagCount = {};
    tags.forEach(item => {
      if (item.tags && Array.isArray(item.tags)) {
        item.tags.forEach(tag => {
          tagCount[tag] = (tagCount[tag] || 0) + 1;
        });
      }
    });

    // Converter para array e ordenar por contagem
    return Object.entries(tagCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5
  }, [tags]);

  const total = processedTags.reduce((sum, tag) => sum + tag.count, 0);

  return (
    <Card>
      <CardContent className="p-6">
        {loading ? (
          <div className="flex items-center justify-center h-24">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-lg bg-purple-100 text-purple-600">
                <Tag className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground font-medium">Top Tags</p>
                <p className="text-2xl font-bold mt-1">{total}</p>
              </div>
            </div>

            {processedTags.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma tag encontrada
              </p>
            ) : (
              <div className="space-y-2">
                {processedTags.map((tag, index) => (
                  <div
                    key={tag.name}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                        {index + 1}
                      </div>
                      <span className="text-sm font-medium truncate max-w-[120px]">
                        {tag.name}
                      </span>
                    </div>
                    <Badge variant="secondary" className="ml-2">
                      {tag.count}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
