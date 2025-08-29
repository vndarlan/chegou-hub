import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Building2, Phone, AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';
import QualityBadge from './QualityBadge';

const BusinessManagerCard = ({ 
  businessManager, 
  onSync, 
  onDelete, 
  isLoading = false 
}) => {
  const {
    id,
    nome,
    business_manager_id,
    access_token,
    numeros_whatsapp = [],
    stats = {}
  } = businessManager;

  const totalNumeros = numeros_whatsapp.length;
  const numerosAtivos = numeros_whatsapp.filter(n => n.status === 'CONNECTED').length;
  const alertas = stats.alertas || 0;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg">{nome}</CardTitle>
              <p className="text-sm text-muted-foreground">
                ID: {business_manager_id}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSync(id)}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(id)}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {/* Estatísticas */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{totalNumeros}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{numerosAtivos}</div>
              <div className="text-xs text-muted-foreground">Ativos</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">{alertas}</div>
              <div className="text-xs text-muted-foreground">Alertas</div>
            </div>
          </div>

          {/* Números WhatsApp - Preview */}
          {numeros_whatsapp.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Phone className="h-4 w-4" />
                Números WhatsApp
              </div>
              <div className="space-y-1">
                {numeros_whatsapp.slice(0, 3).map((numero) => (
                  <div key={numero.id} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {numero.display_phone_number}
                    </span>
                    <div className="flex items-center gap-2">
                      <QualityBadge quality={numero.quality_rating} />
                    </div>
                  </div>
                ))}
                {numeros_whatsapp.length > 3 && (
                  <div className="text-xs text-muted-foreground">
                    +{numeros_whatsapp.length - 3} mais
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Alertas */}
          {alertas > 0 && (
            <div className="flex items-center gap-2 p-2 bg-red-50 rounded-md">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-800 font-medium">
                {alertas} alerta{alertas > 1 ? 's' : ''} ativo{alertas > 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default BusinessManagerCard;