'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { LeasefyLogotype } from '@/components/brand';
import { EnvelopeSimple, CircleNotch } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useI18n } from '@/lib/i18n';
import { ApiError } from '@/lib/api/client';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { CAMPOS_DEL_ARCO, revisarSolicitudArco, type CampoDelArco } from './limites-del-arco';

/**
 * El aviso de arriba del formulario. 02-10-2026 (sistema de errores): antes
 * todo lo que no era un 429 decía el mismo «no pudimos enviar», también un
 * dato mal escrito (el micro respondía 422 con Zod en inglés y nadie lo leía)
 * o la red caída. Ahora el 400 va a cada campo y el resto pasa por el
 * traductor (la regla de oro).
 */
type ErrorType = { tipo: 'rateLimit' } | { tipo: 'mensaje'; texto: string } | null;

const ID_DEL_CAMPO: Record<CampoDelArco, string> = {
  requester_name: 'arco-name',
  requester_email: 'arco-email',
  requester_cedula: 'arco-cedula',
  type: 'arco-type',
  description: 'arco-description',
};

function enfocar(campo: CampoDelArco) {
  if (typeof document !== 'undefined') document.getElementById(ID_DEL_CAMPO[campo])?.focus();
}

/**
 * ARCO-1 (Nico 19-10-2026: «formulario por inmobiliaria»). El formulario es de
 * UNA inmobiliaria (`/arco/<inmobiliaria>`): la nombra arriba y le manda su id
 * al micro en `agency_id`. Sin ella, el micro sólo la reconocía por la
 * dirección web y ninguna tiene una: siempre terminaba en «no habilitado».
 */
export interface InmobiliariaDelArco {
  id: string;
  nombre: string;
  logoUrl: string | null;
}

export function ArcoFormClient({ inmobiliaria }: { inmobiliaria?: InmobiliariaDelArco | null }) {
  const { t } = useI18n();

  // Form field state
  const [requesterName, setRequesterName] = useState('');
  const [requesterCedula, setRequesterCedula] = useState('');
  const [requesterEmail, setRequesterEmail] = useState('');
  const [requestType, setRequestType] = useState('');
  const [description, setDescription] = useState('');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [error, setError] = useState<ErrorType>(null);
  const [errores, setErrores] = useState<Partial<Record<CampoDelArco, string>>>({});

  const limpiar = (campo: CampoDelArco) =>
    setErrores((prev) => {
      if (prev[campo] === undefined) return prev;
      const next = { ...prev };
      delete next[campo];
      return next;
    });

  const describir = (campo: CampoDelArco) =>
    errores[campo]
      ? { 'aria-invalid': true as const, 'aria-describedby': `${ID_DEL_CAMPO[campo]}-error` }
      : {};

  function handleCedulaChange(value: string) {
    // Strip non-numeric characters
    setRequesterCedula(value.replace(/\D/g, ''));
  }

  function resetForm() {
    setRequesterName('');
    setRequesterCedula('');
    setRequesterEmail('');
    setRequestType('');
    setDescription('');
    setError(null);
    setErrores({});
    setSubmitted(false);
    setSubmittedEmail('');
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const body = {
      requester_name: requesterName,
      requester_cedula: requesterCedula,
      requester_email: requesterEmail,
      type: requestType,
      description,
    };

    // Lo que el micro rechazaría se ataja antes, con sus mismas frases.
    const locales = revisarSolicitudArco(body);
    setErrores(locales);
    const primero = CAMPOS_DEL_ARCO.find((c) => locales[c]);
    if (primero) {
      enfocar(primero);
      return;
    }

    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL;
    if (!agentUrl) {
      setError({ tipo: 'mensaje', texto: t('inmobiliaria.ai.arco.public.submitError') });
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(`${agentUrl}/api/arco`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inmobiliaria ? { ...body, agency_id: inmobiliaria.id } : body),
      });

      if (res.ok) {
        setSubmittedEmail(requesterEmail);
        setSubmitted(true);
        return;
      }
      if (res.status === 429) {
        setError({ tipo: 'rateLimit' });
        return;
      }
      const cuerpo = (await res.json().catch(() => null)) as Record<string, unknown> | null;
      const fallo = new ApiError(
        res.status,
        (cuerpo?.message as string | string[] | undefined) ?? '',
        typeof cuerpo?.code === 'string' ? cuerpo.code : undefined,
        cuerpo ?? undefined,
      );
      const reparto = repartirErroresDelServidor<CampoDelArco>(fallo, {
        campos: CAMPOS_DEL_ARCO,
        accion: 'enviar tu solicitud',
        porDefecto: t('inmobiliaria.ai.arco.public.submitError'),
      });
      setErrores(reparto.porCampo);
      if (reparto.orden[0]) enfocar(reparto.orden[0]);
      if (reparto.sueltos.length > 0) setError({ tipo: 'mensaje', texto: reparto.sueltos.join(' · ') });
    } catch (err) {
      // Sin respuesta: la regla de oro habla de la conexión.
      setError({
        tipo: 'mensaje',
        texto: mensajeParaLaPersona(err, { porDefecto: t('inmobiliaria.ai.arco.public.submitError') }),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const descriptionColorClass =
    description.length >= 1000
      ? 'text-danger'
      : description.length >= 900
        ? 'text-warning'
        : 'text-fg-subtle';

  return (
    <div className="w-full max-w-xl rounded-lg border border-border bg-surface p-5 shadow-xs sm:p-8">
      {/* Card header */}
      <div className="text-center mb-8">
        {inmobiliaria ? (
          <div className="mb-3 flex items-center justify-center gap-2.5" data-testid="arco-inmobiliaria">
            {inmobiliaria.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- el logo viene de la inmobiliaria, de cualquier dominio
              <img src={inmobiliaria.logoUrl} alt="" className="h-8 w-8 rounded-md object-contain" />
            ) : null}
            <p className="text-body text-fg">{inmobiliaria.nombre}</p>
          </div>
        ) : (
          <LeasefyLogotype className="mx-auto mb-3 h-5 w-auto text-fg" title="Leasefy" />
        )}
        <h1 className="mb-3 text-balance font-heading text-[26px] font-[420] leading-[1.12] tracking-[-0.025em] text-fg sm:text-[30px]">
          {t('inmobiliaria.ai.arco.public.title')}
        </h1>
        <p className="mx-auto max-w-sm text-body-sm text-fg-muted">
          {inmobiliaria
            ? t('inmobiliaria.ai.arco.public.subtitleDe', { inmobiliaria: inmobiliaria.nombre })
            : t('inmobiliaria.ai.arco.public.subtitle')}
        </p>
      </div>

      {submitted ? (
        /* Success state */
        <div className="text-center space-y-4">
          <EnvelopeSimple className="mx-auto h-10 w-10 text-fg-subtle" aria-hidden="true" />
          <h2 className="text-h3 text-fg">
            {t('inmobiliaria.ai.arco.public.successTitle')}
          </h2>
          <p className="text-body-sm text-fg-muted">
            {t('inmobiliaria.ai.arco.public.successBody', { email: submittedEmail })}
          </p>
          <p className="text-caption text-fg-subtle">
            {t('inmobiliaria.ai.arco.public.successNote')}
          </p>
          <button
            type="button"
            onClick={resetForm}
            className="mx-auto mt-2 block cursor-pointer text-body-sm text-fg underline underline-offset-4 transition-colors hover:text-fg-muted"
          >
            {t('inmobiliaria.ai.arco.public.submitAnother')}
          </button>
        </div>
      ) : (
        /* Form state */
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {/* Error alert */}
          {error && (
            <Alert variant="destructive" role="alert">
              <AlertTitle>
                {error.tipo === 'rateLimit'
                  ? t('inmobiliaria.ai.arco.public.rateLimitTitle')
                  : t('inmobiliaria.ai.arco.error.load').split('.')[0]}
              </AlertTitle>
              <AlertDescription>
                {error.tipo === 'rateLimit' ? t('inmobiliaria.ai.arco.public.rateLimitBody') : error.texto}
              </AlertDescription>
            </Alert>
          )}

          {/* Field: Name */}
          <div className="space-y-1.5">
            <label
              htmlFor="arco-name"
              className="text-caption font-normal text-fg-muted"
            >
              {t('inmobiliaria.ai.arco.public.nombreLabel')}
            </label>
            <Input
              id="arco-name"
              type="text"
              required
              maxLength={200}
              value={requesterName}
              onChange={(e) => {
                setRequesterName(e.target.value);
                limpiar('requester_name');
              }}
              autoComplete="name"
              {...describir('requester_name')}
            />
            <ErrorDelCampo id="arco-name-error" mensaje={errores.requester_name} />
          </div>

          {/* Field: Cedula */}
          <div className="space-y-1.5">
            <label
              htmlFor="arco-cedula"
              className="text-caption font-normal text-fg-muted"
            >
              {t('inmobiliaria.ai.arco.public.cedulaLabel')}
            </label>
            <Input
              id="arco-cedula"
              type="text"
              inputMode="numeric"
              required
              pattern="[0-9]{5,12}"
              value={requesterCedula}
              onChange={(e) => {
                handleCedulaChange(e.target.value);
                limpiar('requester_cedula');
              }}
              autoComplete="off"
              {...describir('requester_cedula')}
            />
            {/* La ayuda y el error se cruzan (sin verse los dos ni saltar el alto). */}
            <ErrorDelCampo
              id="arco-cedula-error"
              mensaje={errores.requester_cedula}
              pista={t('inmobiliaria.ai.arco.public.cedulaHint')}
              className="mt-0"
            />
          </div>

          {/* Field: Email */}
          <div className="space-y-1.5">
            <label
              htmlFor="arco-email"
              className="text-caption font-normal text-fg-muted"
            >
              {t('inmobiliaria.ai.arco.public.emailLabel')}
            </label>
            <Input
              id="arco-email"
              type="email"
              required
              value={requesterEmail}
              onChange={(e) => {
                setRequesterEmail(e.target.value);
                limpiar('requester_email');
              }}
              autoComplete="email"
              {...describir('requester_email')}
            />
            <ErrorDelCampo id="arco-email-error" mensaje={errores.requester_email} />
          </div>

          {/* Field: Type */}
          <div className="space-y-1.5">
            <label
              htmlFor="arco-type"
              className="text-caption font-normal text-fg-muted"
            >
              {t('inmobiliaria.ai.arco.public.tipoLabel')}
            </label>
            <Select
              value={requestType}
              onValueChange={(v) => {
                setRequestType(v);
                limpiar('type');
              }}
              required
            >
              <SelectTrigger id="arco-type" className="min-h-[44px]" {...describir('type')}>
                <SelectValue placeholder={t('inmobiliaria.ai.arco.public.tipoLabel')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="acceso">
                  {t('inmobiliaria.ai.arco.public.tipos.acceso')}
                </SelectItem>
                <SelectItem value="rectificacion">
                  {t('inmobiliaria.ai.arco.public.tipos.rectificacion')}
                </SelectItem>
                <SelectItem value="cancelacion">
                  {t('inmobiliaria.ai.arco.public.tipos.cancelacion')}
                </SelectItem>
                <SelectItem value="oposicion">
                  {t('inmobiliaria.ai.arco.public.tipos.oposicion')}
                </SelectItem>
              </SelectContent>
            </Select>
            <ErrorDelCampo id="arco-type-error" mensaje={errores.type} />
          </div>

          {/* Field: Description */}
          <div className="space-y-1.5">
            <label
              htmlFor="arco-description"
              className="text-caption font-normal text-fg-muted"
            >
              {t('inmobiliaria.ai.arco.public.descripcionLabel')}
            </label>
            <Textarea
              id="arco-description"
              required
              minLength={20}
              maxLength={1000}
              rows={4}
              placeholder={t('inmobiliaria.ai.arco.public.descripcionPlaceholder')}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                limpiar('description');
              }}
              className="min-h-[44px]"
              {...describir('description')}
            />
            <ErrorDelCampo id="arco-description-error" mensaje={errores.description} />
            <p className={`text-caption text-right ${descriptionColorClass}`}>
              {description.length}/1000
            </p>
          </div>

          {/* Submit button */}
          <Button
            type="submit"
            disabled={isSubmitting || !requestType}
            className="w-full min-h-[44px]"
          >
            {isSubmitting ? (
              <>
                <CircleNotch className="mr-2 h-4 w-4 animate-spin" />
                {t('inmobiliaria.ai.arco.public.submitting')}
              </>
            ) : (
              t('inmobiliaria.ai.arco.public.submit')
            )}
          </Button>

          {/* Legal footer */}
          <p className="text-caption text-fg-subtle text-center mt-6">
            {t('inmobiliaria.ai.arco.public.legalFooter')}{' '}
            <Link
              href="/privacidad"
              className="text-fg underline underline-offset-2 transition-colors hover:text-fg-muted"
            >
              {t('inmobiliaria.ai.arco.public.privacyLink')}
            </Link>
            .
          </p>
        </form>
      )}

      {/* Legal footer always shown in success state too */}
      {submitted && (
        <p className="text-caption text-fg-subtle text-center mt-6">
          {t('inmobiliaria.ai.arco.public.legalFooter')}{' '}
          <Link
            href="/privacidad"
            className="text-fg underline underline-offset-2 transition-colors hover:text-fg-muted"
          >
            {t('inmobiliaria.ai.arco.public.privacyLink')}
          </Link>
          .
        </p>
      )}
    </div>
  );
}
