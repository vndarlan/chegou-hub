import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Loader2 } from 'lucide-react';
import { IssueListModal } from './IssueListModal';
import apiClient from '../../../utils/axios';

export function StatusCardsPanel({ data, loading, filters }) {
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loadingIssues, setLoadingIssues] = useState(false);
  const statusList = Array.isArray(data) ? data : [];

  const handleCardClick = async (status) => {
    setSelectedStatus(status);
    setLoadingIssues(true);
    setModalOpen(true);

    try {
      const params = new URLSearchParams();
      params.append('status', status.name);

      // Adicionar filtros globais
      if (filters?.period && filters.period !== 'custom') {
        params.append('period', filters.period);
      } else if (filters?.dateRange?.from && filters?.dateRange?.to) {
        params.append('start_date', filters.dateRange.from.toISOString().split('T')[0]);
        params.append('end_date', filters.dateRange.to.toISOString().split('T')[0]);
      }

      if (filters?.selectedUser !== 'all') {
        params.append('assignee', filters.selectedUser);
      }

      const response = await apiClient.get(`/jira/issues/?${params}`);

      setSelectedStatus({
        ...status,
        issues: response.data.data || []
      });
    } catch (error) {
      console.error('[JIRA] Erro ao buscar issues:', error);
      setSelectedStatus({
        ...status,
        issues: []
      });
    } finally {
      setLoadingIssues(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (statusList.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Nenhum status encontrado
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {statusList.map((status) => (
          <Card
            key={status.name}
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => handleCardClick(status)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{status.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{status.count}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {status.count === 1 ? 'issue' : 'issues'}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedStatus && (
        <IssueListModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          issues={selectedStatus.issues || []}
          statusName={selectedStatus.name}
        />
      )}
    </>
  );
}
