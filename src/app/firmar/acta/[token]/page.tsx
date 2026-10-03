'use client';

/**
 * 🔴 EL INQUILINO FIRMA EL ACTA POR ENLACE (ARREGLOS-3, 03-10-2026; Nico, la
 * recomendada «a» de PRUEBAS-PAGOS: «la firma del inquilino por ENLACE con
 * código, como la aceptación del acuerdo»).
 *
 * SIN sesión: el token de la URL (firmado por el servidor, vive 7 días) abre el
 * acta, y el CÓDIGO que llega a SU correo —el del contrato, nunca uno escrito a
 * mano— es lo que deja firmar. Un acta de entrega se firma el día que recibe
 * las llaves, muchas veces antes de que exista su cuenta del portal.
 *
 * Ve lo que firma ANTES de firmar: el inmueble, la fecha de la entrega, el
 * estado general, las FOTOS por espacio, el inventario, los medidores, las
 * llaves y, en una devolución, el depósito y los descuentos. Firma dibujando,
 * con el mismo formulario de las demás firmas (`SignatureForm`: el trazo, la
 * aceptación y el código).
 *
 * Estados: 404 `ENLACE_DEL_ACTA_INVALIDO` → «enlace no válido»; 410
 * `ENLACE_DEL_ACTA_VENCIDO` → «pide uno nuevo»; `YA_FIRMASTE`, `CERRADA` y
 * `NO_LISTA` (a la inmobiliaria le falta un paso) los dice el back. Cualquier
 * otro fallo es un error real, con su reintento.
 */

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle, ClipboardText, WarningCircle, X } from '@phosphor-icons/react';
import { IconButton, Presence, Stagger, StaggerItem, motionDuration, motionEase, motionScale } from '@leasefy/cadence';
import { AnimatePresence, motion } from 'framer-motion';

import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { SignatureForm } from '@/components/contract/SignatureForm';
import type { OtpAdapter } from '@/components/contract/OTPVerification';
import { toast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api/client';
import { firmaPublicaDelActaApi, type ActaParaElInquilino } from '@/lib/api/firma-del-acta.service';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { formatCurrency } from '@/lib/format';

/** El estado en palabras: el del back (`GOOD`) o el del panel (`bueno`), los dos llegan. */
const ESTADO_GENERAL: Record<string, string> = {
  EXCELLENT: 'Excelente',
  GOOD: 'Bueno',
  FAIR: 'Regular',
  POOR: 'Malo',
  DAMAGED: 'Dañado',
  excelente: 'Excelente',
  bueno: 'Bueno',
  regular: 'Regular',
  malo: 'Malo',
  no_aplica: 'No aplica',
};

function fechaLegible(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Bogota',
  });
}

export default function FirmarActaPage() {
  const { token } = useParams<{ token: string }>();
  const [datos, setDatos] = useState<ActaParaElInquilino | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setDatos(await firmaPublicaDelActaApi.obtener(token));
      setError(null);
    } catch (e) {
      setError(e);
    } finally {
      setCargando(false);
    }
  }, [token]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const enlaceInvalido = error instanceof ApiError && error.status === 404;
  const enlaceVencido = error instanceof ApiError && error.status === 410;

  const adapter: OtpAdapter = {
    send: async () => {
      const r = await firmaPublicaDelActaApi.otpSend(token);
      return { sentTo: r.sentTo, cooldownSeconds: r.cooldownSeconds ?? 60, channels: r.channels };
    },
    verify: async (code: string) => {
      const r = await firmaPublicaDelActaApi.otpVerify(token, code);
      return { verificationToken: r.verificationToken };
    },
  };

  const firmar = async ({ signatureData, otpVerificationToken }: { signatureData: string; otpVerificationToken?: string }) => {
    if (!otpVerificationToken) return;
    try {
      setDatos(
        await firmaPublicaDelActaApi.firmar(token, { signatureData, acceptedTerms: true, otpVerificationToken }),
      );
      toast.success('Firmaste el acta.');
    } catch (err) {
      toast.error('No se pudo firmar el acta.', {
        description: mensajeParaLaPersona(err, { accion: 'firmar el acta', porDefecto: 'Prueba de nuevo en un momento.' }),
      });
      // Relanzado: `SignatureForm` vuelve a pedir el código si el token ya no sirve.
      throw err;
    }
  };

  return (
    <main className="min-h-screen bg-bg px-4 py-8 sm:py-12">
      <section className="mx-auto w-full max-w-2xl space-y-6 rounded-lg border border-border bg-surface p-5 shadow-sm sm:p-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary-soft">
          <ClipboardText className="h-5 w-5 text-primary" aria-hidden="true" />
        </div>

        {cargando && !datos ? (
          <p className="text-body-sm text-fg-muted">Cargando el acta…</p>
        ) : enlaceInvalido ? (
          <div className="space-y-2" data-testid="enlace-invalido">
            <h1 className="text-h2">Enlace no válido</h1>
            <p className="flex items-start gap-2 text-body-sm text-fg-muted">
              <WarningCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              Este enlace para firmar el acta no es válido. Pídele a tu inmobiliaria uno nuevo.
            </p>
          </div>
        ) : enlaceVencido ? (
          <div className="space-y-2" data-testid="enlace-vencido">
            <h1 className="text-h2">Este enlace venció</h1>
            <p className="flex items-start gap-2 text-body-sm text-warning">
              <WarningCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              Pídele a tu inmobiliaria que te mande un enlace nuevo para firmar el acta.
            </p>
          </div>
        ) : error && !datos ? (
          <FalloDeCarga error={error} queEs="el acta" onReintentar={cargar} enmarcado={false} />
        ) : datos ? (
          <ActaParaFirmar datos={datos} adapter={adapter} onFirmar={firmar} />
        ) : null}
      </section>
    </main>
  );
}

function ActaParaFirmar({
  datos,
  adapter,
  onFirmar,
}: {
  datos: ActaParaElInquilino;
  adapter: OtpAdapter;
  onFirmar: (p: { signatureData: string; otpVerificationToken?: string }) => Promise<void>;
}) {
  const { acta, inmobiliaria } = datos;
  const deDevolucion = acta.tipo === 'DEVOLUCION';
  const [ampliada, setAmpliada] = useState<string | null>(null);
  const entrega = fechaLegible(acta.fechaDeEntrega);
  const firmaDelInquilino = datos.firmas.find((f) => f.papel.toUpperCase() === 'INQUILINO') ?? null;

  return (
    <>
      <div className="space-y-1">
        <h1 className="text-h2">Firma el acta {deDevolucion ? 'de devolución' : 'de entrega'}</h1>
        <p className="text-body-sm text-fg-muted">
          {inmobiliaria.nombre} te pide firmar el acta {deDevolucion ? 'con la que entregas' : 'con la que recibes'}{' '}
          <strong className="text-fg">{acta.inmueble}</strong>
          {acta.direccion ? ` — ${acta.direccion}` : ''}. Revisa lo que dice antes de firmar.
        </p>
      </div>

      <dl className="grid gap-x-6 gap-y-2 text-body-sm sm:grid-cols-2">
        {acta.inquilino && (
          <div>
            <dt className="text-caption text-fg-muted">Inquilino</dt>
            <dd className="text-fg">{acta.inquilino}</dd>
          </div>
        )}
        {entrega && (
          <div>
            <dt className="text-caption text-fg-muted">{deDevolucion ? 'Devolución' : 'Entrega'}</dt>
            <dd className="text-fg">{entrega}</dd>
          </div>
        )}
        <div>
          <dt className="text-caption text-fg-muted">Estado general</dt>
          <dd className="text-fg">{ESTADO_GENERAL[acta.estadoGeneral] ?? acta.estadoGeneral}</dd>
        </div>
      </dl>

      {acta.observaciones && (
        <div className="space-y-1">
          <p className="text-caption text-fg-muted">Observaciones</p>
          <p className="whitespace-pre-wrap text-body-sm text-fg">{acta.observaciones}</p>
        </div>
      )}

      <div className="space-y-3" data-testid="fotos-del-acta-publica">
        <h2 className="text-sm font-semibold text-fg">Fotos por espacio</h2>
        <Stagger className="space-y-3">
          {acta.espacios.map((e) => (
            <StaggerItem key={`${e.clave ?? ''}|${e.espacio}`}>
              <p className="mb-1.5 text-body-sm font-medium text-fg">{e.espacio}</p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {e.fotos.map((url, i) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setAmpliada(url)}
                    className="aspect-square overflow-hidden rounded-md bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                    aria-label={`Ver la foto ${i + 1} de ${e.espacio}`}
                  >
                    <img src={url} alt={`Foto ${i + 1} de ${e.espacio}`} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>

      {acta.inventario.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-fg">Inventario</h2>
          <ul className="divide-y divide-border rounded-md border border-border">
            {acta.inventario.map((item, i) => (
              <li key={`${item.nombre}-${i}`} className="flex items-start justify-between gap-3 px-3 py-2 text-body-sm">
                <div className="min-w-0">
                  <p className="text-fg">
                    {item.nombre}
                    {item.cantidad !== null && item.cantidad !== 1 ? ` × ${item.cantidad}` : ''}
                  </p>
                  {item.notas && <p className="text-caption text-fg-muted">{item.notas}</p>}
                </div>
                {item.estado && <span className="shrink-0 text-caption text-fg-muted">{ESTADO_GENERAL[item.estado] ?? item.estado}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {deDevolucion && acta.deposito !== null && (
        <div className="space-y-2" data-testid="deposito-del-acta">
          <h2 className="text-sm font-semibold text-fg">Depósito y descuentos</h2>
          <div className="space-y-1 text-body-sm">
            <p className="flex justify-between gap-3">
              <span className="text-fg-muted">Depósito</span>
              <span className="tabular-nums text-fg">{formatCurrency(acta.deposito)}</span>
            </p>
            {acta.descuentos.map((d, i) => (
              <p key={`${d.concepto}-${i}`} className="flex justify-between gap-3">
                <span className="text-fg-muted">{d.concepto}</span>
                <span className="tabular-nums text-danger">−{formatCurrency(d.valor)}</span>
              </p>
            ))}
            {acta.aDevolver !== null && (
              <p className="flex justify-between gap-3 border-t border-border pt-1 font-medium">
                <span className="text-fg">Se te devuelve</span>
                <span className="tabular-nums text-fg">{formatCurrency(acta.aDevolver)}</span>
              </p>
            )}
          </div>
        </div>
      )}

      {datos.estado === 'YA_FIRMASTE' ? (
        <Presence show className="flex items-start gap-2 rounded-lg border border-success/30 bg-success-soft p-3" data-testid="ya-firmaste">
          <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-success" weight="fill" aria-hidden="true" />
          <p className="text-body-sm text-fg">
            {`Ya firmaste esta acta${firmaDelInquilino?.firmadaEl ? ` el ${fechaLegible(firmaDelInquilino.firmadaEl)}` : ''}`.replace(/\.?$/, '.')}{' '}
            Tu inmobiliaria la tiene con tu firma.
          </p>
        </Presence>
      ) : datos.estado === 'CERRADA' ? (
        <p className="text-body-sm text-fg-muted" data-testid="acta-cerrada">
          Esta acta ya está cerrada. Si tienes dudas, comunícate con {inmobiliaria.nombre}.
        </p>
      ) : datos.estado === 'NO_LISTA' ? (
        <p className="text-body-sm text-fg-muted" data-testid="acta-no-lista">
          {datos.porQue}
        </p>
      ) : (
        <div className="space-y-2" data-testid="firmar-el-acta">
          <p className="text-body-sm text-fg-muted">
            Para firmar te mandamos un código a {datos.correo ?? 'tu correo'}.
          </p>
          <SignatureForm
            onSign={onFirmar}
            adapter={adapter}
            isLandlord={false}
            rolLabel="Inquilino"
            textos={{
              firmado: 'Acta firmada',
              aceptacion: `Estoy de acuerdo con el acta: ${deDevolucion ? 'entregué' : 'recibí'} el inmueble en el estado que describen el inventario y las fotos.`,
              boton: 'Firmar el acta',
              queSeFirma: 'el acta',
            }}
          />
        </div>
      )}

      <AnimatePresence>
        {ampliada && (
          <motion.div
            key="foto-ampliada"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: motionDuration.fast, ease: motionEase.exit } }}
            transition={{ duration: motionDuration.base, ease: motionEase.enter }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            onClick={() => setAmpliada(null)}
          >
            <motion.img
              src={ampliada}
              alt="Foto ampliada del acta"
              initial={{ scale: motionScale.pop, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: motionScale.pop, opacity: 0, transition: { duration: motionDuration.fast, ease: motionEase.exit } }}
              transition={{ duration: motionDuration.base, ease: motionEase.emphasis }}
              className="max-h-[85vh] max-w-full rounded-lg object-contain"
              onClick={(ev) => ev.stopPropagation()}
            />
            <IconButton
              variant="ghost"
              aria-label="Cerrar la foto"
              icon={<X className="h-5 w-5" />}
              onClick={() => setAmpliada(null)}
              className="absolute right-4 top-4 rounded-full bg-black/50 text-white hover:bg-black/70"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
