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

type ErrorType = 'rateLimit' | 'generic' | null;

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
    setSubmitted(false);
    setSubmittedEmail('');
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL;
    if (!agentUrl) {
      setError('generic');
      return;
    }

    setIsSubmitting(true);

    try {
      const body = {
        requester_name: requesterName,
        requester_cedula: requesterCedula,
        requester_email: requesterEmail,
        type: requestType,
        description,
      };

      const res = await fetch(`${agentUrl}/api/arco`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setSubmittedEmail(requesterEmail);
        setSubmitted(true);
      } else if (res.status === 429) {
        setError('rateLimit');
      } else {
        setError('generic');
      }
    } catch {
      setError('generic');
    } finally {
      setIsSubmitting(false);
    }
  }

  const descriptionColorClass =
    description.length >= 1000
      ? 'text-rose-600 dark:text-rose-400'
      : description.length >= 900
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-muted-foreground';

  return (
    <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-8 shadow-sm">
      {/* Card header */}
      <div className="text-center mb-8">
        <p className="text-xl font-semibold font-[Manrope,sans-serif] text-foreground mb-2">
          Leasefy
        </p>
        <h1 className="text-3xl font-semibold font-[Manrope,sans-serif] text-foreground mb-3">
          {t('inmobiliaria.ai.arco.public.title')}
        </h1>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          {t('inmobiliaria.ai.arco.public.subtitle')}
        </p>
      </div>

      {submitted ? (
        /* Success state */
        <div className="text-center space-y-4">
          <EnvelopeSimple
            weight="duotone"
            className="h-12 w-12 text-indigo-500 mx-auto"
          />
          <h2 className="text-xl font-semibold text-foreground">
            {t('inmobiliaria.ai.arco.public.successTitle')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t('inmobiliaria.ai.arco.public.successBody', { email: submittedEmail })}
          </p>
          <p className="text-xs text-muted-foreground/70">
            {t('inmobiliaria.ai.arco.public.successNote')}
          </p>
          <button
            type="button"
            onClick={resetForm}
            className="text-xs text-indigo-500 cursor-pointer hover:text-indigo-600 transition-colors mt-2 block mx-auto"
          >
            {t('inmobiliaria.ai.arco.public.submitAnother')}
          </button>
        </div>
      ) : (
        /* Form state */
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {/* Error alert */}
          {error && (
            <Alert variant="destructive">
              <AlertTitle>
                {error === 'rateLimit'
                  ? t('inmobiliaria.ai.arco.public.rateLimitTitle')
                  : t('inmobiliaria.ai.arco.error.load').split('.')[0]}
              </AlertTitle>
              <AlertDescription>
                {error === 'rateLimit'
                  ? t('inmobiliaria.ai.arco.public.rateLimitBody')
                  : t('inmobiliaria.ai.arco.public.submitError')}
              </AlertDescription>
            </Alert>
          )}

          {/* Field: Name */}
          <div className="space-y-1.5">
            <label
              htmlFor="arco-name"
              className="text-xs font-normal text-foreground"
            >
              {t('inmobiliaria.ai.arco.public.nombreLabel')}
            </label>
            <Input
              id="arco-name"
              type="text"
              required
              maxLength={200}
              value={requesterName}
              onChange={(e) => setRequesterName(e.target.value)}
              autoComplete="name"
            />
          </div>

          {/* Field: Cedula */}
          <div className="space-y-1.5">
            <label
              htmlFor="arco-cedula"
              className="text-xs font-normal text-foreground"
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
              onChange={(e) => handleCedulaChange(e.target.value)}
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              {t('inmobiliaria.ai.arco.public.cedulaHint')}
            </p>
          </div>

          {/* Field: Email */}
          <div className="space-y-1.5">
            <label
              htmlFor="arco-email"
              className="text-xs font-normal text-foreground"
            >
              {t('inmobiliaria.ai.arco.public.emailLabel')}
            </label>
            <Input
              id="arco-email"
              type="email"
              required
              value={requesterEmail}
              onChange={(e) => setRequesterEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          {/* Field: Type */}
          <div className="space-y-1.5">
            <label
              htmlFor="arco-type"
              className="text-xs font-normal text-foreground"
            >
              {t('inmobiliaria.ai.arco.public.tipoLabel')}
            </label>
            <Select value={requestType} onValueChange={setRequestType} required>
              <SelectTrigger id="arco-type" className="min-h-[44px]">
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
          </div>

          {/* Field: Description */}
          <div className="space-y-1.5">
            <label
              htmlFor="arco-description"
              className="text-xs font-normal text-foreground"
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
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[44px]"
            />
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
          <p className="text-xs text-muted-foreground/70 text-center mt-6">
            {t('inmobiliaria.ai.arco.public.legalFooter')}{' '}
            <Link
              href="/privacidad"
              className="text-indigo-500 hover:text-indigo-600 transition-colors"
            >
              {t('inmobiliaria.ai.arco.public.privacyLink')}
            </Link>
            .
          </p>
        </form>
      )}

      {/* Legal footer always shown in success state too */}
      {submitted && (
        <p className="text-xs text-muted-foreground/70 text-center mt-6">
          {t('inmobiliaria.ai.arco.public.legalFooter')}{' '}
          <Link
            href="/privacidad"
            className="text-indigo-500 hover:text-indigo-600 transition-colors"
          >
            {t('inmobiliaria.ai.arco.public.privacyLink')}
          </Link>
          .
        </p>
      )}
    </div>
  );
}
