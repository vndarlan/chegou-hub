import React from 'react';
import { ExternalLink, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { Badge } from '../../../components/ui/badge';
import { Loader2 } from 'lucide-react';

const JIRA_BASE_URL = 'https://grupochegou.atlassian.net/browse/';

export function TimesheetPanel({ data, loading, selectedUser }) {
  if (!selectedUser || selectedUser === 'all') {
    return (
      <Alert>
        <Clock className="h-4 w-4" />
        <AlertDescription>
          Selecione um responsável para visualizar o timesheet
        </AlertDescription>
      </Alert>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Timesheet</CardTitle>
          <CardDescription>Horas trabalhadas no período</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const totalHours = data?.total_hours || 0;
  const issues = data?.issues || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Timesheet</CardTitle>
        <CardDescription>
          Total de horas trabalhadas: <Badge variant="secondary">{totalHours.toFixed(2)}h</Badge>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {issues.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhum registro de horas encontrado para este período
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Chave</TableHead>
                <TableHead>Título</TableHead>
                <TableHead className="text-right">Horas</TableHead>
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
                  <TableCell className="font-medium">{issue.summary}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline">{issue.hours.toFixed(2)}h</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
