import { CaretRight } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';

export function SettingLink({
  icon: Icon,
  title,
  description,
  onClick,
  badge,
  external,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  onClick: () => void;
  badge?: string;
  external?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-6 py-4 hover:bg-white/50 dark:hover:bg-[#1f1f21]/50 transition-colors group"
    >
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#1f1f21] flex items-center justify-center">
          <Icon className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
        </div>
        <div className="text-left">
          <p className="text-sm font-medium text-neutral-900 dark:text-white">{title}</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">{description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {badge && (
          <Badge variant="default">{badge}</Badge>
        )}
        <CaretRight className="w-5 h-5 text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 transition-colors" />
      </div>
    </button>
  );
}
