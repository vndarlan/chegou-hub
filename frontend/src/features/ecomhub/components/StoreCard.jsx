// frontend/src/features/ecomhub/components/StoreCard.jsx
import React from 'react';
import { MoreHorizontal, Edit, Trash2, Power } from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu';

function StoreCard({ store, onEdit, onDelete, onToggleActive }) {
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
    <Card className={`border-border bg-card transition-all hover:shadow-sm ${!store.is_active ? 'opacity-60' : ''}`}>
      <CardContent className="p-3">
        {/* Layout horizontal compacto */}
        <div className="flex items-center justify-between gap-3">
          {/* Nome e País */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm text-card-foreground truncate">
                {store.name}
              </h3>
              <Badge variant="outline" className="text-xs shrink-0">
                {store.country_name || 'N/A'}
              </Badge>
            </div>
            {/* Informações secundárias */}
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              <span className="font-mono">{store.store_id || 'N/A'}</span>
              <span>•</span>
              <span>{formatDate(store.last_sync)}</span>
            </div>
          </div>

          {/* Status e Ações */}
          <div className="flex items-center gap-2 shrink-0">
            <Badge
              variant={store.is_active ? "default" : "secondary"}
              className={`${store.is_active ? 'bg-green-500 text-white' : 'bg-gray-400 text-white'}`}
            >
              {store.is_active ? 'Ativa' : 'Inativa'}
            </Badge>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Abrir menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(store)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => onToggleActive(store)}
                  className={store.is_active ? 'text-yellow-600' : 'text-green-600'}
                >
                  <Power className="h-4 w-4 mr-2" />
                  {store.is_active ? 'Desativar' : 'Ativar'}
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={() => onDelete(store)}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Deletar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default StoreCard;
