import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Phone, ExternalLink, RefreshCw } from 'lucide-react';
import QualityBadge from './QualityBadge';

const PhoneNumberTable = ({ 
  phoneNumbers = [], 
  onRefresh, 
  isLoading = false 
}) => {
  const getStatusBadge = (status) => {
    switch (status?.toUpperCase()) {
      case 'CONNECTED':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Conectado</Badge>;
      case 'DISCONNECTED':
        return <Badge variant="destructive">Desconectado</Badge>;
      case 'PENDING':
        return <Badge variant="outline">Pendente</Badge>;
      default:
        return <Badge variant="outline">Desconhecido</Badge>;
    }
  };

  const formatPhoneNumber = (number) => {
    if (!number) return '-';
    return number.replace(/(\d{2})(\d{5})(\d{4})/, '+$1 ($2) $3-');
  };

  if (phoneNumbers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Números WhatsApp Business
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Phone className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum número WhatsApp Business encontrado</p>
            <p className="text-sm">Sincronize um Business Manager para ver os números</p>
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
            <Phone className="h-5 w-5" />
            Números WhatsApp Business ({phoneNumbers.length})
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Business Manager</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Qualidade</TableHead>
                <TableHead>País</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {phoneNumbers.map((numero) => (
                <TableRow key={numero.id}>
                  <TableCell className="font-medium">
                    {formatPhoneNumber(numero.display_phone_number)}
                  </TableCell>
                  <TableCell>
                    {numero.verified_name || 'Sem nome'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{numero.business_manager?.nome || 'N/A'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(numero.status)}
                  </TableCell>
                  <TableCell>
                    <QualityBadge quality={numero.quality_rating} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{numero.country_flag}</span>
                      <span>{numero.country_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(`https://business.facebook.com/wa/manage/phone-numbers/${numero.whatsapp_business_account_id}`, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default PhoneNumberTable;