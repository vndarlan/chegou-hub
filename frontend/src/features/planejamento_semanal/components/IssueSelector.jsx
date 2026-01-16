// frontend/src/features/planejamento_semanal/components/IssueSelector.jsx
import { ExternalLink } from 'lucide-react';
import { Checkbox } from '../../../components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { ScrollArea } from '../../../components/ui/scroll-area';
import { Label } from '../../../components/ui/label';
import { cn } from '../../../lib/utils';

const JIRA_BASE_URL = 'https://grupochegou.atlassian.net/browse/';

// Configuracao de tamanhos de tempo estimado
const TIME_SIZES = [
  { value: 'PP', label: 'PP', description: 'Ate 1h', color: 'bg-gray-200 hover:bg-gray-300', selectedColor: 'bg-gray-400 ring-2 ring-gray-500' },
  { value: 'P', label: 'P', description: '1h a 4h', color: 'bg-yellow-100 hover:bg-yellow-200', selectedColor: 'bg-yellow-300 ring-2 ring-yellow-500' },
  { value: 'M', label: 'M', description: '4h a 8h', color: 'bg-yellow-200 hover:bg-yellow-300', selectedColor: 'bg-yellow-400 ring-2 ring-yellow-600' },
  { value: 'G', label: 'G', description: '8h a 24h', color: 'bg-orange-200 hover:bg-orange-300', selectedColor: 'bg-orange-400 ring-2 ring-orange-600' },
  { value: 'GG', label: 'GG', description: 'Ate 40h', color: 'bg-red-200 hover:bg-red-300', selectedColor: 'bg-red-400 ring-2 ring-red-600' },
];

/**
 * Painel de opcoes inline para uma issue selecionada
 */
function IssueOptionsPanel({ issueKey, options = {}, onOptionChange }) {
  const currentSize = options.timeSize || 'M';
  const moreThanOneWeek = options.moreThanOneWeek || false;
  const isRoutine = options.isRoutine || false;

  const handleTimeSizeChange = (size) => {
    onOptionChange(issueKey, { ...options, timeSize: size });
  };

  const handleMoreThanOneWeekChange = (checked) => {
    onOptionChange(issueKey, { ...options, moreThanOneWeek: checked });
  };

  const handleIsRoutineChange = (checked) => {
    onOptionChange(issueKey, { ...options, isRoutine: checked });
  };

  return (
    <div className="mt-2 ml-6 p-3 bg-muted/50 rounded-lg border border-dashed space-y-3">
      {/* Tempo Estimado */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground">Tempo Estimado</Label>
        <div className="flex flex-wrap gap-1">
          {TIME_SIZES.map((size) => {
            const isSelected = currentSize === size.value;
            return (
              <button
                key={size.value}
                type="button"
                onClick={() => handleTimeSizeChange(size.value)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-md transition-all',
                  isSelected ? size.selectedColor : size.color,
                  'text-gray-800'
                )}
                title={size.description}
              >
                {size.label}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          {TIME_SIZES.find(s => s.value === currentSize)?.description}
        </p>
      </div>

      {/* Checkboxes */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id={`${issueKey}-more-than-week`}
            checked={moreThanOneWeek}
            onCheckedChange={handleMoreThanOneWeekChange}
          />
          <Label
            htmlFor={`${issueKey}-more-than-week`}
            className="text-xs cursor-pointer"
          >
            Mais de 1 semana?
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id={`${issueKey}-routine`}
            checked={isRoutine}
            onCheckedChange={handleIsRoutineChange}
          />
          <Label
            htmlFor={`${issueKey}-routine`}
            className="text-xs cursor-pointer"
          >
            E rotina?
          </Label>
        </div>
      </div>
    </div>
  );
}

/**
 * Componente para selecionar issues do Jira agrupadas por status
 * @param {Object} issuesByStatus - Issues agrupadas por status { Backlog: [], Priorizado: [], 'Em Andamento': [] }
 * @param {Array} selectedIssues - Array de issue_keys selecionadas
 * @param {Function} onToggleIssue - Callback quando issue e marcada/desmarcada
 * @param {Object} issueOptions - Objeto com configuracoes por issue_key { 'CHEGOU-123': { timeSize: 'M', moreThanOneWeek: false, isRoutine: false } }
 * @param {Function} onIssueOptionChange - Callback quando opcao de issue muda (issueKey, options)
 */
export function IssueSelector({
  issuesByStatus = {},
  selectedIssues = [],
  onToggleIssue,
  issueOptions = {},
  onIssueOptionChange
}) {
  // Ordem de exibicao dos status (do mais inicial ao mais avancado)
  const statusOrder = [
    'Backlog',
    'Refinamento',
    'Em Refinamento',
    'Priorizado',
    'To Do',
    'A Fazer',
    'Em Andamento',
    'Em Desenvolvimento',
    'In Progress',
    'Período de Teste',
    'PERÍODO DE TESTE',
    'Periodo de Teste',
    'Validação',
    'VALIDAÇÃO',
    'Validacao',
    'Em Revisão',
    'Em Revisao',
    'Review',
    'Testing',
    'Em Teste',
    'QA'
  ];

  const statusColors = {
    'Backlog': 'secondary',
    'Refinamento': 'outline',
    'Em Refinamento': 'outline',
    'Priorizado': 'default',
    'To Do': 'secondary',
    'A Fazer': 'secondary',
    'Em Andamento': 'destructive',
    'Em Desenvolvimento': 'destructive',
    'In Progress': 'destructive',
    'Período de Teste': 'default',
    'PERÍODO DE TESTE': 'default',
    'Periodo de Teste': 'default',
    'Validação': 'default',
    'VALIDAÇÃO': 'default',
    'Validacao': 'default',
    'Em Revisão': 'outline',
    'Em Revisao': 'outline',
    'Review': 'outline',
    'Testing': 'default',
    'Em Teste': 'default',
    'QA': 'default'
  };

  // Ordenar os status recebidos conforme statusOrder
  const sortedStatuses = Object.keys(issuesByStatus).sort((a, b) => {
    const indexA = statusOrder.indexOf(a);
    const indexB = statusOrder.indexOf(b);
    // Se nao esta na lista, vai pro final
    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  const totalIssues = Object.values(issuesByStatus).reduce((acc, issues) => acc + issues.length, 0);

  // Handler para mudanca de opcoes
  const handleOptionChange = (issueKey, options) => {
    if (onIssueOptionChange) {
      onIssueOptionChange(issueKey, options);
    }
  };

  if (totalIssues === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">
            Nenhuma issue disponivel para planejamento. Selecione um usuario.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Issues Disponiveis</CardTitle>
          <Badge variant="outline">
            {selectedIssues.length} selecionada(s)
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-6">
            {sortedStatuses.map((status) => {
              const issues = issuesByStatus[status] || [];
              if (issues.length === 0) return null;

              return (
                <div key={status} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant={statusColors[status] || 'secondary'}>
                      {status}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      ({issues.length} {issues.length === 1 ? 'issue' : 'issues'})
                    </span>
                  </div>

                  <div className="space-y-2 ml-1">
                    {issues.map((issue) => {
                      const issueKey = issue.key || issue.issue_key;
                      const isSelected = selectedIssues.includes(issueKey);

                      return (
                        <div
                          key={issueKey}
                          className={`p-3 rounded-lg border transition-colors ${
                            isSelected
                              ? 'bg-primary/5 border-primary/30'
                              : 'bg-background hover:bg-muted/50'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <Checkbox
                              id={issueKey}
                              checked={isSelected}
                              onCheckedChange={(checked) => onToggleIssue(issueKey, checked, issue)}
                              className="mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <a
                                  href={`${JIRA_BASE_URL}${issueKey}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {issueKey}
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                              <label
                                htmlFor={issueKey}
                                className="text-sm text-foreground cursor-pointer line-clamp-2"
                              >
                                {issue.summary}
                              </label>
                            </div>
                          </div>

                          {/* Painel de opcoes - aparece quando issue esta selecionada */}
                          {isSelected && (
                            <IssueOptionsPanel
                              issueKey={issueKey}
                              options={issueOptions[issueKey] || { timeSize: 'M', moreThanOneWeek: false, isRoutine: false }}
                              onOptionChange={handleOptionChange}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default IssueSelector;
