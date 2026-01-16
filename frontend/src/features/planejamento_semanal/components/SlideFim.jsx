// frontend/src/features/planejamento_semanal/components/SlideFim.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Flag, AlertTriangle, Plus, Trash2, Loader2 } from 'lucide-react';
import apiClient from '../../../utils/axios';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Textarea } from '../../../components/ui/textarea';
import { ScrollArea } from '../../../components/ui/scroll-area';

/**
 * Slide final para apresentacao
 * Exibe "FIM" centralizado com area para avisos importantes
 * Avisos sao salvos no banco de dados
 * @param {boolean} isFullscreen - Se true, esconde controles de edicao
 */
export function SlideFim({ isFullscreen = false }) {
  const [avisos, setAvisos] = useState([]);
  const [novoAviso, setNovoAviso] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Buscar avisos da API
  const fetchAvisos = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/planejamento-semanal/avisos/');
      // Garantir que sempre temos um array
      const data = response.data;
      if (Array.isArray(data)) {
        setAvisos(data);
      } else if (data?.avisos && Array.isArray(data.avisos)) {
        setAvisos(data.avisos);
      } else {
        setAvisos([]);
      }
    } catch (err) {
      console.error('Erro ao buscar avisos:', err);
      setAvisos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAvisos();
  }, [fetchAvisos]);

  // Salvar novo aviso
  const handleSalvarAviso = async () => {
    if (!novoAviso.trim()) return;

    setSaving(true);
    try {
      const response = await apiClient.post('/planejamento-semanal/avisos/criar/', {
        texto: novoAviso.trim()
      });

      // Recarregar lista para garantir consistência
      await fetchAvisos();
      setNovoAviso('');
    } catch (err) {
      console.error('Erro ao salvar aviso:', err);
    } finally {
      setSaving(false);
    }
  };

  // Deletar aviso
  const handleDeletarAviso = async (id) => {
    setDeletingId(id);
    try {
      await apiClient.delete(`/planejamento-semanal/avisos/deletar/?id=${id}`);
      setAvisos(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      console.error('Erro ao deletar aviso:', err);
    } finally {
      setDeletingId(null);
    }
  };

  // Permitir salvar com Ctrl+Enter
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSalvarAviso();
    }
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-gradient-to-br from-background to-muted p-8">
      {/* Titulo FIM */}
      <div className="text-center mb-8">
        <Flag className="h-14 w-14 mx-auto text-primary mb-3" />
        <h1 className="text-7xl font-bold text-foreground tracking-wider">
          FIM
        </h1>
        <p className="text-lg text-muted-foreground mt-3">
          Obrigado pela atenção
        </p>
      </div>

      {/* Area de Avisos */}
      <Card className="w-full max-w-3xl shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Avisos Importantes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Lista de avisos existentes */}
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : avisos.length > 0 ? (
            <ScrollArea className="max-h-[200px]">
              <div className="space-y-2">
                {avisos.map((aviso) => (
                  <div
                    key={aviso.id}
                    className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-md border border-yellow-200 dark:border-yellow-900"
                  >
                    <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground whitespace-pre-wrap">
                        {aviso.texto}
                      </p>
                      {aviso.criado_por_nome && (
                        <p className="text-xs text-muted-foreground mt-1">
                          por {aviso.criado_por_nome}
                        </p>
                      )}
                    </div>
                    {!isFullscreen && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeletarAviso(aviso.id)}
                        disabled={deletingId === aviso.id}
                      >
                        {deletingId === aviso.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-2">
              Nenhum aviso cadastrado
            </p>
          )}

          {/* Adicionar novo aviso - apenas fora do fullscreen */}
          {!isFullscreen && (
            <div className="pt-2 border-t space-y-3">
              <Textarea
                placeholder="Digite um novo aviso... (Ctrl+Enter para salvar)"
                value={novoAviso}
                onChange={(e) => setNovoAviso(e.target.value)}
                onKeyDown={handleKeyDown}
                className="min-h-[80px] resize-none text-sm"
              />
              <div className="flex justify-end">
                <Button
                  onClick={handleSalvarAviso}
                  disabled={saving || !novoAviso.trim()}
                  size="sm"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Adicionar Aviso
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default SlideFim;
