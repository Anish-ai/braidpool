import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"
import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, max = 100, children, ...props }, ref) => {
  // Calculate the percentage to fill
  const percentage = value != null ? Math.min(100, Math.max(0, (value / max) * 100)) : 0

  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn(
        "relative h-4 w-full overflow-hidden rounded-full",
        className
      )}
      {...props}
      value={value}
      max={max}
    >
      <ProgressPrimitive.Indicator
        className="h-full transition-all duration-300 rounded-full"
        style={{ width: `${percentage}%` }}
      >
        {children}
      </ProgressPrimitive.Indicator>
    </ProgressPrimitive.Root>
  )
})
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress } 