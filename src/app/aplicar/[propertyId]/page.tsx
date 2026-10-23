'use client';

import { use, useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { CheckCircle, HouseLine, Tag } from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { CargaDeMarca } from '@/components/ui/carga-de-marca';
import { WizardShell } from '@/components/wizard/WizardShell';
import { PostulacionEnviadaModal } from '@/components/tenant/PostulacionEnviadaModal';
import { ApplicationProvider, useApplication } from '@/lib/context/ApplicationContext';
import { useProperty } from '@/lib/hooks/useProperties';
import { applicationsApi } from '@/lib/api/applications.service';
import { useAuth } from '@/lib/auth/use-auth';
import type { Property } from '@/lib/types/property';

// Step components
import { StepPersonal } from '@/components/wizard/steps/StepPersonal';
import { StepEmployment } from '@/components/wizard/steps/StepEmployment';
import { StepIncome } from '@/components/wizard/steps/StepIncome';
import { StepDocuments } from '@/components/wizard/steps/StepDocuments';
import { StepReview } from '@/components/wizard/steps/StepReview';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { PostulacionDirecta } from '@/components/tenant/PostulacionDirecta';
import { usePostulacionDirecta } from '@/lib/hooks/use-postulacion-directa';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { ofertaDelEstudio, type OfertaDelEstudio as Oferta } from '@/components/tenant/PostularButton';
import { OfertaDelEstudio } from '@/components/tenant/OfertaDelEstudio';
import { useAprobacion } from '@/lib/hooks/use-aprobacion';
import {
  leerElegibilidad,
  ofertaPorElegibilidad,
  type Elegibilidad,
} from '@/lib/tenant/antes-de-postularte';

// ============================================================================
// Page props
// ============================================================================

interface AplicarPageProps {
  params: Promise<{ propertyId: string }>;
}

// ============================================================================
// Page component
// ============================================================================

/**
 * Application wizard page
 * Route: /aplicar/[propertyId]
 */
export default function AplicarPage({ params }: AplicarPageProps) {
  const resolvedParams = use(params);
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { property, isLoading, error, errorCrudo } = useProperty(resolvedParams.propertyId);

  // Postulación directa: quien ya se estudió, está vigente, el inmueble le
  // entra en el tope y ya llenó una postulación completa no tiene por qué
  // volver a llenar seis pasos. `?formulario=1` es la salida explícita.
  const verFormulario = searchParams.get('formulario') === '1';
  const {
    cargando: decidiendoCamino,
    prefillDirecto,
    consentText,
  } = usePostulacionDirecta(property?.monthlyRent ?? undefined);
  const [postuladaId, setPostuladaId] = useState<string | null>(null);

  // Get pre-filled name and email from URL params (lead capture)
  const initialName = searchParams.get('name') || '';
  const initialEmail = searchParams.get('email') || '';

  // Get agent attribution from URL params (shareable links)
  const agentCode = searchParams.get('ref') || undefined;
  const linkCode = searchParams.get('link') || undefined;

  // Existing-application detection: an authenticated user who already applied to
  // this property cannot create a second one (backend 409). Detect it up front
  // and show a card instead of letting them redo the whole wizard and dead-end
  // at submit. undefined = still checking, null = none, object = already applied.
  //
  // `useAuth`, no `getAccessToken()`: el token vive en memoria y lo pone el
  // AuthProvider cuando Supabase responde. Leerlo durante el render devuelve
  // null en la primera pasada aunque haya sesión, y entonces esta detección se
  // saltaba entera — quien ya había postulado volvía a llenar los seis pasos
  // para chocar con un 409 al enviar.
  const { isAuthenticated: isAuthed, isLoading: resolviendoSesion } = useAuth();
  const [existingApp, setExistingApp] = useState<
    { id: string; status: string } | null | undefined
  >(undefined);
  const [withdrawing, setWithdrawing] = useState(false);
  const [errorAlRetirar, setErrorAlRetirar] = useState<string | null>(null);

  // 🔴 El estudio es OPCIONAL (Nico, 04-10-2026; reemplaza F-08 y el «Antes de
  // postularte» de QA-IA-A): nadie se queda sin postularse por el estudio. Lo
  // que se lee acá es qué OFRECERLE: con sesión, el veredicto del back; sin
  // sesión, la aprobación local (quien se aprobó por un enlace y aún no tiene
  // cuenta).
  const aprobacionLocal = useAprobacion();
  const [elegibilidad, setElegibilidad] = useState<Elegibilidad | null | undefined>(undefined);
  useEffect(() => {
    if (resolviendoSesion) return;
    if (!isAuthed) {
      setElegibilidad(null);
      return;
    }
    let cancelado = false;
    void leerElegibilidad().then((e) => {
      if (!cancelado) setElegibilidad(e);
    });
    return () => {
      cancelado = true;
    };
  }, [isAuthed, resolviendoSesion]);
  const oferta: Oferta | null = isAuthed
    ? ofertaPorElegibilidad(elegibilidad)
    : aprobacionLocal.cargando
      ? null
      : ofertaDelEstudio({
          aprobacion: aprobacionLocal.aprobacion,
          vigente: aprobacionLocal.vigente,
          haySesion: false,
        });
  const decidiendoSiPuede =
    resolviendoSesion || (isAuthed ? elegibilidad === undefined : aprobacionLocal.cargando);

  useEffect(() => {
    if (resolviendoSesion) return; // todavía no se sabe si hay sesión
    if (!isAuthed) {
      setExistingApp(null); // guests can't have an account-bound application
      return;
    }
    let cancelled = false;
    applicationsApi
      .getMine()
      .then((apps) => {
        if (cancelled) return;
        // Statuses that block a re-apply (mirror the backend guard, which allows
        // a new application only after WITHDRAWN/REJECTED).
        const blocking = ['draft', 'submitted', 'under_review', 'approved'];
        const active = apps.find(
          (a) =>
            a.propertyId === resolvedParams.propertyId &&
            blocking.includes(a.status),
        );
        setExistingApp(active ? { id: active.id, status: active.status } : null);
      })
      .catch(() => {
        // On a failed check, fall through to the wizard rather than blocking.
        if (!cancelled) setExistingApp(null);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthed, resolviendoSesion, resolvedParams.propertyId]);

  const handleWithdrawAndReapply = useCallback(async () => {
    if (!existingApp) return;
    setWithdrawing(true);
    setErrorAlRetirar(null);
    try {
      await applicationsApi.withdraw(existingApp.id);
      setExistingApp(null); // withdrawn → the wizard can render
    } catch (err) {
      // 🔴 02-10-2026: antes sólo se apagaba el spinner y la persona no sabía
      // que no se retiró. Ahora se dice por qué, con la regla de oro.
      setErrorAlRetirar(
        mensajeParaLaPersona(err, {
          accion: 'retirar tu postulación',
          porDefecto: 'No pudimos retirar tu postulación. Prueba de nuevo en un momento.',
        }),
      );
    } finally {
      setWithdrawing(false);
    }
  }, [existingApp]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <CargaDeMarca tamano="lg" />
      </div>
    );
  }

  // 404 handling
    /*
   * «No existe» y «no se pudo cargar» eran la misma pantalla: `if (!x || error)`.
   * Le decía a alguien con mala conexión que esta propiedad había sido eliminada, y sin
   * ofrecer reintentar — porque sobre algo que no existe reintentar no tiene
   * sentido. Las dos señales ya estaban por separado; se juntaban a mano.
   */
  if (error) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6">
        <FalloDeCarga
          error={errorCrudo ?? error}
          queEs="este inmueble"
          volverA={{ label: 'Ver inmuebles disponibles', href: '/propiedades' }}
        />
      </div>
    );
  }

  if (!property) {
    return (
      <AvisoDeAplicar
        icono={HouseLine}
        titulo="Propiedad no encontrada"
        texto="El inmueble que buscas no existe o ya no está publicado."
        accion={{ href: '/propiedades', label: 'Ver inmuebles disponibles' }}
      />
    );
  }

  // contract.md T-0038 §3.3 (WU-2) — a SALE listing 409s at submit with
  // PROPIEDAD_EN_VENTA. Gating here, before the six-step wizard even
  // starts, matches the existing "existing-application detection" reasoning
  // right above: show a card instead of letting the tenant fill the whole
  // wizard only to dead-end at submit. Reachable via a stale link, or a
  // listing that switched RENT->SALE after the link was shared.
  if (property.listingType === 'sale') {
    return (
      <AvisoDeAplicar
        icono={Tag}
        titulo="Este inmueble está en venta"
        texto="No se puede postular a un inmueble en venta. Contacta a la inmobiliaria por chat o agenda una visita desde la ficha del inmueble."
        accion={{ href: `/propiedades/${resolvedParams.propertyId}`, label: 'Volver al inmueble' }}
      />
    );
  }

  // Property not available for applications
  if (property.status !== 'available') {
    return (
      <AvisoDeAplicar
        icono={HouseLine}
        titulo="Propiedad no disponible"
        texto="Este inmueble ya no recibe postulaciones."
        accion={{ href: '/propiedades', label: 'Ver inmuebles disponibles' }}
      />
    );
  }

  // Still checking whether this authenticated user already applied, or which
  // of the two paths they take. Se espera a las dos: mostrar el formulario y
  // reemplazarlo un segundo después por la pantalla directa sería peor que
  // esperar.
  if (decidiendoCamino || decidiendoSiPuede || (isAuthed && existingApp === undefined)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <CargaDeMarca tamano="lg" />
      </div>
    );
  }

  // Already applied → offer to view it or withdraw and start over, instead of a
  // dead-end wizard that 409s at submit.
  if (existingApp) {
    return (
      <AlreadyAppliedCard
        applicationId={existingApp.id}
        onWithdraw={handleWithdrawAndReapply}
        withdrawing={withdrawing}
        error={errorAlRetirar}
      />
    );
  }

  // A quien ya se estudió, tiene la aprobación vigente, el inmueble le entra en
  // el tope y ya llenó una postulación completa, no hay nada que preguntarle:
  // una pantalla de confirmación en vez de los seis pasos.
  //
  // El "ya quedaste postulado" va ENCIMA de esa pantalla, no en lugar de ella:
  // así queda a la vista a cuál de los inmuebles corresponde.
  if (prefillDirecto && !verFormulario) {
    return (
      <>
        <PostulacionDirecta
          property={property}
          prefill={prefillDirecto}
          consentText={consentText}
          hrefFormulario={`${pathname}?formulario=1`}
          onPostulada={setPostuladaId}
        />
        {postuladaId ? (
          <PostulacionEnviadaModal
            property={property}
            applicationId={postuladaId}
          />
        ) : null}
      </>
    );
  }

  return (
    <ApplicationProvider
      propertyId={property.id}
      initialName={initialName}
      initialEmail={initialEmail}
      agentCode={agentCode}
      linkCode={linkCode}
    >
      <WizardContent property={property} oferta={oferta} />
    </ApplicationProvider>
  );
}

// ============================================================================
// Un final sin formulario (no existe, en venta, no disponible)
// ============================================================================

/**
 * Cuando no hay a qué postularse: el ícono suelto, un título liviano, por qué
 * y UNA salida (glow up 22-10; antes títulos en negrilla y botones con flecha).
 */
function AvisoDeAplicar({
  icono: Icono,
  titulo,
  texto,
  accion,
}: {
  icono: Icon;
  titulo: string;
  texto: string;
  accion: { href: string; label: string };
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-md space-y-4 rounded-lg border border-border bg-surface p-6 text-center sm:p-8">
        <Icono className="mx-auto h-8 w-8 text-fg-subtle" aria-hidden="true" />
        <div className="space-y-2">
          <h1 className="text-balance font-heading text-[24px] font-[420] leading-[1.15] tracking-[-0.02em] text-fg">
            {titulo}
          </h1>
          <p className="text-body-sm text-fg-muted">{texto}</p>
        </div>
        <Button asChild className="w-full sm:w-auto" hideArrow>
          <Link href={accion.href}>{accion.label}</Link>
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Already-applied card
// ============================================================================

interface AlreadyAppliedCardProps {
  applicationId: string;
  onWithdraw: () => void;
  withdrawing: boolean;
  /** Por qué no se pudo retirar (null = no hubo fallo). */
  error: string | null;
}

function AlreadyAppliedCard({
  applicationId,
  onWithdraw,
  withdrawing,
  error,
}: AlreadyAppliedCardProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="w-full max-w-md space-y-4 rounded-lg border border-border bg-surface p-6 text-center sm:p-8">
        {/* El visto suelto, sin círculo de color detrás. */}
        <CheckCircle className="mx-auto h-8 w-8 text-success" weight="fill" aria-hidden="true" />
        <div className="space-y-2">
          <h1 className="text-balance font-heading text-[24px] font-[420] leading-[1.15] tracking-[-0.02em] text-fg">
            Ya tienes una postulación
          </h1>
          <p className="text-body-sm text-fg-muted">
            Ya te postulaste a este inmueble. Puedes ver el estado de tu postulación,
            o retirarla para volver a empezar.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Button asChild className="w-full" hideArrow>
            <Link href={`/inquilino/aplicaciones/${applicationId}`}>Ver mi postulación</Link>
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            hideArrow
            onClick={onWithdraw}
            isLoading={withdrawing}
            disabled={withdrawing}
          >
            Retirar y volver a postular
          </Button>
        </div>
        {error ? (
          <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-body-sm text-danger">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}

// ============================================================================
// Wizard content wrapper
// ============================================================================

interface WizardContentProps {
  property: Property;
  /** Qué ofrecerle sobre el estudio (nunca un freno). `null` = nada. */
  oferta: Oferta | null;
}

/**
 * Wrapper that handles the submission state and switches between wizard and confirmation
 */
function WizardContent({ property, oferta }: WizardContentProps) {
  const { application, isGuestSubmission } = useApplication();
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Handle successful submission
  const handleSubmissionComplete = useCallback(() => {
    setIsSubmitted(true);
  }, []);

  const enviada = isSubmitted || application.status === 'submitted';

  // El aviso de "ya te postulaste" va encima del formulario, no en su lugar:
  // detrás queda lo que se acaba de mandar.
  return (
    <>
      <WizardShell property={property}>
        <WizardStepContent
          onSubmissionComplete={handleSubmissionComplete}
          oferta={oferta}
          propertyId={property.id}
        />
      </WizardShell>
      {enviada ? (
        <PostulacionEnviadaModal
          property={property}
          applicationId={application.id}
          esInvitado={isGuestSubmission}
          correoInvitado={application.personal.email}
        />
      ) : null}
    </>
  );
}

// ============================================================================
// Step content component
// ============================================================================

interface WizardStepContentProps {
  onSubmissionComplete: () => void;
  oferta: Oferta | null;
  propertyId: string;
}

/**
 * Renders the appropriate step component based on current step
 */
function WizardStepContent({ onSubmissionComplete, oferta, propertyId }: WizardStepContentProps) {
  const { currentStep, application, submitApplication, isLoading } = useApplication();

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    await submitApplication();
    onSubmissionComplete();
  }, [submitApplication, onSubmissionComplete]);

  return (
    <div className="space-y-6">
      {/* El estudio, ofrecido como ayuda al empezar (nunca un freno) y, al
          final, cómo va a ver la inmobiliaria la postulación. */}
      {oferta && currentStep === 1 && <OfertaDelEstudio oferta={oferta} propertyId={propertyId} />}
      {oferta && currentStep === 5 && (
        <OfertaDelEstudio oferta={oferta} propertyId={propertyId} compacta />
      )}

      {/* Step 1: Personal Information */}
      {currentStep === 1 && <StepPersonal />}

      {/* Step 2: Employment Information */}
      {currentStep === 2 && <StepEmployment />}

      {/* Step 3: Income Information */}
      {currentStep === 3 && <StepIncome />}

      {/* Step 4: Documents */}
      {currentStep === 4 && <StepDocuments />}

      {/* Step 5: Review */}
      {currentStep === 5 && <StepReview />}
    </div>
  );
}
