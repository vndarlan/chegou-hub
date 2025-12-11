import React, { useState } from 'react';
import { Calendar } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Label } from '../../../components/ui/label';
import { DateRangePicker } from '../../../components/ui/date-range-picker';

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

      {period === 'custom' && (
        <div className="mt-2">
          <DateRangePicker
            dateRange={dateRange}
            onDateRangeChange={onDateRangeChange}
            placeholder="Selecione o período..."
          />
        </div>
      )}
    </div>
  );
}
