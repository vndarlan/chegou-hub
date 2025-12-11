import React from 'react';
import { ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table';
import { Badge } from '../../../components/ui/badge';
import { ScrollArea } from '../../../components/ui/scroll-area';

const JIRA_BASE_URL = 'https://grupochegou.atlassian.net/browse/';

export function IssueListModal({ isOpen, onClose, issues = [], statusName = '' }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Issues - {statusName}</DialogTitle>
          <DialogDescription>
            Total de {issues.length} {issues.length === 1 ? 'issue' : 'issues'}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[500px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">Chave</TableHead>
                <TableHead>Título</TableHead>
                <TableHead className="w-48">Responsável</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {issues.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    Nenhuma issue encontrada
                  </TableCell>
                </TableRow>
              ) : (
                issues.map((issue) => (
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
                    <TableCell>{issue.assignee || 'Não atribuído'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
