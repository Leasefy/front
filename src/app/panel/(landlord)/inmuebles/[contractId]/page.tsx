'use client';

/**
 * La ficha de un inmueble del propietario de inmobiliaria, por su contrato
 * (Nico, 11-10-2026: «Ficha de cada inmueble»). Antes los contratos del Inicio
 * no se podían abrir.
 *
 * Del inquilino, SÓLO el nombre y si pagó el mes (Nico): el contacto pasa por
 * la inmobiliaria. Desocupado: desde cuándo, si está publicado, visitas y
 * postulaciones. Los PDF firmados en Leasefy (mandato y contrato); lo que la
 * inmobiliaria sube es sólo de ella.
 */
import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, Wallet, Wrench } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { BackButton } from '@/components/ui/back-button';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { toast } from '@/components/ui/toast';
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { formatCurrency } from '@/lib/format';
import { fechaLarga, hoyEnColombia } from '@/lib/fechas/fecha-de-la-casa';
import { nombreDelMes } from '@/lib/recaudo/meses';
import {
  CLASES_DEL_TONO,
  avanceDelContrato,
  fraseDelGiroDelMes,
  fraseDelMesDelInquilino,
  teGiraronAunqueNoPago,
} from '@/lib/propietario/el-mes-del-contrato';
import {
  portalDelPropietarioApi,
  type EstadoDelContratoEnElPortal,
  type FichaDelInmueble,
  type GiroDelPropietario,
} from '@/lib/api/portal-del-propietario.service';

const ESTADO_DEL_CONTRATO: Record<EstadoDelContratoEnElPortal, string> = {
  VIGENTE: 'Arrendado',
  POR_EMPEZAR: 'Arrendado, empieza pronto',
  EN_FIRMA: 'Contrato en firma',
  TERMINADO: 'Contrato terminado',
  CANCELADO: 'Contrato cancelado',
};

/** La frase sale de `lib/propietario/el-mes-del-contrato` (la misma del Inicio). */
function fraseDelMes(m: NonNullable<FichaDelInmueble['mesActual']>): { texto: string; tono: string } {
  const f = fraseDelMesDelInquilino(m);
  return { texto: f.texto, tono: CLASES_DEL_TONO[f.tono] };
}

function BotonDelDocumento({ contractId, cual, etiqueta }: { contractId: string; cual: 'mandato' | 'contrato'; etiqueta: string }) {
  const [abriendo, setAbriendo] = useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      hideArrow
      isLoading={abriendo}
      data-testid={`abrir-${cual}`}
      onClick={async () => {
        // La pestaña se abre ANTES de pedir el enlace: después del await el navegador la bloquea.
        const ventana = window.open('', '_blank');
        setAbriendo(true);
        try {
          const { url } = await portalDelPropietarioApi.documento(contractId, cual);
          if (ventana) ventana.location.href = url;
          else window.location.href = url;
        } catch (e) {
          ventana?.close();
          toast.error(mensajeParaLaPersona(e, { porDefecto: 'No pudimos abrir el documento.', accion: 'abrir el documento' }));
        } finally {
          setAbriendo(false);
        }
      }}
    >
      <FileText className="h-4 w-4" aria-hidden="true" />
      {etiqueta}
    </Button>
  );
}

/**
 * GLOW UP (21-10-2026, reunión con Portofino): el propietario viene a saber dos
 * cosas de su inmueble: si su inquilino está al día y si la inmobiliaria ya le
 * giró. «Este mes» va primero, con en qué mes del contrato va; las cifras del
 * contrato, lo de desocupado y los documentos se consultan después.
 */
function EsteMes({ ficha, giros }: { ficha: FichaDelInmueble; giros: GiroDelPropietario[] | null }) {
  const avance = avanceDelContrato(ficha.contrato.inicio, ficha.contrato.fin, hoyEnColombia());
  const delGiro = ficha.mesActual ? fraseDelGiroDelMes(giros, ficha.mesActual.mes) : null;
  const aunqueNoPago = teGiraronAunqueNoPago(ficha.mesActual, giros);
  return (
    <section className="space-y-4 rounded-lg border border-border bg-surface p-5" data-testid="inquilino">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-subtitle text-fg">
          {ficha.mesActual ? `Este mes · ${nombreDelMes(ficha.mesActual.mes)}` : 'Tu inquilino'}
        </h2>
        {avance ? (
          <span className="inline-flex items-center gap-2" data-testid="avance-del-contrato">
            <span className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-muted" aria-hidden>
              <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.round((avance.mes / avance.de) * 100)}%` }} />
            </span>
            <span className="font-mono text-caption tabular-nums text-fg-muted">
              Mes {avance.mes} de {avance.de} del contrato
            </span>
          </span>
        ) : null}
      </div>
      <dl className="grid gap-3 sm:grid-cols-2">
        <div className="rounded border border-border bg-bg p-3">
          <dt className="text-caption text-fg-muted">Tu inquilino</dt>
          <dd className="mt-1 space-y-2">
            <p className="text-body text-fg">{ficha.inquilino?.nombre ?? 'Sin nombre registrado'}</p>
            {ficha.mesActual && (
              <p className={`inline-flex rounded-full px-3 py-1 text-body-sm ${fraseDelMes(ficha.mesActual).tono}`} data-testid="mes-del-inquilino">
                {fraseDelMes(ficha.mesActual).texto}
              </p>
            )}
          </dd>
        </div>
        <div className="rounded border border-border bg-bg p-3">
          <dt className="text-caption text-fg-muted">{ficha.inmobiliaria}</dt>
          <dd className="mt-1">
            {delGiro ? (
              <p className={`inline-flex rounded-full px-3 py-1 text-body-sm ${CLASES_DEL_TONO[delGiro.tono]}`} data-testid="giro-del-mes">
                {delGiro.texto}
              </p>
            ) : (
              <p className="text-body-sm text-fg-muted">Lo que te gira está en «Mi plata».</p>
            )}
          </dd>
        </div>
      </dl>
      {aunqueNoPago ? (
        <p className="text-body-sm text-fg" data-testid="te-giraron-aunque-no-pago">
          Tu inquilino todavía no paga {ficha.mesActual ? nombreDelMes(ficha.mesActual.mes) : 'el mes'}, y {ficha.inmobiliaria} igual ya te giró.
        </p>
      ) : null}
      <p className="text-caption text-fg-muted">
        Para hablar con tu inquilino, escríbele a {ficha.inmobiliaria} por Mensajes.
      </p>
    </section>
  );
}

export default function FichaDelInmueblePage({ params }: { params: Promise<{ contractId: string }> }) {
  const { contractId } = use(params);
  const [ficha, setFicha] = useState<FichaDelInmueble | null>(null);
  const [giros, setGiros] = useState<GiroDelPropietario[] | null>(null);
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState<unknown>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setFallo(null);
    try {
      setFicha(await portalDelPropietarioApi.inmueble(contractId));
    } catch (e) {
      setFallo(e);
    } finally {
      setCargando(false);
    }
  }, [contractId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  // Los giros se leen aparte y fallan solos: sin ellos la ficha se ve como antes.
  useEffect(() => {
    let vivo = true;
    portalDelPropietarioApi
      .giros()
      .then((r) => vivo && setGiros(Array.isArray(r?.giros) ? r.giros : []))
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, []);

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div data-testid="ficha-volver">
        <BackButton href="/panel" label="Volver al inicio" />
      </div>
      <EstadoDeDatos cargando={cargando} error={fallo} queEs="este inmueble" onReintentar={cargar}>
        {ficha && (
          <div className="space-y-6" data-testid="ficha-del-inmueble">
            <EncabezadoDePantalla
              seccion="Tu inmueble"
              titulo={ficha.inmueble.direccion}
              junto={
                <span className="rounded-full bg-surface-muted px-3 py-1 text-body-sm text-fg" data-testid="estado-del-contrato">
                  {ESTADO_DEL_CONTRATO[ficha.contrato.estado]}
                </span>
              }
              descripcion={`${ficha.inmueble.ciudad} · Lo administra ${ficha.inmobiliaria}`}
              acciones={
                <>
                  <Button asChild variant="outline" size="sm" hideArrow>
                    <Link href="/panel/solicitudes/nueva" data-testid="ficha-hacer-solicitud">
                      <Wrench className="h-4 w-4" aria-hidden="true" />
                      Reportar un daño o hacer una solicitud
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm" hideArrow>
                    <Link href="/panel/estado-de-cuenta" data-testid="ficha-ver-giros">
                      <Wallet className="h-4 w-4" aria-hidden="true" />
                      Ver lo que se te ha girado
                    </Link>
                  </Button>
                </>
              }
            />

            {ficha.inquilino && <EsteMes ficha={ficha} giros={giros} />}

            <section className="grid gap-4 sm:grid-cols-3" data-testid="cifras-del-contrato">
              <div className="rounded-lg border border-border bg-surface p-4">
                <p className="text-caption text-fg-muted">Canon</p>
                <p className="font-mono text-subtitle tabular-nums text-fg">
                  {ficha.contrato.canonCop === null ? 'Por confirmar' : formatCurrency(ficha.contrato.canonCop)}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-surface p-4">
                <p className="text-caption text-fg-muted">Desde</p>
                <p className="text-subtitle text-fg">{ficha.contrato.inicio ? fechaLarga(ficha.contrato.inicio) : '—'}</p>
              </div>
              <div className="rounded-lg border border-border bg-surface p-4">
                <p className="text-caption text-fg-muted">Hasta</p>
                <p className="text-subtitle text-fg">{ficha.contrato.fin ? fechaLarga(ficha.contrato.fin) : 'Sin fecha de fin'}</p>
              </div>
            </section>

            {ficha.desocupado && (
              <section className="space-y-3 rounded-lg border border-border bg-surface p-5" data-testid="desocupado">
                <h2 className="text-subtitle text-fg">Está desocupado</h2>
                <p className="text-body-sm text-fg-muted">
                  {ficha.desocupado.desde
                    ? `Desde el ${fechaLarga(ficha.desocupado.desde)} (${ficha.desocupado.dias === 1 ? '1 día' : `${ficha.desocupado.dias} días`}).`
                    : 'Todavía no se ha arrendado.'}{' '}
                  {ficha.desocupado.publicado ? 'Está publicado en Leasefy.' : 'Todavía no está publicado.'}
                </p>
                <dl className="grid grid-cols-2 gap-3 sm:max-w-sm">
                  <div className="rounded border border-border bg-bg p-3">
                    <dt className="text-caption text-fg-muted">Visitas</dt>
                    <dd className="font-mono text-subtitle tabular-nums text-fg">{ficha.desocupado.visitas}</dd>
                  </div>
                  <div className="rounded border border-border bg-bg p-3">
                    <dt className="text-caption text-fg-muted">Postulaciones</dt>
                    <dd className="font-mono text-subtitle tabular-nums text-fg">{ficha.desocupado.postulaciones}</dd>
                  </div>
                </dl>
              </section>
            )}

            <section className="space-y-3 rounded-lg border border-border bg-surface p-5" data-testid="documentos-firmados">
              <h2 className="text-subtitle text-fg">Documentos firmados</h2>
              {ficha.documentos.mandato || ficha.documentos.contrato ? (
                <div className="flex flex-wrap gap-2">
                  {ficha.documentos.mandato && <BotonDelDocumento contractId={contractId} cual="mandato" etiqueta="Mi mandato firmado" />}
                  {ficha.documentos.contrato && <BotonDelDocumento contractId={contractId} cual="contrato" etiqueta="El contrato de arrendamiento" />}
                </div>
              ) : (
                <p className="text-body-sm text-fg-muted">
                  Estos documentos se firmaron por fuera de Leasefy: pídele la copia a {ficha.inmobiliaria}.
                </p>
              )}
            </section>
          </div>
        )}
      </EstadoDeDatos>
    </div>
  );
}
