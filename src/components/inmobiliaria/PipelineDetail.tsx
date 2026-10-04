'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { toast } from '@/components/ui/toast';
import {
  X,
  MapPin,
  Phone,
  Envelope,
  Copy,
  WhatsappLogo,
  Clock,
  Warning,
  CheckCircle,
  ArrowRight,
  User,
  Buildings,
  CalendarBlank,
  CaretRight,
  Note,
  XCircle,
  Timer,
  Target,
  TrendUp,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { CrossFade, Stagger, StaggerItem } from '@leasefy/cadence';
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import {
  type PipelineItem,
  type PipelineStage,
  PIPELINE_STAGES,
  formatCurrency,
  getPipelineStageInfo,
} from '@/lib/types/inmobiliaria';
import Link from 'next/link';
import { useLenis } from '@/components/providers/SmoothScroll';
import { mensajeDelRechazoDelMotivo } from '@/components/inmobiliaria/agenda/MotivoDialog';
import { MotivoDePerdidaDialog } from '@/components/inmobiliaria/MotivoDePerdidaDialog';
import { NotasDelLead } from '@/components/inmobiliaria/NotasDelLead';
import { Combobox } from '@/components/ui/combobox';
import { embudoApi } from '@/lib/api/embudo.service';
import type { MiembroDelEquipo } from '@/lib/api/agenda.types';
import { useMiUserId } from '@/lib/agenda/use-equipo';
import { ApiError } from '@/lib/api/client';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { revisarMotivoDePerdida } from '@/lib/pipeline/limites-del-pipeline';

interface PipelineDetailProps {
  isOpen: boolean;
  onClose: () => void;
  item: PipelineItem | null;
  /**
   * Se ESPERA: resuelve cuando el back confirmó, rechaza cuando no. El cajón
   * no dice «movido» ni se cierra hasta que resuelva.
   */
  onStageChange?: (
    itemId: string,
    newStage: PipelineStage,
    lostReason?: string,
  ) => void | Promise<void>;
  /**
   * ¿Puede mover o marcar perdido? Mover es `pipeline:edit` en el back: a un
   * CONTADOR o VIEWER los botones le respondían 403. Por defecto `true` para
   * no cambiar a quien ya lo usa; la página pasa el permiso real.
   */
  puedeEditar?: boolean;
  /** PL-16: pasar a «Visita programada» agenda la visita (día, hora, asesor). */
  onPedirVisita?: (item: PipelineItem) => void;
  /** PL-12: el equipo, para ver y cambiar el asesor del interesado. */
  equipo?: MiembroDelEquipo[];
  /** Después de reasignar: la página relee el tablero. */
  onCambio?: () => void;
}

/**
 * Los hitos de la etapa que EXISTEN de verdad.
 *
 * ── Lo que había acá antes ───────────────────────────────────────────────
 * `generateMockTimeline()` pintaba la línea de tiempo completa —las diez
 * etapas hasta la actual— y para cada una calculaba
 * `Math.floor(Math.random() * 5) + 1` días. Sólo el último tramo salía del
 * dato real (`item.daysInStage`). Todo lo anterior era un número al azar,
 * dibujado con la misma tipografía, el mismo punto y la misma fecha que el
 * único tramo verdadero: nadie mirando la pantalla podía distinguirlos, y
 * sobre esos días se decide a quién apurar y a quién soltar.
 *
 * ── Por qué no se puede arreglar cableando ───────────────────────────────
 * El historial no está escrito en ninguna parte. `PipelineItem` guarda dos
 * escalares —`enteredStageAt` y `daysInStage`— que `PUT /pipeline/:id/stage`
 * PISA en cada movimiento (`pipeline.service.ts`), y no hay tabla de eventos
 * del pipeline ni endpoint de historial. Lo que ya pasó no se perdió al
 * mostrarlo: se perdió al guardarlo.
 *
 * Así que la línea de tiempo muestra los dos momentos que sí están
 * registrados —cuándo entró al pipeline y cuándo entró a la etapa de hoy— y
 * dice de frente que del medio no hay registro.
 */
function hitosReales(item: PipelineItem) {
  const hitos: {
    clave: string;
    /** La etapa, cuando el hito ES una etapa. */
    stage?: PipelineStage;
    fecha: string;
    /** Días en la etapa. Sólo la actual los tiene medidos. */
    dias?: number;
    esActual: boolean;
  }[] = [];

  // Entró a la etapa de hoy. `enteredStageAt` es el campo del back; si por
  // alguna razón no viene, no lo inventamos con `createdAt` —serían dos
  // fechas distintas contadas como la misma.
  if (item.enteredStageAt) {
    hitos.push({
      clave: 'etapa-actual',
      stage: item.stage,
      fecha: item.enteredStageAt,
      dias: item.daysInStage,
      esActual: true,
    });
  }

  // Entró al pipeline. Se omite si cae el mismo día que la etapa actual:
  // repetir la fecha sugiere dos eventos donde hay uno.
  const mismoDia =
    item.enteredStageAt &&
    new Date(item.createdAt).toDateString() === new Date(item.enteredStageAt).toDateString();

  if (item.createdAt && !mismoDia) {
    hitos.push({ clave: 'ingreso', fecha: item.createdAt, esActual: false });
  }

  return hitos;
}

// Get next stage in the pipeline
function getNextStage(currentStage: PipelineStage): PipelineStage | null {
  const stages: PipelineStage[] = [
    'lead',
    'visit_scheduled',
    'visit_done',
    'application',
    'evaluation',
    'approved',
    'contract',
    'handover',
    'completed',
  ];

  const currentIndex = stages.indexOf(currentStage);
  if (currentIndex === -1 || currentIndex === stages.length - 1) return null;
  return stages[currentIndex + 1];
}

// Risk level badge component
function RiskBadge({ score, level }: { score?: number; level?: string }) {
  if (!score && !level) return null;

  const colors: Record<string, string> = {
    A: 'bg-primary-soft text-primary',
    B: 'bg-primary-soft text-primary',
    C: 'bg-warning-soft text-warning',
    D: 'bg-danger-soft text-danger',
    E: 'bg-muted text-muted-foreground',
  };

  return (
    <div className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium', colors[level || 'E'])}>
      {level && <span className="font-bold">{level}</span>}
      {score && <span className="opacity-75">({score} pts)</span>}
    </div>
  );
}

/**
 * PipelineDetail - Sheet drawer showing full pipeline item details
 * Clean, minimal design following project conventions
 */
export function PipelineDetail({
  isOpen,
  onClose,
  item,
  onStageChange,
  puedeEditar = true,
  onPedirVisita,
  equipo = [],
  onCambio,
}: PipelineDetailProps) {
  const { t, formatDate: formatDateI18n } = useI18n();
  const [reasignando, setReasignando] = useState(false);
  const miUserId = useMiUserId();
  const [errorDelAsesor, setErrorDelAsesor] = useState<string | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const [isMarking, setIsMarking] = useState(false);
  const [pidiendoMotivo, setPidiendoMotivo] = useState(false);
  /** Lo que el back dijo del motivo (o del movimiento): va bajo el campo del diálogo. */
  const [errorDelMotivo, setErrorDelMotivo] = useState<string | null>(null);
  const { stop: stopLenis, start: startLenis } = useLenis();

  useEffect(() => {
    if (isOpen) {
      stopLenis();
      return () => {
        startLenis();
      };
    }
  }, [isOpen, stopLenis, startLenis]);

  const timeline = useMemo(() => {
    if (!item) return [];
    return hitosReales(item);
  }, [item]);

  const stageInfo = useMemo(() => {
    if (!item) return null;
    return getPipelineStageInfo(item.stage);
  }, [item]);

  const nextStage = useMemo(() => {
    if (!item) return null;
    return getNextStage(item.stage);
  }, [item]);

  const nextStageInfo = useMemo(() => {
    if (!nextStage) return null;
    return getPipelineStageInfo(nextStage);
  }, [nextStage]);

  const copyToClipboard = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t('inmobiliaria.pipeline.copied'), { description: t('inmobiliaria.pipeline.copiedToClipboard', { label }) });
  }, [t]);

  const openWhatsApp = useCallback((phone: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  }, []);

  /**
   * Avanzar de etapa.
   *
   * 🔴 Acá había `await new Promise(r => setTimeout(r, 800))`: 800 ms de
   * espera FINGIDA —un spinner que no esperaba a nada— y después el cartel de
   * éxito, pasara lo que pasara con el back. El botón se veía «trabajando» y
   * terminaba en verde incluso con la red caída.
   *
   * La espera ahora es la de verdad: la promesa de `onStageChange`.
   */
  const handleMoveToNext = useCallback(async () => {
    if (!item || !nextStage) return;
    // PL-16: «Visita programada» se agenda, no se marca.
    if (nextStage === 'visit_scheduled' && onPedirVisita) {
      onPedirVisita(item);
      return;
    }

    setIsMoving(true);
    try {
      await onStageChange?.(item.id, nextStage);
    } catch {
      // Ya lo avisó quien intentó guardarlo. No hay nada que festejar.
      setIsMoving(false);
      return;
    }

    toast.success(t('inmobiliaria.pipeline.stageUpdated'), {
      description: t('inmobiliaria.pipeline.movedTo', { name: item.candidateName, stage: nextStageInfo?.labelEs || '' }),
    });

    setIsMoving(false);
  }, [item, nextStage, nextStageInfo, onStageChange, t, onPedirVisita]);

  /** PL-12: reasignar el interesado desde el cajón. */
  const reasignar = useCallback(
    async (aUserId: string | undefined) => {
      if (!item || !aUserId || aUserId === item.agenteId) return;
      setReasignando(true);
      setErrorDelAsesor(null);
      try {
        await embudoApi.reasignar(item.id, aUserId);
        toast.success('Interesado reasignado', {
          description: `Ahora lo atiende ${equipo.find((m) => m.userId === aUserId)?.nombre ?? 'otra persona'}.`,
        });
        onCambio?.();
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return;
        setErrorDelAsesor(mensajeParaLaPersona(err, { porDefecto: 'No se pudo reasignar.', accion: 'reasignar el interesado' }));
      } finally {
        setReasignando(false);
      }
    },
    [item, equipo, onCambio],
  );

  /**
   * Marcar perdido — con el motivo, que es el dato por el que existe la
   * columna «Perdido».
   *
   * `pipelineApi.moveStage(id, stage, lostReason)` acepta el motivo desde
   * siempre y el tipo `PipelineItem` tiene `lostReason`: el cajón incluso lo
   * PINTA cuando viene. Nadie lo pedía nunca, así que todos los perdidos
   * quedaban sin explicación. Se reusa `MotivoDialog`, el mismo de cancelar
   * una visita, con su mínimo de caracteres.
   */
  const handleMarkAsLost = useCallback(async (motivo: string) => {
    if (!item) return;
    // El mismo tope que el back (`MoveStageDto.lostReason`, VarChar(500)):
    // el diálogo ya lo dice bajo el campo y no deja confirmar; esto es la
    // segunda guarda, y también va bajo el campo (02-10-2026: nunca un toast).
    const largo = revisarMotivoDePerdida(motivo);
    if (largo) {
      setErrorDelMotivo(largo);
      return;
    }

    setErrorDelMotivo(null);
    setIsMarking(true);
    try {
      await onStageChange?.(item.id, 'lost', motivo);
    } catch (error) {
      // Con motivo, la página NO avisa en un toast: el porqué va bajo el
      // campo y el diálogo sigue abierto con lo escrito.
      setErrorDelMotivo(
        mensajeDelRechazoDelMotivo(error, {
          campo: 'lostReason',
          porDefecto: 'No se pudo marcar como perdido. Prueba de nuevo en un momento.',
          accion: 'marcar el lead como perdido',
        }),
      );
      setIsMarking(false);
      return;
    }

    toast.info(t('inmobiliaria.pipeline.markedAsLost'), {
      description: t('inmobiliaria.pipeline.markedAsLostDesc', { name: item.candidateName }),
    });

    setIsMarking(false);
    setPidiendoMotivo(false);
    onClose();
  }, [item, onStageChange, onClose, t]);

  const handleClose = useCallback(() => {
    setErrorDelAsesor(null);
    onClose();
  }, [onClose]);

  if (!item) return null;

  const isTerminal = item.stage === 'completed' || item.stage === 'lost';
  const isOverdue = item.daysInStage > 7;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && handleClose()} modal={true}>
      <SheetContent side="right" size="md" aria-describedby={undefined}>
        <SheetHeader
          title={<span className="block truncate">{item.propertyTitle}</span>}
          description={
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.propertyAddress}</span>
            </span>
          }
          actions={
            // Al avanzar de etapa la píldora cambia con un fundido: la nueva
            // entra ya y la vieja se va encima (`popLayout`).
            <CrossFade as="span" swapKey={item.stage} mode="popLayout" className="inline-flex shrink-0">
              <span className={cn('shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold', stageInfo?.color)}>
                {stageInfo?.labelEs}
              </span>
            </CrossFade>
          }
        />

        {/* El cuerpo: lo único que scrollea */}
        <SheetBody className="space-y-6">
          {/* Property Card */}
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="flex gap-4 p-4">
              {item.propertyThumbnail ? (
                <img
                  src={item.propertyThumbnail}
                  alt={item.propertyTitle}
                  className="w-20 h-20 rounded-md object-cover shrink-0"
                />
              ) : (
                <div className="w-20 h-20 rounded-md bg-muted flex items-center justify-center shrink-0">
                  <Buildings className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-foreground truncate">{item.propertyTitle}</h3>
                <p className="text-sm text-muted-foreground mt-0.5 truncate">{item.propertyAddress}</p>
                <p className="text-lg font-semibold text-primary mt-2 tabular-nums">
                  {/* A sale mandate has no canon. `—`, never `$ 0` (C6). */}
                  {item.monthlyRent != null ? (
                    <>
                      {formatCurrency(item.monthlyRent)}
                      <span className="text-sm font-normal text-muted-foreground">{t('inmobiliaria.pipeline.month')}</span>
                    </>
                  ) : (
                    '—'
                  )}
                </p>
              </div>
            </div>
            <Link
              href={`/panel/inmobiliaria/inmuebles/${item.consignacionId}`}
              className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/30 text-sm font-medium text-primary hover:bg-muted/50 transition-colors"
            >
              <span>{t('inmobiliaria.pipeline.viewConsignment')}</span>
              <CaretRight className="w-4 h-4" />
            </Link>
            {/* Punto 8 (04-10-2026): pasar el interesado a «Postulación» es
                que se postule. Su enlace, con el asesor (`?ref=`), para que la
                postulación llegue a esta tarjeta con su asesor. */}
            {item.propertyId && (
              <button
                type="button"
                onClick={() => {
                  const enlace = `${window.location.origin}/aplicar/${item.propertyId}${
                    item.agenteId || miUserId ? `?ref=${item.agenteId || miUserId}` : ''
                  }`;
                  void navigator.clipboard?.writeText(enlace);
                  toast.success('Enlace copiado', {
                    description: 'Mándaselo para que se postule: la postulación llega a su tarjeta con su asesor.',
                  });
                }}
                className="flex w-full items-center justify-between px-4 py-3 border-t border-border text-sm font-medium text-primary hover:bg-muted/50 transition-colors"
                data-testid="lead-enlace-postularse"
              >
                <span>Copiar el enlace para que se postule</span>
                <Copy className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Candidate Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <User className="w-3.5 h-3.5" />
              {t('inmobiliaria.pipeline.candidate')}
            </h4>
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-3 mb-4">
                {item.candidateAvatar ? (
                  <img
                    src={item.candidateAvatar}
                    alt={item.candidateName}
                    className="w-11 h-11 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-fg-muted flex items-center justify-center text-white text-sm font-semibold shrink-0">
                    {item.candidateName.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()}
                  </div>
                )}
                <p className="font-medium text-foreground">{item.candidateName}</p>
              </div>

              {/* Contact Grid */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="secondary"
                  hideArrow
                  onClick={() => copyToClipboard(item.candidateEmail, 'Email')}
                  className="justify-start gap-2 px-3 text-muted-foreground"
                >
                  <Envelope className="w-4 h-4 shrink-0" />
                  <span className="truncate flex-1 text-left">{item.candidateEmail.split('@')[0]}</span>
                  <Copy className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </Button>
                <Button
                  variant="secondary"
                  hideArrow
                  onClick={() => copyToClipboard(item.candidatePhone, 'Teléfono')}
                  className="justify-start gap-2 px-3 text-muted-foreground"
                >
                  <Phone className="w-4 h-4 shrink-0" />
                  <span className="truncate flex-1 text-left tabular-nums">{item.candidatePhone}</span>
                  <Copy className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </Button>
              </div>

              {/* WhatsApp Button — allowlist: green-brand CTA. Cadence Button has NO success/green
                  variant (logged gap); the WhatsApp-green fill is a recognised brand color that the
                  primary/secondary variants can't express. Kept native. */}
              <button
                onClick={() => openWhatsApp(item.candidatePhone)}
                className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-2.5 rounded-md bg-success hover:opacity-90 text-white text-sm font-medium transition-colors"
              >
                <WhatsappLogo className="w-4 h-4" weight="fill" />
                {t('inmobiliaria.pipeline.sendWhatsApp')}
              </button>

              {/* Risk Score */}
              {(item.riskScore || item.riskLevel) && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                  <span className="text-sm text-muted-foreground">{t('inmobiliaria.pipeline.riskProfile')}</span>
                  <RiskBadge score={item.riskScore} level={item.riskLevel} />
                </div>
              )}
            </div>
          </div>

          {/* Progress Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <TrendUp className="w-3.5 h-3.5" />
              {t('inmobiliaria.pipeline.progress')}
            </h4>
            <div className="rounded-lg border border-border bg-card divide-y divide-border">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-muted-foreground">{t('inmobiliaria.pipeline.currentStage')}</span>
                <span className={cn('px-2.5 py-1 rounded-sm text-xs font-medium', stageInfo?.color)}>
                  {stageInfo?.labelEs}
                </span>
              </div>

              {/* PL-11/PL-12: quién lo atiende, y cambiarlo desde acá. */}
              <div className="flex items-center justify-between gap-3 px-4 py-3" data-testid="lead-asesor">
                <span className="shrink-0 text-sm text-muted-foreground">Asesor</span>
                {puedeEditar && equipo.some((m) => m.asesor) ? (
                  <div className="w-56 max-w-full">
                    <Combobox
                      data-testid="lead-asesor-select"
                      value={item.agenteId || undefined}
                      onChange={(v) => void reasignar(v ?? undefined)}
                      options={equipo.filter((m) => m.asesor).map((m) => ({ value: m.userId, label: m.nombre }))}
                      placeholder="Sin asignar"
                      disabled={reasignando}
                    />
                  </div>
                ) : (
                  <span className="text-sm font-medium text-foreground">
                    {equipo.find((m) => m.userId === item.agenteId)?.nombre ?? 'Sin asignar'}
                  </span>
                )}
              </div>
              {errorDelAsesor && (
                <p className="px-4 pb-3 text-caption text-danger" role="alert">{errorDelAsesor}</p>
              )}

              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-muted-foreground">{t('inmobiliaria.pipeline.daysInStage')}</span>
                <span className={cn(
                  'flex items-center gap-1.5 text-sm font-semibold tabular-nums',
                  isOverdue ? 'text-warning' : 'text-foreground'
                )}>
                  {item.daysInStage} {t('inmobiliaria.pipeline.days')}
                  {isOverdue && <Warning className="w-4 h-4" weight="fill" />}
                </span>
              </div>

              {item.nextAction && (
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-muted-foreground">{t('inmobiliaria.pipeline.nextAction')}</span>
                  <span className="text-sm font-medium text-foreground">{item.nextAction}</span>
                </div>
              )}

              {item.nextActionDate && (
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-muted-foreground">{t('inmobiliaria.pipeline.targetDate')}</span>
                  <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <CalendarBlank className="w-4 h-4 text-muted-foreground" />
                    {formatDateI18n(new Date(item.nextActionDate), { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Timeline Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Timer className="w-3.5 h-3.5" />
              {t('inmobiliaria.pipeline.history')}
            </h4>
            <div className="rounded-lg border border-border bg-card p-4" data-testid="pipeline-historial">
              <div className="relative pl-5">
                {/* Vertical line */}
                <div className="absolute left-[5px] top-1.5 bottom-1.5 w-px bg-border" />

                {/* Los hitos entran escalonados; al avanzar de etapa, el nuevo
                    entra y los demás se corren a su lugar. */}
                <Stagger className="space-y-4">
                  {timeline.map((hito) => {
                    const infoDeLaEtapa = hito.stage ? getPipelineStageInfo(hito.stage) : null;
                    return (
                      <StaggerItem
                        key={hito.clave}
                        className="relative flex items-start gap-3"
                        data-hito={hito.clave}
                      >
                        {/* Dot */}
                        <div
                          className={cn(
                            'absolute -left-5 w-2.5 h-2.5 rounded-full mt-1.5 ring-2 ring-card',
                            hito.esActual ? 'bg-primary' : 'bg-muted-foreground/30'
                          )}
                        />

                        <div className="flex-1 min-w-0 flex items-start justify-between gap-2">
                          <div>
                            <span
                              className={cn(
                                'text-sm font-medium',
                                hito.esActual ? 'text-foreground' : 'text-muted-foreground'
                              )}
                            >
                              {infoDeLaEtapa?.labelEs ??
                                t('inmobiliaria.pipeline.enteredPipeline')}
                            </span>
                            {/* Los días sólo se afirman donde están medidos: la
                                etapa actual. En el ingreso al pipeline no hay
                                nada que contar. */}
                            {hito.dias !== undefined && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {hito.dias}{' '}
                                {hito.dias === 1
                                  ? t('inmobiliaria.pipeline.daySingular')
                                  : t('inmobiliaria.pipeline.days')}{' '}
                                {t('inmobiliaria.pipeline.inThisStage')}
                              </p>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                            {formatDateI18n(new Date(hito.fecha), {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </span>
                        </div>
                      </StaggerItem>
                    );
                  })}
                </Stagger>
              </div>

              {/* El hueco, dicho de frente. Antes esto se llenaba con
                  `Math.random()`: diez etapas con sus días, todas menos una
                  inventadas y ninguna marcada como tal. */}
              <p
                className="mt-4 pt-3 border-t border-border-faint text-xs leading-snug text-muted-foreground"
                data-testid="pipeline-historial-sin-registro"
              >
                {t('inmobiliaria.pipeline.historyNotRecorded')}
              </p>
            </div>
          </div>

          {/* Notes Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Note className="w-3.5 h-3.5" />
              {t('inmobiliaria.pipeline.notes')}
            </h4>
            <NotasDelLead pipelineItemId={item.id} notasViejas={item.notes} puedeEscribir={puedeEditar} />
          </div>

          {/* Lost Reason */}
          {item.stage === 'lost' && item.lostReason && (
            <div className="p-4 rounded-lg border border-danger/30 bg-danger-soft">
              <h4 className="font-medium text-danger text-sm mb-2 flex items-center gap-2">
                <XCircle className="w-4 h-4" weight="fill" />
                {t('inmobiliaria.pipeline.lostReason')}
              </h4>
              <p className="text-sm text-danger">{item.lostReason}</p>
            </div>
          )}
        </SheetBody>

        {/* Footer Actions — perder a la izquierda, avanzar a la derecha */}
        {!isTerminal && puedeEditar && (
          <SheetFooter
            start={
            <Button
              variant="outline"
              hideArrow
              onClick={() => {
                setErrorDelMotivo(null);
                setPidiendoMotivo(true);
              }}
              data-testid="pipeline-marcar-perdido"
              disabled={isMarking || isMoving}
              isLoading={isMarking}
              className="border-danger/30 text-danger hover:bg-danger-soft hover:text-danger"
            >
              {isMarking ? (
                t('inmobiliaria.pipeline.marking')
              ) : (
                <>
                  <XCircle className="w-4 h-4" />
                  {t('inmobiliaria.pipeline.markAsLost')}
                </>
              )}
            </Button>
            }
          >
            {nextStage && (
              <Button
                hideArrow
                onClick={handleMoveToNext}
                disabled={isMoving || isMarking}
                isLoading={isMoving}
              >
                {isMoving ? (
                  t('inmobiliaria.pipeline.moving')
                ) : (
                  <>
                    {t('inmobiliaria.pipeline.moveTo')} {nextStageInfo?.labelEs}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            )}
          </SheetFooter>
        )}

        {/* El motivo es obligatorio: un lead perdido sin razón no se puede leer
            después. Mismo diálogo y mismo mínimo que cancelar una visita. */}
        <MotivoDePerdidaDialog
          abierto={pidiendoMotivo}
          nombre={item.candidateName}
          enviando={isMarking}
          error={errorDelMotivo}
          onCerrar={() => {
            setPidiendoMotivo(false);
            setErrorDelMotivo(null);
          }}
          onConfirmar={(motivo) => void handleMarkAsLost(motivo)}
        />
      </SheetContent>
    </Sheet>
  );
}

export default PipelineDetail;
