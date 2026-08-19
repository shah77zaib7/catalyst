import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
};

type SegmentedControlProps<T extends string> = {
  value: T;
  options: readonly SegmentedOption<T>[];
  onChange: (value: T) => void;
  label: string;
  className?: string;
};

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  label,
  className,
}: SegmentedControlProps<T>) {
  const listRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const root = listRef.current;
    if (!root) return;

    const measure = () => {
      const active = root.querySelector<HTMLElement>('[data-active="true"]');
      if (!active) return;
      setIndicator({ left: active.offsetLeft, width: active.offsetWidth });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, [value, options]);

  return (
    <div
      ref={listRef}
      role="radiogroup"
      aria-label={label}
      className={cn(
        "relative grid h-12 rounded-2xl bg-muted/80 p-1",
        className,
      )}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden="true"
        className="surface-glass pointer-events-none absolute top-1 bottom-1 rounded-xl transition-[left,width] duration-[var(--motion-fast)] ease-[var(--ease-spring)]"
        style={{ left: indicator.left, width: indicator.width }}
      />
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            data-active={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative z-10 h-full rounded-xl text-sm font-medium transition-colors duration-[var(--motion-fast)] ease-[var(--ease-out)]",
              selected ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
