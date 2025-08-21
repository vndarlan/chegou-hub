import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Clock } from 'lucide-react';

function EcomhubStatusPage() {
  return (
    <div className="flex-1 space-y-4 p-6 min-h-screen bg-background">
      <div className="flex items-center gap-3 mb-6">
        <Clock className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Ecomhub</h1>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-card-foreground">Status do Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Clock className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-foreground mb-2">Em breve</h2>
              <p className="text-muted-foreground">Esta funcionalidade está sendo desenvolvida</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default EcomhubStatusPage;