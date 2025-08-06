import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

import { cn } from "../../lib/utils.js"
import { Input } from "./input"
import { Label } from "./label"

export function DateInputs({
  dateRange,
  onDateRangeChange,
  disabled,
  className
}) {
  const handleFromChange = (e) => {
    const fromDate = e.target.value ? new Date(e.target.value) : undefined
    onDateRangeChange({
      ...dateRange,
      from: fromDate
    })
  }

  const handleToChange = (e) => {
    const toDate = e.target.value ? new Date(e.target.value) : undefined
    onDateRangeChange({
      ...dateRange,
      to: toDate
    })
  }

  const getDateValue = (date) => {
    if (!date) return ""
    return format(date, "yyyy-MM-dd")
  }

  return (
    <div className={cn("flex gap-4", className)}>
      <div className="flex-1">
        <Label className="mb-2 block text-foreground">Data de Início</Label>
        <div className="relative">
          <Input
            type="date"
            value={getDateValue(dateRange?.from)}
            onChange={handleFromChange}
            disabled={disabled}
            className="w-full border-border bg-background text-foreground"
            max={new Date().toISOString().split('T')[0]}
            min="2020-01-01"
          />
          <CalendarIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        </div>
      </div>
      
      <div className="flex-1">
        <Label className="mb-2 block text-foreground">Data de Fim</Label>
        <div className="relative">
          <Input
            type="date"
            value={getDateValue(dateRange?.to)}
            onChange={handleToChange}
            disabled={disabled}
            className="w-full border-border bg-background text-foreground"
            max={new Date().toISOString().split('T')[0]}
            min={getDateValue(dateRange?.from) || "2020-01-01"}
          />
          <CalendarIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        </div>
      </div>
    </div>
  )
}