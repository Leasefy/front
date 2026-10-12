'use client';

import { CurrencyInput } from '@leasefy/cadence';
import { Input, Textarea } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SelectorDeMes } from '@/components/finanzas/SelectorDeMes';
import { mesActual } from '@/lib/recaudo/meses';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { CampoDelFormulario } from '@/lib/chat/acciones-del-hilo';
import { CampoDeDia } from '@/components/contabilidad/CampoDeDia';

/**
 * CamposEnElChat — los datos que el micro pide EN el hilo, con el control de
 * cada tipo (plata, fecha, mes, opción, texto). Lo usan el formulario de una
 * acción y la tarjeta del Plan (24-09, paquete H): los mismos campos, el
 * mismo aspecto, una sola forma de llenarlos.
 */

/** Lo que se muestra al abrir: lo que ya dijo la persona; un mes nunca queda vacío. */
export function valoresIniciales(campos: readonly CampoDelFormulario[]): Record<string, string> {
  return Object.fromEntries(campos.map((c) => [c.clave, c.valor ?? (c.tipo === 'mes' ? mesActual() : '')]));
}

/** Lo que viaja en la intención: plata y números como número; lo vacío, fuera. */
export function datosDeLosCampos(
  campos: readonly CampoDelFormulario[],
  valores: Readonly<Record<string, string>>,
): Record<string, string | number> {
  const datos: Record<string, string | number> = {};
  for (const c of campos) {
    const v = (valores[c.clave] ?? '').trim();
    if (!v) continue;
    datos[c.clave] = c.tipo === 'moneda' || c.tipo === 'numero' ? Number(v.replace(',', '.')) : v;
  }
  return datos;
}

export function CamposEnElChat({
  campos,
  valores,
  onCambiar,
  idBase,
  deshabilitados = false,
}: {
  campos: readonly CampoDelFormulario[];
  valores: Readonly<Record<string, string>>;
  onCambiar: (clave: string, valor: string) => void;
  /** Para los `id` de los controles (únicos en el hilo). */
  idBase: string;
  deshabilitados?: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {campos.map((c) => {
        const id = `campo-${idBase}-${c.clave}`;
        const ancho = c.tipo === 'texto_largo' ? 'sm:col-span-2' : '';
        return (
          <div key={c.clave} className={cn('space-y-1.5', ancho)}>
            <label htmlFor={id} className="block font-body text-[14px] font-medium text-fg">
              {c.etiqueta}
            </label>
            {c.tipo === 'moneda' ? (
              <CurrencyInput
                id={id}
                disabled={deshabilitados}
                value={valores[c.clave] ? Number(valores[c.clave]) : undefined}
                onChange={(v) => onCambiar(c.clave, Number.isFinite(v) ? String(v) : '')}
              />
            ) : c.tipo === 'fecha' ? (
              <CampoDeDia
                id={id}
                value={valores[c.clave] ?? ''}
                onChange={(v) => onCambiar(c.clave, v)}
                disabled={deshabilitados}
              />
            ) : c.tipo === 'mes' ? (
              <SelectorDeMes mes={valores[c.clave] || mesActual()} onCambiar={(m) => onCambiar(c.clave, m)} testId={id} />
            ) : c.tipo === 'opcion' ? (
              <Select value={valores[c.clave] ?? ''} onValueChange={(v) => onCambiar(c.clave, v)} disabled={deshabilitados}>
                {/*
                 * 07-10: las opciones del chat pueden ser frases largas («Incapacidad por
                 * enfermedad general — con las fechas desde y hasta (pide soporte…)», un
                 * egreso con su beneficiario y su valor). A 390 px la lista se salía por la
                 * derecha y cortaba el texto: la lista no pasa del ancho de la pantalla, cada
                 * opción se parte en renglones y lo escogido se lee alineado a la izquierda.
                 */}
                <SelectTrigger id={id} aria-label={c.etiqueta} className="h-auto min-h-11 py-2 text-left">
                  <SelectValue placeholder={t('beta.enElChat.formulario.elige')} />
                </SelectTrigger>
                <SelectContent className="max-w-[min(40rem,calc(100vw-2rem))]">
                  {c.opciones.map((o) => (
                    <SelectItem key={o.valor} value={o.valor} className="h-auto min-h-8 whitespace-normal py-1.5 leading-snug">
                      {o.etiqueta}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : c.tipo === 'texto_largo' ? (
              <Textarea id={id} rows={3} disabled={deshabilitados} value={valores[c.clave] ?? ''} onChange={(e) => onCambiar(c.clave, e.target.value)} />
            ) : (
              <Input
                id={id}
                disabled={deshabilitados}
                inputMode={c.tipo === 'numero' ? 'decimal' : undefined}
                value={valores[c.clave] ?? ''}
                onChange={(e) => onCambiar(c.clave, e.target.value)}
              />
            )}
            {c.ayuda && <p className="font-body text-[13px] text-fg-muted">{c.ayuda}</p>}
          </div>
        );
      })}
    </div>
  );
}
