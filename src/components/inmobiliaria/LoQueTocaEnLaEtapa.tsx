'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { TimePicker } from '@leasefy/cadence';
import { CalendarCheck, CheckCircle, FileText, Handshake, Key } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { SelectorDeFecha as DatePicker } from '@/components/ui/SelectorDeFecha';
import { toast } from '@/components/ui/toast';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { AsegurabilidadManualDeLaPostulacion } from '@/components/inmobiliaria/estudios/AsegurabilidadManualDeLaPostulacion';
import { agendaApi } from '@/lib/api/agenda.service';
import { embudoApi, type LoDeLaEtapa } from '@/lib/api/embudo.service';
import type { MiembroDelEquipo } from '@/lib/api/agenda.types';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { aFechaIso, fechaLocal, hoyLocal } from '@/lib/fechas-locales';
import { columnaDe } from '@/lib/pipeline/etapas-del-tablero';
import type { PipelineItem, PipelineStage } from '@/lib/types/inmobiliaria';
import { useTr } from '@/lib/i18n/use-tr';
import { cn } from '@/lib/utils';

/**
 * «Lo que toca ahora» en el cajón del interesado (reunión con Juan, 31-10-2026, «Pipeline improvement ideas»):
 *   · Visita programada — cuándo, cómo y con quién; pasada la hora, «¿Se hizo?» → «Visita hecha» o reprogramar sin
 *     salir de la etapa.
 *   · Postulación y evaluación — la postulación, sus documentos, la aseguradora elegida a mano y la respuesta:
 *     aprobado (sigue) o rechazado (perdido, o ajustar y reintentar).
 *   · Contrato — el de arrendamiento (inquilino) y el de administración (propietario), con su firma; con los dos
 *     firmados, «listo para la entrega».
 *   · Entrega — el día, la hora y quién la hace; pasada la hora, «¿Se hizo?» → «Cerrado» o reprogramar.
 * Lo demás (el avance de etapa, «Perdido») sigue en el pie del cajón.
 */
export function LoQueTocaEnLaEtapa({
  item,
  puedeEditar,
  equipo,
  onCambio,
  onPedirVisita,
  onMover,
  onMarcarPerdido,
}: {
  item: PipelineItem;
  puedeEditar: boolean;
  equipo: MiembroDelEquipo[];
  onCambio?: () => void;
  onPedirVisita?: (item: PipelineItem) => void;
  onMover?: (etapa: PipelineStage) => Promise<void> | void;
  onMarcarPerdido?: () => void;
}) {
  const tr = useTr();
  const columna = columnaDe(item.stage);
  const conEtapa = ['visit_scheduled', 'application', 'approved', 'contract', 'handover'].includes(columna);
  const [datos, setDatos] = useState<LoDeLaEtapa | null>(null);
  const [fallo, setFallo] = useState<unknown>(null);
  const [cargando, setCargando] = useState(false);

  const leer = useCallback(async () => {
    if (!conEtapa) return;
    setCargando(true);
    setFallo(null);
    try {
      setDatos(await embudoApi.etapa(item.id));
    } catch (e) {
      setFallo(e);
    } finally {
      setCargando(false);
    }
  }, [conEtapa, item.id]);

  useEffect(() => {
    setDatos(null);
    void leer();
  }, [leer, item.stage]);

  if (!conEtapa) return null;

  const nombreDe = (userId: string | null | undefined) => equipo.find((m) => m.userId === userId)?.nombre ?? tr('Sin asignar');
  const despues = () => {
    void leer();
    onCambio?.();
  };

  return (
    <section className="space-y-3" aria-labelledby={`lo-que-toca-${item.id}`} data-testid="lo-que-toca-en-la-etapa">
      <h4 id={`lo-que-toca-${item.id}`} className="font-mono text-[11px] uppercase tracking-[0.08em] text-fg-subtle">
        {tr('Lo que toca ahora')}
      </h4>
      <div className="rounded-lg border border-border bg-card">
        {cargando && !datos ? (
          <div className="space-y-2 p-4" aria-busy="true">
            <div className="h-4 w-2/3 animate-pulse rounded bg-surface-muted" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-surface-muted" />
          </div>
        ) : fallo && !datos ? (
          <div className="flex items-center justify-between gap-3 p-4 text-body-sm">
            <p className="text-fg-muted">{mensajeParaLaPersona(fallo, { accion: tr('leer lo de esta etapa') })}</p>
            <Button size="sm" variant="outline" hideArrow onClick={() => void leer()}>
              {tr('Reintentar')}
            </Button>
          </div>
        ) : datos ? (
          <>
            {columna === 'visit_scheduled' ? (
              <LaVisita item={item} datos={datos} puedeEditar={puedeEditar} nombreDe={nombreDe} onPedirVisita={onPedirVisita} onListo={despues} />
            ) : null}
            {columna === 'application' ? (
              <LaPostulacion item={item} datos={datos} puedeEditar={puedeEditar} onMover={onMover} onMarcarPerdido={onMarcarPerdido} />
            ) : null}
            {columna === 'approved' || columna === 'contract' ? (
              <LosContratos item={item} datos={datos} puedeEditar={puedeEditar} equipo={equipo} onListo={despues} />
            ) : null}
            {columna === 'handover' ? (
              <LaEntrega item={item} datos={datos} puedeEditar={puedeEditar} equipo={equipo} nombreDe={nombreDe} onListo={despues} />
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  );
}

// ── Piezas comunes ────────────────────────────────────────────────────────

/** «viernes 31 de octubre» (con `inicial`, «Viernes 31 de octubre»). */
function diaEnPalabras(dia: string, inicial = false): string {
  const d = new Date(`${dia}T12:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return dia;
  const texto = d.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  return inicial ? texto.charAt(0).toLocaleUpperCase('es-CO') + texto.slice(1) : texto;
}

function Renglon({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-3 text-body-sm">
      <span className="shrink-0 text-fg-muted">{etiqueta}</span>
      <span className="min-w-0 text-right text-fg">{children}</span>
    </div>
  );
}

/** La pregunta cuando ya pasó la hora: arriba, en arena cálida, con las dos salidas. */
function Pregunta({ titulo, texto, children }: { titulo: string; texto: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 border-b border-border bg-warning-soft px-4 py-4" role="status">
      <div className="space-y-1">
        <p className="text-body-sm font-medium text-fg">{titulo}</p>
        <p className="text-body-sm text-fg-muted">{texto}</p>
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

/** Día, hora y (si aplica) quién: lo usan reprogramar la visita y agendar o reprogramar la entrega. */
function CuandoYQuien({
  prefijo,
  dia,
  hora,
  quien,
  equipo,
  onDia,
  onHora,
  onQuien,
}: {
  prefijo: string;
  dia: string;
  hora: string;
  quien?: string;
  equipo?: MiembroDelEquipo[];
  onDia: (v: string) => void;
  onHora: (v: string) => void;
  onQuien?: (v: string) => void;
}) {
  const tr = useTr();
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_9rem]">
        <div>
          <label htmlFor={`${prefijo}-dia`} className="mb-1.5 block text-caption text-fg-muted">
            {tr('Día')}
          </label>
          <DatePicker id={`${prefijo}-dia`} value={fechaLocal(dia)} onChange={(d) => onDia(d ? aFechaIso(d) : '')} minDate={hoyLocal()} placeholder={tr('Elige el día')} />
        </div>
        <div>
          <label htmlFor={`${prefijo}-hora`} className="mb-1.5 block text-caption text-fg-muted">
            {tr('Hora')}
          </label>
          <TimePicker id={`${prefijo}-hora`} value={hora} onChange={(h) => onHora(h ?? '')} step={30} />
        </div>
      </div>
      {equipo && onQuien ? (
        <div>
          <label className="mb-1.5 block text-caption text-fg-muted">{tr('Quién la hace')}</label>
          <Combobox
            data-testid={`${prefijo}-quien`}
            value={quien || undefined}
            onChange={(v) => onQuien(v ?? '')}
            options={equipo.map((m) => ({ value: m.userId, label: m.nombre }))}
            placeholder={tr('Elige quién la hace')}
            contentClassName="z-[400]"
          />
        </div>
      ) : null}
    </div>
  );
}

// ── Visita programada ─────────────────────────────────────────────────────

function LaVisita({
  item,
  datos,
  puedeEditar,
  nombreDe,
  onPedirVisita,
  onListo,
}: {
  item: PipelineItem;
  datos: LoDeLaEtapa;
  puedeEditar: boolean;
  nombreDe: (id: string | null) => string;
  onPedirVisita?: (item: PipelineItem) => void;
  onListo: () => void;
}) {
  const tr = useTr();
  const v = datos.visita;
  const [reprogramando, setReprogramando] = useState(false);
  const [dia, setDia] = useState('');
  const [hora, setHora] = useState('');
  const [enviando, setEnviando] = useState<'hecha' | 'reprogramar' | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!v) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 text-body-sm">
        <p className="text-fg-muted">{tr('Todavía no tiene la visita en la Agenda.')}</p>
        {puedeEditar && onPedirVisita ? (
          <Button size="sm" variant="outline" hideArrow onClick={() => onPedirVisita(item)}>
            <CalendarCheck className="h-4 w-4" aria-hidden />
            {tr('Agendar la visita')}
          </Button>
        ) : null}
      </div>
    );
  }

  const hecha = async () => {
    setEnviando('hecha');
    setError(null);
    try {
      await agendaApi.marcarHecha(v.visitId);
      toast.success(tr('Visita hecha: {nombre}', { nombre: item.candidateName }), { description: tr('Pasó a «Visita hecha». Lo que sigue: que se postule.') });
      onListo();
    } catch (e) {
      setError(mensajeParaLaPersona(e, { accion: tr('marcar la visita como hecha') }));
    } finally {
      setEnviando(null);
    }
  };

  const reprogramar = async () => {
    if (!dia || !hora) return;
    setEnviando('reprogramar');
    setError(null);
    try {
      await agendaApi.reprogramar(v.visitId, { fecha: dia, horaInicio: hora });
      toast.success(tr('Visita reprogramada'), { description: tr('Queda el {dia} a las {hora}, con el mismo asesor.', { dia: diaEnPalabras(dia), hora }) });
      setReprogramando(false);
      onListo();
    } catch (e) {
      setError(mensajeParaLaPersona(e, { accion: tr('reprogramar la visita') }));
    } finally {
      setEnviando(null);
    }
  };

  return (
    <div className="divide-y divide-border" data-testid="etapa-visita">
      {v.yaPaso && puedeEditar && !reprogramando ? (
        <Pregunta
          titulo={tr('¿Se hizo la visita?')}
          texto={tr('Era a las {hora}. Si no se hizo, reprográmala: sigue en «Visita programada».', { hora: v.horaInicio })}
        >
          <Button size="sm" variant="ink" hideArrow isLoading={enviando === 'hecha'} onClick={() => void hecha()} data-testid="visita-se-hizo">
            {tr('Sí, se hizo')}
          </Button>
          <Button size="sm" variant="outline" hideArrow onClick={() => setReprogramando(true)} data-testid="visita-reprogramar">
            {tr('No, reprogramar')}
          </Button>
        </Pregunta>
      ) : null}
      <Renglon etiqueta={tr('Cuándo')}>
        {diaEnPalabras(v.fecha, true)} · <span className="font-mono tabular-nums">{v.horaInicio}</span>
      </Renglon>
      <Renglon etiqueta={tr('Cómo')}>{v.modalidad === 'VIRTUAL' ? tr('Virtual') : tr('Presencial')}</Renglon>
      <Renglon etiqueta={tr('Con')}>{nombreDe(v.asesorUserId ?? item.agenteId ?? null)}</Renglon>
      {reprogramando ? (
        <div className="space-y-3 p-4">
          <CuandoYQuien prefijo={`reprogramar-${item.id}`} dia={dia} hora={hora} onDia={setDia} onHora={setHora} />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" hideArrow onClick={() => setReprogramando(false)} disabled={enviando !== null}>
              {tr('Cancelar')}
            </Button>
            <Button size="sm" variant="ink" hideArrow disabled={!dia || !hora} isLoading={enviando === 'reprogramar'} onClick={() => void reprogramar()} data-testid="visita-guardar-hora">
              {tr('Guardar la nueva hora')}
            </Button>
          </div>
        </div>
      ) : !v.yaPaso && puedeEditar ? (
        <div className="flex justify-end px-4 py-3">
          <Button size="sm" variant="ghost" hideArrow onClick={() => setReprogramando(true)}>
            {tr('Reprogramar')}
          </Button>
        </div>
      ) : null}
      {error ? (
        <div className="px-4 py-3">
          <ErrorDelCampo id={`visita-error-${item.id}`} mensaje={error} />
        </div>
      ) : null}
    </div>
  );
}

// ── Postulación y evaluación ──────────────────────────────────────────────

function LaPostulacion({
  item,
  datos,
  puedeEditar,
  onMover,
  onMarcarPerdido,
}: {
  item: PipelineItem;
  datos: LoDeLaEtapa;
  puedeEditar: boolean;
  onMover?: (etapa: PipelineStage) => Promise<void> | void;
  onMarcarPerdido?: () => void;
}) {
  const tr = useTr();
  const p = datos.postulacion;
  const [rechazada, setRechazada] = useState(false);
  const [moviendo, setMoviendo] = useState(false);

  if (!p) {
    return (
      <p className="p-4 text-body-sm text-fg-muted" data-testid="etapa-sin-postulacion">
        {tr('Todavía no se postula. Copia el enlace de arriba y mándaselo: la postulación llega a esta tarjeta.')}
      </p>
    );
  }

  const mover = async (etapa: PipelineStage, aviso: string) => {
    if (!onMover) return;
    setMoviendo(true);
    try {
      await onMover(etapa);
      toast.success(aviso);
    } catch {
      // Ya lo dijo quien guarda.
    } finally {
      setMoviendo(false);
    }
  };

  return (
    <div className="divide-y divide-border" data-testid="etapa-postulacion">
      <Renglon etiqueta={tr('Postulación')}>
        {p.enviadaEl ? tr('Enviada el {dia}', { dia: diaEnPalabras(p.enviadaEl.slice(0, 10)) }) : tr('Sin enviar todavía')}
      </Renglon>
      <Renglon etiqueta={tr('Documentos')}>
        {p.documentos > 0 ? (
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle className="h-4 w-4 text-success" weight="fill" aria-hidden />
            {tr(p.documentos === 1 ? '1 cargado' : '{n} cargados', { n: p.documentos })}
          </span>
        ) : (
          <span className="text-fg-muted">{tr('Todavía no carga documentos')}</span>
        )}
      </Renglon>
      {item.consignacionId ? (
        <div className="flex justify-end px-4 py-3">
          <Link
            href={`/panel/inmobiliaria/inmuebles/${item.consignacionId}/candidatos?candidato=${encodeURIComponent(p.applicationId)}`}
            className="inline-flex items-center gap-1.5 text-body-sm font-medium text-primary hover:underline hover:underline-offset-4"
          >
            <FileText className="h-4 w-4" aria-hidden />
            {tr('Revisar la postulación y sus documentos')}
          </Link>
        </div>
      ) : null}
      <div className="p-4">
        <p className="mb-2 text-caption text-fg-muted">{tr('La aseguradora, elegida a mano')}</p>
        <AsegurabilidadManualDeLaPostulacion applicationId={p.applicationId} />
      </div>
      {puedeEditar && onMover ? (
        <div className="space-y-3 p-4">
          <p className="text-body-sm text-fg">{tr('¿Qué respondió la aseguradora?')}</p>
          {rechazada ? (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" hideArrow onClick={() => onMarcarPerdido?.()} data-testid="postulacion-perdido">
                {tr('Marcar como perdido')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                hideArrow
                isLoading={moviendo}
                onClick={() => {
                  setRechazada(false);
                  toast.info(tr('Ajusta la postulación y vuelve a enviarla'), {
                    description: tr('Sigue en «Postulación y evaluación»: cambia el codeudor, el canon o la aseguradora y reintenta.'),
                  });
                }}
                data-testid="postulacion-reintentar"
              >
                {tr('Ajustar y reintentar')}
              </Button>
              <Button size="sm" variant="ghost" hideArrow onClick={() => setRechazada(false)}>
                {tr('Volver')}
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="ink"
                hideArrow
                isLoading={moviendo}
                onClick={() => void mover('approved', tr('Aprobado: sigue el contrato'))}
                data-testid="postulacion-aprobada"
              >
                {tr('Aprobado')}
              </Button>
              <Button size="sm" variant="outline" hideArrow onClick={() => setRechazada(true)} data-testid="postulacion-rechazada">
                {tr('Rechazado')}
              </Button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

// ── Contrato ──────────────────────────────────────────────────────────────

const ESTADO_DEL_ARRENDAMIENTO: Record<string, string> = {
  DRAFT: 'En borrador',
  PENDING_LANDLORD_SIGNATURE: 'Esperando la firma del propietario',
  PENDING_TENANT_SIGNATURE: 'Esperando la firma del inquilino',
  REJECTED_PENDING_MODIFICATIONS: 'Con cambios pedidos',
  SIGNED: 'Firmado',
  ACTIVE: 'Firmado y vigente',
};

function EstadoDeFirma({ firmado, texto }: { firmado: boolean; texto: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('h-1.5 w-1.5 rounded-full', firmado ? 'bg-success' : 'bg-warning')} aria-hidden />
      <span className="font-mono text-caption uppercase tracking-[0.06em]">{texto}</span>
    </span>
  );
}

function LosContratos({
  item,
  datos,
  puedeEditar,
  equipo,
  onListo,
}: {
  item: PipelineItem;
  datos: LoDeLaEtapa;
  puedeEditar: boolean;
  equipo: MiembroDelEquipo[];
  onListo: () => void;
}) {
  const tr = useTr();
  const { arrendamiento, administracion, ambosFirmados } = datos.contratos;
  const [agendando, setAgendando] = useState(false);
  const enlaceDelContrato = arrendamiento
    ? `/panel/inmobiliaria/contratos/${arrendamiento.contractId}`
    : datos.postulacion
      ? `/panel/inmobiliaria/contratos/nuevo?applicationId=${encodeURIComponent(datos.postulacion.applicationId)}`
      : `/panel/inmobiliaria/contratos/nuevo?modo=manual${item.propertyId ? `&inmueble=${encodeURIComponent(item.propertyId)}` : ''}`;

  return (
    <div className="divide-y divide-border" data-testid="etapa-contratos">
      {ambosFirmados ? (
        <div className="flex items-start gap-3 bg-success-soft px-4 py-4" role="status">
          <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-success" weight="fill" aria-hidden />
          <div className="space-y-2">
            <p className="text-body-sm text-fg">{tr('Los dos contratos están firmados: listo para la entrega.')}</p>
            {puedeEditar && !agendando ? (
              <Button size="sm" variant="ink" hideArrow onClick={() => setAgendando(true)} data-testid="contratos-agendar-entrega">
                <Key className="h-4 w-4" aria-hidden />
                {tr('Agendar la entrega')}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3" data-testid="contrato-arrendamiento">
        <div className="min-w-0 space-y-1">
          <p className="text-body-sm text-fg">{tr('Contrato de arrendamiento')}</p>
          <p className="text-caption text-fg-muted">{tr('Con el inquilino')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <EstadoDeFirma
            firmado={Boolean(arrendamiento?.firmado)}
            texto={tr(arrendamiento ? (ESTADO_DEL_ARRENDAMIENTO[arrendamiento.estado] ?? 'En firma') : 'Sin generar')}
          />
          <Button asChild size="sm" variant="outline" hideArrow>
            <Link href={enlaceDelContrato}>{tr(arrendamiento ? 'Ver el contrato' : 'Generarlo con la plantilla')}</Link>
          </Button>
        </div>
      </div>
      {administracion ? (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3" data-testid="contrato-administracion">
          <div className="min-w-0 space-y-1">
            <p className="text-body-sm text-fg">{tr('Contrato de administración')}</p>
            <p className="text-caption text-fg-muted">{tr('Con el propietario')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <EstadoDeFirma
              firmado={administracion.estado === 'FIRMADA'}
              texto={tr(administracion.estado === 'FIRMADA' ? 'Firmado' : administracion.estado === 'PENDIENTE' ? 'En firma' : 'Sin firmar')}
            />
            <Button asChild size="sm" variant="outline" hideArrow>
              <Link href={`/panel/inmobiliaria/inmuebles/${administracion.consignacionId}?pestana=mandato`}>
                {tr(administracion.estado === 'SIN_FIRMA' ? 'Generarlo y mandarlo a firmar' : 'Ver el mandato')}
              </Link>
            </Button>
          </div>
        </div>
      ) : null}
      {agendando ? <AgendarEntrega item={item} equipo={equipo} onCancelar={() => setAgendando(false)} onListo={onListo} /> : null}
    </div>
  );
}

// ── Entrega ───────────────────────────────────────────────────────────────

function AgendarEntrega({
  item,
  equipo,
  inicial,
  onCancelar,
  onListo,
}: {
  item: PipelineItem;
  equipo: MiembroDelEquipo[];
  inicial?: { fecha: string; hora: string | null; responsableUserId: string | null };
  onCancelar?: () => void;
  onListo: () => void;
}) {
  const tr = useTr();
  const [dia, setDia] = useState(inicial?.fecha ?? '');
  const [hora, setHora] = useState(inicial?.hora ?? '');
  const [quien, setQuien] = useState(inicial?.responsableUserId ?? item.agenteId ?? '');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const guardar = async () => {
    if (!dia) return;
    setEnviando(true);
    setError(null);
    try {
      await embudoApi.agendarEntrega(item.id, { fecha: dia, ...(hora ? { hora } : {}), ...(quien ? { responsableUserId: quien } : {}) });
      toast.success(tr(inicial ? 'Entrega reprogramada' : 'Entrega agendada'), {
        description: tr('Queda en la Agenda de quien la hace. Pasada la hora, te preguntamos si se hizo.'),
      });
      onListo();
      onCancelar?.();
    } catch (e) {
      setError(mensajeParaLaPersona(e, { accion: tr('agendar la entrega') }));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="space-y-3 p-4" data-testid="agendar-entrega">
      <CuandoYQuien prefijo={`entrega-${item.id}`} dia={dia} hora={hora} quien={quien} equipo={equipo} onDia={setDia} onHora={setHora} onQuien={setQuien} />
      <ErrorDelCampo id={`entrega-error-${item.id}`} mensaje={error} />
      <div className="flex justify-end gap-2">
        {onCancelar ? (
          <Button size="sm" variant="ghost" hideArrow onClick={onCancelar} disabled={enviando}>
            {tr('Cancelar')}
          </Button>
        ) : null}
        <Button size="sm" variant="ink" hideArrow disabled={!dia} isLoading={enviando} onClick={() => void guardar()} data-testid="entrega-guardar">
          {tr(inicial ? 'Guardar la nueva fecha' : 'Agendar la entrega')}
        </Button>
      </div>
    </div>
  );
}

function LaEntrega({
  item,
  datos,
  puedeEditar,
  equipo,
  nombreDe,
  onListo,
}: {
  item: PipelineItem;
  datos: LoDeLaEtapa;
  puedeEditar: boolean;
  equipo: MiembroDelEquipo[];
  nombreDe: (id: string | null) => string;
  onListo: () => void;
}) {
  const tr = useTr();
  const e = datos.entrega;
  const [reprogramando, setReprogramando] = useState(false);
  const [cerrando, setCerrando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!e) {
    return puedeEditar ? (
      <div>
        <p className="px-4 pt-4 text-body-sm text-fg-muted">{tr('Agenda la entrega del inmueble: el día, la hora y quién la hace.')}</p>
        <AgendarEntrega item={item} equipo={equipo} onListo={onListo} />
      </div>
    ) : (
      <p className="p-4 text-body-sm text-fg-muted">{tr('Todavía no hay entrega agendada.')}</p>
    );
  }

  const hecha = async () => {
    setCerrando(true);
    setError(null);
    try {
      await embudoApi.entregaHecha(item.id);
      toast.success(tr('Cerrado: {nombre} ya tiene su inmueble', { nombre: item.candidateName }), { description: tr('Pasó a «Cerrado - Arrendado».') });
      onListo();
    } catch (err) {
      setError(mensajeParaLaPersona(err, { accion: tr('cerrar la entrega') }));
    } finally {
      setCerrando(false);
    }
  };

  return (
    <div className="divide-y divide-border" data-testid="etapa-entrega">
      {e.yaPaso && puedeEditar && !reprogramando ? (
        <Pregunta titulo={tr('¿Se hizo la entrega?')} texto={tr('Si salió bien, ciérralo como arrendado. Si no, reprográmala.')}>
          <Button size="sm" variant="ink" hideArrow isLoading={cerrando} onClick={() => void hecha()} data-testid="entrega-se-hizo">
            <Handshake className="h-4 w-4" aria-hidden />
            {tr('Sí, cerrar como arrendado')}
          </Button>
          <Button size="sm" variant="outline" hideArrow onClick={() => setReprogramando(true)} data-testid="entrega-reprogramar">
            {tr('No, reprogramar')}
          </Button>
        </Pregunta>
      ) : null}
      <Renglon etiqueta={tr('Cuándo')}>
        {diaEnPalabras(e.fecha, true)}
        {e.hora ? (
          <>
            {' · '}
            <span className="font-mono tabular-nums">{e.hora}</span>
          </>
        ) : null}
      </Renglon>
      <Renglon etiqueta={tr('Quién la hace')}>{nombreDe(e.responsableUserId)}</Renglon>
      {reprogramando ? (
        <AgendarEntrega item={item} equipo={equipo} inicial={e} onCancelar={() => setReprogramando(false)} onListo={onListo} />
      ) : !e.yaPaso && puedeEditar ? (
        <div className="flex justify-end gap-2 px-4 py-3">
          <Button size="sm" variant="ghost" hideArrow onClick={() => setReprogramando(true)}>
            {tr('Reprogramar')}
          </Button>
          <Button size="sm" variant="outline" hideArrow isLoading={cerrando} onClick={() => void hecha()}>
            {tr('Ya se hizo')}
          </Button>
        </div>
      ) : null}
      {error ? (
        <div className="px-4 py-3">
          <ErrorDelCampo id={`entrega-cierre-error-${item.id}`} mensaje={error} />
        </div>
      ) : null}
    </div>
  );
}
