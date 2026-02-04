import * as React from "react"
import { ChevronDownIcon } from "lucide-react"
import { cn } from "../../lib/utils"

interface AccordionContextValue {
  expandedItems: string[]
  toggleItem: (value: string) => void
  type: "single" | "multiple"
}

const AccordionContext = React.createContext<AccordionContextValue | null>(null)

interface AccordionProps {
  type?: "single" | "multiple"
  defaultValue?: string | string[]
  children: React.ReactNode
  className?: string
}

const Accordion = React.forwardRef<HTMLDivElement, AccordionProps>(
  ({ type = "single", defaultValue, children, className }, ref) => {
    const [expandedItems, setExpandedItems] = React.useState<string[]>(() => {
      if (defaultValue) {
        return Array.isArray(defaultValue) ? defaultValue : [defaultValue]
      }
      return []
    })

    const toggleItem = React.useCallback((value: string) => {
      setExpandedItems((prev) => {
        if (type === "single") {
          return prev.includes(value) ? [] : [value]
        }
        return prev.includes(value)
          ? prev.filter((item) => item !== value)
          : [...prev, value]
      })
    }, [type])

    return (
      <AccordionContext.Provider value={{ expandedItems, toggleItem, type }}>
        <div ref={ref} className={cn("w-full", className)}>
          {children}
        </div>
      </AccordionContext.Provider>
    )
  }
)
Accordion.displayName = "Accordion"

interface AccordionItemProps {
  value: string
  children: React.ReactNode
  className?: string
}

const AccordionItem = React.forwardRef<HTMLDivElement, AccordionItemProps>(
  ({ value, children, className }, ref) => {
    return (
      <div
        ref={ref}
        data-value={value}
        className={cn("border-b", className)}
      >
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child as React.ReactElement<any>, { itemValue: value })
          }
          return child
        })}
      </div>
    )
  }
)
AccordionItem.displayName = "AccordionItem"

interface AccordionTriggerProps {
  children: React.ReactNode
  className?: string
  itemValue?: string
}

const AccordionTrigger = React.forwardRef<HTMLButtonElement, AccordionTriggerProps>(
  ({ children, className, itemValue }, ref) => {
    const context = React.useContext(AccordionContext)
    if (!context) throw new Error("AccordionTrigger must be used within Accordion")

    const isExpanded = itemValue ? context.expandedItems.includes(itemValue) : false

    return (
      <button
        ref={ref}
        type="button"
        onClick={() => itemValue && context.toggleItem(itemValue)}
        className={cn(
          "flex flex-1 items-center justify-between py-4 text-sm font-medium transition-all hover:underline w-full text-left",
          className
        )}
        aria-expanded={isExpanded}
      >
        {children}
        <ChevronDownIcon
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
            isExpanded && "rotate-180"
          )}
        />
      </button>
    )
  }
)
AccordionTrigger.displayName = "AccordionTrigger"

interface AccordionContentProps {
  children: React.ReactNode
  className?: string
  itemValue?: string
}

const AccordionContent = React.forwardRef<HTMLDivElement, AccordionContentProps>(
  ({ children, className, itemValue }, ref) => {
    const context = React.useContext(AccordionContext)
    if (!context) throw new Error("AccordionContent must be used within Accordion")

    const isExpanded = itemValue ? context.expandedItems.includes(itemValue) : false

    if (!isExpanded) return null

    return (
      <div
        ref={ref}
        className={cn(
          "overflow-hidden text-sm",
          className
        )}
      >
        <div className="pb-4 pt-0">{children}</div>
      </div>
    )
  }
)
AccordionContent.displayName = "AccordionContent"

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
