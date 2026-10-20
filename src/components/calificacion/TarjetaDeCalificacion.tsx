'use client';

/**
 * La Calificación Leasefy en una tarjeta (18-10-2026): la letra, el puntaje,
 * qué quiere decir (¿se le arrienda fácil, con condiciones o no?), hasta qué
 * canon, por qué, y el desglose de lo que pesó. La usan «Mi calificación» (la
 * persona), la búsqueda de la inmobiliaria y el cajón del candidato.
 *
 * Una sola escala en toda la plataforma: A ≥ 80 · B ≥ 60 · C ≥ 40 · D < 40.
 */

import { CheckCircle, Info, ShieldWarning, Warning, type Icon } from '@phosphor-icons/react';
import { Presence, Stagger, StaggerItem } from '@leasefy/cadence';

import { useI18n } from '@/lib/i18n';
import { useTr } from '@/lib/i18n/use-tr';
import { cn } from '@/lib/utils';
import type {
  Bloque,
  Calificacion,
  ComponenteDeLosDocumentos,
  ComponenteDelHistorial,
  Letra,
  Veredicto,
} from '@/lib/api/calificacion-leasefy.service';

const TONO_DE_LA_LETRA: Record<Letra, string> = {
  A: 'bg-success-soft text-success',
  B: 'bg-primary-soft text-primary',
  C: 'bg-warning-soft text-warning',
  D: 'bg-danger-soft text-danger',
};

const VEREDICTO: Record<Veredicto, { texto: string; icono: Icon; tono: string }> = {
  FACIL: { texto: 'Se le arrienda fácil', icono: CheckCircle, tono: 'text-success' },
  CON_CONDICIONES: { texto: 'Se le arrienda con condiciones', icono: Info, tono: 'text-primary' },
  NO: { texto: 'No se recomienda arrendarle', icono: Warning, tono: 'text-danger' },
  REVISAR: { texto: 'Que una persona revise los documentos antes de decidir', icono: ShieldWarning, tono: 'text-warning' },
};

const NOMBRE_DEL_COMPONENTE: Record<ComponenteDelHistorial | ComponenteDeLosDocumentos, string> = {
  puntualidad: 'Puntualidad',
  peorAtraso: 'Peor atraso (24 meses)',
  comoTermino: 'Cómo terminaron sus contratos',
  acuerdos: 'Acuerdos y promesas',
  permanencia: 'Permanencia',
  solvencia: 'Solvencia (ingreso frente al canon)',
  ingresoEstable: 'Ingreso estable',
  capacidadDePago: 'Capacidad de pago',
};

/**
 * La persona lee SU calificación («Mi calificación»): el back escribe las
 * frases para la inmobiliaria («Tiene arriendo vencido…», «sus documentos»);
 * a la persona se le dicen de tú (QA del 19-10-2026). Se cambia la frase
 * entera, nunca palabra por palabra, y cada una tiene su inglés.
 */
const PARA_LA_PERSONA: Record<string, string> = {
  'Tiene arriendo vencido sin pagar hace más de 30 días.': 'Tienes arriendo vencido sin pagar hace más de 30 días.',
  'Quedó debiendo arriendo de un contrato que ya terminó.': 'Quedaste debiendo arriendo de un contrato que ya terminó.',
  'Tiene un cobro jurídico abierto por un arriendo.': 'Tienes un cobro jurídico abierto por un arriendo.',
  'Una inmobiliaria dio por perdida una deuda suya de arriendo en los últimos 4 años.':
    'Una inmobiliaria dio por perdida una deuda tuya de arriendo en los últimos 4 años.',
  'El nombre o el número de la cédula no coincide con el de los otros documentos: que lo revise una persona.':
    'El nombre o el número de tu cédula no coincide con el de tus otros documentos: una persona lo revisará antes de decidir.',
  'Un documento muestra señales de haber sido editado: que lo revise una persona antes de decidir.':
    'Uno de tus documentos muestra señales de haber sido editado: una persona lo revisará antes de decidir.',
  'Sólo con su historial en Leasefy: no hay un estudio de documentos de los últimos 6 meses, así que no se sabe hasta qué canon.':
    'Sólo con tu historial en Leasefy: no hay un estudio de tus documentos de los últimos 6 meses, así que no se sabe hasta qué canon.',
  'Sin historial en Leasefy todavía: la calificación sale de sus documentos.':
    'Sin historial en Leasefy todavía: tu calificación sale de tus documentos.',
  'Cómo terminaron sus contratos': 'Cómo terminaron tus contratos',
};

/** La frase como se le dice a la persona (de tú); si no hay versión suya, la del back. */
export function paraLaPersona(frase: string): string {
  return PARA_LA_PERSONA[frase] ?? frase;
}

/**
 * Las frases de `explicacion` vienen del back en español. Las fijas se buscan
 * tal cual en `frases-en.ts`; la única con números («18 meses de historial en
 * Leasefy: el historial pesa 55 % y los documentos 45 %.») se reconoce y se
 * vuelve a armar con sus cifras para que también salga en inglés.
 */
const FRASE_DE_LOS_MESES = /^(\d+) (mes|meses) de historial en Leasefy: el historial pesa (\d+) % y los documentos (\d+) %\.$/;

export function fraseDelBack(tr: ReturnType<typeof useTr>, frase: string, deTu = false): string {
  const m = FRASE_DE_LOS_MESES.exec(frase);
  if (!m) return tr(deTu ? paraLaPersona(frase) : frase);
  return m[2] === 'mes'
    ? tr('1 mes de historial en Leasefy: el historial pesa {h} % y los documentos {d} %.', { h: m[3], d: m[4] })
    : tr('{n} meses de historial en Leasefy: el historial pesa {h} % y los documentos {d} %.', { n: m[1], h: m[3], d: m[4] });
}

/**
 * `etiqueta`: lo que lee un lector de pantalla. Sin ella, la del panel en su
 * idioma; la página pública (sin el idioma del panel) pasa la suya.
 */
export function LetraDeLaCalificacion({
  letra,
  grande,
  etiqueta,
}: {
  letra: Letra | null;
  grande?: boolean;
  etiqueta?: string;
}) {
  const tr = useTr();
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full font-mono font-semibold tabular-nums',
        grande ? 'h-16 w-16 text-3xl' : 'h-8 w-8 text-sm',
        letra ? TONO_DE_LA_LETRA[letra] : 'bg-surface-muted text-fg-subtle',
      )}
      aria-label={etiqueta ?? (letra ? tr('Letra {l}', { l: letra }) : tr('Sin letra'))}
    >
      {letra ?? '—'}
    </span>
  );
}

function BarrasDelBloque<K extends string>({
  titulo,
  peso,
  bloque,
  deTu,
}: {
  titulo: string;
  peso: number | null;
  bloque: Bloque<K> | null;
  deTu?: boolean;
}) {
  const tr = useTr();
  if (!bloque) return null;
  return (
    <div className="rounded-md border border-border bg-surface-muted/40 p-4 dark:border-border-strong">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h4 className="text-sm font-medium text-fg">{tr(titulo)}</h4>
        <span className="font-mono text-xs tabular-nums text-fg-muted">
          {peso !== null ? tr('pesa {p} %', { p: peso }) : ''}
          {bloque.puntaje !== null ? ` · ${bloque.puntaje}/100` : ''}
        </span>
      </div>
      <Stagger className="space-y-2.5">
        {bloque.desglose.map((r) => (
          <StaggerItem key={r.componente}>
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className={cn('text-fg', r.valor === null && 'text-fg-subtle')}>
                {(() => {
                  const nombre = NOMBRE_DEL_COMPONENTE[r.componente as keyof typeof NOMBRE_DEL_COMPONENTE] ?? r.componente;
                  return tr(deTu ? paraLaPersona(nombre) : nombre);
                })()}
              </span>
              <span className="font-mono tabular-nums text-fg-muted">
                {r.valor === null ? tr('sin dato') : `${Math.round(r.valor)}`}
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-muted dark:bg-border">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-500"
                style={{ width: `${r.valor === null ? 0 : Math.max(2, r.valor)}%` }}
              />
            </div>
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  );
}

export function TarjetaDeCalificacion({
  calificacion,
  className,
  sinDesglose,
  compacta,
  deTu,
}: {
  calificacion: Calificacion;
  className?: string;
  sinDesglose?: boolean;
  /**
   * Para un lugar angosto (el cajón del candidato): todo apilado. Las columnas
   * de `lg:` miran el ancho de la PANTALLA, no el del cajón, y en un cajón con
   * pantalla grande partían el veredicto en tres renglones.
   */
  compacta?: boolean;
  /** La lee la persona misma («Mi calificación»): los avisos se le dicen de tú. */
  deTu?: boolean;
}) {
  const tr = useTr();
  const { formatCurrency } = useI18n();
  const c = calificacion;
  const v = c.veredicto ? VEREDICTO[c.veredicto] : null;
  const pesoHistorial = Math.round(c.pesoDelHistorial * 100);

  if (c.estado === 'SIN_DATOS') {
    return (
      <div className={cn('rounded-lg border border-border bg-surface p-6 dark:border-border-strong', className)}>
        <div className="flex items-start gap-4">
          <LetraDeLaCalificacion letra={null} grande />
          <div className="space-y-1">
            <p className="text-base font-medium text-fg">{tr('Todavía no hay calificación')}</p>
            <p className="max-w-xl text-sm text-fg-muted">
              {c.explicacion[0] ? fraseDelBack(tr, c.explicacion[0], deTu) : tr('Todavía no hay datos para calificar.')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('rounded-lg border border-border bg-surface p-6 dark:border-border-strong', className)}>
      <div className={cn('flex flex-col gap-6', !compacta && 'lg:flex-row lg:items-start lg:justify-between')}>
        <div className="flex items-start gap-4">
          <LetraDeLaCalificacion letra={c.letra} grande />
          <div className="space-y-1.5">
            <p className="font-mono text-xs uppercase tracking-wide text-fg-subtle">{tr('Calificación Leasefy')}</p>
            <p className="text-2xl font-medium text-fg">
              <span className="font-mono tabular-nums">{c.puntaje}</span>
              <span className="text-base text-fg-muted">/100</span>
            </p>
            {v && (
              <p className={cn('flex items-center gap-1.5 text-sm font-medium', v.tono)}>
                <v.icono className="h-4 w-4" weight="fill" aria-hidden />
                {tr(v.texto)}
              </p>
            )}
          </div>
        </div>

        <div className={cn('grid grid-cols-2 gap-4 sm:grid-cols-3', !compacta && 'lg:min-w-[22rem]')}>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wide text-fg-subtle">{tr('Canon máximo')}</p>
            <p className="mt-1 font-mono text-sm tabular-nums text-fg">
              {c.canonMaximoCop !== null ? formatCurrency(c.canonMaximoCop) : tr('Sin ingreso verificado')}
            </p>
          </div>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wide text-fg-subtle">{tr('Historial')}</p>
            <p className="mt-1 font-mono text-sm tabular-nums text-fg">
              {c.mesesObservados === 1 ? tr('1 mes') : c.mesesObservados > 0 ? tr('{n} meses', { n: c.mesesObservados }) : tr('Sin historial')}
            </p>
          </div>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wide text-fg-subtle">{tr('Pesa el historial')}</p>
            <p className="mt-1 font-mono text-sm tabular-nums text-fg">{tr('{p} %', { p: pesoHistorial })}</p>
          </div>
        </div>
      </div>

      <Presence show={c.condiciones.length > 0}>
        <div className="mt-5 rounded-md bg-primary-soft p-3 text-sm text-fg">
          <p className="font-medium">{tr('Condiciones sugeridas')}</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-fg-muted">
            {c.condiciones.map((x) => (
              <li key={x}>{tr(x)}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-fg-subtle">
            {tr('Nunca un depósito en dinero: la Ley 820 lo prohíbe en vivienda.')}
          </p>
        </div>
      </Presence>

      {(c.frenos.length > 0 || c.revisiones.length > 0) && (
        <ul className="mt-4 space-y-1.5">
          {[...c.frenos, ...c.revisiones].map((f) => (
            <li key={f.codigo} className="flex items-start gap-2 rounded-md bg-warning-soft px-3 py-2 text-sm text-fg">
              <Warning className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
              {tr(deTu ? paraLaPersona(f.texto) : f.texto)}
            </li>
          ))}
        </ul>
      )}

      {c.explicacion.length > 0 && (
        <ul className="mt-4 space-y-1 text-sm text-fg-muted">
          {c.explicacion
            .filter((e) => !c.frenos.some((f) => f.texto === e) && !c.revisiones.some((r) => r.texto === e))
            .map((e) => (
              <li key={e}>{fraseDelBack(tr, e, deTu)}</li>
            ))}
        </ul>
      )}

      {!sinDesglose && (
        <div
          className={cn(
            'mt-6 grid gap-4',
            // Columnas parejas: con un solo bloque, ocupa todo el ancho (sin hueco).
            !compacta && c.mesesObservados > 0 && c.historial && c.documentos && 'lg:grid-cols-2',
          )}
        >
          <BarrasDelBloque
            titulo="Historial en Leasefy"
            peso={c.historial && c.mesesObservados > 0 ? pesoHistorial : null}
            bloque={c.mesesObservados > 0 ? c.historial : null}
            deTu={deTu}
          />
          <BarrasDelBloque
            titulo="Documentos"
            peso={c.documentos ? 100 - pesoHistorial : null}
            bloque={c.documentos}
            deTu={deTu}
          />
        </div>
      )}
    </div>
  );
}
