'use client';

/**
 * El cajón de un contrato en Operación → Servicios públicos. Dos trabajos, en dos pestañas:
 *   · FACTURAS — revisar lo que subió el inquilino (o lo que Servi dejó por decidir), registrar una factura y ver la
 *     liquidación de ENTRADA de la que cruza el inicio (anterior vs nuevo, como la hoja de Portofino);
 *   · ENTREGA DEL INMUEBLE — la liquidación de SALIDA (meses pendientes + trámites − saldo a favor) y cargarla al
 *     contrato como «Anticipo de servicios públicos» (Portofino, 29-10-2026).
 * La lista no se pierde: todo pasa en el cajón.
 */

import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft } from '@phosphor-icons/react';
import { backButtonVariants } from '@leasefy/cadence';

import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Cajon, CajonCabecera, CajonCuerpo, CajonPie } from '@/components/ui/cajon';
import { toast } from '@/components/ui/toast';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { EsqueletoTabla } from '@/components/estado/EsqueletoTabla';
import { VacioChico } from '@/components/estado/VacioChico';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { camposDelError, mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { diaCorto } from '@/lib/servicios-publicos/corte-de-la-factura';
import { FormularioDeFactura, type ErroresDeLaFactura } from '@/components/servicios-publicos/FormularioDeFactura';
import { FacturaDelContrato } from '@/components/servicios-publicos/FacturaDelContrato';
import { LiquidacionDeEntrada } from '@/components/servicios-publicos/LiquidacionDeEntrada';
import { LiquidacionDeSalida } from '@/components/servicios-publicos/LiquidacionDeSalida';
import {
  serviciosPublicosApi,
  type FacturaDeServicio,
  type FacturaQueSeRegistra,
  type FilaDelTablero,
  type ServiciosDelContrato,
} from '@/lib/api/servicios-publicos.service';

export type PestanaDelContrato = 'facturas' | 'salida';

interface Props {
  fila: FilaDelTablero | null;
  onCerrar: () => void;
  onCambio: () => void;
  /** `operaciones:edit`: revisar y registrar facturas. */
  puedeEditar: boolean;
  /** `contratos:edit`: cargar el anticipo de servicios al contrato. */
  puedeCargar: boolean;
  /** Con qué pestaña abre (por defecto, las facturas). */
  pestanaInicial?: PestanaDelContrato;
}

export function CajonDelContrato({ fila, onCerrar, onCambio, puedeEditar, puedeCargar, pestanaInicial = 'facturas' }: Props) {
  const [datos, setDatos] = useState<ServiciosDelContrato | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [nueva, setNueva] = useState<FacturaQueSeRegistra | null>(null);
  const [errores, setErrores] = useState<ErroresDeLaFactura>({});
  const [guardando, setGuardando] = useState(false);
  const [registrando, setRegistrando] = useState(false);
  const [version, setVersion] = useState(0);
  const [pestana, setPestana] = useState<PestanaDelContrato>(pestanaInicial);
  const [entradaDe, setEntradaDe] = useState<FacturaDeServicio | null>(null);

  const cargar = useCallback(async () => {
    if (!fila) return;
    setError(null);
    try {
      setDatos(await serviciosPublicosApi.delContrato(fila.contractId));
    } catch (e) {
      setError(e);
    }
  }, [fila]);

  useEffect(() => {
    setDatos(null);
    setRegistrando(false);
    setEntradaDe(null);
    setPestana(pestanaInicial);
    void cargar();
  }, [cargar, pestanaInicial]);

  const despues = async (hacer: () => Promise<unknown>, exito: string) => {
    setGuardando(true);
    try {
      await hacer();
      toast.success(exito);
      await cargar();
      onCambio();
      return true;
    } catch (e) {
      toast.error('No se pudo', { description: mensajeParaLaPersona(e, { accion: 'guardar la factura' }) });
      return false;
    } finally {
      setGuardando(false);
    }
  };

  const verSoporte = async (f: FacturaDeServicio) => {
    try {
      const { url } = await serviciosPublicosApi.soporte(f.id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      toast.error('No se pudo abrir el soporte', { description: mensajeParaLaPersona(e) });
    }
  };

  const registrar = async () => {
    if (!fila || !nueva) return;
    setErrores({});
    setGuardando(true);
    try {
      await serviciosPublicosApi.registrar(fila.contractId, nueva);
      toast.success(
        nueva.tipo === 'ENTRADA'
          ? 'Registramos la factura de entrada y repartimos los días.'
          : nueva.tipo === 'SALIDA'
            ? 'Registramos la factura de salida.'
            : 'Registramos la factura.',
      );
      setRegistrando(false);
      setVersion((v) => v + 1);
      await cargar();
      onCambio();
    } catch (e) {
      const campos = camposDelError(e);
      if (campos.length > 0) setErrores(Object.fromEntries(campos.map((c) => [c.campo, c.mensaje])));
      else toast.error('No se pudo registrar', { description: mensajeParaLaPersona(e, { accion: 'registrar la factura' }) });
    } finally {
      setGuardando(false);
    }
  };

  const inicio = fila?.inicio ?? datos?.entrega ?? null;
  const porRevisar = datos?.facturas.filter((f) => f.estado === 'POR_REVISAR').length ?? fila?.porRevisar ?? 0;

  return (
    <Cajon abierto={!!fila} onOpenChange={(v) => !v && onCerrar()} tamano="xl" data-testid="facturas-del-contrato">
      <Tabs value={pestana} onValueChange={(v) => setPestana(v as PestanaDelContrato)} className="contents">
        <CajonCabecera
          titulo={fila ? `${fila.contrato ?? 'Contrato'} · ${fila.inquilino ?? 'Sin inquilino'}` : ''}
          descripcion={
            fila
              ? [fila.inmueble, inicio ? `empezó el ${diaCorto(inicio, true)}` : null].filter(Boolean).join(' · ') || undefined
              : undefined
          }
        >
          <TabsList variant="segmented" className="mt-1 justify-start">
            <TabsTrigger value="facturas" data-testid="pestana-facturas" className="whitespace-nowrap">
              Facturas
              {porRevisar > 0 ? <span className="ml-1.5 font-mono tabular-nums text-fg-muted">{porRevisar}</span> : null}
            </TabsTrigger>
            <TabsTrigger value="salida" data-testid="pestana-salida" className="whitespace-nowrap">
              Entrega del inmueble
            </TabsTrigger>
          </TabsList>
        </CajonCabecera>
        <CajonCuerpo>
          <TabsContent value="facturas" forceMount className="mt-0 space-y-6 data-[state=inactive]:hidden">
            {error ? (
              <FalloDeCarga error={error} queEs="las facturas del contrato" onReintentar={cargar} />
            ) : !datos ? (
              <EsqueletoTabla columnas={3} filas={3} />
            ) : entradaDe ? (
              <section className="space-y-4" data-testid="vista-de-la-entrada">
                <button type="button" onClick={() => setEntradaDe(null)} className={cn(backButtonVariants({ variant: 'subtle' }))} data-testid="volver-a-las-facturas">
                  <ArrowLeft aria-hidden="true" />
                  <span>Volver a las facturas</span>
                </button>
                <div className="space-y-1">
                  <h3 className="text-h3 text-fg">Liquidación de entrada</h3>
                  <p className="text-body-sm text-fg-muted">
                    {entradaDe.nombreDelServicio} por <span className="font-mono tabular-nums">{formatCurrency(entradaDe.valorCop)}</span>, partida por
                    días entre el anterior y el inquilino que llega.
                  </p>
                </div>
                <LiquidacionDeEntrada factura={entradaDe} entrega={inicio} data-testid="entrada-de-la-factura" />
              </section>
            ) : (
              <>
                {!datos.disponible && (
                  <p className="rounded-md bg-warning-soft px-3 py-2 text-caption text-fg">
                    Falta una actualización de la base: todavía no se pueden registrar facturas.
                  </p>
                )}
                {datos.garantia && (
                  <p className="text-body-sm text-fg-muted" data-testid="saldo-de-la-garantia">
                    Garantía de servicios: queda{' '}
                    <span className="font-mono tabular-nums text-fg">{formatCurrency(datos.garantia.saldoCop)}</span> del inquilino.
                  </p>
                )}

                <section className="space-y-3">
                  <h3 className="text-label text-fg-subtle">Facturas</h3>
                  {datos.facturas.length === 0 ? (
                    <VacioChico
                      ilustracion="factura"
                      titulo="Este contrato todavía no tiene facturas de servicios."
                      detalle="Cuando el inquilino suba la del mes desde su portal, aparece aquí para revisarla."
                    />
                  ) : (
                    <ul className="divide-y divide-border rounded-lg border border-border">
                      {datos.facturas.map((f) => (
                        <FacturaDelContrato
                          key={f.id}
                          factura={f}
                          inicio={inicio}
                          puedeEditar={puedeEditar}
                          guardando={guardando}
                          onVerSoporte={() => void verSoporte(f)}
                          onAprobar={() =>
                            void despues(
                              () => serviciosPublicosApi.aprobar(f.id),
                              f.tipo === 'AJUSTE' ? 'Aprobamos el ajuste: queda a favor del inquilino.' : 'La factura quedó al día.',
                            )
                          }
                          onRechazar={(motivo) => despues(() => serviciosPublicosApi.rechazar(f.id, motivo), 'Rechazamos la factura y le avisamos al inquilino.')}
                          onPagarConLaGarantia={() =>
                            void despues(() => serviciosPublicosApi.pagarConLaGarantia(f.id), 'Pagamos la parte del inquilino con su garantía.')
                          }
                          onPartirPorDias={() => setEntradaDe(f)}
                        />
                      ))}
                    </ul>
                  )}
                </section>

                {puedeEditar && datos.disponible && (
                  <section className="space-y-3">
                    {registrando ? (
                      <FormularioDeFactura
                        key={version}
                        modo="inmobiliaria"
                        entrega={datos.entrega}
                        devolucion={datos.devolucion}
                        errores={errores}
                        revisarEntrada={(d) => serviciosPublicosApi.revisarEntrada(datos.contractId, d)}
                        onCambio={setNueva}
                      />
                    ) : (
                      <Button variant="outline" hideArrow onClick={() => setRegistrando(true)} data-testid="registrar-factura">
                        Registrar una factura
                      </Button>
                    )}
                  </section>
                )}
              </>
            )}
          </TabsContent>
          <TabsContent value="salida" forceMount className="mt-0 data-[state=inactive]:hidden">
            {fila && (
              <LiquidacionDeSalida key={fila.contractId} contractId={fila.contractId} activa={pestana === 'salida'} puedeCargar={puedeCargar} onCargada={onCambio} />
            )}
          </TabsContent>
        </CajonCuerpo>
        {pestana === 'facturas' && registrando && !entradaDe && (
          <CajonPie>
            <Button variant="ghost" hideArrow onClick={() => setRegistrando(false)}>
              Cancelar
            </Button>
            <Button hideArrow disabled={!nueva || guardando} isLoading={guardando} onClick={() => void registrar()} data-testid="guardar-factura">
              Guardar la factura
            </Button>
          </CajonPie>
        )}
      </Tabs>
    </Cajon>
  );
}
