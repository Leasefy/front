'use client';

/**
 * La certificación del mandatario y las facturas de la comisión, en el portal
 * del propietario (Nico, 11-10-2026: «Certificados descargables»). Antes la
 * pantalla decía «pídeselas a tu inmobiliaria»: ahora se bajan aquí.
 *
 * Nico: «ambas, según si lo gestiona una inmobiliaria o Leasefy». Con
 * inmobiliaria se ven las certificaciones que ELLA generó y, si no hay, se le
 * pide con una solicitud (la misma PQRS del portal). La que se genera sola es
 * para lo que gestione Leasefy (el panel del propietario independiente, hoy en
 * pausa).
 */
import { useCallback, useEffect, useState } from 'react';
import { FileArrowDown, Receipt, SealCheck } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { formatCurrency } from '@/lib/format';
import { fechaCorta } from '@/lib/fechas/fecha-de-la-casa';
import { nombreDelMes } from '@/lib/recaudo/meses';
import { pqrsApi } from '@/lib/api/pqrs.service';
import {
  portalDelPropietarioApi,
  type CertificacionDelMandatario,
  type FacturaDeLaComision,
} from '@/lib/api/portal-del-propietario.service';

function BotonDeBajar({ onBajar, etiqueta, testid }: { onBajar: () => Promise<void>; etiqueta: string; testid: string }) {
  const [bajando, setBajando] = useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      hideArrow
      isLoading={bajando}
      data-testid={testid}
      onClick={async () => {
        setBajando(true);
        try {
          await onBajar();
        } catch (e) {
          toast.error(mensajeParaLaPersona(e, { porDefecto: 'No pudimos bajar el PDF.', accion: 'bajar el PDF' }));
        } finally {
          setBajando(false);
        }
      }}
    >
      <FileArrowDown className="h-4 w-4" aria-hidden="true" />
      {etiqueta}
    </Button>
  );
}

export function DocumentosTributarios() {
  const [certs, setCerts] = useState<CertificacionDelMandatario[] | null>(null);
  const [facturas, setFacturas] = useState<FacturaDeLaComision[] | null>(null);
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState<unknown>(null);
  const [pedida, setPedida] = useState(false);
  const [pidiendo, setPidiendo] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setFallo(null);
    try {
      const [c, f] = await Promise.all([
        portalDelPropietarioApi.certificacionesDelMandatario(),
        portalDelPropietarioApi.facturas(),
      ]);
      setCerts(c.certificaciones);
      setFacturas(f.facturas);
    } catch (e) {
      setFallo(e);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const anioPasado = new Date().getFullYear() - 1;
  const pedir = async () => {
    setPidiendo(true);
    try {
      const { contratos } = await pqrsApi.listMineConDisponibilidad();
      await pqrsApi.create({
        tipo: 'peticion',
        asunto: `Certificación del mandatario ${anioPasado}`,
        descripcion: `Necesito la certificación del mandatario del año ${anioPasado} (lo facturado a mis inquilinos por mi cuenta) para mi declaración de renta.`,
        contratoId: contratos[0]?.contratoId,
      });
      setPedida(true);
      toast.success('Le pedimos la certificación a tu inmobiliaria. La ves en Solicitudes.');
    } catch (e) {
      toast.error(mensajeParaLaPersona(e, { porDefecto: 'No pudimos pedirla.', accion: 'pedir la certificación' }));
    } finally {
      setPidiendo(false);
    }
  };

  return (
    <EstadoDeDatos cargando={cargando} error={fallo} queEs="tus documentos tributarios" onReintentar={cargar}>
      <div className="space-y-6" data-testid="documentos-tributarios">
        <section className="space-y-3 rounded-lg border border-border bg-surface p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-subtitle text-fg">
                <SealCheck className="h-4 w-4 text-fg-muted" aria-hidden="true" />
                Certificación del mandatario
              </h2>
              <p className="max-w-2xl text-body-sm text-fg-muted">
                Lo que tu inmobiliaria les facturó a tus inquilinos por tu cuenta: va en tu declaración de renta.
              </p>
            </div>
            {certs !== null && certs.length === 0 && (
              <Button size="sm" hideArrow isLoading={pidiendo} disabled={pedida} onClick={() => void pedir()} data-testid="pedir-certificacion">
                {pedida ? 'Ya la pediste' : 'Pedírsela a tu inmobiliaria'}
              </Button>
            )}
          </div>
          {certs && certs.length > 0 ? (
            <ul className="divide-y divide-border-faint">
              {certs.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3" data-testid={`certificacion-${c.id}`}>
                  <div className="min-w-0">
                    <p className="text-body-sm font-medium text-fg">Período {c.periodo}</p>
                    <p className="text-caption text-fg-muted">
                      {c.inmobiliaria} · {c.facturas === 1 ? '1 factura' : `${c.facturas} facturas`} · {formatCurrency(c.totalCop)}
                    </p>
                  </div>
                  <BotonDeBajar
                    testid={`bajar-certificacion-${c.id}`}
                    etiqueta="Descargar PDF"
                    onBajar={() => portalDelPropietarioApi.bajarCertificacion(c)}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-body-sm text-fg-muted" data-testid="sin-certificacion">
              Tu inmobiliaria todavía no ha generado tu certificación. Pídesela y te llega a tu portal.
            </p>
          )}
        </section>

        <section className="space-y-3 rounded-lg border border-border bg-surface p-5">
          <div>
            <h2 className="flex items-center gap-2 text-subtitle text-fg">
              <Receipt className="h-4 w-4 text-fg-muted" aria-hidden="true" />
              Facturas de la comisión
            </h2>
            <p className="max-w-2xl text-body-sm text-fg-muted">
              Las facturas electrónicas que tu inmobiliaria te emitió por administrar tus inmuebles.
            </p>
          </div>
          {facturas && facturas.length > 0 ? (
            <ul className="divide-y divide-border-faint">
              {facturas.map((f) => (
                <li key={f.id} className="flex flex-wrap items-center justify-between gap-3 py-3" data-testid={`factura-${f.id}`}>
                  <div className="min-w-0">
                    <p className="text-body-sm font-medium text-fg">
                      Factura {f.numero ?? 'sin número'} · {nombreDelMes(f.mes)}
                    </p>
                    <p className="truncate text-caption text-fg-muted">
                      {f.inmueble} · emitida el {fechaCorta(f.emitidaEl)} · {formatCurrency(f.totalCop)}
                    </p>
                  </div>
                  <BotonDeBajar testid={`bajar-factura-${f.id}`} etiqueta="Descargar PDF" onBajar={() => portalDelPropietarioApi.bajarFactura(f)} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-body-sm text-fg-muted" data-testid="sin-facturas">
              Todavía no hay facturas de la comisión a tu nombre.
            </p>
          )}
        </section>
      </div>
    </EstadoDeDatos>
  );
}
