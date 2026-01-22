import { cn } from "@/lib/utils";

type DotVariant = 'default' | 'warning' | 'info' | 'success';

interface SectionLabelProps {
  children: React.ReactNode;
  className?: string;
  dotVariant?: DotVariant;
}

const dotColors: Record<DotVariant, string> = {
  default: 'bg-current opacity-50',
  warning: 'bg-amber-500',
  info: 'bg-blue-500',
  success: 'bg-emerald-500',
};

/**
 * Section label component - Luxterra style
 * 12px text with colored dot indicator
 */
export function SectionLabel({ children, className, dotVariant = 'default' }: SectionLabelProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", dotColors[dotVariant])} />
      <span className="text-xs tracking-tight">{children}</span>
    </div>
  );
}
