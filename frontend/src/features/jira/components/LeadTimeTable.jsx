import React, { useState } from 'react';
import { ExternalLink, ChevronDown, ChevronRight, ChevronLeft, ChevronRight as ChevronRightIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ITEMS_PER_PAGE = 10;

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

  // Estado para controlar linhas expandidas
  const [expandedRows, setExpandedRows] = useState(new Set());

  // Estado para paginação
  const [currentPage, setCurrentPage] = useState(1);

  // Calcular paginação
  const totalPages = Math.ceil(issues.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedIssues = issues.slice(startIndex, endIndex);

  const toggleRow = (key) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedRows(newExpanded);
  };

  const goToPage = (page) => {
    setCurrentPage(page);
    setExpandedRows(new Set()); // Limpar linhas expandidas ao mudar de página
  };

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
          {totalPages > 1 && ` (Página ${currentPage} de ${totalPages})`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {issues.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhuma issue com lead time completo encontrada neste período
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead className="w-32">Chave</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead className="w-40">Responsável</TableHead>
                    <TableHead className="w-44">Criado em</TableHead>
                    <TableHead className="w-44">Resolvido em</TableHead>
                    <TableHead className="w-32 text-right">Lead Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedIssues.map((issue) => (
                  <React.Fragment key={issue.key}>
                    {/* Linha principal */}
                    <TableRow>
                      <TableCell>
                        <button
                          onClick={() => toggleRow(issue.key)}
                          className="hover:bg-muted p-1 rounded transition-colors"
                          title="Expandir para ver tempo por coluna"
                        >
                          {expandedRows.has(issue.key) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                      </TableCell>
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

                    {/* Linha de breakdown expandida */}
                    {expandedRows.has(issue.key) && issue.breakdown && Object.keys(issue.breakdown).length > 0 && (
                      <TableRow className="bg-muted/50">
                        <TableCell colSpan={7} className="p-4">
                          <div className="space-y-2">
                            <h4 className="font-semibold text-sm">Tempo por coluna do fluxo:</h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                              {Object.entries(issue.breakdown).map(([status, days]) => (
                                <div
                                  key={status}
                                  className="flex justify-between items-center bg-background p-2 rounded border"
                                >
                                  <span className="text-sm font-medium">{status}</span>
                                  <Badge variant="outline">{formatDuration(days * 24)}</Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Controles de paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Mostrando {startIndex + 1}-{Math.min(endIndex, issues.length)} de {issues.length} issues
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>

                {/* Números de página */}
                <div className="flex gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    // Mostrar apenas algumas páginas ao redor da atual
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => goToPage(page)}
                          className="w-9"
                        >
                          {page}
                        </Button>
                      );
                    } else if (page === currentPage - 2 || page === currentPage + 2) {
                      return <span key={page} className="px-2">...</span>;
                    }
                    return null;
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Próxima
                  <ChevronRightIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
        )}
      </CardContent>
    </Card>
  );
}
