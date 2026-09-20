'use client';

/**
 * Las piezas que comparten las cinco pantallas de la contabilidad completa
 * (contrato del 18-09).
 *
 * ── 🔴 Un botón gris sin explicación manda a adivinar ───────────────────────
 *
 * `AccionConMotivo` es la pieza más usada de este archivo, y existe porque en
 * esta zona hay una docena de acciones que se deshabilitan por razones
 * distintas: el rol no escribe, falta la migración, el lote ya se pagó, el
 * formato tiene bloqueos, el aprobador es el mismo. Cada una tiene su frase, y
 * la frase va VISIBLE al lado del botón, no sólo en un `title` que se ve al
 * pasar el mouse —que en un teléfono no se ve nunca—.
 *
 * ── 🔴 Bloqueo y aviso no se dibujan igual ─────────────────────────────────
 *
 * `Bloqueos` es rojo e impide; `Avisos` (de `finanzas/piezas`) es amarillo y
 * sólo informa. Pintarlos iguales hace que el contador que ve seis renglones
 * amarillos deje de leerlos, y el séptimo era el que impedía presentar la
 * exógena.
 *
 * ── `PENDIENTE_DE_CONFIRMAR`, nunca un asterisco ───────────────────────────
 *
 * `VistoBuenoDelContador` es el tratamiento que el PUC ya le da a lo que el
 * sistema propone y no sabe: un aviso con el texto exacto. Un asterisco al pie
 * de una tabla de 128 filas no lo lee nadie, y lo que hay debajo de ese
 * asterisco es la diferencia entre presentar bien y una sanción.
 */

import type { ReactNode } from 'react';
import { Info, Prohibit, SealCheck, WarningOctagon } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ── Una acción con su motivo ───────────────────────────────────────────────

export interface AccionConMotivoProps {
  children: ReactNode;
  onClick?: () => void;
  /** `false` deshabilita y muestra `motivo` debajo. */
  puede: boolean;
  /** Por qué no se puede. Obligatorio cuando `puede` es `false`. */
  motivo?: string | null;
  ocupado?: boolean;
  /** Qué decir mientras la petición está en vuelo. */
  textoOcupado?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'default';
  testId?: string;
  /** Alinea el motivo con el botón en una fila en vez de debajo. */
  enLinea?: boolean;
}

export function AccionConMotivo({
  children,
  onClick,
  puede,
  motivo,
  ocupado = false,
  textoOcupado,
  variant = 'outline',
  size = 'sm',
  testId,
  enLinea = false,
}: AccionConMotivoProps) {
  return (
    <div className={cn(enLinea ? 'flex flex-wrap items-center gap-2' : 'space-y-1')}>
      <Button
        variant={variant}
        size={size}
        hideArrow
        onClick={onClick}
        disabled={!puede || ocupado}
        // El `title` además del texto visible: a quien navega con teclado le
        // llega igual, y el texto visible es para el resto.
        title={puede ? undefined : (motivo ?? undefined)}
        data-testid={testId}
      >
        {ocupado ? (textoOcupado ?? 'Un momento…') : children}
      </Button>
      {!puede && motivo ? (
        <p
          className="max-w-prose text-caption text-fg-muted"
          data-testid={testId ? `${testId}-motivo` : undefined}
        >
          {motivo}
        </p>
      ) : null}
    </div>
  );
}

// ── Lo que impide ──────────────────────────────────────────────────────────

/**
 * Los `bloqueos` del back: lo que impide presentar, causar o aprobar. Rojo y
 * arriba. Cuando no hay, no se dibuja nada — no un cartel verde que diga «sin
 * bloqueos», que ocuparía el lugar de los que sí importan.
 */
export function Bloqueos({
  bloqueos,
  titulo = 'Esto impide seguir',
  testId = 'bloqueos',
}: {
  bloqueos: readonly string[];
  titulo?: string;
  testId?: string;
}) {
  if (bloqueos.length === 0) return null;
  return (
    <div
      className="flex gap-2 rounded-lg border border-danger/40 bg-danger-soft p-3 text-sm text-fg"
      data-testid={testId}
      role="alert"
    >
      <Prohibit className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden="true" />
      <div className="space-y-1">
        <p className="font-medium">{titulo}</p>
        <ul className="space-y-1">
          {bloqueos.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ── Lo que decide el contador, no el sistema ───────────────────────────────

/**
 * El tratamiento de `PENDIENTE_DE_CONFIRMAR`: lo que Leasefy propone y que una
 * persona tiene que confirmar, con el texto exacto y sin asteriscos.
 *
 * `puntos` son las frases del back o de la constante del contrato; se listan
 * completas. Recortarlas con un «ver más» las esconde, y lo que esconden es
 * responsabilidad tributaria.
 */
export function VistoBuenoDelContador({
  titulo = 'Pendiente de confirmar con el contador',
  introduccion,
  puntos,
  testId = 'visto-bueno-del-contador',
}: {
  titulo?: string;
  introduccion?: string;
  puntos: readonly string[];
  testId?: string;
}) {
  if (puntos.length === 0 && !introduccion) return null;
  return (
    <section
      className="space-y-2 rounded-lg border border-warning/40 bg-warning-soft p-4 text-sm text-fg"
      data-testid={testId}
      role="status"
    >
      <div className="flex items-center gap-2">
        <SealCheck className="h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
        <p className="font-medium">{titulo}</p>
      </div>
      {introduccion ? <p className="text-fg-muted">{introduccion}</p> : null}
      {puntos.length > 0 ? (
        <ol className="ml-4 list-decimal space-y-1 text-fg-muted">
          {puntos.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}

// ── Una nota que explica un número ─────────────────────────────────────────

/**
 * Una explicación que no es una alerta: por qué el canon no está en el P&G, por
 * qué el resultado del ejercicio va aparte, qué es el CSV de la exógena.
 *
 * Gris y no amarillo a propósito: no hay nada que arreglar, hay algo que
 * entender. Un cartel amarillo permanente entrena a ignorar los amarillos.
 */
export function Nota({
  children,
  testId,
}: {
  children: ReactNode;
  testId?: string;
}) {
  return (
    <div
      className="flex gap-2 rounded-lg border border-border bg-surface-muted p-3 text-caption leading-relaxed text-fg-muted"
      data-testid={testId}
    >
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <div className="space-y-1">{children}</div>
    </div>
  );
}

// ── «Esto no se puede todavía» ─────────────────────────────────────────────

/**
 * Lo mismo que `finanzas/piezas#SinLaMigracion`, con el texto de esta zona:
 * dice lo que el back manda en `motivo` (que ya trae el nombre de la migración)
 * y agrega lo único que el back no puede decir: quién la aplica y qué sí se
 * puede hacer mientras tanto.
 */
export function FaltaLaMigracion({
  motivo,
  queSeEspera,
  mientrasTanto,
  testId = 'falta-la-migracion',
}: {
  motivo: string | null;
  /** «registrar facturas de proveedor», «guardar el visto bueno». */
  queSeEspera: string;
  /** Qué SÍ funciona sin ella. Vacío = nada. */
  mientrasTanto?: string;
  testId?: string;
}) {
  return (
    <div
      className="flex gap-3 rounded-lg border border-border bg-surface p-5 text-sm text-fg"
      data-testid={testId}
      role="status"
    >
      <WarningOctagon className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
      <div className="space-y-1.5">
        <p className="font-medium">Todavía no se puede {queSeEspera}.</p>
        <p className="text-fg-muted">
          {motivo ?? 'Falta la migración de esta pieza en la base de datos.'}
        </p>
        {mientrasTanto ? <p className="text-fg-muted">{mientrasTanto}</p> : null}
        <p className="text-fg-muted">
          La aplica Víctor. Hasta entonces esta pantalla no guarda nada — no se pierde trabajo,
          simplemente todavía no hay dónde escribirlo.
        </p>
      </div>
    </div>
  );
}
