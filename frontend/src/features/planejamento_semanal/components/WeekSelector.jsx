// frontend/src/features/planejamento_semanal/components/WeekSelector.jsx
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { Badge } from '../../../components/ui/badge';

/**
 * Componente para selecionar semana e criar novas semanas (admin only)
 * @param {Array} semanas - Lista de semanas disponiveis
 * @param {Object} selectedSemana - Semana selecionada
 * @param {Function} onSemanaChange - Callback quando semana muda
 * @param {Function} onNovaSemana - Callback para criar nova semana (null se nao for admin)
 * @param {boolean} isAdmin - Se o usuario e admin
 * @param {boolean} loading - Se esta carregando
 * @param {boolean} creating - Se esta criando nova semana
 */
export function WeekSelector({
  semanas = [],
  selectedSemana,
  onSemanaChange,
  onNovaSemana,
  isAdmin = false,
  loading = false,
  creating = false
}) {
  // Formatar label da semana
  const formatSemanaLabel = (semana) => {
    if (!semana) return '-';
    if (semana.label) return semana.label;
    if (semana.data_inicio && semana.data_fim) {
      const inicio = new Date(semana.data_inicio + 'T00:00:00').toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit'
      });
      const fim = new Date(semana.data_fim + 'T00:00:00').toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit'
      });
      return `${inicio} - ${fim}`;
    }
    return '-';
  };

  // Verificar se e a semana atual (a primeira da lista ordenada por data desc)
  const isCurrentWeek = (semana) => {
    if (!semanas.length || !semana) return false;
    return semanas[0]?.id === semana.id;
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Carregando semanas...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Select
        value={selectedSemana?.id?.toString() || ''}
        onValueChange={(value) => {
          const semana = semanas.find(s => s.id.toString() === value);
          if (semana) onSemanaChange(semana);
        }}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Selecione uma semana">
            {selectedSemana && (
              <div className="flex items-center gap-2">
                <span>{formatSemanaLabel(selectedSemana)}</span>
                {isCurrentWeek(selectedSemana) && (
                  <Badge variant="outline" className="text-xs py-0">
                    atual
                  </Badge>
                )}
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {semanas.length === 0 ? (
            <div className="px-2 py-4 text-center text-sm text-muted-foreground">
              Nenhuma semana encontrada
            </div>
          ) : (
            semanas.map((semana) => (
              <SelectItem key={semana.id} value={semana.id.toString()}>
                <div className="flex items-center gap-2">
                  <span>{formatSemanaLabel(semana)}</span>
                  {isCurrentWeek(semana) && (
                    <Badge variant="outline" className="text-xs py-0">
                      atual
                    </Badge>
                  )}
                </div>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>

      {isAdmin && onNovaSemana && (
        <Button
          onClick={onNovaSemana}
          variant="outline"
          size="sm"
          disabled={creating}
        >
          {creating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Criando...
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Nova Semana
            </>
          )}
        </Button>
      )}
    </div>
  );
}

export default WeekSelector;
