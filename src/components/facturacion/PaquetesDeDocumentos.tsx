'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, FileText, Receipt, Sparkle } from '@phosphor-icons/react';
import { enterTransition, Stagger, StaggerItem, usePrefersReducedMotion } from '@leasefy/cadence';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { toast } from '@/components/ui/toast';
import { usePermissionsContextSafe } from '@/lib/context/PermissionsContext';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { paquetesDeDocumentosApi, type VistaDeLosPaquetes } from '@/lib/api/paquetes-de-documentos.service';
import { precioDelMes } from '@/lib/conversion/acceso';
import { cn } from '@/lib/utils';

const fecha = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Bogota' });
const numero = (n: number) => n.toLocaleString('es-CO');
const SONDEO_MS = 5_000;
const SONDEO_TOPE_MS = 10 * 60_000;

/** El paquete que más conviene destacar: el de 1.000 (el de la inmobiliaria mediana). */
const DESTACADO = 1_000;

/**
 * Facturación → Documentos (Nico, 27-10-2026: «paquetes de facturación electrónica que le vamos a vender»). La bolsa
 * (cuántos quedan, cuándo vence), los cuatro paquetes con su precio por documento y las compras. Comprar abre Wompi en
 * otra pestaña y esta pantalla espera la confirmación sola. Comprar: el administrador y el contador.
 */
export function PaquetesDeDocumentos() {
  const reducido = usePrefersReducedMotion();
  const permisos = usePermissionsContextSafe();
  const puedeComprar = Boolean(permisos?.isAdmin || permisos?.canAccess('subscription', 'edit'));
  const [vista, setVista] = useState<VistaDeLosPaquetes | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [comprando, setComprando] = useState<number | null>(null);
  const [esperando, setEsperando] = useState<string | null>(null);
  const sondeo = useRef<number | null>(null);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      const v = await paquetesDeDocumentosApi.ver();
      setVista(v);
      return v;
    } catch (e) {
      setError(e);
      return null;
    }
  }, []);
  useEffect(() => {
    void cargar();
    return () => {
      if (sondeo.current) window.clearInterval(sondeo.current);
    };
  }, [cargar]);

  // Mientras Wompi confirma: se vuelve a leer cada 5 s, hasta 10 minutos.
  useEffect(() => {
    if (!esperando) return;
    const inicio = Date.now();
    sondeo.current = window.setInterval(async () => {
      const v = await cargar();
      const pagado = v?.compras.find((c) => c.id === esperando)?.estado === 'PAGADO';
      if (pagado || Date.now() - inicio > SONDEO_TOPE_MS) {
        if (sondeo.current) window.clearInterval(sondeo.current);
        setEsperando(null);
        if (pagado) toast.success('Listo: los documentos ya están en tu bolsa');
      }
    }, SONDEO_MS);
    return () => {
      if (sondeo.current) window.clearInterval(sondeo.current);
    };
  }, [esperando, cargar]);

  const comprar = async (documentos: number) => {
    // La pestaña se abre YA (el navegador bloquea un window.open después de un await) y después va al pago.
    const pestana = window.open('', '_blank');
    setComprando(documentos);
    try {
      const r = await paquetesDeDocumentosApi.comprar(documentos);
      if (pestana) pestana.location.href = r.paymentUrl;
      else window.location.assign(r.paymentUrl);
      setEsperando(r.paqueteId);
    } catch (e) {
      pestana?.close();
      toast.error('No pudimos abrir el pago', { description: mensajeParaLaPersona(e, { accion: 'comprar el paquete' }) });
    } finally {
      setComprando(null);
    }
  };

  if (error) return <FalloDeCarga error={error} queEs="tus documentos de facturación" onReintentar={cargar} />;
  if (!vista) return <div className="h-72 animate-pulse rounded-lg bg-surface-muted" aria-busy="true" />;

  const { bolsa } = vista;
  const tieneBolsa = bolsa.comprados > 0;
  const usado = tieneBolsa ? Math.min(100, Math.max(0, bolsa.porcentaje)) : 0;
  const base = vista.aLaVenta[0]?.porDocumento ?? null;

  return (
    <div className="space-y-6" data-testid="paquetes-de-documentos">
      <motion.section
        initial={reducido ? { opacity: 0 } : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={enterTransition(reducido)}
        className="rounded-lg border border-border bg-surface p-5 sm:p-6"
        data-testid="bolsa-de-documentos"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-fg-muted">Tu bolsa de documentos</p>
            {tieneBolsa ? (
              <p className="mt-2 flex items-baseline gap-2">
                <span className={cn('text-[40px] font-[420] leading-none tracking-[-0.03em] tabular-nums', bolsa.disponibles <= 0 ? 'text-danger' : 'text-fg')}>
                  {numero(bolsa.disponibles)}
                </span>
                <span className="text-sm text-fg-muted">de {numero(bolsa.comprados)} disponibles</span>
              </p>
            ) : (
              <p className="mt-2 text-[18px] font-medium text-fg">Todavía no tienes un paquete</p>
            )}
            <p className="mt-1 text-sm text-fg-muted">
              {tieneBolsa
                ? `Usaste ${numero(bolsa.usados)}${bolsa.venceElPrimero ? ` · el primero vence el ${fecha.format(new Date(bolsa.venceElPrimero))}` : ''}.`
                : `Este mes llevas ${numero(vista.usadosEsteMes)} documentos transmitidos a la DIAN.`}
            </p>
          </div>
          <p className="max-w-[40ch] text-caption text-fg-subtle">
            Cada factura, nota crédito, nota débito o documento soporte que sale a la DIAN gasta uno. Si se acaban, tus
            facturas siguen saliendo y lo de más se descuenta del próximo paquete.
          </p>
        </div>
        {tieneBolsa && (
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-surface-muted" aria-hidden="true">
            <motion.div
              className={cn('h-full rounded-full', bolsa.aviso === 100 ? 'bg-danger' : bolsa.aviso === 80 ? 'bg-warning' : 'bg-primary')}
              initial={{ width: 0 }}
              animate={{ width: `${usado}%` }}
              transition={enterTransition(reducido)}
            />
          </div>
        )}
        {!vista.cobroPrendido && (
          <p className="mt-4 rounded-md bg-surface-muted px-3 py-2 text-sm text-fg-muted" data-testid="documentos-por-cuenta-de-leasefy">
            Por ahora tus documentos los cubre Leasefy. Ya puedes comprar tu paquete y queda listo para cuando empecemos a contarlos.
          </p>
        )}
        {esperando && (
          <p className="mt-4 rounded-md bg-primary-soft px-3 py-2 text-sm text-fg" data-testid="esperando-el-pago">
            Esperando la confirmación de Wompi. Termina el pago en la otra pestaña; aquí se actualiza solo.
          </p>
        )}
      </motion.section>

      <section>
        <h3 className="text-[16px] font-medium text-fg">Paquetes</h3>
        <p className="mt-0.5 text-sm text-fg-muted">Más IVA. Duran 12 meses. Entre más grande, más barato cada documento.</p>
        {!vista.disponible && (
          <p className="mt-3 rounded-md bg-surface-muted px-3 py-2 text-sm text-fg-muted">
            La compra de paquetes se está terminando de activar. Escríbenos y te ayudamos mientras tanto.
          </p>
        )}
        <Stagger className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {vista.aLaVenta.map((p) => {
            const ahorro = base ? Math.round(((base - p.porDocumento) / base) * 100) : 0;
            const destacado = p.documentos === DESTACADO;
            return (
              <StaggerItem
                key={p.documentos}
                className={cn('relative flex flex-col rounded-lg border bg-surface p-5', destacado ? 'border-primary/40 ring-1 ring-primary/20' : 'border-border')}
                data-testid={`paquete-${p.documentos}`}
              >
                {destacado && (
                  <span className="absolute -top-2.5 left-5 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-medium text-primary-fg">
                    <Sparkle size={12} weight="fill" aria-hidden="true" />
                    El más elegido
                  </span>
                )}
                <span className="inline-flex size-10 items-center justify-center rounded-full bg-primary-soft text-primary">
                  {p.documentos >= 1_000 ? <Receipt size={20} weight="duotone" aria-hidden="true" /> : <FileText size={20} weight="duotone" aria-hidden="true" />}
                </span>
                <p className="mt-4 text-[22px] font-[420] tracking-[-0.02em] text-fg tabular-nums">{numero(p.documentos)} documentos</p>
                <p className="mt-1 text-[15px] font-medium text-fg tabular-nums">{precioDelMes(p.precio)} <span className="text-sm font-normal text-fg-muted">+ IVA</span></p>
                <p className="mt-1 text-sm text-fg-muted tabular-nums">
                  {precioDelMes(p.porDocumento)} cada uno{ahorro > 0 ? ` · ahorras ${ahorro} %` : ''}
                </p>
                <p className="mt-1 text-caption text-fg-subtle tabular-nums">Total con IVA: {precioDelMes(p.total)}</p>
                <div className="mt-5 flex-1" />
                {puedeComprar ? (
                  <Button
                    variant={destacado ? 'default' : 'secondary'}
                    className="h-10 rounded-full"
                    onClick={() => void comprar(p.documentos)}
                    isLoading={comprando === p.documentos}
                    disabled={!vista.disponible || comprando !== null || esperando !== null}
                    data-testid={`comprar-${p.documentos}`}
                  >
                    Comprar
                  </Button>
                ) : (
                  <p className="text-caption text-fg-subtle">Lo compra el administrador o el contador.</p>
                )}
              </StaggerItem>
            );
          })}
        </Stagger>
      </section>

      <section>
        <h3 className="text-[16px] font-medium text-fg">Tus compras</h3>
        {vista.compras.length === 0 ? (
          <div className="mt-3">
            <EmptyState icon={Receipt} ilustracion="factura" title="Todavía no has comprado paquetes" description="Cuando compres uno, aquí ves cuándo lo pagaste y hasta cuándo dura." />
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-border rounded-lg border border-border bg-surface">
            {vista.compras.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm">
                <span className="font-medium text-fg tabular-nums">{numero(c.documentos)} documentos</span>
                <span className="text-fg-muted tabular-nums">{precioDelMes(c.precioCop + c.ivaCop)} con IVA</span>
                <span className="text-fg-muted">{fecha.format(new Date(c.pagadoAt ?? c.creadoAt))}</span>
                <span className="ml-auto inline-flex items-center gap-1.5">
                  {c.estado === 'PAGADO' ? (
                    <>
                      <CheckCircle size={16} weight="fill" className="text-success" aria-hidden="true" />
                      <span className="text-fg">Pagado{c.venceAt ? ` · vence el ${fecha.format(new Date(c.venceAt))}` : ''}</span>
                    </>
                  ) : (
                    <span className="text-fg-muted">Esperando el pago</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
