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

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { mensajeDelFallo } from '@/lib/contratos/fallo-de-accion';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import { Avisos, TituloDeBloque } from './piezas';
import { Cargado, useCargaDeNomina } from './usar-nomina';

export function NominaElectronicaPanel() {
  const [periodo, setPeriodo] = useState('');
  const estado = useCargaDeNomina<NominaElectronica>(
    () => nominaApi.electronica({ periodo: periodo || undefined }),
    [periodo],
  );
  const [errores, setErrores] = useState<string[]>([]);

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
      toast.error(mensajeDelFallo(error, 'No se pudo transmitir el documento.'));
    }
  };

  return (
    <div className="space-y-6">
      <Cargado
        estado={estado}
        queEs="los documentos de nómina electrónica"
        queSeEspera="informar la nómina electrónica"
      >
        {(datos) => (
          <>
            <Avisos
              avisos={[datos.proveedor.pila]}
              titulo="La planilla PILA se hace por fuera de Leasefy"
              tono="info"
              testId="aviso-pila"
            />

            {datos.proveedor.aviso ? (
              <Avisos
                avisos={[datos.proveedor.aviso]}
                titulo={
                  datos.proveedor.esDePrueba
                    ? 'Proveedor DE PRUEBA: estos documentos NO llegan a la DIAN'
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

            <section className="space-y-3">
              <TituloDeBloque
                titulo={`Documentos${datos.cola > 0 ? ` · ${datos.cola} en cola` : ''}`}
                explicacion={`Proveedor: ${datos.proveedor.nombre}. «Generar» numera el documento y lo deja sin CUNE; «Transmitir» es el que habla con el proveedor. Los documentos se generan desde el período, cuando está aprobado.`}
                accion={
                  <Input
                    className="w-36"
                    placeholder="2026-03"
                    value={periodo}
                    onChange={(e) => setPeriodo(e.target.value)}
                    aria-label="Filtrar por período"
                    data-testid="filtro-de-periodo"
                  />
                }
              />
              {datos.documentos.length === 0 ? (
                <p className="rounded-lg border border-border bg-surface p-5 text-sm text-fg-muted">
                  Todavía no hay documentos. Se generan desde un período de nómina
                  aprobado.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table data-testid="tabla-de-documentos">
                    <TableHeader>
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
                    <TableBody>
                      {datos.documentos.map((d) => {
                        const dePrueba = d.cune?.startsWith('PRUEBA-') ?? false;
                        return (
                          <TableRow key={d.id} data-testid={`doc-${d.id}`}>
                            <TableCell className="font-mono text-xs">
                              {d.prefijo}-{d.numero}
                            </TableCell>
                            <TableCell className="text-xs">{d.periodo}</TableCell>
                            <TableCell className="text-xs">
                              {d.tipo.replace(/_/g, ' ').toLowerCase()}
                            </TableCell>
                            <TableCell className="text-xs">
                              {d.estado.toLowerCase()}
                              {d.intentos > 1 ? ` · ${d.intentos} intentos` : ''}
                              {d.ultimoError ? (
                                <p className="max-w-xs text-xs leading-relaxed text-warning">
                                  {d.ultimoError}
                                </p>
                              ) : null}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {d.cune ?? '—'}
                              {dePrueba ? (
                                <span
                                  className="ml-1 block text-xs font-medium text-warning"
                                  data-testid={`de-prueba-${d.id}`}
                                >
                                  No se informó a la DIAN
                                </span>
                              ) : null}
                            </TableCell>
                            <TableCell className="text-right font-mono tabular-nums">
                              {formatCurrency(d.totalNetoCop)}
                            </TableCell>
                            <TableCell>
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
                </div>
              )}
            </section>
          </>
        )}
      </Cargado>
    </div>
  );
}
