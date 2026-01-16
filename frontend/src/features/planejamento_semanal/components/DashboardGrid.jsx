// frontend/src/features/planejamento_semanal/components/DashboardGrid.jsx
import { useState, useMemo } from 'react';
import { CheckCircle2, Clock, Users, ListTodo, ExternalLink, Flag, RefreshCw, Filter, Calendar, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Progress } from '../../../components/ui/progress';
import { Avatar, AvatarImage, AvatarFallback } from '../../../components/ui/avatar';
import { ScrollArea } from '../../../components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';

const JIRA_BASE_URL = 'https://grupochegou.atlassian.net/browse/';

// Mapeamento de times e seus membros (nomes conforme Jira)
const TIMES = {
  'IA & Automações': ['Vinicius Darlan Henriques Miranda', 'Murillo Ribeiro'],
  'Gestão': ['Nathalia Rocha'],
  'Operacional': ['andersonbarbosachegou', 'Marcos Alberto Belisario', 'Matheus ribeiro', 'Murillo Ribeiro'],
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
  'Testando': ['Testando', 'TESTANDO', 'Período de Teste', 'Em Teste', 'Testing', 'QA'],
  'Validando': ['Validando', 'VALIDANDO', 'Validação'],
  'Concluído': ['Done', 'Concluído', 'Concluido', 'Para Revisão', 'PARA REVISÃO', 'Em Revisão', 'EM REVISÃO', 'Review', 'REVIEW', 'Revisão', 'REVISÃO']
};

// Configuração visual por grupo - cores mais vibrantes
const GROUP_CONFIG = {
  'Backlog': { color: 'bg-slate-200 dark:bg-slate-700', textColor: 'text-slate-800 dark:text-slate-200', dot: 'bg-slate-500' },
  'Refinamento': { color: 'bg-amber-200 dark:bg-amber-800/50', textColor: 'text-amber-800 dark:text-amber-200', dot: 'bg-amber-500' },
  'Em Andamento': { color: 'bg-blue-200 dark:bg-blue-800/50', textColor: 'text-blue-800 dark:text-blue-200', dot: 'bg-blue-500' },
  'Testando': { color: 'bg-orange-200 dark:bg-orange-800/50', textColor: 'text-orange-800 dark:text-orange-200', dot: 'bg-orange-500' },
  'Validando': { color: 'bg-violet-200 dark:bg-violet-800/50', textColor: 'text-violet-800 dark:text-violet-200', dot: 'bg-violet-500' },
  'Concluído': { color: 'bg-emerald-200 dark:bg-emerald-800/50', textColor: 'text-emerald-800 dark:text-emerald-200', dot: 'bg-emerald-500' }
};

// Função para obter o grupo de um status
const getStatusGroup = (status) => {
  for (const [group, statuses] of Object.entries(STATUS_GROUPS)) {
    if (statuses.some(s => s.toLowerCase() === status?.toLowerCase())) {
      return group;
    }
  }
  return 'Backlog';
};

// Função para agrupar itens por status
const groupItemsByStatus = (itens) => {
  const groups = {};

  itens.forEach(item => {
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

  const orderedGroups = {};
  const groupOrder = ['Backlog', 'Refinamento', 'Em Andamento', 'Testando', 'Validando', 'Concluído'];
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

// Determina classes do grid baseado na quantidade de pessoas
const getGridClasses = (count) => {
  if (count === 1) return 'grid-cols-1 max-w-2xl mx-auto';
  if (count === 2) return 'grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto';
  if (count === 3) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
  return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
};

/**
 * Grid de cards mostrando planejamento por pessoa
 */
export function DashboardGrid({ data, users = [] }) {
  const [selectedTime, setSelectedTime] = useState('Todos');
  const [selectedPessoa, setSelectedPessoa] = useState('Todas');

  const { semana, planejamentos = [] } = data || {};

  // Lista de pessoas disponíveis (extraída dos planejamentos, sem ignorados)
  const pessoasDisponiveis = useMemo(() => {
    const pessoas = (planejamentos || [])
      .map(p => p.jira_display_name || p.usuario?.nome || '')
      .filter(nome => nome && !deveIgnorar(nome))
      .sort((a, b) => a.localeCompare(b));
    return [...new Set(pessoas)];
  }, [planejamentos]);

  // Filtrar planejamentos por time e pessoa
  const planejamentosFiltrados = useMemo(() => {
    return (planejamentos || []).filter(p => {
      const nome = p.jira_display_name || p.usuario?.nome || '';
      if (deveIgnorar(nome)) return false;

      // Filtro por time
      if (!pertenceAoTime(nome, selectedTime)) return false;

      // Filtro por pessoa
      if (selectedPessoa !== 'Todas' && nome !== selectedPessoa) return false;

      return true;
    });
  }, [planejamentos, selectedTime, selectedPessoa]);

  // Calcular totais
  const { totalItensFiltrados, totalConcluidosFiltrados, progressPercent } = useMemo(() => {
    const total = planejamentosFiltrados.reduce((acc, p) => acc + (p.itens?.length || 0), 0);
    const concluidos = planejamentosFiltrados.reduce((acc, p) => {
      return acc + (p.itens?.filter(i => i.concluido)?.length || 0);
    }, 0);
    return {
      totalItensFiltrados: total,
      totalConcluidosFiltrados: concluidos,
      progressPercent: total > 0 ? Math.round((concluidos / total) * 100) : 0
    };
  }, [planejamentosFiltrados]);

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
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  const getUserAvatar = (accountId) => {
    const user = users.find(u => u.account_id === accountId);
    return user?.avatar_url || null;
  };

  if (!data) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Carregando dados do dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Compacto - Resumo + Filtro */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-muted/30 rounded-lg border">
        {/* Métricas em linha */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold">{getSemanaLabel()}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span><strong>{planejamentosFiltrados.length}</strong> membros</span>
          </div>
          <div className="flex items-center gap-2">
            <ListTodo className="h-4 w-4 text-muted-foreground" />
            <span><strong>{totalItensFiltrados}</strong> itens</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
              {totalConcluidosFiltrados} ({progressPercent}%)
            </span>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Filtro por Time */}
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedTime} onValueChange={(v) => { setSelectedTime(v); setSelectedPessoa('Todas'); }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos os times</SelectItem>
                {Object.keys(TIMES).map(time => (
                  <SelectItem key={time} value={time}>{time}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtro por Pessoa */}
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedPessoa} onValueChange={setSelectedPessoa}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Pessoa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todas">Todas as pessoas</SelectItem>
                {pessoasDisponiveis.map(pessoa => (
                  <SelectItem key={pessoa} value={pessoa}>
                    {pessoa.split(' ').slice(0, 2).join(' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Barra de Progresso Geral */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Progresso geral</span>
          <span className="font-medium">{progressPercent}%</span>
        </div>
        <Progress value={progressPercent} className="h-3" />
      </div>

      {/* Grid de Pessoas */}
      {planejamentosFiltrados.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground text-center">
              Nenhum planejamento encontrado
              {selectedPessoa !== 'Todas' ? ` para ${selectedPessoa.split(' ')[0]}` : selectedTime !== 'Todos' ? ` para o time ${selectedTime}` : ' para esta semana'}.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className={`grid gap-6 ${getGridClasses(planejamentosFiltrados.length)}`}>
          {planejamentosFiltrados.map((planejamento, index) => {
            const nome = planejamento.jira_display_name || planejamento.usuario?.nome || 'Usuario';
            const accountId = planejamento.jira_account_id || planejamento.usuario?.account_id;
            const itens = planejamento.itens || [];
            const totalItens = itens.length;
            const concluidos = itens.filter(i => i.concluido).length;
            const userProgress = totalItens > 0 ? Math.round((concluidos / totalItens) * 100) : 0;
            const avatarUrl = getUserAvatar(accountId);
            const groupedItems = groupItemsByStatus(itens);

            // Cor da borda baseada no progresso
            const borderColor = userProgress === 100
              ? 'border-emerald-400'
              : userProgress >= 50
                ? 'border-blue-400'
                : 'border-muted';

            return (
              <Card
                key={accountId || planejamento.id || `planejamento-${index}`}
                className={`overflow-hidden border-t-4 ${borderColor} transition-shadow hover:shadow-lg`}
              >
                {/* Header com Avatar Grande e Progresso */}
                <CardHeader className="pb-4 bg-gradient-to-b from-muted/50 to-transparent">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-14 w-14 ring-2 ring-background shadow-md">
                      {avatarUrl && <AvatarImage src={avatarUrl} alt={nome} />}
                      <AvatarFallback className="text-lg bg-primary text-primary-foreground">
                        {getInitials(nome)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate mb-2">
                        {nome}
                      </CardTitle>
                      {/* Barra de progresso maior e mais visível */}
                      <div className="space-y-1">
                        <Progress
                          value={userProgress}
                          className="h-3"
                        />
                        <div className="flex justify-between items-center">
                          <Badge
                            variant={userProgress === 100 ? 'default' : 'secondary'}
                            className={`text-xs ${userProgress === 100 ? 'bg-emerald-500' : ''}`}
                          >
                            {concluidos}/{totalItens} concluídos
                          </Badge>
                          <span className={`text-sm font-bold ${
                            userProgress === 100
                              ? 'text-emerald-600'
                              : userProgress >= 50
                                ? 'text-blue-600'
                                : 'text-muted-foreground'
                          }`}>
                            {userProgress}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <ScrollArea className="h-[300px] pr-3">
                    <div className="space-y-3">
                      {Object.entries(groupedItems).map(([group, items]) => {
                        const config = GROUP_CONFIG[group];
                        return (
                          <div key={group} className="space-y-1.5">
                            {/* Header do grupo - mais destacado */}
                            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${config.color}`}>
                              <div className={`h-3 w-3 rounded-full ${config.dot} ring-2 ring-white dark:ring-gray-800`} />
                              <span className={`text-sm font-semibold ${config.textColor}`}>
                                {group}
                              </span>
                              <Badge variant="outline" className="ml-auto text-xs">
                                {items.length}
                              </Badge>
                            </div>

                            {/* Lista de issues */}
                            <div className="pl-3 space-y-1">
                              {items.map((item, idx) => (
                                <div
                                  key={item.issue_key || item.id}
                                  className="flex items-start gap-2 py-1.5 px-2 text-sm hover:bg-muted/50 rounded-md transition-colors"
                                >
                                  <span className="text-muted-foreground text-xs mt-1 font-mono">
                                    {idx === items.length - 1 ? '└' : '├'}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <a
                                        href={`${JIRA_BASE_URL}${item.issue_key}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-medium text-primary hover:underline inline-flex items-center gap-1"
                                      >
                                        {item.issue_key}
                                        <ExternalLink className="h-3 w-3 opacity-50" />
                                      </a>
                                      {item.mais_de_uma_semana && (
                                        <Flag className="h-3.5 w-3.5 text-red-500" title="Mais de uma semana" />
                                      )}
                                      {item.is_rotina && (
                                        <RefreshCw className="h-3.5 w-3.5 text-blue-500" title="Rotina" />
                                      )}
                                    </div>
                                    <p className={`text-xs leading-relaxed ${
                                      item.concluido ? 'text-muted-foreground line-through' : 'text-foreground/80'
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
