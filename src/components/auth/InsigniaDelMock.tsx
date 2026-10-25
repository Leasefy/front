import { ETIQUETA_DEL_MOCK } from '@/lib/auth/mock-del-segundo-factor';
import { cn } from '@/lib/utils';

/**
 * La marca visible de que el mock del segundo factor está activo, para que
 * nadie lo confunda con seguridad real. `admin` usa las clases del backoffice.
 */
export function InsigniaDelMock({
  variante = 'panel',
  className,
}: {
  variante?: 'panel' | 'admin';
  className?: string;
}) {
  return (
    <span
      data-testid="insignia-del-mock"
      title="Sólo desarrollo y staging: no es seguridad real"
      className={cn(
        variante === 'admin'
          ? 'pill pill-warn'
          : 'inline-flex items-center rounded-sm border border-warning/40 bg-warning-soft px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-warning',
        className,
      )}
    >
      {ETIQUETA_DEL_MOCK}
    </span>
  );
}
