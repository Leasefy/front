'use client';

/**
 * Portal del inquilino → Servicios públicos (Portofino, 22-10-2026): «el
 * inquilino sube cada mes la factura pagada» y reporta ahí los «ajustes de
 * conceptos facturados» de EPM (lo de antes de su llegada se le descuenta al
 * propietario). La inmobiliaria la revisa en Operación.
 */

import { useCallback, useEffect, useState } from 'react';
import { Lightning } from '@phosphor-icons/react';
import { CrossFade, StatusBadge } from '@leasefy/cadence';

import { Button } from '@/components/ui/button';
import { Cajon, CajonCabecera, CajonCuerpo, CajonPie } from '@/components/ui/cajon';
import { toast } from '@/components/ui/toast';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { EsqueletoTabla } from '@/components/estado/EsqueletoTabla';
import { formatCurrency } from '@/lib/format';
import { camposDelError, mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { fechaCorta } from '@/components/contratos/BandejaDeCartasDelIncremento';
import { FormularioDeFactura, type ErroresDeLaFactura } from '@/components/servicios-publicos/FormularioDeFactura';
import {
  serviciosPublicosApi,
  type FacturaDeServicio,
  type FacturaQueSeRegistra,
  type ServiciosDelPortal,
} from '@/lib/api/servicios-publicos.service';

const ESTADO: Record<FacturaDeServicio['estado'], { rotulo: string; tono: 'success' | 'warning' | 'critical' | 'neutral' | 'info' }> = {
  POR_REVISAR: { rotulo: 'En revisión', tono: 'warning' },
  AL_DIA: { rotulo: 'Aprobada', tono: 'success' },
  PENDIENTE: { rotulo: 'En proceso', tono: 'info' },
  LIQUIDADA: { rotulo: 'Aplicada', tono: 'success' },
  RECHAZADA: { rotulo: 'Rechazada', tono: 'critical' },
};

export default function ServiciosPublicosDelInquilino() {
  const [datos, setDatos] = useState<ServiciosDelPortal | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [subirA, setSubirA] = useState<string | null>(null);
  const [nueva, setNueva] = useState<FacturaQueSeRegistra | null>(null);
  const [errores, setErrores] = useState<ErroresDeLaFactura>({});
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      setDatos(await serviciosPublicosApi.delPortal());
    } catch (e) {
      setError(e);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const enviar = async () => {
    if (!subirA || !nueva) return;
    setErrores({});
    setEnviando(true);
    try {
      await serviciosPublicosApi.subirDelPortal(subirA, nueva);
      toast.success('Recibimos tu factura', { description: 'La inmobiliaria la revisa y te avisamos.' });
      setSubirA(null);
      await cargar();
    } catch (e) {
      const campos = camposDelError(e);
      if (campos.length > 0) setErrores(Object.fromEntries(campos.map((c) => [c.campo, c.mensaje])));
      else toast.error('No se pudo enviar', { description: mensajeParaLaPersona(e, { accion: 'subir la factura' }) });
    } finally {
      setEnviando(false);
    }
  };

  const verFactura = async (f: FacturaDeServicio) => {
    try {
      const { url } = await serviciosPublicosApi.soporteDelPortal(f.id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      toast.error('No pudimos abrir la factura', { description: mensajeParaLaPersona(e) });
    }
  };

  const vigentes = (datos?.contratos ?? []).filter((c) => c.vigente);

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-h2 text-fg">
          <Lightning className="h-6 w-6 text-primary" weight="duotone" aria-hidden="true" />
          Servicios públicos
        </h1>
        <p className="max-w-2xl text-sm text-fg-muted">
          Sube cada mes la factura que pagaste (energía, agua, gas…). Si la empresa te cobró conceptos de antes de tu llegada,
          súbelos como «ajuste»: se le descuentan al propietario y quedan a tu favor.
        </p>
      </header>

      {error ? (
        <FalloDeCarga error={error} queEs="tus servicios públicos" onReintentar={cargar} />
      ) : (
        <CrossFade swapKey={datos ? 'lista' : 'cargando'} direction="none">
          {!datos ? (
            <EsqueletoTabla columnas={3} filas={3} />
          ) : vigentes.length === 0 ? (
            <p className="rounded-lg border border-border bg-card p-5 text-sm text-fg-muted">No tienes un arriendo vigente.</p>
          ) : (
            <div className="space-y-4">
              {vigentes.map((c) => (
                <section key={c.contractId} className="space-y-3 rounded-lg border border-border bg-card p-4 md:p-5" data-testid={`contrato-${c.contractId}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-fg">{c.inmueble ?? 'Tu arriendo'}</p>
                      {c.contrato && <p className="text-xs text-fg-muted">Contrato {c.contrato}</p>}
                    </div>
                    <Button hideArrow disabled={!datos.disponible} onClick={() => setSubirA(c.contractId)} data-testid="subir-factura">
                      Subir una factura
                    </Button>
                  </div>
                  {c.facturas.length === 0 ? (
                    <p className="text-sm text-fg-muted">Todavía no has subido facturas.</p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {c.facturas.map((f) => (
                        <li key={f.id} className="flex flex-wrap items-start justify-between gap-2 py-3 text-sm">
                          <div>
                            <p className="text-fg">
                              {f.nombreDelServicio}
                              {f.tipo === 'AJUSTE' ? ' · ajuste' : ''} · {formatCurrency(f.valorCop)}
                            </p>
                            <p className="text-xs text-fg-muted">
                              Del {fechaCorta(f.periodoDesde)} al {fechaCorta(f.periodoHasta)}
                            </p>
                            {f.motivoDeLaRevision && <p className="text-xs text-danger">{f.motivoDeLaRevision}</p>}
                          </div>
                          <div className="flex items-center gap-2">
                            <StatusBadge tone={ESTADO[f.estado].tono}>{ESTADO[f.estado].rotulo}</StatusBadge>
                            {f.tieneSoporte && (
                              <Button size="sm" variant="ghost" hideArrow onClick={() => void verFactura(f)}>
                                Ver
                              </Button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
            </div>
          )}
        </CrossFade>
      )}

      <Cajon abierto={!!subirA} onOpenChange={(v) => !v && setSubirA(null)} tamano="lg" data-testid="subir-factura-cajon">
        <CajonCabecera titulo="Subir una factura" descripcion="La inmobiliaria la revisa y te avisa." />
        <CajonCuerpo>{subirA && <FormularioDeFactura modo="inquilino" errores={errores} onCambio={setNueva} />}</CajonCuerpo>
        <CajonPie>
          <Button variant="ghost" hideArrow onClick={() => setSubirA(null)}>
            Cancelar
          </Button>
          <Button hideArrow disabled={!nueva || !nueva.soporte || enviando} isLoading={enviando} onClick={() => void enviar()} data-testid="enviar-factura">
            Enviar la factura
          </Button>
        </CajonPie>
      </Cajon>
    </div>
  );
}
