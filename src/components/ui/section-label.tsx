import { cn } from "@/lib/utils";

interface SectionLabelProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Section label component - Luxterra style
 * 12px text with small dot indicator
 */
export function SectionLabel({ children, className }: SectionLabelProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-50" />
      <span className="text-xs tracking-tight">{children}</span>
    </div>
  );
}
