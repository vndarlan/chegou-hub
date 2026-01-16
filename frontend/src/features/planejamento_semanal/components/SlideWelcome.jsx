// frontend/src/features/planejamento_semanal/components/SlideWelcome.jsx
import { useState, useEffect } from 'react';
import { Calendar, Save, Loader2, Pencil, X } from 'lucide-react';
import apiClient from '../../../utils/axios';
import { Button } from '../../../components/ui/button';
import { Textarea } from '../../../components/ui/textarea';

/**
 * Slide de boas-vindas para apresentacao
 * Titulo fixo + texto editavel (salvo no backend)
 * @param {boolean} isFullscreen - Se true, esconde controles de edicao
 */
export function SlideWelcome({ isFullscreen = false }) {
  const [texto, setTexto] = useState('Bem-vindo');
  const [textoOriginal, setTextoOriginal] = useState('Bem-vindo');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Buscar configuracao do backend
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await apiClient.get('/planejamento-semanal/config-apresentacao/');
        const textoFromApi = response.data.titulo_welcome || 'Bem-vindo';
        setTexto(textoFromApi);
        setTextoOriginal(textoFromApi);
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
    if (!texto.trim()) {
      setTexto(textoOriginal);
      setIsEditing(false);
      return;
    }

    setSaving(true);
    try {
      await apiClient.post('/planejamento-semanal/config-apresentacao/', {
        titulo_welcome: texto.trim()
      });
      setTextoOriginal(texto.trim());
      setIsEditing(false);
    } catch (err) {
      console.error('Erro ao salvar:', err);
      setTexto(textoOriginal);
    } finally {
      setSaving(false);
    }
  };

  // Cancelar edicao
  const handleCancel = () => {
    setTexto(textoOriginal);
    setIsEditing(false);
  };

  // Salvar com Ctrl+Enter
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-gradient-to-br from-background to-muted">
      <div className="text-center space-y-8 max-w-3xl px-8">
        <Calendar className="h-20 w-20 mx-auto text-primary" />

        {/* Titulo fixo */}
        <h1 className="text-6xl font-bold text-primary tracking-tight">
          Planejamento Semanal
        </h1>

        {/* Texto editavel */}
        {isEditing && !isFullscreen ? (
          <div className="space-y-3">
            <Textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={handleKeyDown}
              className="text-xl text-center min-h-[120px] resize-none"
              placeholder="Digite uma mensagem de boas-vindas... (Ctrl+Enter para salvar)"
              autoFocus
            />
            <div className="flex items-center justify-center gap-2">
              <Button
                onClick={handleSave}
                disabled={saving}
                size="sm"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvar
              </Button>
              <Button
                variant="outline"
                onClick={handleCancel}
                size="sm"
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <div className="relative group">
            <p className="text-2xl text-foreground/80 whitespace-pre-wrap leading-relaxed">
              {loading ? '...' : texto}
            </p>
            {!isFullscreen && !loading && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setIsEditing(true)}
                className="absolute -right-12 top-1/2 -translate-y-1/2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default SlideWelcome;
