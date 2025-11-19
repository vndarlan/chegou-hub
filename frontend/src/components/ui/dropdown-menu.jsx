import * as React from "react"
import { createPortal } from "react-dom"
import { cn } from "../../lib/utils"

const DropdownMenu = ({ children }) => {
  const [open, setOpen] = React.useState(false)
  const triggerRef = React.useRef(null)

  return (
    <div className="relative">
      {React.Children.map(children, child =>
        React.cloneElement(child, { open, setOpen, triggerRef })
      )}
    </div>
  )
}

const DropdownMenuTrigger = React.forwardRef(({
  className,
  children,
  open,
  setOpen,
  triggerRef,
  asChild,
  ...props
}, ref) => {
  const Comp = asChild ? React.Fragment : "button"

  // Combinar refs
  const combinedRef = React.useCallback(
    (node) => {
      if (ref) {
        if (typeof ref === 'function') {
          ref(node)
        } else {
          ref.current = node
        }
      }
      if (triggerRef) {
        triggerRef.current = node
      }
    },
    [ref, triggerRef]
  )

  if (asChild) {
    return React.cloneElement(children, {
      ...props,
      ref: combinedRef,
      onClick: () => setOpen(!open)
    })
  }

  return (
    <Comp
      ref={combinedRef}
      className={className}
      onClick={() => setOpen(!open)}
      {...props}
    >
      {children}
    </Comp>
  )
})
DropdownMenuTrigger.displayName = "DropdownMenuTrigger"

const DropdownMenuContent = React.forwardRef(({
  className,
  children,
  open,
  setOpen,
  triggerRef,
  side = "bottom",
  align = "end",
  sideOffset = 4,
  ...props
}, ref) => {
  const contentRef = React.useRef(null)
  const [position, setPosition] = React.useState({ top: 0, left: 0 })

  // Calcular posição baseada no trigger
  React.useEffect(() => {
    if (open && triggerRef?.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const contentWidth = 200 // largura estimada do dropdown

      let top = 0
      let left = 0

      // Calcular posição vertical
      if (side === "bottom") {
        top = rect.bottom + sideOffset
      } else if (side === "top") {
        top = rect.top - sideOffset
      } else if (side === "right") {
        top = rect.top
      } else if (side === "left") {
        top = rect.top
      }

      // Calcular posição horizontal
      if (side === "bottom" || side === "top") {
        if (align === "start") {
          left = rect.left
        } else if (align === "end") {
          left = rect.right - contentWidth
        } else if (align === "center") {
          left = rect.left + (rect.width / 2) - (contentWidth / 2)
        }
      } else if (side === "right") {
        left = rect.right + sideOffset
      } else if (side === "left") {
        left = rect.left - contentWidth - sideOffset
      }

      // Ajustar se sair da viewport
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      if (left + contentWidth > viewportWidth) {
        left = viewportWidth - contentWidth - 10
      }
      if (left < 10) {
        left = 10
      }
      if (top < 10) {
        top = 10
      }

      // Se o dropdown sair pela parte de baixo, mostrar acima
      if (top + 300 > viewportHeight && side === "bottom") {
        top = rect.top - sideOffset
      }

      setPosition({ top, left })
    }
  }, [open, triggerRef, side, align, sideOffset])

  // Fechar ao clicar fora
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (contentRef.current && !contentRef.current.contains(event.target) &&
          triggerRef?.current && !triggerRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    if (open) {
      // Adicionar um pequeno delay para evitar fechar imediatamente
      setTimeout(() => {
        document.addEventListener("mousedown", handleClickOutside)
        document.addEventListener("keydown", handleEscape)
      }, 0)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [open, setOpen, triggerRef])

  if (!open) return null

  // Usar Portal para renderizar fora da hierarquia DOM
  return createPortal(
    <div
      ref={contentRef}
      className={cn(
        "fixed z-[9999] min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95",
        className
      )}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`
      }}
      {...props}
    >
      {children}
    </div>,
    document.body
  )
})
DropdownMenuContent.displayName = "DropdownMenuContent"

const DropdownMenuItem = React.forwardRef(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
      className
    )}
    {...props}
  >
    {children}
  </div>
))
DropdownMenuItem.displayName = "DropdownMenuItem"

const DropdownMenuSeparator = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props}
  />
))
DropdownMenuSeparator.displayName = "DropdownMenuSeparator"

const DropdownMenuLabel = React.forwardRef(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("px-2 py-1.5 text-sm font-semibold", className)}
    {...props}
  >
    {children}
  </div>
))
DropdownMenuLabel.displayName = "DropdownMenuLabel"

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
}