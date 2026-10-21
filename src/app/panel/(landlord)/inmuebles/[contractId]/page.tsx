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
import { CaretLeft, FileText, House } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { formatCurrency } from '@/lib/format';
import { fechaLarga } from '@/lib/fechas/fecha-de-la-casa';
import { CLASES_DEL_TONO, fraseDelMesDelInquilino } from '@/lib/propietario/el-mes-del-contrato';
import {
  portalDelPropietarioApi,
  type EstadoDelContratoEnElPortal,
  type FichaDelInmueble,
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

export default function FichaDelInmueblePage({ params }: { params: Promise<{ contractId: string }> }) {
  const { contractId } = use(params);
  const [ficha, setFicha] = useState<FichaDelInmueble | null>(null);
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

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <Link href="/panel" className="inline-flex items-center gap-1 text-body-sm text-fg-muted hover:text-fg">
        <CaretLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Volver al inicio
      </Link>
      <EstadoDeDatos cargando={cargando} error={fallo} queEs="este inmueble" onReintentar={cargar}>
        {ficha && (
          <div className="space-y-6" data-testid="ficha-del-inmueble">
            <header className="flex flex-wrap items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface-muted">
                <House className="h-6 w-6 text-fg-muted" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <h1 className="text-h2 text-fg">{ficha.inmueble.direccion}</h1>
                <p className="text-body-sm text-fg-muted">
                  {ficha.inmueble.ciudad} · Lo administra {ficha.inmobiliaria}
                </p>
              </div>
              <span className="rounded-full bg-surface-muted px-3 py-1 text-body-sm text-fg" data-testid="estado-del-contrato">
                {ESTADO_DEL_CONTRATO[ficha.contrato.estado]}
              </span>
            </header>

            <section className="grid gap-4 sm:grid-cols-3">
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

            {ficha.inquilino && (
              <section className="space-y-3 rounded-lg border border-border bg-surface p-5" data-testid="inquilino">
                <h2 className="text-subtitle text-fg">Tu inquilino</h2>
                <p className="text-body text-fg">{ficha.inquilino.nombre ?? 'Sin nombre registrado'}</p>
                {ficha.mesActual && (
                  <p className={`inline-flex rounded-full px-3 py-1 text-body-sm ${fraseDelMes(ficha.mesActual).tono}`} data-testid="mes-del-inquilino">
                    {fraseDelMes(ficha.mesActual).texto}
                  </p>
                )}
                <p className="text-caption text-fg-muted">
                  Para hablar con tu inquilino, escríbele a {ficha.inmobiliaria} por Mensajes.
                </p>
              </section>
            )}

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

            <div className="flex flex-wrap gap-3">
              <Link href="/panel/estado-de-cuenta" className="text-body-sm font-medium text-primary hover:underline">
                Ver lo que se te ha girado de este contrato
              </Link>
              <Link href="/panel/solicitudes/nueva" className="text-body-sm font-medium text-primary hover:underline">
                Reportar un daño o hacer una solicitud
              </Link>
            </div>
          </div>
        )}
      </EstadoDeDatos>
    </div>
  );
}
