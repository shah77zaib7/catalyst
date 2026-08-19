import { Link, useRouterState } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Atmosphere } from "@/components/layout/atmosphere";
import { AuthSlot } from "@/components/layout/auth-slot";
import { NAV_ITEMS } from "@/components/layout/nav-config";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/dashboard" className="block min-w-0">
      <span className="font-display text-xl font-medium tracking-tight">CATALYST</span>
      {compact ? null : (
        <span className="mt-1 block text-xs leading-snug text-muted-foreground">
          Market intelligence, without the noise.
        </span>
      )}
    </Link>
  );
}

function NavLinks({
  pathname,
  onNavigate,
  className,
}: {
  pathname: string;
  onNavigate?: () => void;
  className?: string;
}) {
  return (
    <nav aria-label="Primary" className={cn("flex flex-col gap-1", className)}>
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.to;
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "flex h-11 items-center gap-3 rounded-xl px-3 text-sm transition-[background-color,color,box-shadow] duration-[var(--motion-fast)] ease-[var(--ease-out)]",
              active
                ? "surface-glass font-medium text-foreground"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            )}
            aria-current={active ? "page" : undefined}
          >
            <Icon className="size-4 shrink-0" strokeWidth={1.6} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  return (
    <div className="relative min-h-dvh text-foreground">
      <Atmosphere />

      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2"
      >
        Skip to content
      </a>

      <div className="relative z-10 mx-auto flex min-h-dvh max-w-[1680px] gap-2.5 p-2 sm:gap-4 sm:p-3 md:p-4 lg:gap-5 lg:p-6 xl:p-8">
        <aside className="app-plate sticky top-6 hidden h-[calc(100dvh-3rem)] w-60 shrink-0 flex-col px-4 py-6 lg:flex xl:top-8 xl:h-[calc(100dvh-4rem)]">
          <Wordmark />
          <NavLinks pathname={pathname} className="mt-8" />
          <p className="mt-auto px-3 text-xs leading-relaxed text-subtle">
            Catalyst informs the trader. It does not trade.
          </p>
        </aside>

        <div className="app-plate flex min-w-0 flex-1 flex-col">
          <header className="flex min-h-14 items-center justify-between gap-3 px-2.5 pt-[max(0.15rem,env(safe-area-inset-top))] sm:px-5 lg:min-h-16 lg:px-7">
            <div className="flex items-center gap-1 lg:hidden">
              <Button
                type="button"
                variant="icon"
                size="icon"
                aria-label="Open navigation"
                onClick={() => setOpen(true)}
              >
                <Menu className="size-5" />
              </Button>
              <Wordmark compact />
            </div>
            <p className="hidden text-sm text-muted-foreground lg:block">
              Informs. Does not trade.
            </p>
            <AuthSlot />
          </header>

          <main
            id="main"
            className="px-3.5 py-5 sm:px-6 lg:px-8 lg:py-10"
            style={{ paddingBottom: "calc(2.25rem + env(safe-area-inset-bottom))" }}
          >
            {children}
          </main>
        </div>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left">
          <SheetHeader>
            <SheetTitle>CATALYST</SheetTitle>
            <SheetDescription>Market intelligence, without the noise.</SheetDescription>
          </SheetHeader>
          <NavLinks pathname={pathname} onNavigate={() => setOpen(false)} className="px-3" />
        </SheetContent>
      </Sheet>
    </div>
  );
}
