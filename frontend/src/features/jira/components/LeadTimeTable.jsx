import React from 'react';
import { ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { Badge } from '../../../components/ui/badge';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const JIRA_BASE_URL = 'https://grupochegou.atlassian.net/browse/';

const formatDate = (dateString) => {
  if (!dateString) return '-';
  try {
    return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: ptBR });
  } catch {
    return dateString;
  }
};

const formatDuration = (hours) => {
  if (!hours) return '-';
  if (hours < 24) {
    return `${hours.toFixed(1)}h`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return `${days}d ${remainingHours.toFixed(1)}h`;
};

export function LeadTimeTable({ data, loading }) {
  // Garantir que issues seja sempre um array
  const issues = Array.isArray(data) ? data : [];

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lead Time</CardTitle>
          <CardDescription>Tempo de ciclo das issues do início ao fim</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lead Time</CardTitle>
        <CardDescription>
          Tempo de ciclo das issues do início ao fim - Total: {issues.length} issues
        </CardDescription>
      </CardHeader>
      <CardContent>
        {issues.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhuma issue com lead time completo encontrada neste período
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">Chave</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead className="w-40">Responsável</TableHead>
                  <TableHead className="w-44">Criado em</TableHead>
                  <TableHead className="w-44">Resolvido em</TableHead>
                  <TableHead className="w-32 text-right">Lead Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {issues.map((issue) => (
                  <TableRow key={issue.key}>
                    <TableCell>
                      <a
                        href={`${JIRA_BASE_URL}${issue.key}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:underline"
                      >
                        {issue.key}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </TableCell>
                    <TableCell className="font-medium max-w-xs truncate" title={issue.summary}>
                      {issue.summary}
                    </TableCell>
                    <TableCell>{issue.assignee || 'Não atribuído'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(issue.created)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(issue.resolved)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">{formatDuration(issue.lead_time_hours)}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
