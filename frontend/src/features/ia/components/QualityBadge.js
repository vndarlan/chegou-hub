import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, XCircle, Clock } from 'lucide-react';

const QualityBadge = ({ quality, className = "" }) => {
  const getQualityConfig = (quality) => {
    switch (quality?.toLowerCase()) {
      case 'green':
        return {
          variant: 'secondary',
          className: 'bg-green-100 text-green-800 border-green-200',
          icon: CheckCircle,
          label: 'Excelente'
        };
      case 'yellow':
        return {
          variant: 'secondary', 
          className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: AlertTriangle,
          label: 'Atenção'
        };
      case 'red':
        return {
          variant: 'destructive',
          className: 'bg-red-100 text-red-800 border-red-200',
          icon: XCircle,
          label: 'Crítico'
        };
      default:
        return {
          variant: 'outline',
          className: 'bg-gray-100 text-gray-600 border-gray-200',
          icon: Clock,
          label: 'Pendente'
        };
    }
  };

  const config = getQualityConfig(quality);
  const IconComponent = config.icon;

  return (
    <Badge 
      variant={config.variant}
      className={`${config.className} ${className} flex items-center gap-1 font-medium`}
    >
      <IconComponent className="h-3 w-3" />
      {config.label}
    </Badge>
  );
};

export default QualityBadge;