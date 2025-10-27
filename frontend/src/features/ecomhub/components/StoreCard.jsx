// frontend/src/features/ecomhub/components/StoreCard.jsx
import React from 'react';
import { Globe, Edit, Trash2, Power, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';

function StoreCard({ store, onEdit, onDelete, onToggleActive, onTest }) {
  // Mascarar token (mostrar apenas primeiros 4 e últimos 6 caracteres)
  const maskToken = (token) => {
    if (!token || token.length < 10) return '****...****';
    return `${token.substring(0, 4)}...${token.substring(token.length - 6)}`;
  };

  // Formatar data
  const formatDate = (dateStr) => {
    if (!dateStr) return 'Nunca';
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card className={`border-border bg-card transition-all hover:shadow-md ${!store.is_active ? 'opacity-60' : ''}`}>
      <CardContent className="p-4">
        {/* Header com nome e status */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 flex-1">
            <Globe className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-base text-card-foreground truncate">
              {store.name}
            </h3>
          </div>
          <Badge
            variant={store.is_active ? "default" : "secondary"}
            className={`ml-2 ${store.is_active ? 'bg-green-500 text-white' : 'bg-gray-400 text-white'}`}
          >
            {store.is_active ? 'Ativa' : 'Inativa'}
          </Badge>
        </div>

        {/* Informações da loja */}
        <div className="space-y-2 mb-4 text-sm">
          <div>
            <span className="text-muted-foreground">País:</span>
            <span className="ml-2 font-medium text-card-foreground">{store.country_name || 'N/A'}</span>
          </div>

          <div>
            <span className="text-muted-foreground">Store ID:</span>
            <span className="ml-2 font-mono text-xs text-card-foreground">{store.store_id || 'N/A'}</span>
          </div>

          <div>
            <span className="text-muted-foreground">Token:</span>
            <span className="ml-2 font-mono text-xs text-card-foreground">{maskToken(store.token)}</span>
          </div>

          <div>
            <span className="text-muted-foreground">Última Sync:</span>
            <span className="ml-2 text-xs text-card-foreground">{formatDate(store.last_sync)}</span>
          </div>
        </div>

        {/* Botões de ação */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onTest(store)}
            className="flex-1 min-w-[80px] border-blue-300 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
          >
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Testar
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => onEdit(store)}
            className="flex-1 min-w-[80px] border-border bg-background hover:bg-accent"
          >
            <Edit className="h-3 w-3 mr-1" />
            Editar
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => onToggleActive(store)}
            className={`min-w-[40px] ${store.is_active ? 'border-yellow-300 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20' : 'border-green-300 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'}`}
          >
            <Power className="h-3 w-3" />
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => onDelete(store)}
            className="min-w-[40px] border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default StoreCard;
