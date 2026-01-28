import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type DotVariant = 'default' | 'warning' | 'info' | 'success';

interface SectionLabelProps {
  children: React.ReactNode;
  className?: string;
  dotVariant?: DotVariant;
}

const dotColors: Record<DotVariant, string> = {
  default: 'bg-muted-foreground',
  warning: 'bg-amber-500',
  info: 'bg-blue-500',
  success: 'bg-emerald-500',
};

/**
 * Section label component - Usa Badge de shadcn
 * 12px text with colored dot indicator
 */
export function SectionLabel({ children, className, dotVariant = 'default' }: SectionLabelProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", dotColors[dotVariant])} />
      <Badge variant="secondary" className="text-xs font-normal px-0 py-0 bg-transparent text-muted-foreground hover:bg-transparent">
        {children}
      </Badge>
    </div>
  );
}
