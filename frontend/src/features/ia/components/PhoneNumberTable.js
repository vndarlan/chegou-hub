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
import { Phone, RefreshCw, Plus } from 'lucide-react';

const PhoneNumberTable = ({ 
  phoneNumbers = [], 
  onRefresh, 
  isLoading = false,
  onAddNumber 
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

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '-';
    }
  };

  const formatMessageLimit = (limit) => {
    if (!limit) return '-';
    return limit.toLocaleString('pt-BR');
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
            <div className="flex items-center gap-2">
              <Button 
                variant="default" 
                size="sm"
                onClick={onAddNumber}
              >
                <Plus className="h-4 w-4 mr-1" />
                Adicionar Número
              </Button>
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
          <div className="flex items-center gap-2">
            <Button 
              variant="default" 
              size="sm"
              onClick={onAddNumber}
            >
              <Plus className="h-4 w-4 mr-1" />
              Adicionar Número
            </Button>
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
                <TableHead>País</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Token Expira</TableHead>
                <TableHead>Limite Mensagens</TableHead>
                <TableHead>Status</TableHead>
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
                      <span className="text-sm">
                        {numero.business_manager?.bm_nome_customizado || 
                         numero.business_manager?.nome || 'N/A'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{numero.country_flag}</span>
                      <span>
                        {numero.pais_nome_customizado || 
                         numero.country_name || 'N/A'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {numero.perfil || 'N/A'}
                  </TableCell>
                  <TableCell>
                    {formatDate(numero.token_expira_em)}
                  </TableCell>
                  <TableCell>
                    {formatMessageLimit(numero.messaging_limit)}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(numero.status)}
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