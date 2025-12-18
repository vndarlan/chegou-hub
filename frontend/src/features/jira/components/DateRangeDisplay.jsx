import React from 'react';
import { Calendar } from 'lucide-react';
import { Badge } from '../../../components/ui/badge';

/**
 * Componente para exibir o range de datas calculado
 * @param {string} dateLabel - Label formatada do range (ex: "11/12/2024 até 18/12/2024")
 */
export function DateRangeDisplay({ dateLabel }) {
  if (!dateLabel) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-md border border-border">
      <Calendar className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">Período:</span>
      <Badge variant="secondary" className="font-normal">
        {dateLabel}
      </Badge>
    </div>
  );
}
