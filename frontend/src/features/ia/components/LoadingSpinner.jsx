import React from 'react';
import { RefreshCw } from 'lucide-react';

export default function LoadingSpinner({ message = "Carregando..." }) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex items-center gap-2">
        <RefreshCw className="h-6 w-6 animate-spin text-primary" />
        <span className="text-muted-foreground">{message}</span>
      </div>
    </div>
  );
}
