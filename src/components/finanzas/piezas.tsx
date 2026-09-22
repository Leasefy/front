'use client';

/**
 * Las piezas que comparten las pantallas de la lógica financiera del 17-09.
 *
 * ── Una cifra sin su definición no sirve (Nico) ─────────────────────────────
 *
 * El patrón es el de `components/recaudo/Recaudo.tsx`: etiqueta, valor y —
 * debajo— QUÉ MIDE ese número, escrito. Finanzas mira este tablero todos los
 * días y tiene que poder decirle al contador de dónde sale cada peso sin
 * abrir el código.
 *
 * ── `null` se pinta `—`, nunca `0` ──────────────────────────────────────────
 *
 * `valor: number | null`: el `null` del back significa «no se pudo medir», y
 * un cero en su lugar afirma algo que nadie midió (ver `@/lib/tasas`). Cuando
 * hay guion, la definición dice POR QUÉ no se midió — para eso está
 * `sinMedir`.
 */

import type { ReactNode } from 'react';
import { enCristiano } from '@/lib/errores/en-cristiano';
import { Warning, WarningOctagon } from '@phosphor-icons/react';

import { SIN_MEDIR } from '@/lib/tasas';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import { cn } from '@/lib/utils';

// ── Cifras ──────────────────────────────────────────────────────────────────

export interface CifraProps {
  /** Para el `data-testid`: `cifra-<id>` y `valor-<id>`. */
  id: string;
  etiqueta: string;
  /** `null` = el back no pudo medirlo. Se pinta `—`. */
  valor: number | null;
  /** Qué mide el número. Obligatoria: una cifra sin definición no se publica. */
  definicion: string;
  /** Qué decir cuando el valor es `null`. Reemplaza a `definicion`. */
  sinMedir?: string;
  tono?: 'warning' | 'danger' | 'success';
  /** Una línea extra debajo de la definición (comparaciones, detalles). */
  pie?: ReactNode;
}

const TONO: Record<NonNullable<CifraProps['tono']>, string> = {
  warning: 'text-warning',
  danger: 'text-danger',
  success: 'text-success',
};

/** Una cifra en pesos, con su definición debajo. */
export function Cifra({ id, etiqueta, valor, definicion, sinMedir, tono, pie }: CifraProps) {
  const medido = valor !== null && Number.isFinite(valor);
  return (
    <section
      className="space-y-2 rounded-lg border border-border bg-surface p-5"
      data-testid={`cifra-${id}`}
    >
      <p className="text-label text-fg-muted">{etiqueta}</p>
      <p
        className={cn(
          'font-mono text-2xl font-medium tabular-nums text-fg',
          medido && tono && TONO[tono],
        )}
        data-testid={`valor-${id}`}
      >
        {medido ? formatCurrency(valor as number) : SIN_MEDIR}
      </p>
      <p className="text-caption leading-relaxed text-fg-muted">
        {medido ? definicion : (sinMedir ?? definicion)}
      </p>
      {pie ? <div className="text-caption leading-relaxed text-fg-muted">{pie}</div> : null}
    </section>
  );
}

export interface CifraDeTextoProps {
  id: string;
  etiqueta: string;
  /** Ya formateado por quien llama (un `%`, un conteo, una fecha). */
  texto: string;
  definicion: string;
  tono?: CifraProps['tono'];
  pie?: ReactNode;
}

/**
 * Una cifra que NO son pesos: un porcentaje, un conteo, una fecha. Quien llama
 * la formatea —y si no se midió, pasa `SIN_MEDIR`—.
 */
export function CifraDeTexto({ id, etiqueta, texto, definicion, tono, pie }: CifraDeTextoProps) {
  const medido = texto !== SIN_MEDIR;
  return (
    <section
      className="space-y-2 rounded-lg border border-border bg-surface p-5"
      data-testid={`cifra-${id}`}
    >
      <p className="text-label text-fg-muted">{etiqueta}</p>
      <p
        className={cn(
          'font-mono text-2xl font-medium tabular-nums text-fg',
          medido && tono && TONO[tono],
        )}
        data-testid={`valor-${id}`}
      >
        {texto}
      </p>
      <p className="text-caption leading-relaxed text-fg-muted">{definicion}</p>
      {pie ? <div className="text-caption leading-relaxed text-fg-muted">{pie}</div> : null}
    </section>
  );
}

// ── Avisos ──────────────────────────────────────────────────────────────────

/**
 * Lo que el back manda en `avisos`: datos que faltan, plata que no entró en la
 * cuenta, decisiones que le tocan al contador.
 *
 * Va ARRIBA y no se esconde detrás de un «ver más»: un número que calla lo que
 * no cuenta miente por omisión. Mismo dibujo que `CarteraCompleta`.
 */
export function Avisos({
  avisos,
  testId = 'avisos',
  titulo,
}: {
  avisos: readonly string[];
  testId?: string;
  titulo?: string;
}) {
  if (avisos.length === 0) return null;
  return (
    <div
      className="flex gap-2 rounded-lg border border-warning/40 bg-warning-soft p-3 text-sm text-fg"
      data-testid={testId}
      role="status"
    >
      <Warning className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
      <div className="space-y-1">
        {titulo ? <p className="font-medium">{titulo}</p> : null}
        <ul className="space-y-1">
          {avisos.map((aviso) => (
            <li key={aviso}>{aviso}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ── «Todavía no está la migración» ──────────────────────────────────────────

/**
 * El cartel de la pieza que espera una migración.
 *
 * Se muestra con el `motivo` que manda el back —que ya trae el nombre de la
 * migración— y agrega lo único que el back no puede decir: QUIÉN la aplica.
 * Una pantalla que se cae con un 503 no le dice a nadie qué hacer.
 */
export function SinLaMigracion({
  motivo,
  queSeEspera,
  testId = 'sin-la-migracion',
}: {
  motivo: string | null;
  /** Qué va a poder hacerse cuando esté: «cargar las tasas de usura». */
  queSeEspera: string;
  testId?: string;
}) {
  const traducido = enCristiano(motivo);
  return (
    <div
      className="flex gap-3 rounded-lg border border-border bg-surface p-5 text-sm text-fg"
      data-testid={testId}
      role="status"
    >
      <WarningOctagon className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
      <div className="space-y-1.5">
        <p className="font-medium">Todavía no se puede {queSeEspera}.</p>
        {/* 🔴 Traducido: el `motivo` del back trae el identificador de la
            migración, que es para quien despliega y no para la inmobiliaria.
            El original queda en `title` para soporte. */}
        {traducido.texto ? (
          <p className="text-fg-muted" title={traducido.tecnico ?? undefined}>
            {traducido.texto}
          </p>
        ) : null}
        <p className="text-fg-muted">
          Nuestro equipo lo está habilitando. Hasta entonces esta pantalla te muestra lo que ya se
          puede leer y no guarda nada — no se pierde trabajo, simplemente todavía no hay dónde
          escribirlo.
        </p>
      </div>
    </div>
  );
}

// ── Encabezado de bloque ────────────────────────────────────────────────────

/** El título de uno de los bloques del tablero, con su explicación. */
export function TituloDeBloque({
  titulo,
  explicacion,
  accion,
}: {
  titulo: string;
  explicacion: string;
  accion?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-fg">{titulo}</h2>
        <p className="max-w-2xl text-caption leading-relaxed text-fg-muted">{explicacion}</p>
      </div>
      {accion ? <div className="shrink-0">{accion}</div> : null}
    </div>
  );
}
