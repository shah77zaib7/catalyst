import {
  BorderBeam,
  type BorderBeamColorVariant,
  type BorderBeamSize,
  type BorderBeamTheme,
} from "border-beam";
import type { ReactNode } from "react";
import { OrbitTilt } from "@/components/ui/orbit-tilt";
import { cn } from "@/lib/utils";

type MarketCardBeamProps = {
  children: ReactNode;
  size?: BorderBeamSize;
  colorVariant?: BorderBeamColorVariant;
  strength?: number;
  theme?: BorderBeamTheme;
  className?: string;
};

export function MarketCardBeam({
  children,
  size = "pulse-outside",
  colorVariant = "colorful",
  strength = 0.35,
  theme = "light",
  className,
}: MarketCardBeamProps) {
  return (
    <OrbitTilt className={className}>
      <BorderBeam
        size={size}
        colorVariant={colorVariant}
        theme={theme}
        strength={strength}
        className={cn("overflow-visible")}
      >
        {children}
      </BorderBeam>
    </OrbitTilt>
  );
}
