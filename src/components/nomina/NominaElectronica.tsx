'use client';

/**
 * LA NÓMINA ELECTRÓNICA DE LA DIAN.
 *
 * ── 🔴 Las dos cosas que esta pantalla no deja suponer ──────────────────────
 *
 * 1. **La planilla PILA se hace por fuera.** Leasefy calcula los aportes para que
 *    puedas cuadrarla, pero no genera su archivo ni la presenta. Está escrito
 *    arriba para que nadie busque el botón que no existe.
 * 2. **Un CUNE que empieza por `PRUEBA-` NO se informó a la DIAN.** Cuando el
 *    proveedor es el de prueba, el cartel lo dice en el encabezado y cada
 *    documento lo repite. Un «aceptado» con un CUNE falso es exactamente la clase
 *    de tranquilidad que hace que alguien no cumpla una obligación y se entere
 *    con una sanción.
 *
 * ── Generar no es transmitir ────────────────────────────────────────────────
 *
 * «Generar» numera el documento y lo deja SIN CUNE — la misma regla que las
 * facturas. «Transmitir» es el que habla con el proveedor. Los dos botones están
 * separados porque son dos hechos distintos y uno de los dos es irreversible ante
 * la DIAN.
 */

import { SinDatos } from '@/components/estado/SinDatos';
import { cn } from '@/lib/utils';
import { FileText } from '@phosphor-icons/react';
import Link from 'next/link';
import { sinElEquipoEnLaFrase } from '@/lib/contabilidad/plata';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { CampoDeMes } from '@/components/ui/campo-de-mes';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from '@/components/ui/toast';
import { nominaApi } from '@/lib/api/nomina.service';
import type { NominaElectronica } from '@/lib/api/nomina.types';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import { Avisos, etiquetaDelPeriodo } from './piezas';
import { Cargado, useCargaDeNomina } from './usar-nomina';
import { CifraHeroe } from '@/components/pantalla/CifraHeroe';
import { PestanasDeEstado } from '@/components/pantalla/PestanasDeEstado';
import { Label } from '@/components/ui/label';
import { localeDeLasCifras } from '@/lib/i18n/idioma-de-las-cifras';

/** Lo que se dice en vez de «La integración la hace Víctor» (revisora r25, B8). */
export const CONEXION_CON_LA_DIAN =
  'La conexión con la DIAN la activa Leasefy, con el mismo proveedor de la factura electrónica.';

type VistaDeDocumentos = 'todos' | 'por-transmitir' | 'rechazados' | 'aceptados';
const POR_TRANSMITIR = new Set(['GENERADO', 'EN_COLA', 'TRANSMITIDO', 'NO_CONFIGURADO']);

/**
 * Ronda 26 (revisora r25, Nómina electrónica #1): el texto del back ya empieza con «La planilla PILA se hace
 * por fuera de Leasefy…»; antes el front lo anteponía y salía dos veces seguidas. Sólo se antepone si no lo trae.
 */
function FraseDeLaPila({ pila }: { pila: string }) {
  if (/^\s*la planilla pila se hace por fuera/i.test(pila)) return <>{pila}</>;
  return (
    <>
      <span className="text-fg">La planilla PILA se hace por fuera de Leasefy.</span> {pila}
    </>
  );
}

export function NominaElectronicaPanel() {
  const [periodo, setPeriodo] = useState('');
  const estado = useCargaDeNomina<NominaElectronica>(
    () => nominaApi.electronica({ periodo: periodo || undefined }),
    [periodo],
  );
  const [errores, setErrores] = useState<string[]>([]);
  const [vista, setVista] = useState<VistaDeDocumentos>('todos');

  const transmitir = async (id: string) => {
    setErrores([]);
    try {
      const r = await nominaApi.transmitir(id);
      if (r.estado === 'RECHAZADO' && r.errores?.length) {
        setErrores(r.errores);
        toast.error('El documento fue rechazado. Mira los motivos arriba.');
      } else {
        toast.success(r.mensaje);
      }
      await estado.recargar();
    } catch (error) {
      toast.error(mensajeParaLaPersona(error, { porDefecto: 'No se pudo transmitir el documento.', accion: 'transmitir el documento' }));
    }
  };

  return (
    <div className="space-y-6">
      {/* El filtro del período vive dentro de la tarjeta: al cambiarlo se vuelve a pedir la lista y
          la tarjeta se queda en pantalla con la anterior mientras llega (antes se desmontaba al
          escribir). */}
      <Cargado
        estado={{ ...estado, cargando: estado.cargando && estado.datos === null }}
        queEs="los documentos de nómina electrónica"
        queSeEspera="informar la nómina electrónica"
      >
        {(datos) => {
          const aceptados = datos.documentos.filter((d) => d.estado === 'ACEPTADO');
          const rechazados = datos.documentos.filter((d) => d.estado === 'RECHAZADO');
          const porTransmitir = datos.documentos.filter((d) => POR_TRANSMITIR.has(d.estado));
          const visibles =
            vista === 'aceptados' ? aceptados : vista === 'rechazados' ? rechazados : vista === 'por-transmitir' ? porTransmitir : datos.documentos;
          const cifras = localeDeLasCifras();
          return (
          <>
            {/* GLOW UP 3.ª vuelta · LA RESPUESTA: cuántos documentos ya aceptó la DIAN. La PILA, que
                se hace por fuera, va a su pie: está escrita arriba para que nadie busque el botón. */}
            {datos.documentos.length === 0 ? (
              <p className="text-body-sm text-fg-muted" data-testid="aviso-pila">
                <FraseDeLaPila pila={datos.proveedor.pila} />
              </p>
            ) : (
            <CifraHeroe
              rotulo="Aceptados por la DIAN"
              cifra={`${aceptados.length.toLocaleString(cifras)} de ${datos.documentos.length.toLocaleString(cifras)}`}
              contexto={
                datos.proveedor.esDePrueba
                  ? 'con el proveedor de prueba: no llegan a la DIAN'
                  : `proveedor: ${datos.proveedor.nombre}${datos.cola > 0 ? ` · ${datos.cola} en cola` : ''}`
              }
              total={datos.documentos.length}
              tramos={[
                { clave: 'aceptados', etiqueta: 'Aceptados', monto: aceptados.length, tono: 'exito', cifra: aceptados.length.toLocaleString(cifras) },
                { clave: 'por-transmitir', etiqueta: 'Por transmitir', monto: porTransmitir.length, tono: 'neutro', cifra: porTransmitir.length.toLocaleString(cifras) },
                { clave: 'rechazados', etiqueta: 'Rechazados', monto: rechazados.length, tono: 'critico', cifra: rechazados.length.toLocaleString(cifras) },
              ]}
              pie={
                <span data-testid="aviso-pila">
                  <FraseDeLaPila pila={datos.proveedor.pila} />
                </span>
              }
              data-testid="cifra-de-la-electronica"
            />
            )}

            {datos.proveedor.aviso ? (
              <Avisos
                // Revisora r25 (B8): el aviso del back dice quién del equipo hace la
                // integración; quien lee no sabe quién es Víctor (lo mismo prueban
                // las vecinas: ParametrosDeNomina y Desprendible).
                avisos={[sinElEquipoEnLaFrase(datos.proveedor.aviso, CONEXION_CON_LA_DIAN)]}
                titulo={
                  datos.proveedor.esDePrueba
                    ? 'Proveedor de prueba: estos documentos no llegan a la DIAN'
                    : 'Sin proveedor de nómina electrónica'
                }
                testId="aviso-del-proveedor"
              />
            ) : null}

            {errores.length > 0 ? (
              <Avisos
                avisos={errores}
                titulo="El documento fue rechazado por esto"
                testId="errores-de-transmision"
              />
            ) : null}

            <section className="overflow-hidden rounded-lg border border-border bg-surface" aria-label="Documentos">
              {/* Ronda 30 (revisora r27): sin documentos (y sin período elegido) no hay barra: «Período: Todos»
                  sobre una lista vacía no filtra nada. */}
              <div className={cn('flex flex-wrap items-center gap-3 border-b border-border px-4 py-3', datos.documentos.length === 0 && !periodo && 'hidden')}>
                {datos.documentos.length > 0 ? (
                  <PestanasDeEstado
                    etiqueta="Estado de los documentos"
                    valor={vista}
                    onCambio={setVista}
                    pestanas={[
                      { valor: 'todos', etiqueta: 'Todos', cuantos: datos.documentos.length, fija: true },
                      { valor: 'por-transmitir', etiqueta: 'Por transmitir', cuantos: porTransmitir.length },
                      { valor: 'rechazados', etiqueta: 'Rechazados', cuantos: rechazados.length, tono: 'aviso' },
                      { valor: 'aceptados', etiqueta: 'Aceptados', cuantos: aceptados.length },
                    ]}
                  />
                ) : null}
                <div className="ml-auto flex items-center gap-2">
                  <Label htmlFor="filtro-de-periodo" className="text-caption text-fg-muted">Período</Label>
                  {/* El campo de mes de la casa (guardián fechas-con-cadence: nada de calendarios del navegador). */}
                  <CampoDeMes
                    id="filtro-de-periodo"
                    className="w-44"
                    value={periodo}
                    onChange={setPeriodo}
                    placeholder="Todos"
                    testid="filtro-de-periodo"
                  />
                </div>
              </div>
              {visibles.length === 0 ? (
                // Revisora r25 (C5): el vacío con su salida (antes una línea gris).
                datos.documentos.length === 0 ? (
                  <SinDatos
                    queSon="documentos"
                    icono={FileText}
                    titulo="Todavía no hay documentos"
                    descripcion="Se generan desde un período de nómina aprobado: «Generar» lo numera sin CUNE y «Transmitir» es el que habla con el proveedor."
                    accion={
                      <Button asChild size="sm" variant="secondary" hideArrow>
                        <Link href="/panel/inmobiliaria/nomina/periodos">Ir a Liquidación</Link>
                      </Button>
                    }
                  />
                ) : (
                  <p className="p-5 text-body-sm text-fg-muted">Ningún documento en esta pestaña.</p>
                )
              ) : (
                  <Table data-testid="tabla-de-documentos" className="max-md:block">
                    <TableHeader className="max-md:hidden">
                      <TableRow>
                        <TableHead>Número</TableHead>
                        <TableHead>Período</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>CUNE</TableHead>
                        <TableHead className="text-right">Neto</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody className="max-md:block">
                      {visibles.map((d) => {
                        const dePrueba = d.cune?.startsWith('PRUEBA-') ?? false;
                        return (
                          <TableRow
                            key={d.id}
                            data-testid={`doc-${d.id}`}
                            className="max-md:grid max-md:grid-cols-[minmax(0,1fr)_auto] max-md:gap-x-4 max-md:gap-y-1 max-md:border-b max-md:border-border max-md:px-4 max-md:py-3.5 max-md:last:border-0"
                          >
                            <TableCell className="font-mono text-caption max-md:col-start-1 max-md:row-start-1 max-md:block max-md:p-0 max-md:text-body-sm max-md:text-fg">
                              {d.prefijo}-{d.numero}
                            </TableCell>
                            <TableCell className="text-caption max-md:col-start-1 max-md:row-start-2 max-md:block max-md:p-0 max-md:text-fg-muted">
                              {etiquetaDelPeriodo(d.periodo, null)}
                              <span className="md:hidden"> · {d.tipo.replace(/_/g, ' ').toLowerCase()}</span>
                            </TableCell>
                            <TableCell className="text-caption max-md:hidden">
                              {d.tipo.replace(/_/g, ' ').toLowerCase()}
                            </TableCell>
                            <TableCell className="text-caption max-md:col-start-2 max-md:row-start-2 max-md:block max-md:p-0 max-md:text-right">
                              {d.estado.toLowerCase()}
                              {d.intentos > 1 ? ` · ${d.intentos} intentos` : ''}
                              {d.ultimoError ? (
                                <p className="max-w-xs text-caption leading-relaxed text-warning">
                                  {d.ultimoError}
                                </p>
                              ) : null}
                            </TableCell>
                            <TableCell className="font-mono text-caption max-md:col-span-2 max-md:row-start-3 max-md:block max-md:break-all max-md:p-0 max-md:text-fg-muted">
                              {d.cune ?? '—'}
                              {dePrueba ? (
                                <span
                                  className="ml-1 block text-caption font-medium text-warning"
                                  data-testid={`de-prueba-${d.id}`}
                                >
                                  No se informó a la DIAN
                                </span>
                              ) : null}
                            </TableCell>
                            <TableCell className="text-right font-mono tabular-nums max-md:col-start-2 max-md:row-start-1 max-md:block max-md:p-0">
                              {formatCurrency(d.totalNetoCop)}
                            </TableCell>
                            <TableCell className="max-md:col-span-2 max-md:row-start-4 max-md:block max-md:p-0">
                              {d.estado !== 'ACEPTADO' ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => void transmitir(d.id)}
                                  data-testid={`transmitir-${d.id}`}
                                >
                                  Transmitir
                                </Button>
                              ) : null}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
              )}
            </section>
          </>
          );
        }}
      </Cargado>
    </div>
  );
}
