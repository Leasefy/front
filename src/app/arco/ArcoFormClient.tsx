'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
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

export function ArcoFormClient() {
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
        body: JSON.stringify(body),
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
    <div className="w-full max-w-xl rounded-[22px] border border-border bg-surface p-8">
      {/* Card header */}
      <div className="text-center mb-8">
        <p className="text-xl font-semibold font-heading text-fg mb-2">
          Leasefy
        </p>
        <h1 className="text-3xl font-semibold font-heading text-fg mb-3">
          {t('inmobiliaria.ai.arco.public.title')}
        </h1>
        <p className="text-sm text-fg-subtle max-w-sm mx-auto">
          {t('inmobiliaria.ai.arco.public.subtitle')}
        </p>
      </div>

      {submitted ? (
        /* Success state */
        <div className="text-center space-y-4">
          <EnvelopeSimple
            weight="duotone"
            className="h-12 w-12 text-[#1A40FF] mx-auto"
          />
          <h2 className="text-xl font-semibold text-fg">
            {t('inmobiliaria.ai.arco.public.successTitle')}
          </h2>
          <p className="text-sm text-fg-subtle">
            {t('inmobiliaria.ai.arco.public.successBody', { email: submittedEmail })}
          </p>
          <p className="text-xs text-fg-subtle">
            {t('inmobiliaria.ai.arco.public.successNote')}
          </p>
          <button
            type="button"
            onClick={resetForm}
            className="text-xs text-[#1A40FF] cursor-pointer hover:text-[#1A40FF] transition-colors mt-2 block mx-auto"
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
              className="text-xs font-normal text-fg-muted"
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
              className="text-xs font-normal text-fg-muted"
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
              className="text-xs font-normal text-fg-muted"
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
              className="text-xs font-normal text-fg-muted"
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
                  {t('inmobiliaria.ai.arco.tabs.acceso')}
                </SelectItem>
                <SelectItem value="rectificacion">
                  {t('inmobiliaria.ai.arco.tabs.rectificacion')}
                </SelectItem>
                <SelectItem value="cancelacion">
                  {t('inmobiliaria.ai.arco.tabs.cancelacion')}
                </SelectItem>
                <SelectItem value="oposicion">
                  {t('inmobiliaria.ai.arco.tabs.oposicion')}
                </SelectItem>
              </SelectContent>
            </Select>
            <ErrorDelCampo id="arco-type-error" mensaje={errores.type} />
          </div>

          {/* Field: Description */}
          <div className="space-y-1.5">
            <label
              htmlFor="arco-description"
              className="text-xs font-normal text-fg-muted"
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
            <p className={`text-xs text-right ${descriptionColorClass}`}>
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
          <p className="text-xs text-fg-subtle text-center mt-6">
            {t('inmobiliaria.ai.arco.public.legalFooter')}{' '}
            <Link
              href="/privacidad"
              className="text-[#1A40FF] hover:text-[#1A40FF] transition-colors"
            >
              {t('inmobiliaria.ai.arco.public.privacyLink')}
            </Link>
            .
          </p>
        </form>
      )}

      {/* Legal footer always shown in success state too */}
      {submitted && (
        <p className="text-xs text-fg-subtle text-center mt-6">
          {t('inmobiliaria.ai.arco.public.legalFooter')}{' '}
          <Link
            href="/privacidad"
            className="text-[#1A40FF] hover:text-[#1A40FF] transition-colors"
          >
            {t('inmobiliaria.ai.arco.public.privacyLink')}
          </Link>
          .
        </p>
      )}
    </div>
  );
}
