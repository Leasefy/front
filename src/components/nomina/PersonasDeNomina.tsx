'use client';

/**
 * LAS PERSONAS DE NÓMINA — los cuatro tipos, y qué implica cada uno.
 *
 * ── 🔴 Por qué el tipo se elige y no se deduce ──────────────────────────────
 *
 * Un EMPLEADO y un contratista de PRESTACIÓN DE SERVICIOS se ven casi iguales en
 * un formulario y se liquidan completamente distinto: al contratista no se le
 * liquidan prestaciones, ni auxilio de transporte, ni aportes del empleador, y su
 * retención es la del art. 392 y no la tabla del art. 383.
 *
 * Por eso cada tipo trae escrito en pantalla lo que implica, ANTES de elegirlo, y
 * el back rechaza las combinaciones imposibles (un aprendiz con contrato
 * indefinido, un contratista con contrato a término fijo).
 *
 * ── Y una cosa que esta pantalla NO hace ───────────────────────────────────
 *
 * **No calcula la comisión de un asesor.** Nico (17-09): «la comisión de los
 * asesores va por fuera de Leasefy». Acá un asesor es alguien a quien se le paga
 * una comisión que se REGISTRA como novedad. Lo que sí hace el producto, y es la
 * parte que cuesta plata si se hace mal, es tratarla como SALARIO: entra al IBC y
 * a la base de prima, cesantías y vacaciones.
 */

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import type {
  CatalogoDePersonas,
  Personas,
  TipoDePersona,
} from '@/lib/api/nomina.types';
import { mensajeDelFallo } from '@/lib/contratos/fallo-de-accion';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import { Avisos, TituloDeBloque } from './piezas';
import { Cargado, useCargaDeNomina } from './usar-nomina';

/** El contrato que le corresponde a cada tipo, para que el formulario no falle. */
const CONTRATO_POR_TIPO: Record<TipoDePersona, string> = {
  EMPLEADO: 'INDEFINIDO',
  ASESOR: 'INDEFINIDO',
  PRESTACION_SERVICIOS: 'PRESTACION_SERVICIOS',
  APRENDIZ: 'APRENDIZAJE',
};

export function PersonasDeNominaPanel() {
  const [busqueda, setBusqueda] = useState('');
  const estado = useCargaDeNomina<{
    personas: Personas;
    catalogo: CatalogoDePersonas;
  }>(async () => {
    const [p, c] = await Promise.all([
      nominaApi.personas({ busqueda: busqueda || undefined }),
      nominaApi.catalogoDePersonas(),
    ]);
    return { personas: p, catalogo: c };
  }, [busqueda]);

  const [abriendo, setAbriendo] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="busqueda-de-personas">Buscar por nombre o documento</Label>
          <Input
            id="busqueda-de-personas"
            className="w-72"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            data-testid="busqueda-de-personas"
          />
        </div>
        <Button onClick={() => setAbriendo(true)} data-testid="nueva-persona">
          Registrar a alguien
        </Button>
      </div>

      <Cargado
        estado={estado}
        queEs="las personas de nómina"
        queSeEspera="registrar a alguien en nómina"
      >
        {({ personas, catalogo }) => (
          <>
            {personas.cuotaDeAprendices?.aviso ? (
              <Avisos
                avisos={[
                  personas.cuotaDeAprendices.aviso,
                  personas.cuotaDeAprendices.fuente,
                ]}
                titulo="Cuota de aprendices"
                testId="cuota-de-aprendices"
              />
            ) : null}

            <section className="space-y-3">
              <TituloDeBloque
                titulo="Los cuatro tipos, y qué implica cada uno"
                explicacion="El tipo decide cómo se liquida. No se deduce del cargo ni del salario: se elige, y el back rechaza las combinaciones imposibles."
              />
              <div className="grid gap-3 sm:grid-cols-2">
                {catalogo.tipos.map((t) => (
                  <div
                    key={t.tipo}
                    className="space-y-1 rounded-lg border border-border bg-surface p-4"
                    data-testid={`tipo-${t.tipo}`}
                  >
                    <p className="text-sm font-medium text-fg">{t.nombre}</p>
                    <p className="text-caption leading-relaxed text-fg-muted">
                      {t.descripcion}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <TituloDeBloque
                titulo={`${personas.total} persona${personas.total === 1 ? '' : 's'} en nómina`}
                explicacion="Quien se retira NO se borra: sus liquidaciones y su certificado de retenciones tienen que sobrevivir."
              />
              {personas.personas.length === 0 ? (
                <p className="rounded-lg border border-border bg-surface p-5 text-sm text-fg-muted">
                  Todavía no hay nadie registrado.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table data-testid="tabla-de-personas">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Cargo</TableHead>
                        <TableHead className="text-right">Salario</TableHead>
                        <TableHead>Periodicidad</TableHead>
                        <TableHead>ARL</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {personas.personas.map((p) => (
                        <TableRow key={p.id} data-testid={`persona-${p.id}`}>
                          <TableCell>
                            <span className="font-medium text-fg">{p.nombre}</span>
                            {p.documento ? (
                              <span className="ml-1.5 text-caption text-fg-muted">
                                {p.documento}
                              </span>
                            ) : (
                              <span className="ml-1.5 text-caption text-warning">
                                sin documento
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-caption">
                            {p.tipo.replace(/_/g, ' ').toLowerCase()}
                            {p.salarioIntegral ? ' · integral' : ''}
                            {p.etapaAprendizaje
                              ? ` · ${p.etapaAprendizaje.toLowerCase()}`
                              : ''}
                          </TableCell>
                          <TableCell className="text-caption text-fg-muted">
                            {p.cargo ?? '—'}
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums">
                            {p.salarioCop != null
                              ? formatCurrency(p.salarioCop)
                              : '—'}
                          </TableCell>
                          <TableCell className="text-caption">
                            {p.periodicidad.toLowerCase()}
                          </TableCell>
                          <TableCell className="text-caption">
                            {p.claseRiesgoArl ?? (
                              <span className="text-warning">sin clase</span>
                            )}
                          </TableCell>
                          <TableCell className="text-caption">
                            {p.activo
                              ? 'Activo'
                              : `Retirado${p.fechaRetiro ? ` el ${p.fechaRetiro.slice(0, 10)}` : ''}`}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              <p className="text-caption text-fg-muted">{catalogo.fuenteArl}</p>
            </section>

            <NuevaPersona
              abierto={abriendo}
              catalogo={catalogo}
              onCerrar={() => setAbriendo(false)}
              onCreada={async () => {
                setAbriendo(false);
                await estado.recargar();
              }}
            />
          </>
        )}
      </Cargado>
    </div>
  );
}

function NuevaPersona({
  abierto,
  catalogo,
  onCerrar,
  onCreada,
}: {
  abierto: boolean;
  catalogo: CatalogoDePersonas;
  onCerrar: () => void;
  onCreada: () => Promise<void>;
}) {
  const [tipo, setTipo] = useState<TipoDePersona>('EMPLEADO');
  const [nombre, setNombre] = useState('');
  const [documento, setDocumento] = useState('');
  const [cargo, setCargo] = useState('');
  const [salario, setSalario] = useState('');
  const [fechaIngreso, setFechaIngreso] = useState('');
  const [periodicidad, setPeriodicidad] = useState('MENSUAL');
  const [claseRiesgoArl, setClase] = useState(catalogo.claseDeRiesgoSugerida);
  const [etapa, setEtapa] = useState('LECTIVA');
  const [guardando, setGuardando] = useState(false);

  const descripcion = catalogo.tipos.find((t) => t.tipo === tipo)?.descripcion;

  const crear = async () => {
    setGuardando(true);
    try {
      await nominaApi.crearPersona({
        tipo,
        nombre,
        documento: documento || undefined,
        cargo: cargo || undefined,
        fechaIngreso,
        tipoContrato: CONTRATO_POR_TIPO[tipo],
        salarioCop: salario ? Number(salario) : undefined,
        periodicidad,
        claseRiesgoArl,
        etapaAprendizaje: tipo === 'APRENDIZ' ? etapa : undefined,
      });
      toast.success(`${nombre} quedó registrada en nómina.`);
      await onCreada();
    } catch (error) {
      toast.error(mensajeDelFallo(error, 'No se pudo registrar a la persona.'));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={abierto} onOpenChange={(a) => !a && onCerrar()}>
      <DialogContent data-testid="dialogo-de-persona">
        <DialogHeader>
          <DialogTitle>Registrar a alguien en nómina</DialogTitle>
          <DialogDescription>
            El tipo decide cómo se liquida. Lo que falte se completa después en su
            ficha; lo que el back exige para poder liquidar te lo dice al guardar.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="tipo-de-persona">Tipo</Label>
            <select
              id="tipo-de-persona"
              className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-fg"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoDePersona)}
              data-testid="campo-tipo"
            >
              {catalogo.tipos.map((t) => (
                <option key={t.tipo} value={t.tipo}>
                  {t.nombre}
                </option>
              ))}
            </select>
            {descripcion ? (
              <p
                className="text-caption leading-relaxed text-fg-muted"
                data-testid="descripcion-del-tipo"
              >
                {descripcion}
              </p>
            ) : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="nombre-de-persona">Nombre completo</Label>
              <Input
                id="nombre-de-persona"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                data-testid="campo-nombre"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="documento-de-persona">Documento</Label>
              <Input
                id="documento-de-persona"
                value={documento}
                onChange={(e) => setDocumento(e.target.value)}
                data-testid="campo-documento"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cargo-de-persona">Cargo</Label>
              <Input
                id="cargo-de-persona"
                value={cargo}
                onChange={(e) => setCargo(e.target.value)}
                data-testid="campo-cargo"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="salario-de-persona">
                {tipo === 'APRENDIZ' ? 'Apoyo de sostenimiento' : 'Salario mensual'}
              </Label>
              <Input
                id="salario-de-persona"
                type="number"
                value={salario}
                onChange={(e) => setSalario(e.target.value)}
                data-testid="campo-salario"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ingreso-de-persona">Fecha de ingreso</Label>
              <Input
                id="ingreso-de-persona"
                type="date"
                value={fechaIngreso}
                onChange={(e) => setFechaIngreso(e.target.value)}
                data-testid="campo-ingreso"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="periodicidad-de-persona">Periodicidad</Label>
              <select
                id="periodicidad-de-persona"
                className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-fg"
                value={periodicidad}
                onChange={(e) => setPeriodicidad(e.target.value)}
                data-testid="campo-periodicidad"
              >
                {catalogo.periodicidades.map((p) => (
                  <option key={p} value={p}>
                    {p.toLowerCase()}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="arl-de-persona">Clase de riesgo de ARL</Label>
              <select
                id="arl-de-persona"
                className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-fg"
                value={claseRiesgoArl}
                onChange={(e) => setClase(e.target.value)}
                data-testid="campo-arl"
              >
                {catalogo.clasesDeRiesgoArl.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <p className="text-caption text-fg-muted">
                La asigna la ARL según el cargo. Sin ella el aporte sale en cero.
              </p>
            </div>
            {tipo === 'APRENDIZ' ? (
              <div className="space-y-1.5">
                <Label htmlFor="etapa-de-aprendiz">Etapa</Label>
                <select
                  id="etapa-de-aprendiz"
                  className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-fg"
                  value={etapa}
                  onChange={(e) => setEtapa(e.target.value)}
                  data-testid="campo-etapa"
                >
                  <option value="LECTIVA">Lectiva</option>
                  <option value="PRODUCTIVA">Productiva</option>
                </select>
              </div>
            ) : null}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button
            onClick={() => void crear()}
            disabled={guardando || nombre.trim().length < 3 || !fechaIngreso}
            data-testid="guardar-persona"
          >
            Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
