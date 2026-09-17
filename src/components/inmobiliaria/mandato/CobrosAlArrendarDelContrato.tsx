'use client';

/**
 * Lo que la inmobiliaria le cobra al PROPIETARIO por arrendar este inmueble
 * (regla del 17-09): colocación, una póliza opcional o cualquier cobro con
 * nombre que la casa haya configurado.
 *
 * Se descuenta en la primera liquidación del propietario, como una deducción
 * más —con su propio origen— así que sigue las reglas que ya existen: si el mes
 * no alcanza, queda saldo en contra y pasa al siguiente. Los obligatorios los
 * aplica el back solo al activarse el contrato; acá se ven, y se aplican los
 * opcionales que la inmobiliaria escoja.
 */

import { useCallback, useEffect, useState } from 'react';
import { Receipt } from '@phosphor-icons/react';

import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/components/ui/toast';
import { mandatoApi, type CobrosAlArrendarDelContrato as Datos } from '@/lib/api/mandato.service';
import { mensajeDelFallo } from '@/lib/contratos/fallo-de-accion';
import { PESOS } from '@/lib/mandato/textos';

export function CobrosAlArrendarDelContrato({
  contractId,
  puedeAplicar,
}: {
  contractId: string;
  puedeAplicar: boolean;
}) {
  const [datos, setDatos] = useState<Datos | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [escogidos, setEscogidos] = useState<string[]>([]);
  const [aplicando, setAplicando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const d = await mandatoApi.cobrosAlArrendar(contractId);
      setDatos(d);
      setEscogidos([]);
      setError(null);
    } catch (e) {
      setError(e);
    } finally {
      setCargando(false);
    }
  }, [contractId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function aplicar() {
    setAplicando(true);
    try {
      const r = await mandatoApi.aplicarCobrosAlArrendar(contractId, escogidos);
      toast.success(
        r.aplicados.length === 1
          ? `${r.aplicados[0].nombre} queda como deducción.`
          : `${r.aplicados.length} cobros quedan como deducción.`,
        { description: 'Se descuentan de la próxima liquidación del propietario.' },
      );
      await cargar();
    } catch (e) {
      toast.error('No se pudieron aplicar.', { description: mensajeDelFallo(e, '') });
    } finally {
      setAplicando(false);
    }
  }

  // Sin cobros configurados la sección no existe: una tarjeta vacía en la ficha
  // del contrato es ruido, no información.
  if (!cargando && !error && (datos?.cobros.length ?? 0) === 0) return null;

  return (
    <section className="rounded-lg border border-border bg-card overflow-hidden" data-testid="cobros-al-arrendar">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
        <Receipt className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
        <h3 className="text-base font-semibold text-foreground">Cobros al propietario por arrendar</h3>
      </div>
      <div className="p-5">
        <EstadoDeDatos
          cargando={cargando}
          error={error}
          vacio={!datos}
          queEs="los cobros al arrendar"
          onReintentar={cargar}
        >
          {datos ? (
            <div className="space-y-4">
              {!datos.disponible && datos.motivo ? (
                <p className="text-sm text-warning">{datos.motivo}</p>
              ) : null}
              <p className="text-sm text-muted-foreground">
                Se descuentan de la liquidación de{' '}
                {datos.propietarioName ?? 'el propietario'}. El primer canon de este contrato es{' '}
                {PESOS.format(datos.primerCanonCop)}.
              </p>
              <ul className="space-y-2">
                {datos.cobros.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-start justify-between gap-3 rounded-md border border-border p-3"
                  >
                    <span className="flex items-start gap-2">
                      {c.aplicado || !c.opcional || !puedeAplicar || !datos.disponible ? null : (
                        <Checkbox
                          checked={escogidos.includes(c.id)}
                          aria-label={`Aplicar ${c.nombre}`}
                          onCheckedChange={(v) =>
                            setEscogidos((e) =>
                              v === true ? [...e, c.id] : e.filter((x) => x !== c.id),
                            )
                          }
                        />
                      )}
                      <span>
                        <span className="block text-sm text-foreground">{c.nombre}</span>
                        <span className="block text-xs text-muted-foreground">
                          {c.tipo === 'PORCENTAJE_PRIMER_CANON'
                            ? `${c.valor.toLocaleString('es-CO')} % del primer canon`
                            : 'valor fijo'}
                          {c.opcional ? ' · opcional' : ' · siempre'}
                        </span>
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="block text-sm font-medium tabular-nums text-foreground">
                        {PESOS.format(c.valorCop)}
                      </span>
                      <span
                        className="block text-xs text-muted-foreground"
                        data-testid={`estado-${c.id}`}
                      >
                        {c.aplicado ? 'ya descontado' : 'sin aplicar'}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
              {escogidos.length > 0 ? (
                <div className="flex justify-end">
                  <Button size="sm" hideArrow isLoading={aplicando} onClick={aplicar}>
                    Aplicar {escogidos.length === 1 ? 'el cobro' : `${escogidos.length} cobros`}
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
        </EstadoDeDatos>
      </div>
    </section>
  );
}
