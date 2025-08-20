import * as React from "react"
import { Calendar } from "./calendar"
import { DateRangePicker } from "./date-range-picker"
import { RobustDatePicker } from "./robust-date-picker"
import { Card, CardContent, CardHeader, CardTitle } from "./card"
import { Badge } from "./badge"

export function CalendarTest() {
  const [dateRange, setDateRange] = React.useState({
    from: undefined,
    to: undefined
  })

  const [singleDate, setSingleDate] = React.useState()

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold">🗓️ Calendar Components Test</h1>
      
      {/* Status */}
      <div className="flex gap-2">
        <Badge variant="outline">react-day-picker: 9.8.1</Badge>
        <Badge variant="outline">date-fns: 4.1.0</Badge>
        <Badge variant="outline">shadcn/ui</Badge>
      </div>

      {/* Test 1: Calendar Base */}
      <Card>
        <CardHeader>
          <CardTitle>1. Calendar Base Component</CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={singleDate}
            onSelect={setSingleDate}
            className="rounded-md border"
          />
          <p className="mt-2 text-sm text-muted-foreground">
            Data selecionada: {singleDate ? singleDate.toLocaleDateString('pt-BR') : 'Nenhuma'}
          </p>
        </CardContent>
      </Card>

      {/* Test 2: DateRangePicker */}
      <Card>
        <CardHeader>
          <CardTitle>2. DateRangePicker (Popup)</CardTitle>
        </CardHeader>
        <CardContent>
          <DateRangePicker
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            placeholder="Clique para selecionar período..."
          />
          <p className="mt-2 text-sm text-muted-foreground">
            Período: {dateRange?.from && dateRange?.to ? 
              `${dateRange.from.toLocaleDateString('pt-BR')} - ${dateRange.to.toLocaleDateString('pt-BR')}` : 
              'Nenhum período selecionado'}
          </p>
        </CardContent>
      </Card>

      {/* Test 3: RobustDatePicker */}
      <Card>
        <CardHeader>
          <CardTitle>3. RobustDatePicker (Auto-Fallback)</CardTitle>
        </CardHeader>
        <CardContent>
          <RobustDatePicker
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            placeholder="Período inteligente..."
          />
        </CardContent>
      </Card>

      {/* Debug Info */}
      <Card>
        <CardHeader>
          <CardTitle>Debug Info</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-muted p-3 rounded overflow-auto">
            {JSON.stringify({ dateRange, singleDate }, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}