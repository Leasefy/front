'use client';

/**
 * QA-MIGRACION-95 (MP-06, 06-10-2026): cuando la detección se equivoca, la
 * persona elige la hoja y la fila de los encabezados.
 *
 * Terceros y contratos adivinan en qué hoja y en qué fila empieza la tabla
 * (`elegirDondeEstaLaTabla`), pero no dejaban corregirlo. Visto en el
 * navegador: un libro con las hojas «Inquilinos» y «Propietarios» subido en
 * Propietarios se leía desde «Inquilinos» sin decirlo (iba a crear a los
 * inquilinos como propietarios), y un listado con un título arriba y sólo
 * «Nombre, Cédula» se quedaba en la fila 1 sin salida. Mismo patrón que la hoja
 * del plan de cuentas (`HojaDelLibro` de ImportarCuentas), más la fila.
 */

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/** Dónde se leyó la tabla, con lo necesario para ofrecer otra hoja u otra fila. */
export interface DondeSeLeyoLaTabla {
  /** Todas las hojas del libro, en orden (una sola en un CSV). */
  hojas: string[];
  /** La hoja que se leyó. */
  hoja: string;
  /** Fila (0 = la primera) de los encabezados dentro de esa hoja. */
  fila: number;
  /** Las primeras filas de esa hoja, para mostrar qué trae cada una. */
  primerasFilas: string[][];
}

/** Lo que se ve de una fila en el desplegable: sus primeras celdas con algo. */
function muestraDeLaFila(celdas: readonly string[]): string {
  const texto = celdas
    .map((c) => String(c ?? '').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(', ');
  return texto.length > 48 ? `${texto.slice(0, 47)}…` : texto;
}

/** Las filas que se pueden ofrecer como encabezado: las que traen algo. */
export function filasParaElegir(primerasFilas: readonly string[][]): Array<{ fila: number; muestra: string }> {
  return primerasFilas
    .map((celdas, fila) => ({ fila, muestra: muestraDeLaFila(celdas) }))
    .filter((f) => f.muestra !== '');
}

export function ElegirDondeEstaLaTabla({
  donde,
  ocupado = false,
  soloLaFila = false,
  onElegirHoja,
  onElegirFila,
}: {
  donde: DondeSeLeyoLaTabla;
  ocupado?: boolean;
  /** El importador de inmuebles ya tiene su selector de hoja: sólo la fila. */
  soloLaFila?: boolean;
  onElegirHoja: (hoja: string) => void;
  onElegirFila: (fila: number) => void;
}) {
  const filas = filasParaElegir(donde.primerasFilas);
  // La fila leída siempre está en la lista, aunque venga vacía.
  if (!filas.some((f) => f.fila === donde.fila)) {
    filas.push({ fila: donde.fila, muestra: '' });
    filas.sort((a, b) => a.fila - b.fila);
  }
  const variasHojas = !soloLaFila && donde.hojas.length > 1;
  if (!variasHojas && filas.length < 2) return null;

  return (
    <div
      className="flex flex-wrap items-center gap-x-6 gap-y-2 text-caption text-fg-muted"
      data-testid="donde-esta-la-tabla"
    >
      {variasHojas ? (
        <div className="flex flex-wrap items-center gap-2">
          <span>
            El libro trae {donde.hojas.length} hojas. Leímos la hoja
          </span>
          <Select value={donde.hoja} onValueChange={onElegirHoja} disabled={ocupado}>
            <SelectTrigger
              className="h-9 w-auto min-w-[10rem] max-w-[16rem] [&>span]:truncate"
              aria-label="Hoja del libro"
              data-testid="elegir-hoja"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {donde.hojas.map((h) => (
                <SelectItem key={h} value={h}>
                  {h}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      {filas.length > 1 ? (
        // QA-MIGRACION-95 (TE-20): a 390 px el desplegable (mínimo 12rem) se
        // salía 11 px de la tarjeta; en el celular ocupa el ancho que hay.
        <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto">
          <span>Los encabezados están en la</span>
          <Select
            value={String(donde.fila)}
            onValueChange={(v) => onElegirFila(Number(v))}
            disabled={ocupado}
          >
            <SelectTrigger
              className="h-9 w-full min-w-0 max-w-full sm:w-auto sm:min-w-[12rem] sm:max-w-[22rem] [&>span]:truncate"
              aria-label="Fila de los encabezados"
              data-testid="elegir-fila-de-encabezado"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {filas.map(({ fila, muestra }) => (
                <SelectItem key={fila} value={String(fila)}>
                  {muestra ? `fila ${fila + 1} · ${muestra}` : `fila ${fila + 1}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
    </div>
  );
}
