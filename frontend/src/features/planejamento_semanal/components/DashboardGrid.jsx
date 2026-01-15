// frontend/src/features/planejamento_semanal/components/DashboardGrid.jsx
import { CheckCircle2, Clock, Users, ListTodo, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Progress } from '../../../components/ui/progress';
import { Avatar, AvatarImage, AvatarFallback } from '../../../components/ui/avatar';
import { ScrollArea } from '../../../components/ui/scroll-area';

const JIRA_BASE_URL = 'https://grupochegou.atlassian.net/browse/';

/**
 * Grid de cards mostrando planejamento por pessoa
 * @param {Object} data - Dados do dashboard { semana, planejamentos, total_itens, total_concluidos }
 */
export function DashboardGrid({ data }) {
  if (!data) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">
            Carregando dados do dashboard...
          </p>
        </CardContent>
      </Card>
    );
  }

  const { semana, planejamentos = [], total_itens = 0, total_concluidos = 0 } = data;
  const progressPercent = total_itens > 0 ? Math.round((total_concluidos / total_itens) * 100) : 0;

  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Semana</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{semana || '-'}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Membros</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{planejamentos.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Itens</CardTitle>
            <ListTodo className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total_itens}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Concluidos</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{total_concluidos}</div>
            <Progress value={progressPercent} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">{progressPercent}% concluido</p>
          </CardContent>
        </Card>
      </div>

      {/* Grid de Pessoas */}
      {planejamentos.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">
              Nenhum planejamento encontrado para esta semana.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {planejamentos.map((planejamento) => {
            const { usuario, itens = [], total: totalItens = 0, concluidos = 0 } = planejamento;
            const userProgress = totalItens > 0 ? Math.round((concluidos / totalItens) * 100) : 0;

            return (
              <Card key={usuario?.account_id || usuario?.nome}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={usuario?.avatar_url} alt={usuario?.nome} />
                      <AvatarFallback>
                        {getInitials(usuario?.nome)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">
                        {usuario?.nome || 'Usuario'}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={userProgress === 100 ? 'default' : 'secondary'} className="text-xs">
                          {concluidos}/{totalItens}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {userProgress}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <Progress value={userProgress} className="mt-2" />
                </CardHeader>
                <CardContent className="pt-0">
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-2">
                      {itens.map((item) => (
                        <div
                          key={item.issue_key}
                          className={`flex items-start gap-2 p-2 rounded-md text-sm ${
                            item.concluido
                              ? 'bg-green-50 dark:bg-green-950/20'
                              : 'bg-muted/50'
                          }`}
                        >
                          {item.concluido ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                          ) : (
                            <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 mt-0.5 shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <a
                              href={`${JIRA_BASE_URL}${item.issue_key}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-primary hover:underline flex items-center gap-1"
                            >
                              {item.issue_key}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                            <p className={`text-xs truncate ${
                              item.concluido ? 'text-muted-foreground line-through' : 'text-foreground'
                            }`}>
                              {item.summary}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default DashboardGrid;
