import React, { useState, useEffect } from 'react';
import apiClient from '../../../utils/axios';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { Badge } from '../../../components/ui/badge';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import { AlertTriangle, RefreshCw, Cloud, QrCode } from 'lucide-react';

export default function WorkspaceSelector({ value, onChange, showLimiteAlert = true }) {
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [limiteInfo, setLimiteInfo] = useState(null);

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  useEffect(() => {
    if (value && showLimiteAlert) {
      fetchLimiteInfo(value);
    }
  }, [value, showLimiteAlert]);

  const fetchWorkspaces = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/ia/nicochat-workspaces/');
      const data = response.data.results || response.data;
      setWorkspaces(data);

      // Auto-selecionar primeiro workspace ativo
      if (!value && data.length > 0) {
        const activeWorkspace = data.find(w => w.ativo) || data[0];
        onChange(activeWorkspace.id);
      }
    } catch (err) {
      console.error('Erro ao carregar workspaces:', err);
      setError('Erro ao carregar workspaces');
    } finally {
      setLoading(false);
    }
  };

  const fetchLimiteInfo = async (workspaceId) => {
    try {
      const response = await apiClient.get(`/ia/nicochat-workspaces/${workspaceId}/check_limite/`);
      setLimiteInfo(response.data);
    } catch (err) {
      console.error('Erro ao verificar limite:', err);
    }
  };

  const getTipoWhatsAppIcon = (tipo) => {
    if (tipo === 'cloud') {
      return <Cloud className="h-4 w-4 text-blue-600" title="WhatsApp Cloud API" />;
    } else if (tipo === 'qr_code') {
      return <QrCode className="h-4 w-4 text-purple-600" title="WhatsApp QR Code" />;
    }
    return null;
  };

  const getLimiteBadge = () => {
    if (!limiteInfo) return null;

    const { percentual_utilizado, contatos_atuais, limite_contatos, limite_atingido } = limiteInfo;

    if (limite_atingido) {
      return (
        <Badge variant="destructive" className="ml-2">
          {contatos_atuais}/{limite_contatos} (LIMITE ATINGIDO!)
        </Badge>
      );
    }

    if (percentual_utilizado >= 90) {
      return (
        <Badge variant="outline" className="ml-2 bg-yellow-100 text-yellow-800 border-yellow-300">
          {contatos_atuais}/{limite_contatos} ({percentual_utilizado.toFixed(1)}%)
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="ml-2 bg-green-100 text-green-800 border-green-300">
        {contatos_atuais}/{limite_contatos}
      </Badge>
    );
  };

  if (error) {
    return (
      <Alert variant="destructive" className="max-w-xs">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const selectedWorkspace = workspaces.find(w => w.id === value);

  return (
    <div className="flex items-center gap-2">
      <Select value={value?.toString()} onValueChange={(val) => onChange(parseInt(val))} disabled={loading}>
        <SelectTrigger className="w-[250px]">
          {loading ? (
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Carregando...</span>
            </div>
          ) : selectedWorkspace ? (
            <div className="flex items-center gap-2">
              {getTipoWhatsAppIcon(selectedWorkspace.tipo_whatsapp)}
              <span>{selectedWorkspace.nome}</span>
            </div>
          ) : (
            <SelectValue placeholder="Selecione um workspace" />
          )}
        </SelectTrigger>
        <SelectContent>
          {workspaces.map((workspace) => (
            <SelectItem key={workspace.id} value={workspace.id.toString()}>
              <div className="flex items-center justify-between w-full gap-2">
                <div className="flex items-center gap-2">
                  {getTipoWhatsAppIcon(workspace.tipo_whatsapp)}
                  <span>{workspace.nome}</span>
                </div>
                {workspace.ativo && (
                  <Badge variant="secondary" className="ml-2 text-xs">Ativo</Badge>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {showLimiteAlert && getLimiteBadge()}

      {limiteInfo?.alerta && (
        <AlertTriangle className="h-5 w-5 text-yellow-600" />
      )}
    </div>
  );
}
