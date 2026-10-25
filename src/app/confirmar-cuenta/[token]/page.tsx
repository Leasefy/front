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
import { CheckCircle, Info, WarningCircle } from '@phosphor-icons/react';
import { Presence } from '@leasefy/cadence';

import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import {
  AvisoDelEnlace,
  CargandoElEnlace,
  DatoDelEnlace,
  MarcoDelEnlace,
  TituloDelEnlace,
} from '@/components/enlace-publico/MarcoDelEnlace';
import { Button } from '@/components/ui/button';
import { mandatoApi, type CambioDeCuentaPublico } from '@/lib/api/mandato.service';
import { mensajeDelFallo } from '@/lib/contratos/fallo-de-accion';
import { fechaCorta, hoyEnColombia } from '@/lib/fechas/fecha-de-la-casa';

/** El día (en Colombia) hasta el que sirve el enlace: «24 oct 2026». */
function venceElDia(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return fechaCorta(hoyEnColombia(d));
}

/** A nombre de otra persona: se lee ANTES de autorizar que la plata salga para allá. */
function TitularDeOtraPersona({ nombre, testId }: { nombre: string; testId?: string }) {
  return (
    <p
      className="mt-3 flex items-start gap-2 rounded-md bg-warning-soft px-3 py-2.5 text-body-sm text-fg"
      data-testid={testId}
    >
      <WarningCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" weight="fill" aria-hidden="true" />
      <span>
        A nombre de <strong className="font-medium">{nombre}</strong>, no tuyo.
      </span>
    </p>
  );
}

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

  const reparto = cambio?.reparto && cambio.reparto.length > 1 ? cambio.reparto : null;
  const pendiente = cambio?.estado === 'PENDIENTE_CONFIRMACION' && !cambio.vencido;
  const vence = pendiente ? venceElDia(cambio?.expiraAt) : null;

  return (
    <MarcoDelEnlace de={cambio?.inmobiliaria} vista={error && !cambio ? 'error' : !cambio ? 'cargando' : 'cambio'}>
      {error && !cambio ? (
        <FalloDeCarga error={error} queEs="el cambio de cuenta" onReintentar={cargar} enmarcado={false} />
      ) : !cambio ? (
        <CargandoElEnlace texto="Cargando el cambio de cuenta…" />
      ) : (
        <>
          <TituloDelEnlace
            rotulo="Cambio de cuenta bancaria"
            titulo="Confirma el cambio de tu cuenta bancaria"
            descripcion={
              reparto
                ? `Hola ${cambio.propietario}, ${cambio.inmobiliaria} recibió una solicitud para repartir tus arriendos entre ${reparto.length} cuentas:`
                : `Hola ${cambio.propietario}, ${cambio.inmobiliaria} recibió una solicitud para girarte tus arriendos a esta cuenta:`
            }
          />

          {/* 🔴 22-09: con reparto, el propietario autoriza TODAS las cuentas,
              no sólo la principal: se le muestran todas, con su porcentaje. */}
          {reparto ? (
            <ul className="divide-y divide-border-faint rounded-md border border-border" data-testid="reparto-a-confirmar">
              {reparto.map((c, i) => (
                <li key={i} className="px-4 py-3.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="min-w-0 text-body text-fg">{c.banco ?? 'Banco'}</p>
                    <p className="shrink-0 font-mono text-body tabular-nums text-fg">{c.porcentaje} %</p>
                  </div>
                  <p className="mt-0.5 text-body-sm text-fg-muted">
                    {c.tipoDeCuenta ?? ''} · <span className="font-mono tabular-nums">{c.cuentaEnmascarada}</span>
                  </p>
                  {c.titularDeOtraPersona ? <TitularDeOtraPersona nombre={c.titularDeOtraPersona} /> : null}
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-md border border-border px-4 py-4">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                <div className="col-span-2">
                  <DatoDelEnlace rotulo="Banco">{cambio.banco ?? 'Banco'}</DatoDelEnlace>
                </div>
                <DatoDelEnlace rotulo="Tipo de cuenta">{cambio.tipoDeCuenta ?? '—'}</DatoDelEnlace>
                <DatoDelEnlace rotulo="Número" mono>
                  {cambio.cuentaEnmascarada}
                </DatoDelEnlace>
              </dl>
              {/* 🔴 22-09: si la cuenta es de otra persona, el propietario tiene que
                  leer de quién ANTES de autorizar que su plata salga para allá. */}
              {cambio.titularDeOtraPersona ? (
                <TitularDeOtraPersona nombre={cambio.titularDeOtraPersona} testId="titular-de-otra-persona" />
              ) : null}
            </div>
          )}

          {pendiente ? (
            <div className="space-y-4">
              <p className="flex items-start gap-2 text-body-sm text-fg-muted">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-fg-subtle" aria-hidden="true" />
                <span>
                  Aunque confirmes, el primer giro a la cuenta nueva queda retenido hasta que un
                  administrador de {cambio.inmobiliaria} lo apruebe.
                </span>
              </p>
              <Presence show={Boolean(errorAlConfirmar)}>
                <p className="flex gap-2 text-body-sm text-danger" role="alert">
                  <WarningCircle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  {errorAlConfirmar}
                </p>
              </Presence>
              <Button onClick={confirmar} isLoading={confirmando} className="w-full" data-testid="confirmar-cuenta">
                Sí, confirmo el cambio
              </Button>
              <p className="text-center text-body-sm text-fg">
                Si no pediste este cambio, no confirmes y comunícate con la inmobiliaria.
              </p>
              {vence ? (
                <p className="text-center text-caption text-fg-subtle" data-testid="vence-el-enlace">
                  Puedes confirmarlo hasta el {vence}.
                </p>
              ) : null}
            </div>
          ) : cambio.estado === 'PENDIENTE_CONFIRMACION' && cambio.vencido ? (
            <AvisoDelEnlace tono="vencido" titulo="Este enlace venció" data-testid="cambio-vencido">
              <p>Si el cambio es tuyo, pídele a {cambio.inmobiliaria} que lo solicite de nuevo.</p>
            </AvisoDelEnlace>
          ) : cambio.estado === 'CONFIRMADO' || cambio.estado === 'APROBADO' ? (
            <Presence
              show
              className="flex items-start gap-2.5 rounded-md bg-success-soft px-4 py-3 text-body-sm text-fg"
              data-testid="cuenta-confirmada"
            >
              <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-success" weight="fill" aria-hidden="true" />
              <span>
                {cambio.estado === 'APROBADO'
                  ? 'Cambio confirmado y aprobado: tus giros van a esta cuenta.'
                  : 'Listo, confirmaste el cambio. Tu próximo giro sale a esta cuenta cuando la inmobiliaria lo apruebe.'}
              </span>
            </Presence>
          ) : (
            <p className="text-body-sm text-fg-muted">
              Esta solicitud ya se cerró. Si tienes dudas, comunícate con {cambio.inmobiliaria}.
            </p>
          )}
        </>
      )}
    </MarcoDelEnlace>
  );
}
