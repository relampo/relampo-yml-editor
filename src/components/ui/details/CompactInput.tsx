import * as React from "react"
import { cn } from "../../../lib/utils"

export interface InputProps
    extends React.InputHTMLAttributes<HTMLInputElement> {
    error?: boolean;
}

const CompactInput = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, error, ...props }, ref) => {
        return (
            <input
                type={type}
                className={cn(
                    "flex h-7 w-full rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-zinc-600 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-yellow-500 disabled:cursor-not-allowed disabled:opacity-50 text-zinc-300 font-mono",
                    error && "border-red-500/50 focus-visible:ring-red-500",
                    className
                )}
                ref={ref}
                {...props}
            />
        )
    }
)
CompactInput.displayName = "CompactInput"

export { CompactInput }
