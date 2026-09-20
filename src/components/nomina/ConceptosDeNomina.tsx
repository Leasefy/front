'use client';

/**
 * LOS CONCEPTOS Y SU CUENTA DEL PUC — el mapeo contable de nómina.
 *
 * ── 🔴 Las DOS marcas que no son la misma ───────────────────────────────────
 *
 * «Constitutivo de salario» y «base prestacional» son dos columnas y no una, y el
 * caso que las separa está en esta tabla: **el auxilio de transporte NO es
 * salario** (no entra al IBC de seguridad social, Ley 15 de 1959) **pero SÍ es
 * base de prima y cesantías** (CST art. 249) — y no de vacaciones (art. 192).
 *
 * La pantalla las muestra por separado, con esa explicación, porque el día que
 * alguien las «unifique» la nómina va a cotizar de más y a provisionar de menos.
 *
 * ── Lo que un concepto de sistema deja y no deja cambiar ───────────────────
 *
 * De los que el motor calcula se puede cambiar el nombre, las cuentas y si está
 * activo. La clase y las bases NO: las define la ley, no la inmobiliaria. Y no se
 * borran — desactivarlos los saca de la vista y deja las liquidaciones viejas
 * cuadrando.
 *
 * ── Y lo que bloquea el asiento ────────────────────────────────────────────
 *
 * Los conceptos sin cuenta salen ARRIBA y contados: son los que hacen que
 * «Asentar» falle, y enterarse al intentar asentar es enterarse tarde.
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
import type { ClaseDeConcepto, Conceptos } from '@/lib/api/nomina.types';
import { mensajeDelFallo } from '@/lib/contratos/fallo-de-accion';
import { Avisos, TituloDeBloque } from './piezas';
import { Cargado, useCargaDeNomina } from './usar-nomina';

const NOMBRE_DE_CLASE: Record<ClaseDeConcepto, string> = {
  DEVENGADO: 'Devengados',
  DEDUCCION: 'Deducciones',
  APORTE_EMPLEADOR: 'Aportes del empleador',
  PROVISION: 'Provisiones de prestaciones',
};

export function ConceptosDeNominaPanel() {
  const estado = useCargaDeNomina<Conceptos>(() => nominaApi.conceptos(), []);
  const [sembrando, setSembrando] = useState(false);
  const [editando, setEditando] = useState<Record<string, string>>({});

  const sembrar = async () => {
    setSembrando(true);
    try {
      const r = await nominaApi.sembrarConceptos();
      toast.success(
        `${r.creados} concepto${r.creados === 1 ? '' : 's'} creado${r.creados === 1 ? '' : 's'}` +
          (r.reparados > 0
            ? ` y ${r.reparados} reparado${r.reparados === 1 ? '' : 's'}`
            : '') +
          ` de ${r.total}.`,
      );
      await estado.recargar();
    } catch (error) {
      toast.error(mensajeDelFallo(error, 'No se pudieron sembrar los conceptos.'));
    } finally {
      setSembrando(false);
    }
  };

  const guardarCuenta = async (
    id: string,
    campo: 'cuentaPuc' | 'cuentaPucContra',
    valor: string,
  ) => {
    try {
      await nominaApi.actualizarConcepto(id, { [campo]: valor.trim() || null });
      toast.success('Cuenta guardada.');
      await estado.recargar();
    } catch (error) {
      toast.error(mensajeDelFallo(error, 'No se pudo guardar la cuenta.'));
    }
  };

  return (
    <div className="space-y-6">
      <Cargado
        estado={estado}
        queEs="el catálogo de conceptos"
        queSeEspera="configurar los conceptos de nómina"
      >
        {(datos) => (
          <>
            {datos.sembrados === 0 ? (
              <Avisos
                avisos={[
                  'El catálogo está vacío. Siémbralo: trae los conceptos que el motor calcula, con las cuentas del Decreto 2650 como SUGERENCIA. Es idempotente — sembrar dos veces no duplica y no pisa lo que edites.',
                ]}
                testId="catalogo-vacio"
              />
            ) : null}

            {datos.sinCuenta.length > 0 ? (
              <Avisos
                avisos={datos.sinCuenta.map(
                  (c) => `${c.codigo} — ${c.nombre}: le falta ${c.falta}.`,
                )}
                titulo={`${datos.sinCuenta.length} concepto${datos.sinCuenta.length === 1 ? '' : 's'} sin cuenta: la nómina se liquida pero NO se asienta`}
                testId="conceptos-sin-cuenta"
              />
            ) : null}

            <section className="space-y-3">
              <TituloDeBloque
                titulo="El catálogo"
                explicacion={datos.avisoDeCuentas}
                accion={
                  <Button
                    variant="outline"
                    onClick={() => void sembrar()}
                    disabled={sembrando}
                    data-testid="sembrar-conceptos"
                  >
                    {datos.sembrados === 0
                      ? 'Sembrar el catálogo'
                      : 'Volver a sembrar (no pisa lo editado)'}
                  </Button>
                }
              />

              <div
                className="rounded-lg border border-border bg-surface p-4 text-xs leading-relaxed text-fg-muted"
                data-testid="por-que-dos-marcas"
              >
                <p className="font-medium text-fg">
                  Por qué hay DOS marcas y no una
                </p>
                <p>
                  «Salarial» significa que entra al IBC de seguridad social.
                  «Prestacional» significa que entra a la base de prima y cesantías.
                  El auxilio de transporte es el caso que las separa:{' '}
                  <strong>no es salario</strong> (Ley 15 de 1959 art. 2) pero{' '}
                  <strong>sí es base de prima y cesantías</strong> (CST art. 249) —
                  y no de vacaciones (art. 192). Unificarlas hace cotizar de más y
                  provisionar de menos.
                </p>
              </div>

              {(Object.keys(NOMBRE_DE_CLASE) as ClaseDeConcepto[]).map((clase) => {
                const lista = datos.conceptos.filter((c) => c.clase === clase);
                if (lista.length === 0) return null;
                return (
                  <div key={clase} className="space-y-2">
                    <h3 className="text-sm font-medium text-fg">
                      {NOMBRE_DE_CLASE[clase]}
                    </h3>
                    <div className="overflow-x-auto">
                      <Table data-testid={`conceptos-${clase}`}>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Código</TableHead>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Salarial</TableHead>
                            <TableHead>Prestacional</TableHead>
                            <TableHead>Cuenta del PUC</TableHead>
                            <TableHead>Contrapartida</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {lista.map((c) => (
                            <TableRow key={c.id} data-testid={`concepto-${c.codigo}`}>
                              <TableCell className="font-mono text-xs">
                                {c.codigo}
                              </TableCell>
                              <TableCell>
                                <span className="text-fg">{c.nombre}</span>
                                {c.notas ? (
                                  <p className="text-xs leading-relaxed text-fg-muted">
                                    {c.notas}
                                  </p>
                                ) : null}
                              </TableCell>
                              <TableCell
                                className="text-xs"
                                data-testid={`salarial-${c.codigo}`}
                              >
                                {c.constitutivoSalario ? 'Sí' : 'No'}
                              </TableCell>
                              <TableCell
                                className="text-xs"
                                data-testid={`prestacional-${c.codigo}`}
                              >
                                {c.basePrestacional ? 'Sí' : 'No'}
                              </TableCell>
                              <TableCell>
                                <Input
                                  className="w-28 font-mono text-xs"
                                  defaultValue={c.cuentaPuc ?? ''}
                                  placeholder="sin mapear"
                                  onChange={(e) =>
                                    setEditando((v) => ({
                                      ...v,
                                      [`${c.id}:cuentaPuc`]: e.target.value,
                                    }))
                                  }
                                  onBlur={() => {
                                    const v = editando[`${c.id}:cuentaPuc`];
                                    if (v !== undefined && v !== (c.cuentaPuc ?? '')) {
                                      void guardarCuenta(c.id, 'cuentaPuc', v);
                                    }
                                  }}
                                  data-testid={`cuenta-${c.codigo}`}
                                />
                              </TableCell>
                              <TableCell>
                                {clase === 'APORTE_EMPLEADOR' ||
                                clase === 'PROVISION' ||
                                c.codigo === 'SUELDO' ? (
                                  <Input
                                    className="w-28 font-mono text-xs"
                                    defaultValue={c.cuentaPucContra ?? ''}
                                    placeholder="sin mapear"
                                    onChange={(e) =>
                                      setEditando((v) => ({
                                        ...v,
                                        [`${c.id}:contra`]: e.target.value,
                                      }))
                                    }
                                    onBlur={() => {
                                      const v = editando[`${c.id}:contra`];
                                      if (
                                        v !== undefined &&
                                        v !== (c.cuentaPucContra ?? '')
                                      ) {
                                        void guardarCuenta(
                                          c.id,
                                          'cuentaPucContra',
                                          v,
                                        );
                                      }
                                    }}
                                    data-testid={`contra-${c.codigo}`}
                                  />
                                ) : (
                                  <span className="text-xs text-fg-muted">—</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                );
              })}
            </section>
          </>
        )}
      </Cargado>
    </div>
  );
}
