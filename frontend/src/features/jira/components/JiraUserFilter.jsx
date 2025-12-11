import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Label } from '../../../components/ui/label';

export function JiraUserFilter({ user, onUserChange, users = [] }) {
  return (
    <div className="space-y-2">
      <Label htmlFor="user-select">Responsável</Label>
      <Select value={user} onValueChange={onUserChange}>
        <SelectTrigger id="user-select" className="w-full">
          <SelectValue placeholder="Selecione o responsável" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          {users.map((u) => (
            <SelectItem key={u.accountId} value={u.accountId}>
              {u.displayName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
