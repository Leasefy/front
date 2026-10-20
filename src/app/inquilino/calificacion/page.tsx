'use client';

/**
 * «Mi Calificación Leasefy» (Nico, 18-10-2026): la persona ve la suya GRATIS
 * (Ley 2157), con todo el detalle; decide si la comparte con las
 * inmobiliarias de Leasefy (casilla aparte, sin marcar); ve quién la
 * consultó; responde las evaluaciones de fin de contrato; y compra el
 * certificado verificable para mostrarlo afuera.
 */

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Certificate, CircleNotch, Eye, Handshake, ShareNetwork, XCircle } from '@phosphor-icons/react';
import { Presence } from '@leasefy/cadence';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState } from '@/components/ui/empty-state';
import { EsqueletoDePagina } from '@/components/estado/EsqueletoDePagina';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { useEntradaTrasCargar } from '@/components/portales/use-entrada-tras-cargar';
import { TarjetaDeCalificacion } from '@/components/calificacion/TarjetaDeCalificacion';
import { apiClient } from '@/lib/api/client';
import {
  calificacionLeasefyApi,
  type ContratoDeLaPersona,
  type EvaluacionDeFin,
  type MiCalificacion,
} from '@/lib/api/calificacion-leasefy.service';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { useI18n } from '@/lib/i18n';
import { useLocaleDeFechas, useLocaleDelPanel, useTr } from '@/lib/i18n/use-tr';
import { conIdioma } from '@/lib/idioma/idioma';

/** Cuántas veces y cada cuánto se pregunta si el pago ya quedó (≈ 30 s). */
const VUELTAS_AL_CONFIRMAR = 10;
const PAUSA_AL_CONFIRMAR_MS = 3000;

const COMO_TERMINO: Record<ContratoDeLaPersona['termino'], string> = {
  VIGENTE: 'Vigente',
  SIN_DEUDA: 'Terminó sin deudas',
  CON_DEUDA: 'Terminó con deuda',
  JURIDICO: 'En cobro jurídico',
  // Contrato migrado, sin cuotas en Leasefy, que la inmobiliaria evaluó al terminar (19-10-2026).
  EVALUADO: 'Terminó; lo evaluó la inmobiliaria',
};

function Seccion({ titulo, descripcion, children }: { titulo: string; descripcion?: string; children: React.ReactNode }) {
  const tr = useTr();
  return (
    <section className="rounded-lg border border-border bg-surface p-6 dark:border-border-strong">
      <h2 className="text-base font-medium text-fg">{tr(titulo)}</h2>
      {descripcion && <p className="mt-1 max-w-2xl text-sm text-fg-muted">{tr(descripcion)}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Autorizacion({ datos, alCambiar }: { datos: MiCalificacion; alCambiar: () => void }) {
  const tr = useTr();
  const { locale } = useI18n();
  const [texto, setTexto] = useState<{ title: string; text: string } | null>(null);
  const [marcada, setMarcada] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const a = datos.autorizacion;

  useEffect(() => {
    apiClient
      .get<{ title: string; text: string }>(
        `/legal/consent-text?type=calificacion-leasefy&lang=${locale === 'en' ? 'en' : 'es'}`,
      )
      .then(setTexto)
      .catch(() => setTexto(null));
  }, [locale]);

  const decidir = async (aceptar: boolean) => {
    setEnviando(true);
    try {
      await calificacionLeasefyApi.decidir(aceptar);
      toast.success(aceptar ? tr('Listo: tu calificación ya se puede compartir.') : tr('Retiraste la autorización.'));
      setMarcada(false);
      alCambiar();
    } catch (e) {
      toast.error(mensajeParaLaPersona(e, { porDefecto: tr('No se pudo guardar tu decisión.') }));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Seccion
      titulo="Compartir mi calificación"
      descripcion="Si lo autorizas, las inmobiliarias que usan Leasefy pueden consultar tu calificación cuando estudien un arriendo para ti. Ven el resultado, nunca tus documentos."
    >
      {a.vigente && !a.hayVersionNueva ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-sm text-fg">
            <ShareNetwork className="h-4 w-4 text-success" aria-hidden />
            {tr('La autorizaste el {d}.', {
              d: a.desde ? new Date(a.desde).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-CO', { day: 'numeric', month: 'long', year: 'numeric' }) : '—',
            })}
          </p>
          <Button variant="outline" hideArrow disabled={enviando} onClick={() => decidir(false)}>
            {tr('Retirar la autorización')}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {texto && (
            <div className="max-h-48 overflow-y-auto rounded-md bg-surface-muted p-4 text-xs leading-relaxed text-fg-muted" data-lenis-prevent>
              <p className="mb-1 font-medium text-fg">{texto.title}</p>
              {texto.text}
            </div>
          )}
          {a.hayVersionNueva && (
            <p className="text-sm text-warning">{tr('El texto de la autorización cambió: léelo y vuelve a aceptarlo.')}</p>
          )}
          <label className="flex items-start gap-3 text-sm text-fg">
            <Checkbox checked={marcada} onCheckedChange={(v) => setMarcada(v === true)} aria-label={tr('Acepto la autorización')} />
            <span>{tr('Leí y acepto la autorización para la Calificación Leasefy.')}</span>
          </label>
          <Button hideArrow disabled={!marcada || enviando} onClick={() => decidir(true)}>
            {tr('Autorizar')}
          </Button>
        </div>
      )}
    </Seccion>
  );
}

function Evaluacion({ e, alResponder }: { e: EvaluacionDeFin; alResponder: () => void }) {
  const tr = useTr();
  const [texto, setTexto] = useState('');
  const [abierta, setAbierta] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const responder = async () => {
    setEnviando(true);
    try {
      await calificacionLeasefyApi.responder(e.id, texto);
      toast.success(tr('Tu respuesta quedó al lado de la evaluación.'));
      alResponder();
    } catch (err) {
      toast.error(mensajeParaLaPersona(err, { porDefecto: tr('No se pudo guardar tu respuesta.') }));
    } finally {
      setEnviando(false);
    }
  };
  return (
    <div className="rounded-md border border-border p-4 dark:border-border-strong">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-fg">
          {e.inmobiliaria ?? tr('Una inmobiliaria')}
          {e.direccion ? <span className="font-normal text-fg-muted"> · {e.direccion}</span> : null}
        </p>
        <span className="font-mono text-xs tabular-nums text-fg-muted">{e.puntaje}/100</span>
      </div>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        {e.respuestas.map((r) => (
          <div key={r.pregunta}>
            <dt className="text-xs text-fg-subtle">{tr(r.pregunta)}</dt>
            <dd className="text-fg">{tr(r.respuesta)}</dd>
          </div>
        ))}
      </dl>
      {e.nota && <p className="mt-3 text-sm text-fg-muted">«{e.nota}»</p>}
      {e.respuestaDelInquilino ? (
        <p className="mt-3 rounded-md bg-surface-muted p-3 text-sm text-fg">
          <span className="font-medium">{tr('Tu respuesta:')}</span> {e.respuestaDelInquilino}
        </p>
      ) : (
        <div className="mt-3">
          {!abierta ? (
            <Button variant="outline" size="sm" hideArrow onClick={() => setAbierta(true)}>
              {tr('Responder')}
            </Button>
          ) : (
            <div className="space-y-2">
              <Textarea value={texto} onChange={(x) => setTexto(x.target.value)} maxLength={2000} rows={3} placeholder={tr('Cuenta tu versión (se muestra al lado de la evaluación).')} />
              <div className="flex gap-2">
                <Button size="sm" hideArrow disabled={texto.trim().length < 5 || enviando} onClick={responder}>
                  {tr('Enviar respuesta')}
                </Button>
                <Button size="sm" variant="ghost" hideArrow onClick={() => setAbierta(false)}>
                  {tr('Cancelar')}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function MiCalificacionPage({
  searchParams,
}: {
  searchParams: Promise<{ certificado?: string }>;
}) {
  const tr = useTr();
  const router = useRouter();
  const { formatCurrency } = useI18n();
  const localeFechas = useLocaleDeFechas();
  const idiomaDelPanel = useLocaleDelPanel();
  const { certificado } = use(searchParams);
  const [datos, setDatos] = useState<MiCalificacion | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [cargando, setCargando] = useState(true);
  const [comprando, setComprando] = useState(false);
  // El pago que se está confirmando (al volver de Wompi o con «Revisar mi pago») y el que no se pudo confirmar todavía.
  const [revisando, setRevisando] = useState<string | null>(certificado ?? null);
  const [sinConfirmar, setSinConfirmar] = useState<string | null>(null);
  const entrada = useEntradaTrasCargar(cargando);

  const cargar = useCallback(() => {
    setCargando(true);
    calificacionLeasefyApi
      .mia()
      .then((d) => {
        setDatos(d);
        setError(null);
      })
      .catch(setError)
      .finally(() => setCargando(false));
  }, []);

  useEffect(cargar, [cargar]);

  // Al volver de Wompi (o con «Revisar mi pago»): preguntar unas veces si el certificado ya quedó pagado. El back,
  // si el aviso de Wompi no llegó, le pregunta a Wompi; si a los ~30 s sigue sin pago, se dice y se puede volver a revisar.
  useEffect(() => {
    if (!revisando) return;
    let vueltas = 0;
    let vivo = true;
    let t: ReturnType<typeof setTimeout> | undefined;
    const preguntar = async () => {
      vueltas += 1;
      try {
        const r = await calificacionLeasefyApi.estadoDelCertificado(revisando);
        if (!vivo) return;
        if (r.estado === 'VIGENTE') {
          toast.success(tr('Tu certificado está listo: {c}', { c: r.codigo ?? '' }));
          setRevisando(null);
          setSinConfirmar(null);
          // Sin `?certificado=` en la dirección: al recargar no se vuelve a anunciar.
          if (certificado) router.replace('/inquilino/calificacion', { scroll: false });
          cargar();
          return;
        }
      } catch {
        /* se sigue preguntando */
      }
      if (!vivo) return;
      if (vueltas >= VUELTAS_AL_CONFIRMAR) {
        setSinConfirmar(revisando);
        setRevisando(null);
        return;
      }
      t = setTimeout(() => void preguntar(), PAUSA_AL_CONFIRMAR_MS);
    };
    void preguntar();
    return () => {
      vivo = false;
      if (t) clearTimeout(t);
    };
  }, [revisando, certificado, cargar, router, tr]);

  const comprar = async () => {
    setComprando(true);
    try {
      const r = await calificacionLeasefyApi.pedirCertificado();
      window.location.href = r.paymentUrl;
    } catch (e) {
      toast.error(mensajeParaLaPersona(e, { porDefecto: tr('No se pudo pedir el certificado.') }));
      setComprando(false);
    }
  };

  const fecha = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString(localeFechas, { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
  const fechaYHora = (iso: string) =>
    new Date(iso).toLocaleString(localeFechas, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'America/Bogota',
    });

  if (cargando && !datos) return <EsqueletoDePagina variante="list" className="p-6 lg:p-8" />;
  if (error && !datos) {
    return (
      <div className="p-6 lg:p-8">
        <FalloDeCarga error={error} queEs={tr('tu calificación')} onReintentar={cargar} />
      </div>
    );
  }
  if (!datos) return null;

  const contratos = datos.historial?.porContrato ?? [];
  const sinCalificacion = !datos.calificacion || datos.calificacion.estado === 'SIN_DATOS';

  return (
    <motion.div {...entrada} className="space-y-6 p-6 lg:p-8">
      <header className="space-y-1">
        <h1 className="text-h2 text-fg">{tr('Mi Calificación Leasefy')}</h1>
        <p className="max-w-2xl text-sm text-fg-muted">
          {tr('Cómo te ven para arrendar: tu historial de pagos en Leasefy y tus documentos. Verla es gratis, siempre.')}
        </p>
      </header>

      {datos.calificacion ? (
        <TarjetaDeCalificacion calificacion={datos.calificacion} deTu />
      ) : (
        <EmptyState icon={XCircle} title={tr('Todavía no hay calificación')} description={tr('Todavía no hay datos para calificar.')} />
      )}

      <Autorizacion datos={datos} alCambiar={cargar} />

      <Seccion titulo="Tus arriendos en Leasefy" descripcion="Cada contrato que cuenta para tu historial, con cuántas cuotas pagaste a tiempo.">
        {contratos.length === 0 ? (
          <p className="text-sm text-fg-muted">{tr('Todavía no tienes arriendos con historial de pagos en Leasefy.')}</p>
        ) : (
          <div className="divide-y divide-border dark:divide-border-strong">
            {contratos.map((k) => (
              <div key={k.contractId} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-fg">{k.inmobiliaria ?? tr('Una inmobiliaria')}</p>
                  <p className="truncate text-xs text-fg-muted">{k.direccion ?? '—'}</p>
                </div>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 font-mono text-xs tabular-nums text-fg-muted">
                  <span>{tr('{n} meses', { n: k.meses })}</span>
                  {k.cuotasContadas > 0 ? (
                    <>
                      <span>{tr('{a} de {c} a tiempo', { a: k.cuotasATiempo, c: k.cuotasContadas })}</span>
                      <span>{k.peorAtrasoDias > 0 ? tr('peor atraso {d} días', { d: k.peorAtrasoDias }) : tr('sin atrasos')}</span>
                    </>
                  ) : (
                    <span>{tr('sin cuotas pagadas en Leasefy')}</span>
                  )}
                  {k.deudaVencidaCop > 0 && <span className="text-danger">{tr('debe {v}', { v: formatCurrency(k.deudaVencidaCop) })}</span>}
                  <span className="font-sans text-fg">{tr(COMO_TERMINO[k.termino])}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Seccion>

      <Seccion titulo="Quién consultó tu calificación" descripcion="Cada vez que una inmobiliaria la mira, queda aquí.">
        {!datos.consultas.disponible ? (
          <p className="text-sm text-fg-muted">{tr('Esta parte todavía no está disponible.')}</p>
        ) : datos.consultas.lista.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-fg-muted">
            <Eye className="h-4 w-4" aria-hidden />
            {tr('Nadie la ha consultado todavía.')}
          </p>
        ) : (
          <ul className="divide-y divide-border text-sm dark:divide-border-strong">
            {datos.consultas.lista.slice(0, 20).map((c, i) => (
              <li key={`${c.cuando}-${i}`} className="flex justify-between gap-3 py-2">
                <span className="text-fg">{c.inmobiliaria}</span>
                {/* Con la hora: dos consultas del mismo día no parecen la misma fila repetida. */}
                <span className="font-mono text-xs tabular-nums text-fg-muted">{fechaYHora(c.cuando)}</span>
              </li>
            ))}
          </ul>
        )}
      </Seccion>

      <Seccion titulo="Evaluaciones al terminar un contrato" descripcion="Lo que dijo la inmobiliaria cuando terminó tu contrato. Puedes responder una vez; tu respuesta se muestra al lado.">
        {!datos.evaluaciones.disponible || datos.evaluaciones.lista.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-fg-muted">
            <Handshake className="h-4 w-4" aria-hidden />
            {tr('No tienes evaluaciones todavía.')}
          </p>
        ) : (
          <div className="space-y-3">
            {datos.evaluaciones.lista.map((e) => (
              <Evaluacion key={e.id} e={e} alResponder={cargar} />
            ))}
          </div>
        )}
      </Seccion>

      <Seccion
        titulo="Certificado para compartir"
        descripcion="Un código que cualquiera puede comprobar en Leasefy durante 60 días: sirve para mostrar tu calificación a una inmobiliaria que no está en Leasefy."
      >
        <div className="space-y-4">
          <Presence show={datos.certificados.lista.length > 0}>
            <ul className="space-y-2">
              {datos.certificados.lista.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-surface-muted px-3 py-2 text-sm">
                  <span className="font-mono tabular-nums text-fg">{c.codigo}</span>
                  <span className="text-xs text-fg-muted">
                    {c.vencido ? tr('Venció el {d}', { d: fecha(c.venceEl) }) : tr('Vale hasta el {d}', { d: fecha(c.venceEl) })}
                  </span>
                  {c.codigo && (
                    <Link
                      className="text-xs text-primary hover:underline"
                      href={conIdioma(`/verificar-calificacion/${encodeURIComponent(c.codigo)}`, idiomaDelPanel)}
                    >
                      {tr('Ver cómo lo ven')}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </Presence>
          <Presence show={revisando !== null}>
            <p role="status" className="flex items-center gap-2 rounded-md bg-surface-muted px-3 py-2 text-sm text-fg">
              <CircleNotch className="h-4 w-4 shrink-0 animate-spin text-fg-muted" aria-hidden />
              {tr('Estamos confirmando tu pago con Wompi…')}
            </p>
          </Presence>
          <Presence show={revisando === null && (sinConfirmar ?? datos.certificados.pendienteId ?? null) !== null}>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-warning-soft px-3 py-2 text-sm text-fg">
              <p>
                {sinConfirmar
                  ? tr('Todavía no vemos tu pago. Si ya pagaste, puede tardar unos minutos: revísalo de nuevo en un rato.')
                  : tr('Tienes un pago del certificado sin terminar. Si ya pagaste, revisa si quedó listo.')}
              </p>
              <Button
                variant="outline"
                size="sm"
                hideArrow
                onClick={() => setRevisando(sinConfirmar ?? datos.certificados.pendienteId ?? null)}
              >
                {tr('Revisar mi pago')}
              </Button>
            </div>
          </Presence>
          {datos.certificados.precioCop === null ? (
            <p className="text-sm text-fg-muted">{tr('El certificado todavía no está a la venta.')}</p>
          ) : (
            <div className="space-y-2">
              <Button hideArrow disabled={comprando || sinCalificacion} onClick={comprar}>
                <Certificate className="mr-2 h-4 w-4" aria-hidden />
                {tr('Comprar certificado por {v}', { v: formatCurrency(datos.certificados.precioCop) })}
              </Button>
              {/* Un botón apagado dice por qué (QA del 19-10-2026). */}
              {sinCalificacion && (
                <p className="text-xs text-fg-muted">
                  {tr('Lo podrás comprar cuando tengas calificación: con cuotas pagadas en Leasefy o un estudio de tus documentos.')}
                </p>
              )}
            </div>
          )}
        </div>
      </Seccion>
    </motion.div>
  );
}
