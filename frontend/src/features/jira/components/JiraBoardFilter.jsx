import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Label } from '../../../components/ui/label';

export function JiraBoardFilter({ board, onBoardChange, boards = [] }) {
  return (
    <div className="space-y-2">
      <Label htmlFor="board-select">Board</Label>
      <Select value={board} onValueChange={onBoardChange}>
        <SelectTrigger id="board-select" className="w-full">
          <SelectValue placeholder="Selecione o board" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          {boards.map((b) => (
            <SelectItem key={b.id} value={b.id.toString()}>
              {b.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
