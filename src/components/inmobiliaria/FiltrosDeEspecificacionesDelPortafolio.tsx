'use client';

import { SegmentedControl } from '@leasefy/cadence';

import { Checkbox } from '@/components/ui/checkbox';
import { MoneyInputNumerico } from '@/components/ui/money-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { FiltrosDeEspecificaciones } from '@/lib/inmuebles/especificaciones';
import { useTr } from '@/lib/i18n/use-tr';

const CUALQUIERA = 'cualquiera';

/**
 * Los filtros de especificaciones en «Filtros (n)» de la tabla de inmuebles (Nico, 31-10-2026: «sumarle más filtros a
 * la tabla de inmueble porfa, muchos más»). Cada cambio filtra en el acto; la regla vive en
 * `lib/inmuebles/especificaciones.ts` (`cumpleLasEspecificaciones`).
 */
export function FiltrosDeEspecificacionesDelPortafolio({
  valor,
  onCambio,
}: {
  valor: FiltrosDeEspecificaciones;
  onCambio: (v: FiltrosDeEspecificaciones) => void;
}) {
  const tr = useTr();
  const poner = <K extends keyof FiltrosDeEspecificaciones>(k: K, v: FiltrosDeEspecificaciones[K] | undefined) => {
    const siguiente = { ...valor };
    if (v === undefined || v === false || (typeof v === 'number' && Number.isNaN(v))) delete siguiente[k];
    else siguiente[k] = v;
    onCambio(siguiente);
  };

  const minimo = (k: 'habitacionesMin' | 'banosMin', etiqueta: string) => (
    <div className="space-y-1">
      <p className="text-caption text-fg-muted">{etiqueta}</p>
      <Select value={valor[k] != null ? String(valor[k]) : CUALQUIERA} onValueChange={(v) => poner(k, v === CUALQUIERA ? undefined : Number(v))}>
        <SelectTrigger className="w-full" aria-label={etiqueta} data-testid={`filtro-${k}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={CUALQUIERA}>{tr('Cualquiera')}</SelectItem>
          {[1, 2, 3, 4, 5].map((n) => (
            <SelectItem key={n} value={String(n)}>
              {`${n}+`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="space-y-3 border-t border-border pt-3" data-testid="filtros-de-especificaciones">
      <SegmentedControl<'todos' | 'rent' | 'sale'>
        fullWidth
        aria-label={tr('Negocio')}
        value={valor.negocio ?? 'todos'}
        onChange={(v) => poner('negocio', v === 'todos' ? undefined : v)}
        options={[
          { value: 'todos', label: tr('Todos') },
          { value: 'rent', label: tr('Arriendo') },
          { value: 'sale', label: tr('Venta') },
        ]}
      />
      <div className="grid grid-cols-2 gap-2">
        {minimo('habitacionesMin', tr('Habitaciones'))}
        {minimo('banosMin', tr('Baños'))}
      </div>
      <div className="space-y-1">
        <p className="text-caption text-fg-muted">{tr('Estrato')}</p>
        <Select value={valor.estrato != null ? String(valor.estrato) : CUALQUIERA} onValueChange={(v) => poner('estrato', v === CUALQUIERA ? undefined : Number(v))}>
          <SelectTrigger className="w-full" aria-label={tr('Estrato')} data-testid="filtro-estrato">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={CUALQUIERA}>{tr('Cualquiera')}</SelectItem>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <SelectItem key={n} value={String(n)}>
                {tr('Estrato {n}', { n })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <p className="text-caption text-fg-muted">{tr('Canon desde')}</p>
          <MoneyInputNumerico value={valor.canonMin} onChange={(v) => poner('canonMin', v)} aria-label={tr('Canon desde')} />
        </div>
        <div className="space-y-1">
          <p className="text-caption text-fg-muted">{tr('Canon hasta')}</p>
          <MoneyInputNumerico value={valor.canonMax} onChange={(v) => poner('canonMax', v)} aria-label={tr('Canon hasta')} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2">
        {(
          [
            ['parqueadero', tr('Con parqueadero')],
            ['cuartoUtil', tr('Con cuarto útil')],
            ['amoblado', tr('Amoblado')],
          ] as const
        ).map(([k, etiqueta]) => (
          <label key={k} className="flex items-center gap-2 text-body-sm text-fg">
            <Checkbox checked={valor[k] === true} onCheckedChange={(v) => poner(k, v === true ? true : undefined)} data-testid={`filtro-${k}`} />
            {etiqueta}
          </label>
        ))}
      </div>
    </div>
  );
}
