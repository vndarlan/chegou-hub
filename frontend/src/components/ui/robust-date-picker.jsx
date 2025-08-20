import * as React from "react"
import { CalendarIcon, AlertCircle } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

import { cn } from "../../lib/utils.js"
import { Button } from "./button"
import { Input } from "./input"
import { Label } from "./label"
import { Alert, AlertDescription } from "./alert"
import { DateRangePicker } from "./date-range-picker"
import { DateInputs } from "./date-inputs"

export function RobustDatePicker({
  dateRange,
  onDateRangeChange,
  disabled,
  className,
  placeholder = "Selecione o período..."
}) {
  const [useCalendar, setUseCalendar] = React.useState(true)
  const [hasCalendarError, setHasCalendarError] = React.useState(false)

  // Função para alternar entre modos
  const toggleMode = () => {
    setUseCalendar(!useCalendar)
  }

  // Se houver erro no Calendar, usar inputs automaticamente
  React.useEffect(() => {
    if (hasCalendarError) {
      setUseCalendar(false)
    }
  }, [hasCalendarError])

  const ErrorBoundaryWrapper = ({ children }) => {
    React.useEffect(() => {
      const handleError = (error, errorInfo) => {
        console.warn('Calendar error detected, switching to HTML5 inputs:', error)
        setHasCalendarError(true)
      }
      
      window.addEventListener('error', handleError)
      return () => window.removeEventListener('error', handleError)
    }, [])

    return children
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Toggle entre modos */}
      <div className="flex items-center justify-between">
        <Label className="text-foreground">Período</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={toggleMode}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          {useCalendar ? "Usar inputs" : "Usar calendário"}
        </Button>
      </div>

      {/* Aviso de erro se Calendar falhou */}
      {hasCalendarError && (
        <Alert className="py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Calendário indisponível, usando inputs HTML5
          </AlertDescription>
        </Alert>
      )}

      {/* Renderização condicional */}
      <ErrorBoundaryWrapper>
        {useCalendar && !hasCalendarError ? (
          <DateRangePicker
            dateRange={dateRange}
            onDateRangeChange={onDateRangeChange}
            disabled={disabled}
            placeholder={placeholder}
            className="w-full"
          />
        ) : (
          <DateInputs
            dateRange={dateRange}
            onDateRangeChange={onDateRangeChange}
            disabled={disabled}
            className="w-full"
          />
        )}
      </ErrorBoundaryWrapper>

      {/* Status indicator */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Modo: {useCalendar && !hasCalendarError ? "Calendário popup" : "Inputs HTML5"}
        </span>
        {dateRange?.from && dateRange?.to && (
          <span className="text-green-600">
            ✓ {format(dateRange.from, "dd/MM", { locale: ptBR })} - {format(dateRange.to, "dd/MM", { locale: ptBR })}
          </span>
        )}
      </div>
    </div>
  )
}