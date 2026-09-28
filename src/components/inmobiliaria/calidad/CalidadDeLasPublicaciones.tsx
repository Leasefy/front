'use client';

/**
 * Pestaña «Calidad» de Inmuebles › Portales — Niti · calidad (26-09-2026).
 *
 * Qué pidió Nico (`niti-spec.md`, decisión 7): junto a donde ya se publica,
 * los inmuebles de peor a mejor con su puntaje, qué les falta, sus problemas y
 * las fotos señaladas, con Aprobar / Rechazar / Despublicar y el enlace a la
 * ficha. Todo lo lee del micro (`nitiApi`); los textos llegan en español y se
 * pintan tal cual — `falta[].que` es la salida VERBATIM de la regla del back,
 * así que Portales y Niti nunca discrepan.
 *
 * Reglas que esta pantalla no rompe:
 *   · Niti apagado para la inmobiliaria ⇒ se dice, y la lista NO se pide.
 *   · Cada propuesta ofrece el botón que corresponde a su acción; una acción
 *     que este front no conoce sólo se puede rechazar.
 *   · Despublicar es UN clic (decisión 5): el botón ya dice lo que hace.
 *   · Sin `portafolio:edit` no hay botones de escribir (como en «Publicar»).
 */

import { useState } from 'react';
import Link from 'next/link';
import { ArrowSquareOut, Power, Sparkle, WarningCircle } from '@phosphor-icons/react';
import { SegmentedControl } from '@leasefy/cadence';

import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { EsqueletoTabla } from '@/components/estado/EsqueletoTabla';
import { SinDatos } from '@/components/estado/SinDatos';
import { Badge, Button, EmptyState } from '@/components/ui';
import { TablePagination } from '@/components/ui/pagination';
import { toast } from '@/components/ui/toast';
import { useAuth } from '@/lib/auth';
import { formatDateTime } from '@/lib/format';
import { useInmueblesDeNiti, useResumenDeNiti } from '@/lib/hooks/use-niti';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useI18n } from '@/lib/i18n';
import { nitiApi } from '@/lib/api/niti.service';
import { cn } from '@/lib/utils';
import {
  FILTROS_DE_CALIDAD,
  type DecisionDeCalidad,
  type FiltroDeCalidad,
  type InmuebleAuditado,
  type PropuestaDeCalidad,
  type ResumenDeCalidad,
} from '@/lib/types/niti';

const K = 'inmobiliaria.calidad';
export const TAMANOS_DE_PAGINA = [10, 20, 50];
const TAMANO_POR_DEFECTO = 20;

type BotonDeAprobar = 'aplicar' | 'despublicar' | 'hecha';

/** Qué botón de aprobar lleva una propuesta; `null` si no se sabe qué haría. */
export function botonDeAprobar(p: PropuestaDeCalidad): BotonDeAprobar | null {
  if (p.accion === 'desconocida') return null;
  if (p.tipo === 'tarea' || p.accion === 'tarea') return 'hecha';
  if (p.accion === 'despublicar') return 'despublicar';
  return 'aplicar';
}

/** Umbrales de DESIGN §4 (barras de puntaje): ≥75 bien, ≥50 regular, <50 mal. */
function tonoDelPuntaje(n: number): string {
  if (n >= 75) return 'bg-success';
  if (n >= 50) return 'bg-warning';
  return 'bg-danger';
}

export function CalidadDeLasPublicaciones() {
  const { t } = useI18n();
  const { agency } = useAuth();
  const agencyId = agency?.id ?? null;
  const { canAccess } = usePermissions();
  const puedeDecidir = canAccess('portafolio', 'edit');

  const resumen = useResumenDeNiti(agencyId);
  const activo = resumen.data?.activo === true;

  const [filtro, setFiltro] = useState<FiltroDeCalidad>('todos');
  const [limit, setLimit] = useState(TAMANO_POR_DEFECTO);
  // La página vale sólo para el filtro con que se eligió (como en Cobri).
  const alcance = `${filtro}|${limit}`;
  const [pagina, setPagina] = useState({ alcance, n: 1 });
  const page = pagina.alcance === alcance ? pagina.n : 1;

  const lista = useInmueblesDeNiti(agencyId, { page, limit, filtro }, activo);
  const [decidiendo, setDecidiendo] = useState<string | null>(null);

  async function decidir(propuesta: PropuestaDeCalidad, decision: DecisionDeCalidad) {
    if (!agencyId) return;
    setDecidiendo(propuesta.id);
    try {
      const r = await nitiApi.decidir(agencyId, propuesta.id, decision);
      const mensaje = r.mensaje || t(`${K}.decisionSinMensaje`);
      if (r.estado === 'fallida') toast.error(mensaje);
      else toast.success(mensaje);
      await Promise.all([lista.recargar(), resumen.recargar()]);
    } catch (e) {
      toast.error(t(`${K}.decisionFallo`, { error: e instanceof Error ? e.message : String(e) }));
    } finally {
      setDecidiendo(null);
    }
  }

  const total = lista.data?.total ?? 0;

  return (
    <div className="space-y-6" data-testid="calidad-de-las-publicaciones">
      <EstadoDeDatos
        cargando={resumen.cargando && !resumen.data}
        error={resumen.error}
        queEs={t(`${K}.queEsResumen`)}
        onReintentar={resumen.recargar}
        conservarContenido
        esqueleto={<div className="h-36 animate-pulse rounded-lg bg-surface-muted" />}
      >
        {resumen.data ? <Encabezado resumen={resumen.data} /> : null}
      </EstadoDeDatos>

      {resumen.data && !activo ? (
        <EmptyState
          icon={Power}
          title={t(`${K}.apagadoTitulo`)}
          description={t(`${K}.apagadoDescripcion`)}
        />
      ) : null}

      {activo ? (
        <section className="rounded-lg border border-border bg-surface" data-testid="calidad-lista">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
            <SegmentedControl<FiltroDeCalidad>
              aria-label={t(`${K}.filtroAria`)}
              size="sm"
              value={filtro}
              onChange={setFiltro}
              options={FILTROS_DE_CALIDAD.map((f) => ({ value: f, label: t(`${K}.filtro.${f}`) }))}
            />
            {lista.data ? (
              <span className="text-caption tabular-nums text-fg-muted" data-testid="calidad-conteo">
                {total === 1 ? t(`${K}.conteoUno`) : t(`${K}.conteoVarios`, { total })}
              </span>
            ) : null}
          </div>

          <EstadoDeDatos
            cargando={lista.cargando && !lista.data}
            error={lista.error}
            queEs={t(`${K}.queEsLista`)}
            onReintentar={lista.recargar}
            conservarContenido
            vacio={Boolean(lista.data) && total === 0}
            esqueleto={<EsqueletoTabla filas={5} columnas={3} />}
            cuandoVacio={
              filtro !== 'todos' ? (
                <SinDatos queSon={t(`${K}.queSon`)} hayFiltros onLimpiarFiltros={() => setFiltro('todos')} />
              ) : (
                <SinDatos
                  queSon={t(`${K}.queSon`)}
                  icono={Sparkle}
                  titulo={t(`${K}.vacioTitulo`)}
                  descripcion={t(`${K}.vacioDescripcion`)}
                />
              )
            }
          >
            <ul className="divide-y divide-border-faint">
              {(lista.data?.items ?? []).map((i) => (
                <FilaDeInmueble
                  key={i.propertyId}
                  inmueble={i}
                  puedeDecidir={puedeDecidir}
                  decidiendo={decidiendo}
                  onDecidir={(p, d) => void decidir(p, d)}
                />
              ))}
            </ul>
          </EstadoDeDatos>

          {lista.data && total > 0 ? (
            <div className="border-t border-border px-4 py-3">
              <TablePagination
                total={total}
                page={page}
                pageSize={limit}
                pageSizeOptions={TAMANOS_DE_PAGINA}
                onPageChange={(n) => setPagina({ alcance, n })}
                onPageSizeChange={setLimit}
              />
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

// ── El encabezado: cómo va Niti en esta inmobiliaria ────────────────────────

function Cifra({ etiqueta, children, testid }: { etiqueta: string; children: React.ReactNode; testid?: string }) {
  return (
    <div className="space-y-1" data-testid={testid}>
      <dt className="text-label text-fg-muted">{etiqueta}</dt>
      <dd className="text-fg">{children}</dd>
    </div>
  );
}

function Encabezado({ resumen }: { resumen: ResumenDeCalidad }) {
  const { t, locale } = useI18n();
  const loc = locale === 'en' ? 'en' : 'es';
  const usd = (n: number) =>
    new Intl.NumberFormat(loc === 'en' ? 'en-US' : 'es-CO', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);

  return (
    <section className="space-y-4 rounded-lg border border-border bg-surface p-6 shadow-sm" data-testid="calidad-encabezado">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary-soft">
          <Sparkle className="h-5 w-5 text-primary" weight="fill" aria-hidden="true" />
        </div>
        <div className="min-w-0 space-y-0.5">
          <h2 className="text-subtitle text-fg">{t('inmobiliaria.ai.workspace.agente.calidad')}</h2>
          <p className="text-body-sm text-fg-muted">{t(`${K}.descripcion`)}</p>
          <p className="text-caption text-fg-muted" data-testid="calidad-ultima-pasada">
            {resumen.ultimaPasada
              ? t(`${K}.ultimaPasada`, { fecha: formatDateTime(resumen.ultimaPasada, loc) })
              : t(`${K}.sinPasada`)}
          </p>
        </div>
      </div>

      {resumen.errorDeLaUltimaPasada ? (
        <div
          className="flex items-start gap-2 rounded-md border border-border bg-danger-soft p-3"
          role="status"
          data-testid="calidad-error-de-la-pasada"
        >
          <WarningCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-danger">{t(`${K}.errorPasadaTitulo`)}</p>
            <p className="mt-0.5 text-body-sm text-fg-muted">{resumen.errorDeLaUltimaPasada}</p>
          </div>
        </div>
      ) : null}

      {resumen.activo ? (
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Cifra etiqueta={t(`${K}.puntajePromedio`)}>
            {resumen.puntajePromedio === null ? (
              <span className="font-mono text-h2 tabular-nums text-fg-subtle">—</span>
            ) : (
              <>
                <span className="font-mono text-h2 tabular-nums">{resumen.puntajePromedio}</span>
                <span className="text-sm text-fg-muted">/100</span>
              </>
            )}
          </Cifra>
          <Cifra etiqueta={t(`${K}.porArreglar`)}>
            <span className="font-mono text-h2 tabular-nums">{resumen.conProblemas}</span>{' '}
            <span className="text-sm text-fg-muted">
              {t(`${K}.porArreglarDe`, { total: resumen.inmueblesAuditados })}
            </span>
          </Cifra>
          {resumen.fotosIA.activo ? (
            <Cifra etiqueta={t(`${K}.fotosIA`)} testid="calidad-fotos-ia">
              <span className="font-mono text-h2 tabular-nums">{resumen.fotosIA.revisadasEsteMes}</span>{' '}
              <span className="text-sm text-fg-muted">{t(`${K}.fotosIARevisadas`)}</span>
              <span className="block text-caption text-fg-muted">
                {t(`${K}.fotosIAGasto`, {
                  gasto: usd(resumen.fotosIA.gastoEstimadoUsdEsteMes),
                  tope: usd(resumen.fotosIA.topeUsdMes),
                })}
              </span>
            </Cifra>
          ) : null}
        </dl>
      ) : null}
    </section>
  );
}

// ── Un inmueble ─────────────────────────────────────────────────────────────

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-label text-fg-muted">{titulo}</p>
      {children}
    </div>
  );
}

function FilaDeInmueble({
  inmueble: i,
  puedeDecidir,
  decidiendo,
  onDecidir,
}: {
  inmueble: InmuebleAuditado;
  puedeDecidir: boolean;
  decidiendo: string | null;
  onDecidir: (p: PropuestaDeCalidad, d: DecisionDeCalidad) => void;
}) {
  const { t } = useI18n();
  const donde = [i.barrio, i.ciudad].filter(Boolean).join(', ');
  const motivo = t(`${K}.motivo.${i.motivo}`);
  const negocio = t(`${K}.negocio.${i.tipoDeNegocio}`);
  const puntaje = Math.max(0, Math.min(100, i.puntaje));

  return (
    <li className="space-y-4 px-4 py-4" data-testid={`calidad-inmueble-${i.propertyId}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <p className="font-medium text-fg">
            {i.titulo}
            {i.codigo !== null ? <span className="ml-1.5 font-mono text-fg-subtle">#{i.codigo}</span> : null}
          </p>
          <p className="text-caption text-fg-muted">
            {[donde, motivo.startsWith(K) ? '' : motivo, negocio.startsWith(K) ? '' : negocio]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-28 space-y-1" aria-label={t(`${K}.puntajeAria`, { n: puntaje })}>
            <p className="text-right">
              <span className="font-mono tabular-nums text-fg">{puntaje}</span>
              <span className="text-sm text-fg-muted">/100</span>
            </p>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted" aria-hidden="true">
              <div className={cn('h-full rounded-full', tonoDelPuntaje(puntaje))} style={{ width: `${puntaje}%` }} />
            </div>
          </div>
          <Button size="sm" variant="outline" asChild>
            <Link href={i.href}>
              {t(`${K}.abrirFicha`)}
              <ArrowSquareOut className="ml-1.5 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>

      {i.posibleTomado ? (
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="warning">{t(`${K}.posibleTomado`)}</Badge>
          <span className="text-caption text-fg-muted">{t(`${K}.posibleTomadoDetalle`)}</span>
        </div>
      ) : null}

      {i.falta.length > 0 ? (
        <Bloque titulo={t(`${K}.queFalta`)}>
          <ul className="list-disc space-y-0.5 pl-5 text-body-sm text-fg">
            {i.falta.map((f, n) => (
              <li key={`${f.campo}-${n}`}>{f.que}</li>
            ))}
          </ul>
        </Bloque>
      ) : null}

      {i.problemas.length > 0 ? (
        <Bloque titulo={t(`${K}.problemas`)}>
          <ul className="list-disc space-y-0.5 pl-5 text-body-sm text-fg">
            {i.problemas.map((p, n) => (
              <li key={`${p.codigo}-${n}`}>{p.texto}</li>
            ))}
          </ul>
        </Bloque>
      ) : null}

      {i.fotosSenaladas.length > 0 ? (
        <Bloque titulo={t(`${K}.fotos`)}>
          <ul className="flex flex-wrap gap-3">
            {i.fotosSenaladas.map((f) => (
              <li key={f.fotoId} className="w-32 space-y-1">
                {/* eslint-disable-next-line @next/next/no-img-element -- foto del inmueble en el almacenamiento, sin dominio fijo para next/image */}
                <img
                  src={f.url}
                  alt={f.motivo}
                  loading="lazy"
                  className="h-20 w-32 rounded-sm border border-border object-cover"
                />
                <p className="text-caption leading-snug text-fg-muted">{f.motivo}</p>
              </li>
            ))}
          </ul>
        </Bloque>
      ) : null}

      {i.propuestas.length > 0 ? (
        <Bloque titulo={t(`${K}.propuestas`)}>
          <ul className="space-y-2">
            {i.propuestas.map((p) => (
              <Propuesta
                key={p.id}
                propuesta={p}
                puedeDecidir={puedeDecidir}
                ocupado={decidiendo !== null}
                enCurso={decidiendo === p.id}
                onDecidir={onDecidir}
              />
            ))}
          </ul>
        </Bloque>
      ) : null}
    </li>
  );
}

const ETIQUETA_DE_APROBAR: Record<BotonDeAprobar, string> = {
  aplicar: 'aprobarYAplicar',
  despublicar: 'despublicar',
  hecha: 'marcarHecha',
};

function Propuesta({
  propuesta: p,
  puedeDecidir,
  ocupado,
  enCurso,
  onDecidir,
}: {
  propuesta: PropuestaDeCalidad;
  puedeDecidir: boolean;
  ocupado: boolean;
  enCurso: boolean;
  onDecidir: (p: PropuestaDeCalidad, d: DecisionDeCalidad) => void;
}) {
  const { t } = useI18n();
  const aprobar = botonDeAprobar(p);
  return (
    <li
      className="flex flex-col gap-2 rounded-md bg-surface-muted px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
      data-testid={`calidad-propuesta-${p.id}`}
    >
      <p className="text-body-sm text-fg">{p.texto}</p>
      {puedeDecidir ? (
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          {aprobar ? (
            <Button
              size="sm"
              hideArrow
              variant={aprobar === 'despublicar' ? 'destructive' : aprobar === 'hecha' ? 'outline' : 'default'}
              disabled={ocupado}
              isLoading={enCurso}
              onClick={() => onDecidir(p, 'approve')}
            >
              {t(`${K}.${ETIQUETA_DE_APROBAR[aprobar]}`)}
            </Button>
          ) : null}
          <Button size="sm" variant="ghost" disabled={ocupado} onClick={() => onDecidir(p, 'reject')}>
            {t(`${K}.rechazar`)}
          </Button>
        </div>
      ) : null}
    </li>
  );
}
