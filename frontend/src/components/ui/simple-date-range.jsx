import React, { useState } from 'react'
import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

import { cn } from "../../lib/utils"
import { Button } from "./button"
import { Calendar } from "./calendar"
import { Popover, PopoverContent, PopoverTrigger } from "./popover-radix"

export function SimpleDateRange({
  dateRange,
  onDateRangeChange,
  disabled,
  className,
  placeholder = "Selecione o período..."
}) {
  const [open, setOpen] = useState(false)

  const handleSelect = (range) => {
    onDateRangeChange(range)
    // Fechar popover apenas quando ambas as datas estão selecionadas
    if (range?.from && range?.to) {
      setOpen(false)
    }
  }

  const formatDateRange = () => {
    if (!dateRange?.from) {
      return placeholder
    }
    
    if (dateRange.from && !dateRange.to) {
      return format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
    }
    
    if (dateRange.from && dateRange.to) {
      return `${format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} - ${format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}`
    }
    
    return placeholder
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal border-border bg-background",
              !dateRange?.from && "text-muted-foreground"
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatDateRange()}
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-auto p-0 bg-popover border-border shadow-lg" 
          align="start" 
          side="bottom"
        >
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={dateRange?.from}
            selected={dateRange}
            onSelect={handleSelect}
            numberOfMonths={2}
            className="rounded-lg border-0"
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}