'use client';
/**
 * 🔴 CB-R21 (04-10-2026) · «Pagar» una factura de proveedor.
 *
 * Decisión de Nico, tal cual: «Proveedores: Una sola, en Gastos». La factura
 * vive en Contabilidad › Gastos; pagarla crea SU egreso (el back hereda del
 * causado el proveedor, el neto, las retenciones, el rubro y la sede: nada de
 * eso se vuelve a escribir, porque escribirlo dos veces es cómo se gira un valor
 * distinto al que se causó). El egreso queda PENDIENTE en Egresos y de ahí va
 * al lote, que aprueba OTRA persona: la doble firma ya existe y no se duplica.
 *
 * Lo único que se pide es la cuenta a la que se gira, porque el egreso no la
 * deja cambiar después (sólo la fecha) y el archivo para el banco la necesita.
 * Es opcional: sin ella el egreso nace igual y el giro se hace a mano.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Cajon, CajonCabecera, CajonCuerpo, CajonPie } from '@/components/ui/cajon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SegmentedControl } from '@/components/ui/toggle-group';
import { toast } from '@/components/ui/toast';
import { mensajeDeContabilidad } from '@/components/migracion/contabilidad-errores';
import {
  gastosApi,
  type Egreso,
  type FacturaDeProveedor,
} from '@/lib/api/gastos.service';
import { diaLegible } from '@/lib/contabilidad/fechas';
import { Monto } from '../Monto';
import { Nota } from '../piezas';

const TIPOS_DE_CUENTA = [
  { valor: 'AHORROS', nombre: 'Ahorros' },
  { valor: 'CORRIENTE', nombre: 'Corriente' },
] as const;

/** El número que se muestra de la factura del proveedor: «FE-77» o «77». */
export function numeroDeLaFactura(f: Pick<FacturaDeProveedor, 'prefijoDelProveedor' | 'numeroDelProveedor'>): string {
  return [f.prefijoDelProveedor, f.numeroDelProveedor].filter(Boolean).join('-');
}

export function PagarFactura({
  factura,
  onCerrar,
  onPagada,
}: {
  factura: FacturaDeProveedor | null;
  onCerrar: () => void;
  onPagada: (egreso: Egreso) => void;
}) {
  const [banco, setBanco] = useState('');
  const [tipoDeCuenta, setTipoDeCuenta] = useState('');
  const [numeroDeCuenta, setNumeroDeCuenta] = useState('');
  const [enviando, setEnviando] = useState(false);

  const numeroMalo = numeroDeCuenta.trim() !== '' && !/^[\d\s-]+$/.test(numeroDeCuenta.trim());
  const retenciones = factura
    ? factura.retefuenteCop + factura.reteivaCop + factura.reteicaCop
    : 0;

  const cerrar = () => {
    if (enviando) return;
    setBanco('');
    setTipoDeCuenta('');
    setNumeroDeCuenta('');
    onCerrar();
  };

  const pagar = async () => {
    if (!factura || numeroMalo) return;
    setEnviando(true);
    try {
      const egreso = await gastosApi.facturas.pagar(factura.id, {
        banco,
        tipoDeCuenta,
        numeroDeCuenta: numeroDeCuenta.replace(/[\s-]/g, ''),
      });
      toast.success(
        `La factura de ${factura.proveedorNombre} quedó en Egresos, lista para el lote. El lote lo aprueba otra persona antes de girar.`,
      );
      setBanco('');
      setTipoDeCuenta('');
      setNumeroDeCuenta('');
      onPagada(egreso);
    } catch (e) {
      toast.error(mensajeDeContabilidad(e, 'No se pudo mandar a pagar la factura.'));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Cajon
      abierto={factura !== null}
      onOpenChange={(a) => {
        if (!a) cerrar();
      }}
      data-testid="cajon-pagar-factura"
    >
      {factura ? (
        <>
          <CajonCabecera
            titulo={`Pagar a ${factura.proveedorNombre}`}
            descripcion={`Factura ${numeroDeLaFactura(factura) || 'sin número'} del ${diaLegible(factura.fecha)}`}
          />
          <CajonCuerpo className="space-y-6">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <dt className="text-fg-muted">Total de la factura</dt>
              <dd className="text-right">
                <Monto valor={factura.totalCop} />
              </dd>
              <dt className="text-fg-muted">Retenciones que le practicas</dt>
              <dd className="text-right">
                {/* Sin retenciones, «$ 0» (no «$ -0»). */}
                <Monto valor={retenciones > 0 ? -retenciones : 0} />
              </dd>
              <dt className="font-medium text-fg">Lo que se le gira</dt>
              <dd className="text-right font-semibold" data-testid="pagar-neto">
                <Monto valor={factura.netoCop} />
              </dd>
              {factura.fechaDeVencimiento ? (
                <>
                  <dt className="text-fg-muted">Vence</dt>
                  <dd className="text-right">{diaLegible(factura.fechaDeVencimiento)}</dd>
                </>
              ) : null}
            </dl>

            <fieldset className="space-y-4">
              <legend className="text-sm font-medium text-fg">Cuenta del proveedor</legend>
              <div className="space-y-1.5">
                <Label htmlFor="pagar-banco">Banco</Label>
                <Input
                  id="pagar-banco"
                  value={banco}
                  onChange={(e) => setBanco(e.target.value)}
                  placeholder="Bancolombia"
                  maxLength={80}
                  data-testid="pagar-banco"
                />
              </div>
              <div className="space-y-1.5">
                <span className="text-sm font-medium text-fg">Tipo de cuenta</span>
                <div data-testid="pagar-tipo">
                  <SegmentedControl
                    aria-label="Tipo de cuenta"
                    value={tipoDeCuenta}
                    onValueChange={(v: string) => setTipoDeCuenta(v)}
                    options={TIPOS_DE_CUENTA.map((t) => ({ value: t.valor, label: t.nombre }))}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pagar-numero">Número de cuenta</Label>
                <Input
                  id="pagar-numero"
                  value={numeroDeCuenta}
                  onChange={(e) => setNumeroDeCuenta(e.target.value)}
                  inputMode="numeric"
                  maxLength={30}
                  aria-invalid={numeroMalo}
                  data-testid="pagar-numero"
                />
                {numeroMalo ? (
                  <p className="text-caption text-danger">El número de cuenta lleva sólo dígitos.</p>
                ) : null}
              </div>
              <Nota>
                La cuenta no se puede cambiar después. Si no la tienes ahora, el egreso queda igual
                y el giro lo haces por fuera del archivo del banco.
              </Nota>
            </fieldset>
          </CajonCuerpo>
          <CajonPie>
            <Button variant="outline" hideArrow onClick={cerrar} disabled={enviando}>
              Cancelar
            </Button>
            <Button
              hideArrow
              onClick={() => void pagar()}
              disabled={enviando || numeroMalo}
              data-testid="confirmar-pagar-factura"
            >
              {enviando ? 'Enviando…' : 'Mandar a pagar'}
            </Button>
          </CajonPie>
        </>
      ) : null}
    </Cajon>
  );
}
