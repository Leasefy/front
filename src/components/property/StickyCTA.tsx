'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Heart, ShareNetwork, VideoCamera, MapPin, TrendUp, Clock, Check, Calendar, Copy, ChatCircle } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { SegmentedControl } from '@leasefy/cadence';
import { LeasefyLogo } from '@/components/brand';
import { useOptionalI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/lib/auth/use-auth';
import { visitsApi } from '@/lib/api/visits.service';
import { messagesApi } from '@/lib/api/messages.service';
import { ApiError } from '@/lib/api/client';
import type { VisitSlot } from '@/lib/api/visits.types';
import { PostularButton } from '@/components/tenant/PostularButton';
import { useAprobacion } from '@/lib/hooks/use-aprobacion';
import { seLePuedePrometerSinCodeudor } from '@/lib/api/aprobacion.service';

interface StickyCTAProps {
  propertyId: string;
  /**
   * Modalidades que acepta el inmueble. `undefined` = un back que todavía no
   * las manda ⇒ se ofrecen las dos, como venía siendo. Un arreglo VACÍO sí
   * significa «ninguna» y apaga el agendamiento.
   */
  visitTypes?: Array<'IN_PERSON' | 'VIRTUAL'>;
  /** Monthly rent (COP). Ignored for display when `listingType === 'sale'` — see `salePrice`. */
  price: number;
  adminFee?: number;
  isWishlisted?: boolean;
  onWishlistToggle?: () => void;
  className?: string;
  /**
   * contract.md T-0038 §3.2.2/§3.3 — `'sale'` drops the postulación tab in
   * favour of "Contactar" (O-1: registration required, no `@Public()` chat).
   * Defaults to `'rent'` so existing callers keep today's behaviour.
   */
  listingType?: 'rent' | 'sale';
  /** contract.md T-0038 §3.2.3 — `null`/absent renders "Sin dato", never `$0` (C6). */
  salePrice?: number | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Group slot array by date, preserving availability */
type SlotsByDate = Record<string, Array<{ time: string; available: boolean }>>;

function groupSlotsByDate(slots: VisitSlot[]): SlotsByDate {
  const grouped: SlotsByDate = {};
  for (const slot of slots) {
    if (!grouped[slot.date]) grouped[slot.date] = [];
    grouped[slot.date].push({ time: slot.startTime, available: slot.isAvailable });
  }
  return grouped;
}

/** "2026-04-12" → { dayName: "Sáb", dayNumber: 12 } */
function parseDateDisplay(dateStr: string) {
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const date = new Date(dateStr + 'T12:00:00'); // noon avoids timezone shifts
  return { dayName: dayNames[date.getDay()], dayNumber: date.getDate() };
}

/** "09:00" → "9:00am" | "14:00" → "2:00pm" */
function formatTimeSlot(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const period = h >= 12 ? 'pm' : 'am';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${m.toString().padStart(2, '0')}${period}`;
}

/** "YYYY-MM-DD" + N days in the future */
function addDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

/*
 * Acá vivía `generateMockStats(propertyId)`: sumaba los códigos de las letras
 * del id y de ahí salían "N personas viendo ahora" —con un punto latiendo y un
 * contador que subía o bajaba solo cada 10 segundos— y una insignia de "Muy
 * solicitado". Nada de eso se medía.
 *
 * Iba en el panel pegado al botón de postularse: el peor lugar posible para
 * urgencia inventada, porque es exactamente donde la persona decide. Fuera
 * hasta que haya visitas de verdad que contar.
 */

// ─── Compartir el inmueble ───────────────────────────────────────────────────

/**
 * Qué terminó pasando al compartir. Se separa `cancelado` de `error` a
 * propósito: cerrar la hoja del sistema es una decisión del usuario, no una
 * falla, y avisarla como error es mentirle.
 */
type ResultadoDeCompartir = 'nativo' | 'copiado' | 'cancelado' | 'error';

/**
 * Compartir con la hoja nativa cuando existe (es lo que la gente espera en el
 * teléfono) y caer al portapapeles cuando no.
 *
 * Vive suelto en el módulo porque HAY DOS botones de compartir en esta
 * pantalla —el de la tarjeta de escritorio y el del CTA fijo del móvil— y
 * cuando cada uno tenía su propio `handleCopyShare` se desincronizaron: el del
 * móvil ni siquiera reusaba la URL ya calculada.
 */
async function compartirEnlace(url: string): Promise<ResultadoDeCompartir> {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ url, title: 'Inmueble en Leasefy' });
      return 'nativo';
    } catch (err) {
      // Cancelar la hoja no es un fallo: no hay nada que avisar.
      if (err instanceof Error && err.name === 'AbortError') return 'cancelado';
      // Cualquier otro fallo del share nativo todavía tiene el portapapeles.
    }
  }
  try {
    // En contexto inseguro `navigator.clipboard` ni existe: el acceso tira
    // TypeError acá adentro y termina en 'error', que es lo que queremos.
    await navigator.clipboard.writeText(url);
    return 'copiado';
  } catch {
    return 'error';
  }
}

/**
 * El botón de compartir, con la señal que antes no daba.
 *
 * Antes sólo cambiaba el ícono a un tilde por 2 segundos dentro de un botón de
 * 40px —imperceptible— y si el portapapeles fallaba (permiso denegado, http
 * sin TLS) el `catch` se lo comía y el usuario se quedaba creyendo que copió.
 */
function useCompartirInmueble(propertyId: string) {
  const i18n = useOptionalI18n();
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);

  // Se calcula en el cliente para no romper la hidratación con el origen.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setShareUrl(`${window.location.origin}/propiedades/${propertyId}`);
    }
  }, [propertyId]);

  const compartir = useCallback(async () => {
    const url =
      shareUrl ||
      (typeof window !== 'undefined' ? `${window.location.origin}/propiedades/${propertyId}` : '');
    if (!url) return;

    const resultado = await compartirEnlace(url);
    if (resultado === 'copiado') {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success(
        i18n?.t('propiedad.compartir.copiado') ?? 'Copiamos el enlace del inmueble',
      );
      return;
    }
    if (resultado === 'error') {
      toast.error(
        i18n?.t('propiedad.compartir.falloAlCopiar') ?? 'No pudimos copiar el enlace',
        {
          description:
            i18n?.t('propiedad.compartir.falloAlCopiarDetalle') ??
            'Copialo a mano desde la barra de direcciones del navegador.',
        },
      );
    }
    // 'nativo' y 'cancelado' no dicen nada: la hoja del sistema ya fue la señal.
  }, [i18n, propertyId, shareUrl]);

  return { shareUrl, copied, compartir };
}

// ─── Error messages ──────────────────────────────────────────────────────────

function getScheduleErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 409) return 'Este horario ya fue reservado. Elegí otro.';
    if (err.status === 403) return 'No podés agendar una visita para tu propia propiedad.';
    if (err.status === 400) return 'Formato de datos inválido. Recargá la página e intentá de nuevo.';
  }
  return 'Ocurrió un error al agendar. Intentá de nuevo.';
}

// ============================================================================
// StickyCTA
// ============================================================================

/**
 * StickyCTA — Sticky card with dual action: Apply or Schedule Visit.
 * Visit scheduling is connected to the real backend API.
 */
export function StickyCTA({
  propertyId,
  visitTypes,
  price,
  adminFee = 0,
  isWishlisted = false,
  onWishlistToggle,
  className,
  listingType = 'rent',
  salePrice,
}: StickyCTAProps) {
  const { user, isAuthenticated, hasActiveAgencyMembership } = useAuth();
  const router = useRouter();
  const isSaleListing = listingType === 'sale';

  /*
   * ¿Podemos decirle que se postula sin codeudor?
   *
   * `null` = no sabemos, y entonces no se afirma nada. Sin aprobación resuelta
   * no hay forma de saber si la aseguradora le va a pedir codeudor, y una
   * promesa sobre el trato es de las peores cosas que se pueden inventar: la
   * descubre cuando ya se ilusionó.
   */
  const { aprobacion } = useAprobacion();
  const sinCodeudor = seLePuedePrometerSinCodeudor(aprobacion);
  const pathname = usePathname();

  // An inmobiliaria/agent viewing a property is NOT a prospective tenant: they
  // must not apply or schedule a visit. Instead they get a "share this property"
  // panel (copy link). Covers agency owners, invited agents (backendRole AGENT),
  // and personal-role users with an active agency membership.
  const isAgencyViewer =
    !!user && (user.role === 'agency' || user.backendRole === 'AGENT' || hasActiveAgencyMembership);

  const [ctaMode, setCtaMode] = useState<'apply' | 'visit' | 'contact'>(isSaleListing ? 'contact' : 'apply');
  const [visitTextT, setVisitType] = useState<'presencial' | 'virtual'>('presencial');

  /**
   * Las modalidades ofrecidas, en el vocabulario de esta pantalla.
   * `undefined` del back = las dos (compatibilidad); vacío = ninguna.
   */
  const modalidades = useMemo<Array<'presencial' | 'virtual'>>(() => {
    if (!visitTypes) return ['presencial', 'virtual'];
    const salida: Array<'presencial' | 'virtual'> = [];
    if (visitTypes.includes('IN_PERSON')) salida.push('presencial');
    if (visitTypes.includes('VIRTUAL')) salida.push('virtual');
    return salida;
  }, [visitTypes]);

  // Si la seleccionada dejó de ofrecerse, se cae a la que sí está: sin esto se
  // mandaría una reserva de un tipo que el inmueble no acepta.
  useEffect(() => {
    if (modalidades.length > 0 && !modalidades.includes(visitTextT)) {
      setVisitType(modalidades[0]);
    }
  }, [modalidades, visitTextT]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [visitConfirmed, setVisitConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  // contract-addendum-2.md §B.2/§B.9 — the sale CTA's "Contactar" action.
  // WU-3 shipped the CTA swap; this wires it to the real endpoint.
  const [isStartingChat, setIsStartingChat] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);

  const handleStartChat = async () => {
    if (isStartingChat) return;
    setIsStartingChat(true);
    setContactError(null);
    try {
      // §B.2 — idempotent: an existing thread with this prospect returns
      // 200 with the same conversationId, a new one returns 201.
      const { conversationId } = await messagesApi.createPropertyInquiry(propertyId);
      router.push(`/inquilino/mensajes?conversationId=${conversationId}`);
    } catch (error) {
      setContactError(
        error instanceof ApiError && error.messages
          ? error.messages.join(' · ')
          : 'No pudimos iniciar la conversación. Intentá de nuevo.',
      );
    } finally {
      setIsStartingChat(false);
    }
  };

  // Slots from backend
  const [slotsByDate, setSlotsByDate] = useState<SlotsByDate>({});
  const [slotsLoading, setSlotsLoading] = useState(false);


  // Enlace público del inmueble + compartir. La URL se sigue mostrando en el
  // panel de la inmobiliaria para copiarla a mano si todo lo demás falla.
  const { shareUrl, copied, compartir } = useCompartirInmueble(propertyId);
  const handleCopyShare = () => void compartir();


  // ─── Fetch slots when visit tab opens ─────────────────────────────────────
  useEffect(() => {
    if (ctaMode !== 'visit') return;

    setSlotsLoading(true);
    setSlotsByDate({});
    setSelectedDay(null);
    setSelectedTime(null);

    // Start from tomorrow (backend requires ≥2h anticipation)
    const startDate = addDays(1);
    const endDate = addDays(8); // 7-day window

    visitsApi
      .getSlots(propertyId, startDate, endDate)
      .then((response) => setSlotsByDate(groupSlotsByDate(response.slots)))
      .catch(() => {
        // Non-blocking: empty slots will show "sin disponibilidad"
      })
      .finally(() => setSlotsLoading(false));
  }, [ctaMode, propertyId]);

  // ─── Derived slot data ────────────────────────────────────────────────────

  /** Dates that have at least one available slot, sorted ascending */
  const availableDates = Object.keys(slotsByDate)
    .filter((date) => slotsByDate[date].some((s) => s.available))
    .sort()
    .slice(0, 5); // max 5 shown (grid columns)

  /** Slots for the currently selected date */
  const timesForDay = selectedDay ? (slotsByDate[selectedDay] ?? []) : [];

  // ─── Actions ──────────────────────────────────────────────────────────────

  const handleScheduleVisit = async () => {
    if (!selectedDay || !selectedTime) return;

    // Require authentication
    if (!isAuthenticated || !user) {
      router.push(`/auth?returnUrl=${encodeURIComponent(pathname)}`);
      return;
    }

    setIsSubmitting(true);
    setScheduleError(null);

    try {
      await visitsApi.create({
        propertyId,
        date: selectedDay,
        startTime: selectedTime,
        visitType: visitTextT === 'presencial' ? 'IN_PERSON' : 'VIRTUAL',
      });
      setVisitConfirmed(true);
    } catch (err) {
      setScheduleError(getScheduleErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetVisit = () => {
    setVisitConfirmed(false);
    setSelectedDay(null);
    setSelectedTime(null);
    setScheduleError(null);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className={cn('lg:sticky lg:top-28', className)}>
      <Card className="overflow-hidden rounded-xl border-border shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                {/* La firma del DS, no el nombre tipeado a mano: acá vivía un
                    `<p>Leasefy</p>` que no era el logo (Nico, 2026-09-04). Es
                    el mismo arreglo que ya se hizo en los dos footers. */}
                <LeasefyLogo size={20} tone="brand" />
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[hsl(var(--success-50))] dark:bg-[hsl(var(--success-500)/0.15)] text-[hsl(var(--success-500))] text-[10px] font-semibold uppercase tracking-wide rounded-full">
                  <Check className="w-3 h-3" />
                  Verificado
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Respuesta en menos de 24h</p>
            </div>
            <div className="flex gap-2">
              {onWishlistToggle && (
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={onWishlistToggle}
                  className={cn(
                    'h-10 w-10',
                    isWishlisted
                      ? 'border-destructive/20 bg-destructive/5 text-destructive hover:bg-destructive/10'
                      : 'hover:bg-surface-muted text-muted-foreground'
                  )}
                  aria-label={isWishlisted ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                >
                  <Heart className={cn('w-[18px] h-[18px]', isWishlisted && 'fill-current')} />
                </Button>
              )}
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={handleCopyShare}
                className="h-10 w-10 hover:bg-surface-muted text-muted-foreground"
                aria-label={copied ? 'Enlace copiado' : 'Compartir'}
                data-testid="share-copy-header"
              >
                {copied ? (
                  <Check className="w-[18px] h-[18px] text-[hsl(var(--success-500))]" />
                ) : (
                  <ShareNetwork className="w-[18px] h-[18px]" />
                )}
              </Button>
            </div>
          </div>

          {/* Price */}
          <div className="mb-6 pb-6 border-b border-border">
            {isSaleListing ? (
              // contract.md T-0038 §3.2.3 — never `formatCurrency(null)`
              // (that helper silently renders "$ 0", C6). `salePrice` is
              // never displayed as a canon: no "/mes" suffix.
              <div className="flex items-baseline gap-1.5">
                <span className="text-[30px] font-mono tabular-nums font-bold text-foreground tracking-[-0.02em]">
                  {salePrice != null ? formatCurrency(salePrice) : 'Sin dato'}
                </span>
              </div>
            ) : (
              <>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[30px] font-mono tabular-nums font-bold text-foreground tracking-[-0.02em]">
                    {formatCurrency(price)}
                  </span>
                  <span className="text-[14px] text-muted-foreground font-medium">/mes</span>
                </div>
                {adminFee > 0 && (
                  <p className="text-[13px] text-muted-foreground mt-1.5">
                    + {formatCurrency(adminFee)} administración
                  </p>
                )}
              </>
            )}
          </div>

          {isAgencyViewer ? (
            /* ── Agency/agent viewer: share panel (no apply / no visit) ── */
            <div data-testid="agency-share-panel">
              <div className="flex items-start gap-2.5 mb-4">
                <ShareNetwork className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <p className="text-[13px] text-muted-foreground">
                  Compartí esta propiedad con un interesado por el canal que prefieras.
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-muted px-3 h-11 mb-3">
                <input
                  readOnly
                  value={shareUrl}
                  aria-label="Enlace de la propiedad"
                  data-testid="agency-share-url"
                  onFocus={(e) => e.currentTarget.select()}
                  className="flex-1 min-w-0 bg-transparent text-[13px] text-fg-muted outline-none truncate"
                />
              </div>

              <Button
                type="button"
                onClick={handleCopyShare}
                hideArrow
                className="w-full gap-2"
                data-testid="agency-share-copy"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Enlace copiado
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copiar enlace
                  </>
                )}
              </Button>

              <p className="text-[11px] text-muted-foreground text-center mt-3">
                Como inmobiliaria no aplicas ni agendas visitas — compartí el enlace con tus clientes.
              </p>
            </div>
          ) : (
          <>
          {/* Tab selector */}
          <div className="mb-6">
            {/*
              contract.md T-0038 §3.3/§3 ledger §2.7 (O-1/O-2) — a SALE
              listing has no postulación: "Contactar" replaces "Postularme".
              "Agendar visita" stays, unconditionally — there is no per-agency
              "has a visits agenda" switch (O-2).
            */}
            <SegmentedControl<'apply' | 'visit' | 'contact'>
              fullWidth
              value={ctaMode}
              onChange={setCtaMode}
              aria-label={isSaleListing ? 'Contactar o agendar visita' : 'Postularme o agendar visita'}
              options={
                isSaleListing
                  ? [
                      { value: 'contact', label: 'Contactar' },
                      { value: 'visit', label: 'Agendar visita' },
                    ]
                  : [
                      { value: 'apply', label: 'Postularme' },
                      { value: 'visit', label: 'Agendar visita' },
                    ]
              }
            />
          </div>

          {/* Tab content */}
          {ctaMode === 'contact' ? (
            /* ── Contact tab (SALE listing) — O-1: registration required,
               no @Public() contact surface. The actual chat thread is WU-5;
               this only gates on auth and states the current capability
               honestly instead of faking a chat UI. ── */
            <div className="text-center py-4">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary-soft flex items-center justify-center">
                <ChatCircle className="w-6 h-6 text-primary" />
              </div>
              {isAuthenticated ? (
                <>
                  <h3 className="text-[15px] font-heading font-semibold text-foreground mb-2">
                    Chateá con la inmobiliaria
                  </h3>
                  <p className="text-[13px] text-muted-foreground mb-4">
                    Iniciá una conversación sobre esta propiedad. Si ya escribiste antes, te llevamos al mismo hilo.
                  </p>
                  <Button
                    type="button"
                    hideArrow
                    className="w-full"
                    isLoading={isStartingChat}
                    disabled={isStartingChat}
                    onClick={handleStartChat}
                  >
                    Contactar
                  </Button>
                  {contactError && (
                    <p role="alert" className="mt-3 text-[13px] text-danger">
                      {contactError}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <h3 className="text-[15px] font-heading font-semibold text-foreground mb-2">
                    Iniciá sesión para contactar a la inmobiliaria
                  </h3>
                  <p className="text-[13px] text-muted-foreground mb-4">
                    Es rápido y te permite chatear sobre esta propiedad y agendar una visita.
                  </p>
                  <Button
                    type="button"
                    hideArrow
                    className="w-full"
                    onClick={() => router.push(`/auth?returnUrl=${encodeURIComponent(pathname)}`)}
                  >
                    Iniciar sesión
                  </Button>
                </>
              )}
            </div>
          ) : ctaMode === 'apply' ? (
            /* ── Apply tab ── */
            <div>
              <div className="space-y-2.5 mb-6">
                {/*
                  «Sin codeudor» estaba fijo en toda propiedad, y es una promesa
                  sobre el trato que el propio producto desmiente: una aprobación
                  condicionada «normalmente pide un codeudor o un depósito
                  adicional» (ResultadoAprobacion). Se lo prometíamos justo a
                  quien iba a tener que conseguirlo.

                  Ahora sale de SU aprobación, la misma que usa la puerta de
                  postularse, y con `null` no se afirma nada: no saber no es
                  poder prometer. Y se dice "te postulas", no "aplicas"
                  (docs/VOCABULARIO.md).
                */}
                {sinCodeudor !== null && (
                  <div className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-[hsl(var(--success-500))] flex-shrink-0" strokeWidth={3} />
                    <p className="text-[13px] text-muted-foreground">
                      {sinCodeudor ? (
                        <>
                          <span className="font-semibold text-foreground">Sin codeudor</span> — te
                          postulas solo con tu información
                        </>
                      ) : (
                        <>
                          Tu aprobación quedó{' '}
                          <span className="font-semibold text-foreground">con condiciones</span> — la
                          aseguradora puede pedirte codeudor
                        </>
                      )}
                    </p>
                  </div>
                )}
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-muted-foreground/60 flex-shrink-0" />
                  <p className="text-[13px] text-muted-foreground">
                    Respuesta en <span className="font-semibold text-foreground">menos de 24h</span>
                  </p>
                </div>
              </div>
              <PostularButton propertyId={propertyId} canonCop={price} className="w-full">
                Postularme a esta propiedad
              </PostularButton>
              <p className="text-[11px] text-muted-foreground text-center mt-3">
                Completa tu solicitud en minutos
              </p>
            </div>
          ) : visitConfirmed ? (
            /* ── Visit confirmed ── */
            <div className="text-center py-4">
              <div className="w-16 h-16 mx-auto mb-4 bg-[hsl(var(--success-500))] rounded-xl flex items-center justify-center">
                <Check className="w-8 h-8 text-white" strokeWidth={3} />
              </div>
              <h3 className="text-lg font-heading font-semibold text-foreground mb-2">
                ¡Visita agendada!
              </h3>
              <p className="text-sm text-muted-foreground mb-1">
                {visitTextT === 'presencial' ? 'Visita presencial' : 'Visita virtual'}
              </p>
              {selectedDay && selectedTime && (
                <p className="text-sm font-medium text-foreground mb-4">
                  {parseDateDisplay(selectedDay).dayName} {parseDateDisplay(selectedDay).dayNumber} · {formatTimeSlot(selectedTime)}
                </p>
              )}
              <p className="text-xs text-muted-foreground mb-6">
                Te enviaremos un correo con los detalles de la visita y recordatorios.
              </p>
              <Button
                variant="link"
                hideArrow
                onClick={handleResetVisit}
                className="h-auto p-0 text-sm font-medium"
              >
                Agendar otra visita
              </Button>
            </div>
          ) : (
            /* ── Visit tab ── */
            <div className="space-y-5">
              {/* Sólo las modalidades que el inmueble acepta. Con una sola no
                  hay nada que elegir: se dice cuál es y ya. Ofrecer una que la
                  inmobiliaria apagó termina en una visita que nadie atiende. */}
              {modalidades.length > 1 ? (
                <SegmentedControl<'presencial' | 'virtual'>
                  fullWidth
                  value={visitTextT}
                  onChange={setVisitType}
                  aria-label="Tipo de visita"
                  options={[
                    {
                      value: 'presencial',
                      ariaLabel: 'Presencial',
                      label: (
                        <span className="inline-flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          Presencial
                        </span>
                      ),
                    },
                    {
                      value: 'virtual',
                      ariaLabel: 'Virtual',
                      label: (
                        <span className="inline-flex items-center gap-2">
                          <VideoCamera className="w-4 h-4" />
                          Virtual
                        </span>
                      ),
                    },
                  ]}
                />
              ) : (
                <p className="flex items-center justify-center gap-2 rounded-full bg-surface-muted px-3 py-2 text-body-sm text-fg-muted">
                  {modalidades[0] === 'virtual' ? (
                    <VideoCamera className="h-4 w-4" aria-hidden />
                  ) : (
                    <MapPin className="h-4 w-4" aria-hidden />
                  )}
                  Visita {modalidades[0] === 'virtual' ? 'virtual' : 'presencial'}
                </p>
              )}

              {/* Slots loading */}
              {slotsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Spinner variant="muted" />
                </div>
              ) : availableDates.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-[13px] text-muted-foreground">Sin disponibilidad en los próximos días.</p>
                  <p className="text-[12px] text-muted-foreground/70 mt-1">Volvé a revisar pronto.</p>
                </div>
              ) : (
                <>
                  {/* Date picker */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-2.5">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                      <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wide">Selecciona fecha</p>
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                      {availableDates.map((dateStr) => {
                        const { dayName, dayNumber } = parseDateDisplay(dateStr);
                        const isSelected = selectedDay === dateStr;
                        return (
                          <Button
                            key={dateStr}
                            variant={isSelected ? 'default' : 'outline'}
                            hideArrow
                            onClick={() => { setSelectedDay(dateStr); setSelectedTime(null); setScheduleError(null); }}
                            className={cn(
                              'h-auto flex-col gap-0 px-0 py-2.5 rounded-xl',
                              !isSelected && 'hover:border-primary/30'
                            )}
                          >
                            <span className={cn(
                              'block text-[9px] font-semibold uppercase tracking-wide',
                              isSelected ? 'text-white/70' : 'text-muted-foreground'
                            )}>
                              {dayName}
                            </span>
                            <span className="block text-[15px] font-bold mt-0.5 font-mono tabular-nums">{dayNumber}</span>
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Time picker — only shown after a date is selected */}
                  {selectedDay && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-2.5">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                        <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wide">Selecciona hora</p>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {timesForDay.map(({ time, available }) => (
                          <Button
                            key={time}
                            variant={selectedTime === time ? 'default' : 'outline'}
                            hideArrow
                            onClick={() => { if (available) { setSelectedTime(time); setScheduleError(null); } }}
                            disabled={!available}
                            className={cn(
                              'h-auto py-2.5 rounded-md text-[12px] font-semibold font-mono tabular-nums',
                              !available && 'line-through',
                              available && selectedTime !== time && 'hover:border-primary/30'
                            )}
                          >
                            {formatTimeSlot(time)}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Error message */}
              {scheduleError && (
                <p className="text-[12px] text-destructive text-center">{scheduleError}</p>
              )}

              {/* CTA button */}
              <Button
                onClick={handleScheduleVisit}
                disabled={!selectedDay || !selectedTime || isSubmitting || slotsLoading}
                hideArrow
                className="w-full h-auto py-4 rounded-xl text-[14px] gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Spinner size="sm" variant="current" />
                    Agendando...
                  </>
                ) : selectedDay && selectedTime ? (
                  <>
                    <Check className="w-4 h-4" />
                    Confirmar visita
                  </>
                ) : (
                  'Selecciona fecha y hora'
                )}
              </Button>

              <p className="text-[11px] text-muted-foreground text-center flex items-center justify-center gap-2">
                <span className="w-1 h-1 rounded-full bg-[hsl(var(--success-500))]" />
                Visita gratuita
                <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                Cancelación flexible
              </p>
            </div>
          )}
          </>
          )}
        </div>

        {/*
          Acá iba «Última postulación hace 12 minutos», con un punto verde
          pulsando para que pareciera un dato en vivo. Estaba escrito a mano:
          los mismos 12 minutos en TODAS las propiedades, para siempre, incluso
          en una que nadie tocó nunca. Urgencia inventada.

          No se reemplaza por otro número: el back no expone la actividad de una
          propiedad. Cuando la exponga, este es el lugar.
        */}
      </Card>
    </div>
  );
}

// ============================================================================
// MobileStickyCTA
// ============================================================================

/**
 * MobileStickyCTA — Fixed bottom CTA for mobile devices
 */
export function MobileStickyCTA({
  propertyId,
  price,
  listingType = 'rent',
  salePrice,
}: {
  propertyId: string;
  price: number;
  /** contract.md T-0038 §3.2.2/§3.3 — see `StickyCTA`'s prop doc. */
  listingType?: 'rent' | 'sale';
  /** contract.md T-0038 §3.2.3 — `null`/absent renders "Sin dato", never `$0` (C6). */
  salePrice?: number | null;
}) {
  const { user, isAuthenticated, hasActiveAgencyMembership } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isAgencyViewer =
    !!user && (user.role === 'agency' || user.backendRole === 'AGENT' || hasActiveAgencyMembership);
  const isSaleListing = listingType === 'sale';

  // El MISMO compartir que la tarjeta de escritorio: hoja nativa cuando existe,
  // portapapeles cuando no, y toast en los dos desenlaces que importan.
  const { copied, compartir } = useCompartirInmueble(propertyId);
  const [isStartingChat, setIsStartingChat] = useState(false);

  // contract-addendum-2.md §B.2/§B.9 — same action as the desktop
  // StickyCTA's "Contactar" button, wired here too (WU-3 shipped the CTA,
  // this wires the action).
  const handleStartChat = async () => {
    if (isStartingChat) return;
    setIsStartingChat(true);
    try {
      const { conversationId } = await messagesApi.createPropertyInquiry(propertyId);
      router.push(`/inquilino/mensajes?conversationId=${conversationId}`);
    } catch {
      // Mobile CTA has no room for an inline error banner; the desktop
      // StickyCTA on the same page already surfaces one.
    } finally {
      setIsStartingChat(false);
    }
  };

  const handleCopyShare = () => void compartir();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-surface/95 backdrop-blur-xl border-t border-border lg:hidden z-30">
      <div className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-lg font-mono tabular-nums font-bold text-foreground tracking-tight">
              {isSaleListing ? (
                salePrice != null ? formatCurrency(salePrice) : 'Sin dato'
              ) : (
                <>
                  {formatCurrency(price)}
                  <span className="text-[13px] font-medium text-muted-foreground font-sans">/mes</span>
                </>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            {isAgencyViewer ? (
              <Button type="button" onClick={handleCopyShare} hideArrow className="gap-2" data-testid="mobile-agency-share">
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copiado
                  </>
                ) : (
                  <>
                    <ShareNetwork className="w-4 h-4" />
                    Compartir
                  </>
                )}
              </Button>
            ) : isSaleListing ? (
              // contract.md T-0038 §3.3, ledger §2.7 O-1 — no postulación,
              // no @Public() contact surface. Unauthenticated goes to sign-up.
              <>
                <Button
                  type="button"
                  hideArrow
                  isLoading={isStartingChat}
                  disabled={isStartingChat}
                  onClick={() =>
                    isAuthenticated
                      ? handleStartChat()
                      : router.push(`/auth?returnUrl=${encodeURIComponent(pathname)}`)
                  }
                >
                  Contactar
                </Button>
                <Button
                  variant="outline"
                  hideArrow
                  onClick={() =>
                    isAuthenticated
                      ? undefined
                      : router.push(`/auth?returnUrl=${encodeURIComponent(pathname)}`)
                  }
                >
                  Visita
                </Button>
              </>
            ) : (
              <>
                <PostularButton propertyId={propertyId} canonCop={price} hideArrow />
                <Button variant="outline" hideArrow>
                  Visita
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
