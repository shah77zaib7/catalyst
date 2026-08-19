import { SOURCE_STATUS_DESCRIPTIONS, SOURCE_STATUS_LABELS } from "@/lib/source-status";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { SourceStatus } from "@/types/catalyst";

const VARIANT: Record<SourceStatus, "live" | "cached" | "mock" | "unavailable"> = {
  live: "live",
  cached: "cached",
  mock: "mock",
  unavailable: "unavailable",
};

type SourceStatusBadgeProps = {
  status: SourceStatus;
  className?: string;
  showTooltip?: boolean;
};

export function SourceStatusBadge({
  status,
  className,
  showTooltip = true,
}: SourceStatusBadgeProps) {
  const badge = (
    <Badge
      variant={VARIANT[status]}
      className={cn("align-middle", className)}
      aria-label={`Source status: ${SOURCE_STATUS_LABELS[status]}`}
    >
      {SOURCE_STATUS_LABELS[status]}
    </Badge>
  );

  if (!showTooltip) return badge;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">{badge}</span>
      </TooltipTrigger>
      <TooltipContent>{SOURCE_STATUS_DESCRIPTIONS[status]}</TooltipContent>
    </Tooltip>
  );
}
