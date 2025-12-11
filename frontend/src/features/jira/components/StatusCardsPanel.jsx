import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Loader2 } from 'lucide-react';
import { IssueListModal } from './IssueListModal';

export function StatusCardsPanel({ data, loading }) {
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const statusList = Array.isArray(data) ? data : [];

  const handleCardClick = (status) => {
    setSelectedStatus(status);
    setModalOpen(true);
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
