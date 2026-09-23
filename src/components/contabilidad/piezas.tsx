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
import { motivoEnCristiano } from '@/lib/errores/en-cristiano';

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
        {/* 🔴 20-09 · El motivo pasa por `enCristiano` ACÁ, no en cada quien
            que usa esta pieza. El 18-09 Nico preguntó por qué una pantalla le
            mostraba «Falta aplicar la migración 20260917120000_modalidad_
            del_mandato», y se escribió el traductor; pero aplicarlo era cosa
            de cada pantalla, y siete no lo hacían. Con el traductor adentro,
            la próxima nace bien sin que nadie se acuerde.

            El motivo entero sigue viajando: va en el `title`, así que quien
            tenga que diagnosticar lo tiene a un mouse de distancia. */}
        <p className="text-fg-muted" title={motivo ?? undefined}>
          {motivoEnCristiano(motivo) ??
            'Esta función todavía no está disponible.'}
        </p>
        {mientrasTanto ? <p className="text-fg-muted">{mientrasTanto}</p> : null}
        <p className="text-fg-muted">
          Nuestro equipo la está habilitando. Hasta entonces esta pantalla no guarda nada — no se pierde trabajo,
          simplemente todavía no hay dónde escribirlo.
        </p>
      </div>
    </div>
  );
}

// ── UNA tarjeta: los filtros van PEGADOS a su tabla ────────────────────────

/**
 * 🔴 20-09 · Nico, sobre Facturación y con la captura al lado: «porque esto no
 * está pegado a la tabla de cada uno». Lo dijo de una pantalla, pero el
 * defecto estaba en diez: en toda la contabilidad el rango de fechas, el
 * selector de cuenta y las casillas vivían en una tarjeta con borde propio,
 * separada por 20 px de la tarjeta de la tabla que filtran.
 *
 * Dos tarjetas dicen «dos cosas». Un filtro NO es otra cosa: es el encabezado
 * de su tabla, y leerlo aparte obliga a recordar qué rango se pidió mientras
 * se miran los números. Peor con scroll: el filtro se va de pantalla y la
 * tabla queda sin decir de qué fechas habla.
 *
 * Por eso el chasis de la casa es UNA tarjeta: filtros con `border-b`, luego
 * el cuerpo, y el paginador adentro. El borde de adentro los separa sin
 * volverlos dos objetos.
 *
 * ⚠️ `overflow-x-clip`, nunca `overflow-hidden`: recorta igual, pero no crea
 * un contenedor de scroll, y por lo tanto no mata ningún `sticky` de adentro.
 * Eso costó seis arreglos en un mismo día.
 */
export function TarjetaDeInforme({
  filtros,
  filtrosClassName = 'flex flex-wrap items-end gap-x-6 gap-y-3',
  children,
  className,
  testId,
}: {
  /** Lo que filtra la tabla. Se dibuja arriba, dentro de la misma tarjeta. */
  filtros?: ReactNode;
  /** Cómo se acomodan los filtros: fila envuelta por defecto, o una grilla. */
  filtrosClassName?: string;
  children: ReactNode;
  className?: string;
  testId?: string;
}) {
  return (
    <section
      data-testid={testId}
      className={cn('overflow-x-clip rounded-lg border border-border bg-surface', className)}
    >
      {filtros ? (
        <div className={cn('border-b border-border p-4', filtrosClassName)}>{filtros}</div>
      ) : null}
      {children}
    </section>
  );
}

/**
 * Una franja dentro de la tarjeta: el veredicto de un informe, un resumen, un
 * aviso. Va entre los filtros y la tabla, con su propio borde inferior, para
 * que no se lea como una tarjeta suelta más.
 */
export function FranjaDeInforme({
  children,
  tono = 'neutro',
  className,
  testId,
  papel,
}: {
  children: ReactNode;
  tono?: 'neutro' | 'bien' | 'mal';
  className?: string;
  testId?: string;
  papel?: 'status' | 'alert';
}) {
  return (
    <div
      role={papel}
      data-testid={testId}
      className={cn(
        'flex flex-wrap items-center gap-3 border-b border-border px-4 py-3 text-sm',
        tono === 'bien' && 'bg-success-soft',
        tono === 'mal' && 'bg-danger-soft',
        tono === 'neutro' && 'bg-surface-muted',
        className,
      )}
    >
      {children}
    </div>
  );
}
