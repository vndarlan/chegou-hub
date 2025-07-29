import * as React from "react"
import { cn } from "../../lib/utils"

const DropdownMenu = ({ children }) => {
  const [open, setOpen] = React.useState(false)
  
  return (
    <div className="relative">
      {React.Children.map(children, child => 
        React.cloneElement(child, { open, setOpen })
      )}
    </div>
  )
}

const DropdownMenuTrigger = React.forwardRef(({ className, children, open, setOpen, asChild, ...props }, ref) => {
  const Comp = asChild ? React.Fragment : "button"
  
  if (asChild) {
    return React.cloneElement(children, {
      ...props,
      onClick: () => setOpen(!open)
    })
  }
  
  return (
    <Comp
      ref={ref}
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
  side = "bottom",
  align = "start",
  sideOffset = 4,
  ...props 
}, ref) => {
  const contentRef = React.useRef(null)
  
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (contentRef.current && !contentRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    
    if (open) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [open, setOpen])
  
  if (!open) return null
  
  return (
    <div
      ref={contentRef}
      className={cn(
        "absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
        side === "bottom" && "top-full",
        side === "top" && "bottom-full",
        side === "right" && "left-full",
        side === "left" && "right-full",
        align === "start" && "left-0",
        align === "end" && "right-0",
        align === "center" && "left-1/2 -translate-x-1/2",
        className
      )}
      style={{ marginTop: side === "bottom" ? sideOffset : undefined }}
      {...props}
    >
      {children}
    </div>
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