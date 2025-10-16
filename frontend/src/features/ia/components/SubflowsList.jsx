import React from 'react';
import { Bot, Sparkles } from 'lucide-react';
import { ScrollArea } from '../../../components/ui/scroll-area';

export default function SubflowsList({ subfluxos = [] }) {
  if (!subfluxos || subfluxos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Bot className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
        <p className="text-sm text-muted-foreground">Nenhuma automação encontrada</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[300px] pr-4">
      <div className="space-y-3">
        {subfluxos.map((subfluxo, index) => (
          <div
            key={subfluxo.id || index}
            className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-green-500 to-green-600 flex-shrink-0">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm leading-tight">{subfluxo.name || 'Automação sem nome'}</p>
              <p className="text-xs text-muted-foreground mt-1 font-mono">ID: {subfluxo.id}</p>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
