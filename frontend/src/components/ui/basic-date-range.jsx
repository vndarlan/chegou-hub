import React, { useState } from 'react'
import { CalendarIcon } from 'lucide-react'
import { cn } from "../../lib/utils"
import { Button } from "./button"

export function BasicDateRange({
  dateRange,
  onDateRangeChange,
  disabled,
  className,
  placeholder = "Selecione o período..."
}) {
  const [showInputs, setShowInputs] = useState(false)

  const handleFromChange = (e) => {
    const date = e.target.value ? new Date(e.target.value) : undefined
    onDateRangeChange({
      from: date,
      to: dateRange?.to
    })
  }

  const handleToChange = (e) => {
    const date = e.target.value ? new Date(e.target.value) : undefined
    onDateRangeChange({
      from: dateRange?.from,
      to: date
    })
  }

  const formatDate = (date) => {
    if (!date) return ''
    return date.toISOString().split('T')[0]
  }

  const formatDisplayDate = (date) => {
    if (!date) return ''
    return date.toLocaleDateString('pt-BR')
  }

  const getDisplayText = () => {
    if (!dateRange?.from) return placeholder
    if (dateRange.from && !dateRange.to) {
      return formatDisplayDate(dateRange.from)
    }
    if (dateRange.from && dateRange.to) {
      return `${formatDisplayDate(dateRange.from)} - ${formatDisplayDate(dateRange.to)}`
    }
    return placeholder
  }

  if (showInputs) {
    return (
      <div className={cn("flex gap-2 items-center", className)}>
        <input
          type="date"
          value={formatDate(dateRange?.from)}
          onChange={handleFromChange}
          disabled={disabled}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <span className="text-muted-foreground">até</span>
        <input
          type="date"
          value={formatDate(dateRange?.to)}
          onChange={handleToChange}
          disabled={disabled}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowInputs(false)}
          disabled={disabled}
        >
          OK
        </Button>
      </div>
    )
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <Button
        variant="outline"
        onClick={() => setShowInputs(true)}
        disabled={disabled}
        className={cn(
          "w-full justify-start text-left font-normal",
          !dateRange?.from && "text-muted-foreground"
        )}
      >
        <CalendarIcon className="mr-2 h-4 w-4" />
        {getDisplayText()}
      </Button>
    </div>
  )
}