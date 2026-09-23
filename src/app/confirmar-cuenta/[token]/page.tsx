'use client';

/**
 * 🔴 Lo que abre el PROPIETARIO desde el correo para confirmar el cambio de su
 * cuenta bancaria (17-09), SIN sesión: el token de la URL es la credencial.
 *
 * Muestra lo mínimo para reconocer el cambio —inmobiliaria, banco, tipo y los
 * últimos cuatro dígitos— y un solo botón. Confirmar NO libera plata: el primer
 * giro a la cuenta nueva queda retenido hasta que un administrador de la
 * inmobiliaria lo apruebe, y la página lo dice. Si no fue él, no confirma y
 * llama a la inmobiliaria.
 */

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Bank, CheckCircle, WarningCircle } from '@phosphor-icons/react';

import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { Button } from '@/components/ui/button';
import { mandatoApi, type CambioDeCuentaPublico } from '@/lib/api/mandato.service';
import { mensajeDelFallo } from '@/lib/contratos/fallo-de-accion';

export default function ConfirmarCuentaBancariaPage() {
  const { token } = useParams<{ token: string }>();
  const [cambio, setCambio] = useState<CambioDeCuentaPublico | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [errorAlConfirmar, setErrorAlConfirmar] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      setCambio(await mandatoApi.cambioPublico(token));
      setError(null);
    } catch (e) {
      setError(e);
    }
  }, [token]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function confirmar() {
    setConfirmando(true);
    setErrorAlConfirmar(null);
    try {
      setCambio(await mandatoApi.confirmarCambioPublico(token));
    } catch (e) {
      setErrorAlConfirmar(mensajeDelFallo(e, 'No se pudo confirmar. Intenta de nuevo.'));
    } finally {
      setConfirmando(false);
    }
  }

  return (
    <main className="min-h-screen bg-bg flex items-center justify-center p-6">
      <section className="w-full max-w-md rounded-lg border border-border bg-surface p-8 space-y-5 shadow-sm">
        <div className="w-10 h-10 rounded-md bg-primary-soft flex items-center justify-center">
          <Bank className="w-5 h-5 text-primary" aria-hidden="true" />
        </div>
        {error && !cambio ? (
          <FalloDeCarga error={error} queEs="el cambio de cuenta" onReintentar={cargar} />
        ) : !cambio ? (
          <p className="text-body-sm text-fg-muted">Cargando…</p>
        ) : (
          <>
            <div className="space-y-1">
              <h1 className="text-h2">Confirma el cambio de tu cuenta bancaria</h1>
              <p className="text-body-sm text-fg-muted">
                Hola {cambio.propietario}, {cambio.inmobiliaria} recibió una solicitud para girarte tus
                arriendos a esta cuenta:
              </p>
            </div>
            <div className="rounded-md bg-surface-muted px-4 py-3">
              <p className="text-body font-medium">{cambio.banco ?? 'Banco'}</p>
              <p className="text-body-sm text-fg-muted">
                {cambio.tipoDeCuenta ?? ''} · <span className="font-mono">{cambio.cuentaEnmascarada}</span>
              </p>
              {/* 🔴 22-09: si la cuenta es de otra persona, el propietario tiene que
                  leer de quién ANTES de autorizar que su plata salga para allá. */}
              {cambio.titularDeOtraPersona ? (
                <p className="mt-1 text-body-sm text-fg" data-testid="titular-de-otra-persona">
                  A nombre de <strong>{cambio.titularDeOtraPersona}</strong>, no tuyo.
                </p>
              ) : null}
            </div>

            {cambio.estado === 'PENDIENTE_CONFIRMACION' && !cambio.vencido ? (
              <>
                <p className="text-body-sm text-fg-muted">
                  Aunque confirmes, el primer giro a la cuenta nueva queda retenido hasta que un
                  administrador de {cambio.inmobiliaria} lo apruebe. Si no pediste este cambio, no confirmes
                  y comunícate con la inmobiliaria.
                </p>
                {errorAlConfirmar ? (
                  <p className="text-body-sm text-danger flex gap-2" role="alert">
                    <WarningCircle className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
                    {errorAlConfirmar}
                  </p>
                ) : null}
                <Button onClick={confirmar} isLoading={confirmando} className="w-full" data-testid="confirmar-cuenta">
                  Sí, confirmo el cambio
                </Button>
              </>
            ) : cambio.estado === 'PENDIENTE_CONFIRMACION' && cambio.vencido ? (
              <p className="text-body-sm text-warning">
                Este enlace venció. Si el cambio es tuyo, pídele a {cambio.inmobiliaria} que lo solicite de nuevo.
              </p>
            ) : cambio.estado === 'CONFIRMADO' || cambio.estado === 'APROBADO' ? (
              <p className="text-body-sm text-success flex gap-2" data-testid="cuenta-confirmada">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
                {cambio.estado === 'APROBADO'
                  ? 'Cambio confirmado y aprobado: tus giros van a esta cuenta.'
                  : 'Listo, confirmaste el cambio. Tu próximo giro sale a esta cuenta cuando la inmobiliaria lo apruebe.'}
              </p>
            ) : (
              <p className="text-body-sm text-fg-muted">
                Esta solicitud ya se cerró. Si tienes dudas, comunícate con {cambio.inmobiliaria}.
              </p>
            )}
          </>
        )}
      </section>
    </main>
  );
}
