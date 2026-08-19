import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "rounded-[var(--radius-control)] bg-accent text-accent-foreground shadow-[var(--shadow-border)] transition-[opacity,transform,box-shadow] duration-[var(--motion-fast)] ease-[var(--ease-spring)] hover:opacity-90",
        default:
          "rounded-[var(--radius-control)] bg-accent text-accent-foreground shadow-[var(--shadow-border)] transition-[opacity,transform,box-shadow] duration-[var(--motion-fast)] ease-[var(--ease-spring)] hover:opacity-90",
        secondary:
          "rounded-[var(--radius-control)] bg-muted text-foreground transition-[background-color,transform] duration-[var(--motion-fast)] ease-[var(--ease-spring)] hover:bg-muted/80",
        glass:
          "surface-glass surface-glass-interactive rounded-[var(--radius-control)] text-foreground",
        outline:
          "surface-glass surface-glass-interactive rounded-[var(--radius-control)] text-foreground",
        ghost:
          "rounded-[var(--radius-control)] text-foreground transition-[background-color,transform] duration-[var(--motion-fast)] ease-[var(--ease-spring)] hover:bg-muted/70",
        destructive:
          "rounded-[var(--radius-control)] bg-destructive/12 text-destructive transition-[background-color,transform] duration-[var(--motion-fast)] ease-[var(--ease-spring)] hover:bg-destructive/18",
        icon: "surface-glass surface-glass-interactive size-11 rounded-full text-foreground",
      },
      size: {
        default: "h-11 px-4",
        sm: "h-10 px-3.5",
        lg: "h-12 px-5",
        icon: "size-11 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    static?: boolean;
  };

function Button({
  className,
  variant,
  size,
  asChild = false,
  static: isStatic,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(
        buttonVariants({ variant, size }),
        !isStatic && "active:not-disabled:scale-[0.97]",
        className,
      )}
      {...props}
    />
  );
}

export { Button, buttonVariants };
