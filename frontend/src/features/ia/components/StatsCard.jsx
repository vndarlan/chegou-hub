import React from 'react';
import { Card, CardContent } from '../../../components/ui/card';
import { RefreshCw } from 'lucide-react';

export default function StatsCard({ title, value, icon, color = 'blue', loading = false }) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    gray: 'bg-gray-100 text-gray-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    red: 'bg-red-100 text-red-600',
  };

  return (
    <Card>
      <CardContent className="p-4">
        {loading ? (
          <div className="flex items-center justify-center h-16">
            <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${colorClasses[color] || colorClasses.blue}`}>
              {icon}
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground font-medium">{title}</p>
              <p className="text-2xl font-bold mt-0.5">{value.toLocaleString('pt-BR')}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
