import { cn } from "@/lib/utils";

type DotVariant = 'default' | 'warning' | 'info' | 'success';

interface SectionLabelProps {
  children: React.ReactNode;
  className?: string;
  dotVariant?: DotVariant;
}

const dotColors: Record<DotVariant, string> = {
  default: 'bg-black',
  warning: 'bg-amber-500',
  info: 'bg-blue-500',
  success: 'bg-emerald-500',
};

/**
 * Section label component - Premium styling
 * 12px uppercase text with colored dot indicator
 */
export function SectionLabel({ children, className, dotVariant = 'default' }: SectionLabelProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className={cn(
        "h-2 w-2 rounded-full",
        dotColors[dotVariant]
      )} />
      <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
        {children}
      </span>
    </div>
  );
}
