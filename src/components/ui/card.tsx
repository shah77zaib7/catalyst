import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

function Card({
  className,
  variant = "solid",
  lift = true,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  variant?: "solid" | "glass" | "plate" | "glass-card";
  lift?: boolean;
}) {
  return (
    <div
      className={cn(
        "text-card-foreground",
        variant === "solid" && "card-surface rounded-[22px]",
        variant === "glass" && "surface-glass rounded-[22px]",
        variant === "plate" && "app-plate",
        variant === "glass-card" && "glass-card",
        lift && "card-lift",
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1.5 p-5 sm:p-6", className)} {...props} />;
}

function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-base font-medium tracking-tight", className)} {...props} />;
}

function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 pt-0 sm:p-6 sm:pt-0", className)} {...props} />;
}

function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center p-5 pt-0 sm:p-6 sm:pt-0", className)} {...props} />;
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
