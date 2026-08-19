import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium tracking-[0.1em] uppercase",
  {
    variants: {
      variant: {
        default: "bg-muted text-muted-foreground",
        live: "bg-status-live/10 text-status-live-fg",
        cached: "bg-status-cached/12 text-status-cached-fg",
        mock: "source-hatch bg-muted text-status-mock-fg",
        unavailable: "border border-dashed border-status-unavailable/45 bg-transparent text-status-unavailable-fg",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const DOT: Record<NonNullable<VariantProps<typeof badgeVariants>["variant"]>, string> = {
  default: "bg-muted-foreground",
  live: "bg-status-live",
  cached: "bg-status-cached",
  mock: "bg-status-mock",
  unavailable: "bg-status-unavailable",
};

function Badge({
  className,
  variant = "default",
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      <span
        aria-hidden="true"
        className={cn("size-1.5 shrink-0 rounded-full", DOT[variant ?? "default"])}
      />
      {children}
    </span>
  );
}

export { Badge, badgeVariants };
