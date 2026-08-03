import { Switch } from '@/components/ui/switch';

export function SettingToggle({
  icon: Icon,
  title,
  description,
  enabled,
  onToggle,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
  accent?: 'emerald' | 'indigo';
}) {
  return (
    <div className="flex items-center justify-between px-6 py-4 hover:bg-surface-hover transition-colors">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-surface-muted flex items-center justify-center">
          <Icon className="w-5 h-5 text-fg-muted" />
        </div>
        <div>
          <p className="text-sm font-medium text-fg">{title}</p>
          <p className="text-xs text-fg-subtle">{description}</p>
        </div>
      </div>
      <Switch
        checked={enabled}
        onCheckedChange={onToggle}
        aria-label={title}
        className={accent === 'emerald' ? 'data-[state=checked]:bg-success' : undefined}
      />
    </div>
  );
}
