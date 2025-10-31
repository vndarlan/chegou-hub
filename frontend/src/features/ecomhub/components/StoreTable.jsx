// frontend/src/features/ecomhub/components/StoreTable.jsx
import React from 'react';
import { MoreHorizontal, Edit, Trash2, Power, CheckCircle2, Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import StoreCard from './StoreCard';

function StoreTable({ stores, onEdit, onDelete, onToggleActive, onTest, testingStore }) {
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

  // Renderização mobile (cards compactos)
  const renderMobileCards = () => (
    <div className="space-y-3 md:hidden">
      {stores.map((store) => (
        <div key={store.id} className="relative">
          {testingStore === store.id && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
          <StoreCard
            store={store}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggleActive={onToggleActive}
            onTest={onTest}
          />
        </div>
      ))}
    </div>
  );

  // Renderização desktop (tabela)
  const renderDesktopTable = () => (
    <div className="hidden md:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="font-semibold">Nome</TableHead>
            <TableHead className="font-semibold">País</TableHead>
            <TableHead className="font-semibold">Store ID</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold">Última Sync</TableHead>
            <TableHead className="text-right font-semibold">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stores.map((store) => (
            <TableRow
              key={store.id}
              className={`hover:bg-accent/50 transition-colors ${!store.is_active ? 'opacity-60' : ''} ${testingStore === store.id ? 'relative' : ''}`}
            >
              {testingStore === store.id && (
                <TableCell colSpan={6} className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </TableCell>
              )}

              <TableCell className="font-medium">{store.name}</TableCell>

              <TableCell>
                <Badge variant="outline" className="text-xs">
                  {store.country_name || 'N/A'}
                </Badge>
              </TableCell>

              <TableCell>
                <span className="font-mono text-xs text-muted-foreground">
                  {store.store_id || 'N/A'}
                </span>
              </TableCell>

              <TableCell>
                <Badge
                  variant={store.is_active ? "default" : "secondary"}
                  className={`${store.is_active ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-gray-400 text-white hover:bg-gray-500'}`}
                >
                  {store.is_active ? 'Ativa' : 'Inativa'}
                </Badge>
              </TableCell>

              <TableCell className="text-sm text-muted-foreground">
                {formatDate(store.last_sync)}
              </TableCell>

              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onTest(store)}
                    className="border-blue-300 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                    Testar
                  </Button>

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
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <>
      {renderMobileCards()}
      {renderDesktopTable()}
    </>
  );
}

export default StoreTable;
