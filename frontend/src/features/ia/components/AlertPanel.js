import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, 
  AlertCircle, 
  XCircle, 
  Clock,
  RefreshCw,
  X
} from 'lucide-react';

const AlertPanel = ({ 
  alerts = [], 
  onRefresh, 
  onDismiss,
  isLoading = false 
}) => {
  const getPriorityConfig = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'critical':
        return {
          icon: XCircle,
          className: 'border-red-200 bg-red-50',
          iconColor: 'text-red-600',
          badgeClassName: 'bg-red-100 text-red-800'
        };
      case 'high':
        return {
          icon: AlertTriangle,
          className: 'border-orange-200 bg-orange-50',
          iconColor: 'text-orange-600',
          badgeClassName: 'bg-orange-100 text-orange-800'
        };
      case 'medium':
        return {
          icon: AlertCircle,
          className: 'border-yellow-200 bg-yellow-50',
          iconColor: 'text-yellow-600',
          badgeClassName: 'bg-yellow-100 text-yellow-800'
        };
      default:
        return {
          icon: Clock,
          className: 'border-blue-200 bg-blue-50',
          iconColor: 'text-blue-600',
          badgeClassName: 'bg-blue-100 text-blue-800'
        };
    }
  };

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Agora';
    const now = new Date();
    const alertTime = new Date(timestamp);
    const diffMs = now - alertTime;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffHours > 24) {
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} dia${diffDays > 1 ? 's' : ''} atrás`;
    }
    if (diffHours > 0) {
      return `${diffHours} hora${diffHours > 1 ? 's' : ''} atrás`;
    }
    if (diffMinutes > 0) {
      return `${diffMinutes} min atrás`;
    }
    return 'Agora';
  };

  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Alertas de Qualidade
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum alerta ativo</p>
            <p className="text-sm">Todos os números estão funcionando normalmente</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Alertas de Qualidade ({alerts.length})
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {alerts.map((alert) => {
            const config = getPriorityConfig(alert.priority);
            const IconComponent = config.icon;

            return (
              <Alert key={alert.id} className={config.className}>
                <div className="flex items-start justify-between w-full">
                  <div className="flex items-start gap-3">
                    <IconComponent className={`h-5 w-5 ${config.iconColor} mt-0.5`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge 
                          variant="secondary" 
                          className={config.badgeClassName}
                        >
                          {alert.priority?.toUpperCase() || 'BAIXA'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatTimeAgo(alert.created_at)}
                        </span>
                      </div>
                      <AlertDescription className="text-sm font-medium mb-1">
                        {alert.title || 'Alerta de Qualidade'}
                      </AlertDescription>
                      <AlertDescription className="text-sm">
                        {alert.description || alert.message}
                      </AlertDescription>
                      {alert.phone_number && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          Número: {alert.phone_number.display_phone_number}
                          {alert.phone_number.business_manager && (
                            <> • BM: {alert.phone_number.business_manager.nome}</>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {onDismiss && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDismiss(alert.id)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </Alert>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default AlertPanel;