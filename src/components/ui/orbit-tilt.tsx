import type { ReactNode } from "react";
import { usePointerOrbit } from "@/lib/use-pointer-orbit";
import { cn } from "@/lib/utils";

export function OrbitTilt({
  children,
  className,
  maxTilt = 7,
}: {
  children: ReactNode;
  className?: string;
  maxTilt?: number;
}) {
  const ref = usePointerOrbit<HTMLDivElement>(maxTilt);

  return (
    <div className={cn("orbit-stage overflow-visible", className)}>
      <div ref={ref} className="orbit-tilt overflow-visible">
        {children}
      </div>
    </div>
  );
}
