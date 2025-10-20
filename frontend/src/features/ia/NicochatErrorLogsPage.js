import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useWorkspace } from './contexts/WorkspaceContext';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { RefreshCw, AlertTriangle, Phone, Mail, User } from 'lucide-react';

export default function NicochatErrorLogsPage() {
  const { selectedWorkspace } = useWorkspace();
  const [errorLogs, setErrorLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (selectedWorkspace) {
      fetchErrorLogs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWorkspace]);

  const fetchErrorLogs = async () => {
    if (!selectedWorkspace) {
      setError('Nenhum workspace selecionado');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(
        `/ia/nicochat-workspaces/${selectedWorkspace}/error_logs/`
      );

      if (response.data.success) {
        setErrorLogs(response.data.error_logs || []);
      } else {
        setError(response.data.error || 'Erro ao buscar logs');
        setErrorLogs([]);
      }
    } catch (err) {
      console.error('Erro ao buscar logs:', err);
      setError('Erro ao comunicar com o servidor. Tente novamente.');
      setErrorLogs([]);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar logs por busca
  const filteredLogs = errorLogs.filter(log => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      log.name.toLowerCase().includes(searchLower) ||
      log.phone.includes(search) ||
      (log.email && log.email.toLowerCase().includes(searchLower)) ||
      log.error_message.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <AlertTriangle className="text-red-600" size={32} />
            Log de Erros NicoChat
          </h1>
          <p className="text-muted-foreground mt-1">
            Subscribers com erro detectado na variável "erroencontrado"
          </p>
        </div>

        <Button
          onClick={fetchErrorLogs}
          disabled={loading || !selectedWorkspace}
          className="gap-2"
        >
          <RefreshCw className={loading ? "animate-spin" : ""} size={16} />
          {loading ? 'Carregando...' : 'Atualizar'}
        </Button>
      </div>

      {/* Stats Card */}
      <Card>
        <CardHeader>
          <CardTitle>Estatísticas</CardTitle>
          <CardDescription>Resumo dos erros encontrados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-8">
            <div>
              <div className="text-3xl font-bold text-red-600">
                {filteredLogs.length}
              </div>
              <div className="text-sm text-muted-foreground">
                Erros {search ? 'filtrados' : 'totais'}
              </div>
            </div>
            {search && (
              <div>
                <div className="text-3xl font-bold text-gray-600">
                  {errorLogs.length}
                </div>
                <div className="text-sm text-muted-foreground">
                  Total de erros
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
          <Input
            placeholder="Buscar por nome, telefone, email ou mensagem de erro..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {search && (
          <Button
            variant="outline"
            onClick={() => setSearch('')}
          >
            Limpar
          </Button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <RefreshCw className="animate-spin mx-auto mb-4 text-muted-foreground" size={32} />
              <p className="text-muted-foreground">
                Buscando erros... Isso pode levar alguns segundos.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Cliente</TableHead>
                  <TableHead className="w-[150px]">Contato</TableHead>
                  <TableHead>Mensagem de Erro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-12">
                      <div className="text-muted-foreground">
                        {search ? (
                          <>
                            <AlertTriangle className="mx-auto mb-2 opacity-50" size={32} />
                            <p>Nenhum resultado encontrado para "{search}"</p>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="mx-auto mb-2 opacity-50" size={32} />
                            <p className="font-semibold">Nenhum erro registrado</p>
                            <p className="text-sm mt-1">
                              Ótimo! Não há subscribers com erros no momento.
                            </p>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log, index) => (
                    <TableRow key={log.user_ns || index}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="text-muted-foreground" size={16} />
                          <div>
                            <div className="font-medium">{log.name}</div>
                            {log.email && (
                              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                <Mail size={12} />
                                {log.email}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Phone size={14} className="text-muted-foreground" />
                          {log.phone || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-sm bg-red-50 text-red-700 p-3 rounded border border-red-200">
                          {log.error_message}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Footer Info */}
      {!loading && filteredLogs.length > 0 && (
        <div className="text-sm text-muted-foreground text-center">
          Mostrando {filteredLogs.length} {filteredLogs.length === 1 ? 'erro' : 'erros'}
          {search && ` de ${errorLogs.length} total`}
        </div>
      )}
    </div>
  );
}
