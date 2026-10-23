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

import { AnimatedNumber } from '@leasefy/cadence';
import Link from 'next/link';
import { createContext, useContext, useState, type ReactNode } from 'react';
import { enCristiano } from '@/lib/errores/en-cristiano';
import { Info, WarningOctagon } from '@phosphor-icons/react';
import { MasDetalles } from '@/components/pantalla/MasDetalles';

import { CifraQueCabe } from '@/components/estado/CifraQueCabe';
import { useTr } from '@/lib/i18n/use-tr';

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
  /** `muted`: un valor vacío («—») que no debe pesar como los demás. */
  tono?: 'warning' | 'danger' | 'success' | 'muted';
  /** Una línea extra debajo de la definición (comparaciones, detalles). */
  pie?: ReactNode;
  /** Algo debajo de la cifra, antes del pie (una barra de avance). */
  extra?: ReactNode;
  /**
   * Cómo se escribe la cifra. Por defecto, `formatCurrency` de siempre. Las
   * pantallas de Contabilidad pasan la plata de la casa («$ 80.330.850»,
   * «−$ 119.100»; CB-17, 03-10-2026). Opcional: las demás no cambian.
   */
  formato?: (n: number) => string;
  /**
   * GLOW UP (20-10-2026): dentro de una `TarjetaDeCifras`, la cifra que
   * contesta la pregunta del bloque. Va más grande; las demás la acompañan.
   */
  destacada?: boolean;
  /** Una marca antes de la etiqueta (el color de su tramo en una barra). */
  marca?: ReactNode;
  /** Clases de la celda dentro de una `TarjetaDeCifras` (p. ej. cuántas columnas ocupa). */
  className?: string;
}

const TONO: Record<NonNullable<CifraProps['tono']>, string> = {
  warning: 'text-warning',
  danger: 'text-danger',
  success: 'text-success',
  muted: 'text-fg-subtle',
};

/** Una cifra en pesos, con su definición debajo. */
export function Cifra({
  id,
  etiqueta,
  valor,
  definicion,
  sinMedir,
  tono,
  pie,
  formato = formatCurrency,
  destacada,
  marca,
  className,
  extra,
}: CifraProps) {
  const enTarjeta = useContext(QueMideCadaCifra);
  const medido = valor !== null && Number.isFinite(valor);
  if (enTarjeta) {
    return (
      <CeldaDeCifra
        id={id}
        etiqueta={etiqueta}
        marca={marca}
        destacada={destacada}
        className={className}
        tono={medido ? tono : undefined}
        texto={medido ? formato(valor as number) : SIN_MEDIR}
        definicion={medido ? definicion : (sinMedir ?? definicion)}
        pie={pie}
        extra={extra}
      >
        {medido ? <AnimatedNumber value={valor as number} format={formato} /> : SIN_MEDIR}
      </CeldaDeCifra>
    );
  }
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
        {/* Si la cifra cambia sin recargar (otro período, otro filtro),
            cuenta desde la anterior; al montarse se muestra quieta. */}
        {medido ? <AnimatedNumber value={valor as number} format={formato} /> : SIN_MEDIR}
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
  destacada?: boolean;
  marca?: ReactNode;
  className?: string;
  /** Lo que va entre la cifra y el pie dentro de una tarjeta (una barra de avance). */
  extra?: ReactNode;
}

/**
 * Una cifra que NO son pesos: un porcentaje, un conteo, una fecha. Quien llama
 * la formatea —y si no se midió, pasa `SIN_MEDIR`—.
 */
export function CifraDeTexto({
  id,
  etiqueta,
  texto,
  definicion,
  tono,
  pie,
  destacada,
  marca,
  className,
  extra,
}: CifraDeTextoProps) {
  const enTarjeta = useContext(QueMideCadaCifra);
  const medido = texto !== SIN_MEDIR;
  if (enTarjeta) {
    return (
      <CeldaDeCifra
        id={id}
        etiqueta={etiqueta}
        marca={marca}
        destacada={destacada}
        className={className}
        tono={medido ? tono : undefined}
        texto={texto}
        definicion={definicion}
        pie={pie}
        extra={extra}
      >
        {texto}
      </CeldaDeCifra>
    );
  }
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

// ── Tarjeta de cifras (GLOW UP, 20-10-2026) ─────────────────────────────────

/**
 * Si las cifras de esta tarjeta muestran qué mide cada una. `null` = la cifra
 * no está en una tarjeta y se pinta como siempre (con su definición debajo).
 */
const QueMideCadaCifra = createContext<{ abiertas: boolean } | null>(null);

/**
 * Un bloque de cifras que contesta UNA pregunta, en una sola tarjeta — GLOW UP
 * (Nico, 20-10-2026: «minimizando carga cognitiva… esconder información
 * irrelevante en la misma pantalla presentada de otra manera»).
 *
 * Antes cada cifra era su propia tarjeta con un párrafo debajo: dieciocho
 * tarjetas del mismo peso y otros tantos párrafos, y la cifra que contesta la
 * pregunta no se distinguía de las que la explican. Ahora:
 *
 *   · arriba, el título del bloque y su pregunta en una línea, con su acción;
 *   · las cifras en una fila de celdas separadas por una línea fina, la que
 *     contesta la pregunta más grande (`destacada`);
 *   · qué mide cada cifra sigue en la pantalla —una cifra sin definición no se
 *     publica—, plegado detrás de «Qué mide cada cifra», que abre todas las del
 *     bloque a la vez. Lo que es DATO (una comparación, lo que va aparte) va en
 *     el `pie` y se ve siempre.
 */
export function TarjetaDeCifras({
  titulo,
  pregunta,
  explicacion,
  accion,
  children,
  testId,
  className,
  queMideDesdeAfuera,
}: {
  titulo: string;
  /** Una línea: la pregunta que contesta el bloque. */
  pregunta?: string;
  /** El párrafo largo del bloque: se ve con «Qué mide cada cifra». */
  explicacion?: ReactNode;
  accion?: ReactNode;
  children: ReactNode;
  testId?: string;
  className?: string;
  /**
   * 22-10 (revisión): «Qué mide cada cifra» lo maneja la pantalla, una sola vez
   * (el Tablero tenía cuatro botones iguales). Con esto, la tarjeta no pinta el suyo.
   */
  queMideDesdeAfuera?: boolean;
}) {
  const tr = useTr();
  const [abiertasPropio, setAbiertas] = useState(false);
  const abiertas = queMideDesdeAfuera ?? abiertasPropio;
  return (
    <section
      className={cn('overflow-hidden rounded-[20px] border border-border bg-surface', className)}
      data-testid={testId}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-5 pb-4 pt-5">
        <div className="min-w-0 space-y-0.5">
          <h2 className="text-h3 text-fg">{titulo}</h2>
          {pregunta ? <p className="text-body-sm text-fg-muted">{pregunta}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {queMideDesdeAfuera === undefined ? (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full text-body-sm font-medium text-fg-muted underline-offset-4 transition-colors duration-fast hover:text-fg hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-pressed={abiertas}
            onClick={() => setAbiertas((v) => !v)}
            data-testid={testId ? `${testId}-que-mide` : undefined}
          >
            <Info className="h-4 w-4" aria-hidden="true" />
            {abiertas ? tr('Ocultar qué mide cada cifra') : tr('Qué mide cada cifra')}
          </button>
          ) : null}
          {accion}
        </div>
      </div>
      {explicacion ? (
        <p
          hidden={!abiertas}
          className={cn(
            'max-w-3xl px-5 pb-4 text-caption leading-relaxed text-fg-muted',
            abiertas && 'animate-rise-in',
          )}
        >
          {explicacion}
        </p>
      ) : null}
      <QueMideCadaCifra.Provider value={{ abiertas }}>{children}</QueMideCadaCifra.Provider>
    </section>
  );
}

/**
 * Las celdas de una `TarjetaDeCifras`, separadas por una línea fina (la grilla
 * pinta el borde por el hueco de 1 px). Quien la usa elige las columnas, y que
 * cada fila quede llena: una celda de menos dejaría un hueco gris.
 */
export function FilaDeCifras({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('grid gap-px border-t border-border bg-border', className)}>{children}</div>;
}

function CeldaDeCifra({
  id,
  etiqueta,
  marca,
  destacada,
  className,
  tono,
  texto,
  definicion,
  pie,
  extra,
  children,
}: {
  id: string;
  etiqueta: string;
  marca?: ReactNode;
  destacada?: boolean;
  className?: string;
  tono?: CifraProps['tono'];
  /** La cifra ya escrita: con ella se achica la letra para que quepa entera. */
  texto: string;
  definicion: string;
  pie?: ReactNode;
  extra?: ReactNode;
  children: ReactNode;
}) {
  const { abiertas } = useContext(QueMideCadaCifra) ?? { abiertas: true };
  return (
    <section
      className={cn('flex min-w-0 flex-col gap-1.5 bg-surface px-5 py-4', className)}
      data-testid={`cifra-${id}`}
      data-destacada={destacada ? '' : undefined}
    >
      <p className="flex items-center gap-2 text-label text-fg-muted">
        {marca}
        <span className="min-w-0">{etiqueta}</span>
      </p>
      <p
        className={cn(
          'font-mono font-medium tabular-nums text-fg',
          destacada ? 'text-stat' : 'text-h2',
          tono && TONO[tono],
        )}
        data-testid={`valor-${id}`}
      >
        <CifraQueCabe texto={texto}>{children}</CifraQueCabe>
      </p>
      {extra}
      {pie ? <div className="text-caption leading-relaxed text-fg-muted">{pie}</div> : null}
      <p
        hidden={!abiertas}
        className={cn('text-caption leading-relaxed text-fg-muted', abiertas && 'animate-rise-in')}
      >
        {definicion}
      </p>
    </section>
  );
}

/**
 * Un renglón de una cuenta dentro de una `TarjetaDeCifras`: «Comisiones
 * $ 770.000», «− 4x1000 $ 27.134,80», con el subtotal en negrilla y con línea
 * arriba. Para lo que se SUMA y se RESTA hasta un resultado: leído como cuenta
 * se entiende de dónde sale el resultado sin explicarlo.
 */
export function RenglonDeCifra({
  id,
  etiqueta,
  valor,
  definicion,
  signo,
  subtotal,
  tono,
  formato = formatCurrency,
  marca,
  pie,
}: {
  id: string;
  etiqueta: ReactNode;
  valor: number | null;
  definicion: string;
  /** `'-'` = se resta: se escribe «−» delante de la cifra. */
  signo?: '+' | '-';
  subtotal?: boolean;
  tono?: CifraProps['tono'];
  formato?: (n: number) => string;
  /** Un punto de color antes de la etiqueta (el tramo de una barra). */
  marca?: ReactNode;
  /** Un renglón chico debajo, siempre visible («120 cuotas», un enlace). */
  pie?: ReactNode;
}) {
  const { abiertas } = useContext(QueMideCadaCifra) ?? { abiertas: true };
  const medido = valor !== null && Number.isFinite(valor);
  return (
    <div
      className={cn('py-2', subtotal && 'border-t border-border')}
      data-testid={`cifra-${id}`}
    >
      <div className="flex items-baseline justify-between gap-4">
        <p className={cn('flex min-w-0 items-center gap-2 text-body-sm', subtotal ? 'font-medium text-fg' : 'text-fg-muted')}>
          {marca}
          <span className="min-w-0">{etiqueta}</span>
        </p>
        <p
          className={cn(
            'shrink-0 font-mono text-body-sm tabular-nums',
            subtotal ? 'font-medium text-fg' : 'text-fg',
            medido && tono && TONO[tono],
          )}
        >
          {signo === '-' && medido ? <span aria-hidden="true">− </span> : null}
          <span data-testid={`valor-${id}`}>
            {medido ? <AnimatedNumber value={valor as number} format={formato} /> : SIN_MEDIR}
          </span>
        </p>
      </div>
      {pie ? <div className="pt-0.5 text-caption text-fg-muted">{pie}</div> : null}
      <p
        hidden={!abiertas}
        className={cn('pt-0.5 text-caption leading-relaxed text-fg-muted', abiertas && 'animate-rise-in')}
      >
        {definicion}
      </p>
    </div>
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
  /*
   * GLOW UP (revisión de Dinero, 22-10-2026): eran franjas amarillas con
   * borde, apiladas encima de todo, y empujaban la cifra que importa hacia
   * abajo. Ahora es UN renglón con su punto ámbar: con un aviso, el aviso; con
   * varios, «N cosas afectan estas cifras» y el detalle plegado (montado: el
   * texto sigue en la página para quien lo busque). Manual de voz: «Aviso: un
   * renglón, junto a lo que afecta».
   */
  const uno = avisos.length === 1;
  return (
    <div className="flex items-start gap-2.5 text-body-sm text-fg" data-testid={testId} role="status">
      <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-warning-500" aria-hidden="true" />
      {uno ? (
        <p className="min-w-0">
          {titulo ? <span className="sr-only">{titulo}: </span> : null}
          <TextoDelAviso aviso={avisos[0]} />
        </p>
      ) : (
        <MasDetalles
          montadoSiempre
          etiqueta={`${avisos.length} cosas afectan estas cifras`}
          etiquetaAbierto="Ocultar"
        >
          {titulo ? <p className="sr-only">{titulo}</p> : null}
          <ul className="list-disc space-y-1 pl-4 text-fg-muted marker:text-fg-subtle">
            {avisos.map((aviso) => (
              <li key={aviso}><TextoDelAviso aviso={aviso} /></li>
            ))}
          </ul>
        </MasDetalles>
      )}
    </div>
  );
}

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
  /**
   * Opcional desde CB-17 (03-10-2026): un bloque cuya explicación ya la dice
   * la cabecera de la pantalla no la repite debajo de su título.
   */
  explicacion?: string;
  accion?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-fg">{titulo}</h2>
        {explicacion ? (
          <p className="max-w-2xl text-caption leading-relaxed text-fg-muted">{explicacion}</p>
        ) : null}
      </div>
      {accion ? <div className="shrink-0">{accion}</div> : null}
    </div>
  );
}

/**
 * El texto de un aviso del back. Ronda 12 de la revisión: el que manda a
 * «Costos de la plata» lleva su enlace (antes había que ir a buscarlo).
 */
const RUTA_DE_COSTOS_DE_LA_PLATA = '/panel/inmobiliaria/configuracion/costos-de-la-plata';
function TextoDelAviso({ aviso }: { aviso: string }) {
  if (!/costos de la plata/i.test(aviso)) return <>{aviso}</>;
  return (
    <>
      {aviso}{' '}
      <Link href={RUTA_DE_COSTOS_DE_LA_PLATA} className="font-medium text-primary underline-offset-4 hover:underline">
        Configurar los costos
      </Link>
    </>
  );
}
