import React from 'react';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { Button } from '../../../components/ui/button';

export default function ErrorAlert({ message, onRetry }) {
  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>{message}</span>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} className="ml-2">
            Tentar Novamente
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
