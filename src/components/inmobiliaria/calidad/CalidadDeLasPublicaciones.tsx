'use client';

/**
 * Niti · calidad (26-09-2026). Vive en DOS lugares con el mismo cuerpo:
 *   · `variante="pagina"` — su fila en «Agentes IA»
 *     (`/inmuebles/calidad-de-publicaciones`): el margen del panel, el
 *     encabezado común (`EncabezadoDePantalla`, desde el 22-10) con la píldora
 *     de estado junto al título, como «Agente de pagos».
 *   · `variante="pestana"` (por defecto) — la pestaña «Calidad» de Inmuebles ›
 *     Portales, que ya pone su propio `h1` y su margen.
 *
 * Glow up (Nico, 29-09-2026: «mira eso como se ve de horrible»): la tarjeta
 * pegada a los bordes y el «apagado» suelto en el medio de la nada pasan a ser
 * un encabezado de panel + un estado por caso, cada uno en su tarjeta:
 *   consultando · sin verificar (no se pudo preguntar) · apagado (quién lo
 *   prende) · prendido sin primera pasada (la lista vacía lo dice; sin cifras
 *   en cero que parezcan datos) · prendido con datos (franja de cifras + lista)
 *   · la última pasada falló (alerta arriba de las cifras).
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

import { useTr } from '@/lib/i18n/use-tr';
import { CifraHeroe } from '@/components/pantalla/CifraHeroe';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowSquareOut, Power, Sparkle } from '@phosphor-icons/react';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { PestanasDeEstado } from '@/components/pantalla/PestanasDeEstado';
import { ParaEntenderMas } from '@/components/ui/para-entender-mas';

import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { EsqueletoTabla } from '@/components/estado/EsqueletoTabla';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { SinDatos } from '@/components/estado/SinDatos';
import { PildoraDelAgente, estadoDeLaLectura } from '@/components/inmobiliaria/agentes/EstadoDelAgente';
import { Badge, Button } from '@/components/ui';
import { AlertaAccionable } from '@/components/ui/alerta-accionable';
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

export type VarianteDeCalidad = 'pagina' | 'pestana';

export interface CalidadDeLasPublicacionesProps {
  /** `pagina`: su fila en «Agentes IA». `pestana` (por defecto): dentro de Portales. */
  variante?: VarianteDeCalidad;
}

export function CalidadDeLasPublicaciones({ variante = 'pestana' }: CalidadDeLasPublicacionesProps = {}) {
  const { t } = useI18n();
  const { agency } = useAuth();
  const agencyId = agency?.id ?? null;
  const { canAccess } = usePermissions();
  const puedeDecidir = canAccess('portafolio', 'edit');

  const resumen = useResumenDeNiti(agencyId);
  const activo = resumen.data?.activo === true;
  const estado = estadoDeLaLectura({ activo: resumen.data?.activo, error: resumen.error });

  const [filtro, setFiltro] = useState<FiltroDeCalidad>('todos');
  const [limit, setLimit] = useState(TAMANO_POR_DEFECTO);
  // La página vale sólo para el filtro con que se eligió (como en Payu).
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
  const esPagina = variante === 'pagina';
  const r = resumen.data;
  /*
   * Prendido pero sin primera pasada: «0 de 0» y «—» se leen como datos. La
   * lista vacía de abajo ya lo dice con palabras («todavía no ha auditado
   * ningún inmueble»), así que la franja no se pinta.
   */
  const hayCifras = Boolean(r && r.activo && (r.ultimaPasada !== null || r.inmueblesAuditados > 0));

  return (
    <div className={cn('space-y-6', esPagina && 'p-6 lg:p-8')} data-testid="calidad-de-las-publicaciones">
      <Cabecera variante={variante} estado={estado} resumen={r ?? null} />

      {!r ? (
        resumen.error ? (
          // Es lo único que hay en la pantalla: el cartel lleva su marco.
          <FalloDeCarga error={resumen.error} queEs={t(`${K}.queEsResumen`)} onReintentar={resumen.recargar} />
        ) : (
          <div className="space-y-6" aria-hidden="true" data-testid="calidad-cargando">
            <div className="h-[5.5rem] animate-pulse rounded-lg bg-surface-muted motion-reduce:animate-none" />
            <div className="h-64 animate-pulse rounded-lg bg-surface-muted motion-reduce:animate-none" />
          </div>
        )
      ) : null}

      {r && !activo ? <Apagado variante={variante} /> : null}

      {r && activo && r.errorDeLaUltimaPasada ? (
        <AlertaAccionable
          severidad="danger"
          titulo={t(`${K}.errorPasadaTitulo`)}
          data-testid="calidad-error-de-la-pasada"
        >
          {r.errorDeLaUltimaPasada}
        </AlertaAccionable>
      ) : null}

      {r && hayCifras ? <Cifras resumen={r} /> : null}

      {activo ? (
        <section
          className="overflow-hidden rounded-lg border border-border bg-card"
          aria-label={t(`${K}.listaAria`)}
          data-testid="calidad-lista"
        >
          <div className="border-b border-border px-4 py-3">
            <FiltroDeLaLista
              filtro={filtro}
              onCambiar={setFiltro}
              resumen={r ?? null}
              totalDeLaLista={lista.data ? total : null}
            />
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

// ── El encabezado: el mismo de las demás pantallas del panel ────────────────

function Cabecera({
  variante,
  estado,
  resumen,
}: {
  variante: VarianteDeCalidad;
  estado: ReturnType<typeof estadoDeLaLectura>;
  resumen: ResumenDeCalidad | null;
}) {
  const { t, locale } = useI18n();
  const tr = useTr();
  const loc = locale === 'en' ? 'en' : 'es';
  // Revisora r24 (Calidad #3): sin el estado leído no hay píldora —el cartel del fallo ya lo dice—;
  // mientras pregunta, «Consultando…»; leído, prendido o apagado.
  const pildora = estado === 'sin-verificar' ? null : <PildoraDelAgente estado={estado} data-testid="estado-de-niti" />;
  // Sólo cuando hubo pasada: «todavía no pasó» lo dice la lista vacía.
  const ultima = resumen?.ultimaPasada ? (
    <p className="text-caption text-fg-muted" data-testid="calidad-ultima-pasada">
      {t(`${K}.ultimaPasada`, { fecha: formatDateTime(resumen.ultimaPasada, loc) })}
    </p>
  ) : null;

  if (variante === 'pagina') {
    // GLOW UP 22-10 (revisora r24, Calidad #1–#2): el encabezado común; el agente en el sobretítulo y el
    // h1 = el riel; una línea de para qué sirve y la regla de los modos en «¿Cómo funciona?».
    return (
      <div className="space-y-2" data-testid="calidad-encabezado">
        <EncabezadoDePantalla
          seccion={t(`${K}.seccion`)}
          titulo={t(`${K}.titulo`)}
          descripcion={tr('Lo que le falta a cada publicación para salir bien en los portales.')}
          junto={pildora}
          ayuda={
            <ParaEntenderMas etiqueta={tr('¿Cómo funciona?')} titulo={t(`${K}.titulo`)}>
              <p className="text-sm leading-relaxed text-fg-muted">{t(`${K}.descripcion`)}</p>
            </ParaEntenderMas>
          }
        />
        {ultima}
      </div>
    );
  }
  return (
    <header className="space-y-1" data-testid="calidad-encabezado">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 className="text-subtitle text-fg">{t('inmobiliaria.ai.workspace.agente.calidad')}</h2>
        {pildora}
      </div>
      <p className="max-w-2xl text-sm text-fg-muted">{t(`${K}.descripcion`)}</p>
      {ultima}
    </header>
  );
}

// ── Apagado: cómo está hoy y quién lo prende, sin cara de error ─────────────

function Apagado({ variante }: { variante: VarianteDeCalidad }) {
  const { t } = useI18n();
  const Titulo = variante === 'pagina' ? 'h2' : 'h3';
  return (
    <section className="rounded-lg border border-border bg-surface p-6" data-testid="calidad-apagado">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <Power className="mt-0.5 h-5 w-5 shrink-0 text-fg-subtle" aria-hidden="true" />
        <div className="min-w-0 space-y-1">
          <Titulo className="text-subtitle text-fg">{t(`${K}.apagadoTitulo`)}</Titulo>
          <p className="max-w-2xl text-body-sm text-fg-muted">{t(`${K}.apagadoDescripcion`)}</p>
        </div>
      </div>
    </section>
  );
}

// ── La cifra: cuántas publicaciones hay que arreglar ───────────────────────

function Cifras({ resumen }: { resumen: ResumenDeCalidad }) {
  const { t } = useI18n();
  const tr = useTr();
  const conFotos = resumen.fotosIA.activo;
  const promedio = resumen.puntajePromedio === null ? null : Math.max(0, Math.min(100, resumen.puntajePromedio));

  const sinProblemas = Math.max(0, resumen.inmueblesAuditados - resumen.conProblemas);
  /*
   * GLOW UP 22-10 (UX, al nivel de Deuda del mes): LA RESPUESTA en una cifra —cuántos inmuebles tienen
   * algo por arreglar, de los auditados—, con su barra (por arreglar · bien). Revisora r24 (Calidad #4 y
   * #6): el pie en UNA línea —puntaje promedio · fotos revisadas— y sin el gasto en dólares (es el costo de
   * Leasefy; no cambia ninguna decisión de la inmobiliaria, y Nico: ninguna pantalla con dólares).
   */
  return (
    <section className="rounded-lg border border-border bg-card px-5 py-5" data-testid="calidad-cifras">
      <CifraHeroe
        rotulo={t(`${K}.porArreglar`)}
        cifra={resumen.conProblemas}
        contexto={t(`${K}.porArreglarDe`, { total: resumen.inmueblesAuditados })}
        total={resumen.inmueblesAuditados}
        tramos={[
          { clave: 'por-arreglar', etiqueta: t(`${K}.porArreglar`), monto: resumen.conProblemas, tono: 'aviso' },
          { clave: 'bien', etiqueta: tr('Sin nada por arreglar'), monto: sinProblemas, tono: 'exito' },
        ]}
        pie={
          <span className="flex flex-wrap gap-x-1.5">
            <span>
              {t(`${K}.puntajePromedio`)}{' '}
              <span className="font-mono tabular-nums text-fg">{promedio === null ? '—' : `${promedio}/100`}</span>
            </span>
            {conFotos ? (
              <span data-testid="calidad-fotos-ia">
                · <span className="font-mono tabular-nums text-fg">{resumen.fotosIA.revisadasEsteMes}</span>{' '}
                {tr('fotos revisadas este mes')}
              </span>
            ) : null}
          </span>
        }
      />
    </section>
  );
}

// ── El filtro: las pestañas de estado de la casa, dentro de la tarjeta ────────

/**
 * Revisora r24 (Calidad #5): `PestanasDeEstado` con su conteo donde el resumen lo sabe (todos y con algo
 * por arreglar); las otras dos sin número (el back no las cuenta) salvo la activa, que lleva el total de
 * la lista. A 390 se deslizan en su riel: ya no hace falta el `Select` del celular.
 */
function FiltroDeLaLista({
  filtro,
  onCambiar,
  resumen,
  totalDeLaLista,
}: {
  filtro: FiltroDeCalidad;
  onCambiar: (f: FiltroDeCalidad) => void;
  resumen: ResumenDeCalidad | null;
  totalDeLaLista: number | null;
}) {
  const { t } = useI18n();
  const conocido: Partial<Record<FiltroDeCalidad, number>> = resumen
    ? { todos: resumen.inmueblesAuditados, con_problemas: resumen.conProblemas }
    : {};
  return (
    <PestanasDeEstado<FiltroDeCalidad>
      etiqueta={t(`${K}.filtroAria`)}
      valor={filtro}
      onCambio={onCambiar}
      data-testid="calidad-filtro"
      pestanas={FILTROS_DE_CALIDAD.map((f) => ({
        valor: f,
        etiqueta: t(`${K}.filtro.${f}`),
        cuantos: conocido[f] ?? (f === filtro ? totalDeLaLista : null),
        fija: true,
        tono: f === 'con_problemas' ? ('aviso' as const) : undefined,
      }))}
    />
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
        {/* En el teléfono baja a su propia línea: puntaje a la izquierda, ficha a la derecha. */}
        <div className="flex w-full items-center justify-between gap-4 sm:w-auto sm:justify-end">
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
