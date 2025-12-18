import React, { useState } from 'react';
import { Calendar } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Label } from '../../../components/ui/label';
import { DateRangeDisplay } from './DateRangeDisplay';
import { calculateDateRange } from '../utils/dateCalculations';

const PERIOD_OPTIONS = [
  { value: 'current_week', label: 'Semana Atual' },
  { value: 'last_week', label: 'Semana Passada' },
  { value: '2_weeks_ago', label: 'Semana Retrasada' },
  { value: '15d', label: 'Últimos 15 dias' },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: '45d', label: 'Últimos 45 dias' },
  { value: '3m', label: 'Últimos 3 meses' },
  { value: '6m', label: 'Últimos 6 meses' },
  { value: 'custom', label: 'Personalizado' },
];

export function JiraPeriodFilter({ period, onPeriodChange, dateRange, onDateRangeChange }) {
  // Calcular range de datas
  const calculatedRange = calculateDateRange(period, dateRange);

  return (
    <div className="space-y-2">
      <Label htmlFor="period-select">Período</Label>
      <Select value={period} onValueChange={onPeriodChange}>
        <SelectTrigger id="period-select" className="w-full">
          <SelectValue placeholder="Selecione o período" />
        </SelectTrigger>
        <SelectContent>
          {PERIOD_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {calculatedRange && (
        <DateRangeDisplay dateLabel={calculatedRange.label} />
      )}

      {period === 'custom' && (
        <div className="mt-2 space-y-2">
          <div className="space-y-1">
            <Label htmlFor="start-date" className="text-xs">Data Início</Label>
            <input
              id="start-date"
              type="date"
              value={dateRange?.from ? dateRange.from.toISOString().split('T')[0] : ''}
              onChange={(e) => {
                const newDate = e.target.value ? new Date(e.target.value + 'T00:00:00') : null;
                onDateRangeChange({
                  from: newDate,
                  to: dateRange?.to || null
                });
              }}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="end-date" className="text-xs">Data Fim</Label>
            <input
              id="end-date"
              type="date"
              value={dateRange?.to ? dateRange.to.toISOString().split('T')[0] : ''}
              onChange={(e) => {
                const newDate = e.target.value ? new Date(e.target.value + 'T00:00:00') : null;
                onDateRangeChange({
                  from: dateRange?.from || null,
                  to: newDate
                });
              }}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
            />
          </div>
        </div>
      )}
    </div>
  );
}
