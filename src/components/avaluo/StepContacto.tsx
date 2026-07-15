'use client';

import { useContext, useEffect } from 'react';
import { AuthContext } from '@/lib/auth/auth-context';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useAvaluo } from './AvaluoContext';

// ---------------------------------------------------------------------------
// StepContacto — Step 2
// ---------------------------------------------------------------------------

/**
 * Step 2: Requester email + three distinct Ley 1581 (Habeas Data) consents.
 *
 * Auth-aware: uses useContext(AuthContext) directly — NOT useAuth() — because
 * this component lives inside AvaluoProvider which is outside AuthProvider.
 * useAuth() throws if outside AuthProvider; useContext never throws.
 */
export function StepContacto() {
  const authContext = useContext(AuthContext);
  const { formData, updateFormData } = useAvaluo();

  const authenticatedEmail = authContext?.user?.email;

  // Pre-fill email when the user is logged in
  useEffect(() => {
    if (authenticatedEmail && formData.identity !== authenticatedEmail) {
      updateFormData({ identity: authenticatedEmail });
    }
    // Only run when authenticatedEmail changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticatedEmail]);

  return (
    <div className="space-y-6">
      {/* Email */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-fg">
          Email de contacto <span className="text-danger">*</span>
        </label>
        <Input
          type="email"
          placeholder="tu@correo.com"
          value={formData.identity}
          onChange={(e) => updateFormData({ identity: e.target.value })}
          disabled={!!authenticatedEmail}
          readOnly={!!authenticatedEmail}
          autoComplete="email"
          aria-describedby="email-hint"
        />
        {authenticatedEmail ? (
          <p id="email-hint" className="text-xs text-fg-muted">
            Usando el email de tu cuenta.
          </p>
        ) : (
          <p id="email-hint" className="text-xs text-fg-muted">
            Te enviaremos el enlace de seguimiento a este correo.
          </p>
        )}
      </div>

      {/* Consents — Ley 1581 (Habeas Data) */}
      <div className="space-y-4">
        <p className="text-sm font-medium text-fg">
          Consentimientos de datos personales
        </p>

        {/* Consent 1: purposeAvaluo — REQUIRED */}
        <div className="space-y-1">
          <div className="flex items-start gap-3">
            <Checkbox
              id="consent-avaluo"
              checked={formData.purposeAvaluo}
              onCheckedChange={(v) =>
                updateFormData({ purposeAvaluo: v === true })
              }
              aria-required="true"
              aria-describedby="consent-avaluo-desc"
            />
            <label
              htmlFor="consent-avaluo"
              className="text-sm text-fg leading-snug cursor-pointer"
            >
              Autorizo a Leasefy a procesar mis datos personales para generar
              el avalúo comercial solicitado.
            </label>
          </div>
          <p
            id="consent-avaluo-desc"
            className="text-xs text-fg-muted pl-7"
          >
            Necesario para continuar.
          </p>
          {!formData.purposeAvaluo && (
            <p className="text-xs text-warning pl-7">
              Debés aceptar este consentimiento para enviar la solicitud.
            </p>
          )}
        </div>

        {/* Consent 2: purposeDataset — optional */}
        <div className="flex items-start gap-3">
          <Checkbox
            id="consent-dataset"
            checked={formData.purposeDataset}
            onCheckedChange={(v) =>
              updateFormData({ purposeDataset: v === true })
            }
          />
          <label
            htmlFor="consent-dataset"
            className="text-sm text-fg leading-snug cursor-pointer"
          >
            Autorizo el uso anónimo de los datos de este inmueble en datasets
            de investigación de mercado inmobiliario. (Opcional)
          </label>
        </div>

        {/* Consent 3: purposeContacto — optional */}
        <div className="flex items-start gap-3">
          <Checkbox
            id="consent-contacto"
            checked={formData.purposeContacto}
            onCheckedChange={(v) =>
              updateFormData({ purposeContacto: v === true })
            }
          />
          <label
            htmlFor="consent-contacto"
            className="text-sm text-fg leading-snug cursor-pointer"
          >
            Autorizo a Leasefy a contactarme con ofertas, noticias y novedades
            del servicio por email o WhatsApp. (Opcional)
          </label>
        </div>
      </div>

      {/* Policy notice */}
      <p className="text-xs text-fg-muted leading-relaxed">
        Tus datos son tratados conforme a la Ley 1581 de 2012 (Habeas Data) y
        la política de privacidad de Leasefy.
      </p>
    </div>
  );
}
