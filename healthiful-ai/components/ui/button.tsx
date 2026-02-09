import * as React from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "secondary" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-2xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background",
          variant === "default" && "bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-dark)]",
          variant === "outline" && "border border-[var(--input)] bg-[var(--background)] hover:bg-[var(--secondary)] hover:text-[var(--secondary-foreground)]",
          variant === "secondary" && "bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:bg-[var(--secondary)]/80",
          variant === "ghost" && "hover:bg-[var(--secondary)] hover:text-[var(--secondary-foreground)]",
          variant === "destructive" && "bg-[var(--destructive)] text-[var(--destructive-foreground)] hover:bg-[var(--destructive)]/90",
          size === "default" && "h-12 px-6 py-3",
          size === "sm" && "h-9 px-3 rounded-lg",
          size === "lg" && "h-14 px-8 rounded-2xl text-lg",
          size === "icon" && "h-10 w-10",
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
