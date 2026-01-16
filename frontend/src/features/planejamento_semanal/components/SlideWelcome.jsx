// frontend/src/features/planejamento_semanal/components/SlideWelcome.jsx
import { useState, useEffect } from 'react';
import { Calendar, Save, Loader2, Pencil, X } from 'lucide-react';
import apiClient from '../../../utils/axios';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';

/**
 * Slide de boas-vindas para apresentacao
 * Titulo editavel (salvo no backend) + subtitulo fixo
 * @param {boolean} isFullscreen - Se true, esconde controles de edicao
 */
export function SlideWelcome({ isFullscreen = false }) {
  const [titulo, setTitulo] = useState('Bem-vindo');
  const [tituloOriginal, setTituloOriginal] = useState('Bem-vindo');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Buscar configuracao do backend
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await apiClient.get('/planejamento-semanal/config-apresentacao/');
        const tituloFromApi = response.data.titulo_welcome || 'Bem-vindo';
        setTitulo(tituloFromApi);
        setTituloOriginal(tituloFromApi);
      } catch (err) {
        console.log('Erro ao buscar configuracao:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  // Salvar configuracao
  const handleSave = async () => {
    if (!titulo.trim()) {
      setTitulo(tituloOriginal);
      setIsEditing(false);
      return;
    }

    setSaving(true);
    try {
      await apiClient.post('/planejamento-semanal/config-apresentacao/', {
        titulo_welcome: titulo.trim()
      });
      setTituloOriginal(titulo.trim());
      setIsEditing(false);
    } catch (err) {
      console.error('Erro ao salvar:', err);
      setTitulo(tituloOriginal);
    } finally {
      setSaving(false);
    }
  };

  // Cancelar edicao
  const handleCancel = () => {
    setTitulo(tituloOriginal);
    setIsEditing(false);
  };

  // Salvar com Enter
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-gradient-to-br from-background to-muted">
      <div className="text-center space-y-6">
        <Calendar className="h-20 w-20 mx-auto text-primary" />

        {/* Titulo editavel */}
        {isEditing && !isFullscreen ? (
          <div className="flex items-center justify-center gap-2">
            <Input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              onKeyDown={handleKeyDown}
              className="text-4xl font-bold text-center w-80 h-16"
              autoFocus
            />
            <Button
              size="icon"
              onClick={handleSave}
              disabled={saving}
              className="h-12 w-12"
            >
              {saving ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Save className="h-5 w-5" />
              )}
            </Button>
            <Button
              size="icon"
              variant="outline"
              onClick={handleCancel}
              className="h-12 w-12"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-3">
            <h1 className="text-6xl font-bold text-foreground tracking-tight">
              {loading ? '...' : titulo}
            </h1>
            {!isFullscreen && !loading && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setIsEditing(true)}
                className="h-10 w-10 opacity-50 hover:opacity-100"
              >
                <Pencil className="h-5 w-5" />
              </Button>
            )}
          </div>
        )}

        {/* Subtitulo fixo */}
        <h2 className="text-4xl font-semibold text-primary">
          Planejamento Semanal
        </h2>
      </div>
    </div>
  );
}

export default SlideWelcome;
