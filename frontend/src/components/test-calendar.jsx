import React, { useState } from 'react'
import { BasicDateRange } from './ui/basic-date-range'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'

export function TestCalendar() {
  const [dateRange, setDateRange] = useState({
    from: undefined,
    to: undefined
  })

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Teste do Calendário</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <BasicDateRange
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              className="w-80"
              placeholder="Selecione as datas..."
            />
            
            {dateRange?.from && (
              <div className="text-sm text-muted-foreground">
                Data inicial: {dateRange.from.toLocaleDateString('pt-BR')}
              </div>
            )}
            
            {dateRange?.to && (
              <div className="text-sm text-muted-foreground">
                Data final: {dateRange.to.toLocaleDateString('pt-BR')}
              </div>
            )}
            
            {dateRange?.from && dateRange?.to && (
              <div className="p-2 bg-green-100 rounded text-green-800 text-sm">
                ✅ Range selecionado: {dateRange.from.toLocaleDateString('pt-BR')} até {dateRange.to.toLocaleDateString('pt-BR')}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}