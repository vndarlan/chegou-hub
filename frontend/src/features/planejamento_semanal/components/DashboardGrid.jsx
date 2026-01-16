// frontend/src/features/planejamento_semanal/components/DashboardGrid.jsx
import { useState } from 'react';
import { CheckCircle2, Clock, Users, ListTodo, ExternalLink, Flag, RefreshCw, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Progress } from '../../../components/ui/progress';
import { Avatar, AvatarImage, AvatarFallback } from '../../../components/ui/avatar';
import { ScrollArea } from '../../../components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';

const JIRA_BASE_URL = 'https://grupochegou.atlassian.net/browse/';

// Mapeamento de times e seus membros
const TIMES = {
  'IA & Automações': ['Vinicius Darlan Henriques Miranda', 'Murillo Ribeiro'],
  'Gestão': ['Nathalia Rocha'],
  'Operacional': ['Matheus ribeiro', 'andersonbarbosachegou', 'Marcos Alberto Belisario', 'Murillo Ribeiro'],
  'Suporte': ['Igor Vaz Santos Magalhães', 'Ricardo Machado'],
  'Tráfego e Criativos': ['Matheus Silva']
};

// Pessoas para ignorar no dashboard
const IGNORAR = ['João Bento Coelho'];

// Agrupa status em categorias para exibição
const STATUS_GROUPS = {
  'Backlog': ['Backlog', 'To Do', 'A Fazer', 'Priorizado'],
  'Refinamento': ['Refinamento', 'Em Refinamento'],
  'Em Andamento': ['Em Andamento', 'Em Desenvolvimento', 'In Progress'],
  'Validação': ['Validação', 'Período de Teste', 'Em Teste', 'Testing', 'QA', 'Em Revisão', 'Review'],
  'Concluído': ['Done', 'Concluído', 'Concluido']
};

// Configuração visual por grupo
const GROUP_CONFIG = {
  'Backlog': { color: 'bg-gray-100 dark:bg-gray-800', textColor: 'text-gray-700 dark:text-gray-300', dot: 'bg-gray-400' },
  'Refinamento': { color: 'bg-yellow-100 dark:bg-yellow-900/30', textColor: 'text-yellow-700 dark:text-yellow-300', dot: 'bg-yellow-500' },
  'Em Andamento': { color: 'bg-blue-100 dark:bg-blue-900/30', textColor: 'text-blue-700 dark:text-blue-300', dot: 'bg-blue-500' },
  'Validação': { color: 'bg-purple-100 dark:bg-purple-900/30', textColor: 'text-purple-700 dark:text-purple-300', dot: 'bg-purple-500' },
  'Concluído': { color: 'bg-green-100 dark:bg-green-900/30', textColor: 'text-green-700 dark:text-green-300', dot: 'bg-green-500' }
};

// Função para obter o grupo de um status
const getStatusGroup = (status) => {
  for (const [group, statuses] of Object.entries(STATUS_GROUPS)) {
    if (statuses.some(s => s.toLowerCase() === status?.toLowerCase())) {
      return group;
    }
  }
  return 'Backlog'; // default
};

// Função para agrupar itens por status
const groupItemsByStatus = (itens) => {
  const groups = {};

  itens.forEach(item => {
    // Determinar o grupo baseado no status ou se está concluído
    let group;
    if (item.concluido) {
      group = 'Concluído';
    } else {
      group = getStatusGroup(item.issue_status);
    }

    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(item);
  });

  // Ordenar grupos na ordem definida
  const orderedGroups = {};
  const groupOrder = ['Backlog', 'Refinamento', 'Em Andamento', 'Validação', 'Concluído'];
  groupOrder.forEach(group => {
    if (groups[group] && groups[group].length > 0) {
      orderedGroups[group] = groups[group];
    }
  });

  return orderedGroups;
};

// Verifica se uma pessoa pertence a um time
const pertenceAoTime = (nome, time) => {
  if (time === 'Todos') return true;
  const membros = TIMES[time] || [];
  return membros.some(membro =>
    nome?.toLowerCase().includes(membro.toLowerCase()) ||
    membro.toLowerCase().includes(nome?.toLowerCase())
  );
};

// Verifica se deve ignorar a pessoa
const deveIgnorar = (nome) => {
  return IGNORAR.some(ignorado =>
    nome?.toLowerCase().includes(ignorado.toLowerCase())
  );
};

/**
 * Grid de cards mostrando planejamento por pessoa
 * @param {Object} data - Dados do dashboard { semana, planejamentos, total_itens, total_concluidos }
 * @param {Array} users - Lista de usuarios do Jira para buscar fotos
 */
export function DashboardGrid({ data, users = [] }) {
  const [selectedTime, setSelectedTime] = useState('Todos');

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

  // Filtrar planejamentos pelo time selecionado e remover ignorados
  const planejamentosFiltrados = planejamentos.filter(p => {
    const nome = p.jira_display_name || p.usuario?.nome || '';
    if (deveIgnorar(nome)) return false;
    return pertenceAoTime(nome, selectedTime);
  });

  // Recalcular totais baseado nos filtrados
  const totalItensFiltrados = planejamentosFiltrados.reduce((acc, p) => acc + (p.itens?.length || 0), 0);
  const totalConcluidosFiltrados = planejamentosFiltrados.reduce((acc, p) => {
    return acc + (p.itens?.filter(i => i.concluido)?.length || 0);
  }, 0);

  const progressPercent = totalItensFiltrados > 0 ? Math.round((totalConcluidosFiltrados / totalItensFiltrados) * 100) : 0;

  // Formatar label da semana
  const getSemanaLabel = () => {
    if (!semana) return '-';
    if (typeof semana === 'string') return semana;
    if (semana.label) return semana.label;
    if (semana.data_inicio && semana.data_fim) {
      const inicio = new Date(semana.data_inicio).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      const fim = new Date(semana.data_fim).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      return `${inicio} - ${fim}`;
    }
    return '-';
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Buscar foto do usuario pelo account_id
  const getUserAvatar = (accountId) => {
    const user = users.find(u => u.account_id === accountId);
    return user?.avatar_url || null;
  };

  return (
    <div className="space-y-6">
      {/* Filtro de Time */}
      <div className="flex items-center justify-end gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={selectedTime} onValueChange={setSelectedTime}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrar por time" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Todos">Todos</SelectItem>
            {Object.keys(TIMES).map(time => (
              <SelectItem key={time} value={time}>{time}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Semana</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getSemanaLabel()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Membros</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{planejamentosFiltrados.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Itens</CardTitle>
            <ListTodo className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItensFiltrados}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Concluidos</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalConcluidosFiltrados}</div>
            <Progress value={progressPercent} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">{progressPercent}% concluido</p>
          </CardContent>
        </Card>
      </div>

      {/* Grid de Pessoas */}
      {planejamentosFiltrados.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">
              Nenhum planejamento encontrado {selectedTime !== 'Todos' ? `para o time ${selectedTime}` : 'para esta semana'}.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {planejamentosFiltrados.map((planejamento, index) => {
            // Suportar ambos os formatos de dados
            const nome = planejamento.jira_display_name || planejamento.usuario?.nome || 'Usuario';
            const accountId = planejamento.jira_account_id || planejamento.usuario?.account_id;
            const itens = planejamento.itens || [];
            const totalItens = itens.length;
            const concluidos = itens.filter(i => i.concluido).length;
            const userProgress = totalItens > 0 ? Math.round((concluidos / totalItens) * 100) : 0;

            const avatarUrl = getUserAvatar(accountId);

            // Agrupar itens por status
            const groupedItems = groupItemsByStatus(itens);

            return (
              <Card key={accountId || planejamento.id || `planejamento-${index}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      {avatarUrl && <AvatarImage src={avatarUrl} alt={nome} />}
                      <AvatarFallback>
                        {getInitials(nome)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">
                        {nome}
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
                  <ScrollArea className="h-[280px]">
                    <div className="space-y-4">
                      {Object.entries(groupedItems).map(([group, items]) => {
                        const config = GROUP_CONFIG[group];
                        return (
                          <div key={group} className="space-y-1">
                            {/* Header do grupo de status */}
                            <div className={`flex items-center gap-2 px-2 py-1 rounded-md ${config.color}`}>
                              <div className={`h-2.5 w-2.5 rounded-full ${config.dot}`} />
                              <span className={`text-sm font-medium ${config.textColor}`}>
                                {group} ({items.length})
                              </span>
                            </div>

                            {/* Lista de issues do grupo */}
                            <div className="pl-2 border-l-2 border-muted ml-1 space-y-1">
                              {items.map((item, index) => (
                                <div
                                  key={item.issue_key || item.id}
                                  className="flex items-start gap-2 py-1 px-2 text-sm hover:bg-muted/50 rounded-sm"
                                >
                                  <span className="text-muted-foreground text-xs mt-0.5">
                                    {index === items.length - 1 ? '└' : '├'}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1">
                                      <a
                                        href={`${JIRA_BASE_URL}${item.issue_key}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-medium text-primary hover:underline flex items-center gap-1"
                                      >
                                        {item.issue_key}
                                        <ExternalLink className="h-3 w-3" />
                                      </a>
                                      {item.mais_de_uma_semana && (
                                        <Flag className="h-3.5 w-3.5 text-red-500 shrink-0" title="Mais de uma semana" />
                                      )}
                                      {item.is_rotina && (
                                        <RefreshCw className="h-3.5 w-3.5 text-blue-500 shrink-0" title="Rotina" />
                                      )}
                                    </div>
                                    <p className={`text-xs truncate ${
                                      item.concluido ? 'text-muted-foreground line-through' : 'text-foreground'
                                    }`}>
                                      {item.issue_summary || item.summary}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
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
