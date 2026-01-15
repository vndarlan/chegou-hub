// frontend/src/features/planejamento_semanal/components/IssueSelector.jsx
import { ExternalLink } from 'lucide-react';
import { Checkbox } from '../../../components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { ScrollArea } from '../../../components/ui/scroll-area';

const JIRA_BASE_URL = 'https://grupochegou.atlassian.net/browse/';

/**
 * Componente para selecionar issues do Jira agrupadas por status
 * @param {Object} issuesByStatus - Issues agrupadas por status { Backlog: [], Priorizado: [], 'Em Andamento': [] }
 * @param {Array} selectedIssues - Array de issue_keys selecionadas
 * @param {Function} onToggleIssue - Callback quando issue e marcada/desmarcada
 */
export function IssueSelector({ issuesByStatus = {}, selectedIssues = [], onToggleIssue }) {
  const statusOrder = ['Backlog', 'Priorizado', 'Em Andamento'];
  const statusColors = {
    'Backlog': 'secondary',
    'Priorizado': 'default',
    'Em Andamento': 'destructive',
  };

  const totalIssues = Object.values(issuesByStatus).reduce((acc, issues) => acc + issues.length, 0);

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
            {statusOrder.map((status) => {
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
                          className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                            isSelected
                              ? 'bg-primary/5 border-primary/30'
                              : 'bg-background hover:bg-muted/50'
                          }`}
                        >
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
