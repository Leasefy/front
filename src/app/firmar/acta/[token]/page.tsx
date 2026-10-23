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

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle, X } from '@phosphor-icons/react';
import { IconButton, Presence, Stagger, StaggerItem, motionDuration, motionEase, motionScale } from '@leasefy/cadence';
import { AnimatePresence, motion } from 'framer-motion';

import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import {
  AvisoDelEnlace,
  CargandoElEnlace,
  DatoDelEnlace,
  MarcoDelEnlace,
  TituloDelEnlace,
} from '@/components/enlace-publico/MarcoDelEnlace';
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
    <MarcoDelEnlace
      ancho="xl"
      de={datos?.inmobiliaria.nombre}
      vista={
        cargando && !datos ? 'cargando' : enlaceInvalido ? 'invalido' : enlaceVencido ? 'vencido' : error && !datos ? 'error' : 'acta'
      }
    >
      {cargando && !datos ? (
        <CargandoElEnlace texto="Cargando el acta…" />
      ) : enlaceInvalido ? (
        <AvisoDelEnlace tono="invalido" titulo="Enlace no válido" data-testid="enlace-invalido">
          <p>Este enlace para firmar el acta no es válido. Pídele a tu inmobiliaria uno nuevo.</p>
        </AvisoDelEnlace>
      ) : enlaceVencido ? (
        <AvisoDelEnlace tono="vencido" titulo="Este enlace venció" data-testid="enlace-vencido">
          <p>Pídele a tu inmobiliaria que te mande un enlace nuevo para firmar el acta.</p>
        </AvisoDelEnlace>
      ) : error && !datos ? (
        <FalloDeCarga error={error} queEs="el acta" onReintentar={cargar} enmarcado={false} />
      ) : datos ? (
        <ActaParaFirmar datos={datos} adapter={adapter} onFirmar={firmar} />
      ) : null}
    </MarcoDelEnlace>
  );
}

/** El título de cada parte del acta: liviano, sin negrilla. */
function TituloDeParte({ children }: { children: ReactNode }) {
  return <h2 className="text-body font-medium text-fg">{children}</h2>;
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
      <TituloDelEnlace
        rotulo={deDevolucion ? 'Acta de devolución' : 'Acta de entrega'}
        titulo={`Firma el acta ${deDevolucion ? 'de devolución' : 'de entrega'}`}
        descripcion={
          <>
            {inmobiliaria.nombre} te pide firmar el acta {deDevolucion ? 'con la que entregas' : 'con la que recibes'}{' '}
            <strong className="font-medium text-fg">{acta.inmueble}</strong>
            {acta.direccion ? ` — ${acta.direccion}` : ''}. Revisa lo que dice antes de firmar.
          </>
        }
      />

      {/* Lo esencial del acta, en una ficha: quién, cuándo y en qué estado. */}
      <div className="space-y-4 rounded-md border border-border px-4 py-4">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
          {acta.inquilino && <DatoDelEnlace rotulo="Inquilino">{acta.inquilino}</DatoDelEnlace>}
          {entrega && <DatoDelEnlace rotulo={deDevolucion ? 'Devolución' : 'Entrega'}>{entrega}</DatoDelEnlace>}
          <DatoDelEnlace rotulo="Estado general">
            {ESTADO_GENERAL[acta.estadoGeneral] ?? acta.estadoGeneral}
          </DatoDelEnlace>
        </dl>
        {acta.observaciones && (
          <div className="space-y-1 border-t border-border-faint pt-3">
            <p className="text-caption text-fg-muted">Observaciones</p>
            <p className="whitespace-pre-wrap text-body-sm text-fg">{acta.observaciones}</p>
          </div>
        )}
      </div>

      <div className="space-y-3" data-testid="fotos-del-acta-publica">
        <TituloDeParte>Fotos por espacio</TituloDeParte>
        <Stagger className="space-y-3">
          {acta.espacios.map((e) => (
            <StaggerItem key={`${e.clave ?? ''}|${e.espacio}`}>
              <p className="mb-1.5 text-body-sm text-fg-muted">{e.espacio}</p>
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
          <TituloDeParte>Inventario</TituloDeParte>
          <ul className="divide-y divide-border rounded-md border border-border">
            {acta.inventario.map((item, i) => (
              <li key={`${item.nombre}-${i}`} className="flex items-start justify-between gap-3 px-4 py-2.5 text-body-sm">
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
          <TituloDeParte>Depósito y descuentos</TituloDeParte>
          <div className="space-y-1.5 rounded-md border border-border px-4 py-3 text-body-sm">
            <p className="flex justify-between gap-3">
              <span className="text-fg-muted">Depósito</span>
              <span className="font-mono tabular-nums text-fg">{formatCurrency(acta.deposito)}</span>
            </p>
            {acta.descuentos.map((d, i) => (
              <p key={`${d.concepto}-${i}`} className="flex justify-between gap-3">
                <span className="text-fg-muted">{d.concepto}</span>
                <span className="font-mono tabular-nums text-danger">−{formatCurrency(d.valor)}</span>
              </p>
            ))}
            {acta.aDevolver !== null && (
              <p className="flex items-baseline justify-between gap-3 border-t border-border-faint pt-2">
                <span className="text-fg">Se te devuelve</span>
                <span className="font-mono text-body tabular-nums text-fg">{formatCurrency(acta.aDevolver)}</span>
              </p>
            )}
          </div>
        </div>
      )}

      {datos.estado === 'YA_FIRMASTE' ? (
        <Presence show className="flex items-start gap-2.5 rounded-md bg-success-soft px-4 py-3" data-testid="ya-firmaste">
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
        <div className="space-y-3 border-t border-border-faint pt-6" data-testid="firmar-el-acta">
          <TituloDeParte>Tu firma</TituloDeParte>
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
