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

import { SinDatos } from '@/components/estado/SinDatos';
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
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableBodyAnimado,
  TableRowAnimada,
} from '@/components/ui/table';
import { toast } from '@/components/ui/toast';
import { nominaApi } from '@/lib/api/nomina.service';
import type {
  CatalogoDePersonas,
  Personas,
  TipoDePersona,
} from '@/lib/api/nomina.types';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { atributosDelError, useErroresDelFormulario } from './errores-del-formulario';
import { MENSAJES_DE_NOMINA, SALARIO_MAXIMO_DEL_MES_COP, pasaDe } from './limites-de-nomina';
import { Avisos } from './piezas';
import { Cargado, useCargaDeNomina } from './usar-nomina';
import { CifraHeroe } from '@/components/pantalla/CifraHeroe';
import { MasDetalles } from '@/components/pantalla/MasDetalles';
import { PestanasDeEstado } from '@/components/pantalla/PestanasDeEstado';
import { fechaCorta } from '@/lib/fechas/fecha-de-la-casa';
import { localeDeLasCifras } from '@/lib/i18n/idioma-de-las-cifras';

import { ariaDelCampoDeDia, CampoDeDia } from '@/components/contabilidad/CampoDeDia';
/** Los campos de la persona que pueden llevar error, con el nombre del DTO. */
type CampoDeLaPersona = 'nombre' | 'documento' | 'cargo' | 'salarioCop' | 'fechaIngreso';
const CAMPOS_DE_LA_PERSONA: readonly CampoDeLaPersona[] = [
  'nombre',
  'documento',
  'cargo',
  'salarioCop',
  'fechaIngreso',
];
const ID_DEL_CAMPO_DE_LA_PERSONA: Record<CampoDeLaPersona, string> = {
  nombre: 'nombre-de-persona',
  documento: 'documento-de-persona',
  cargo: 'cargo-de-persona',
  salarioCop: 'salario-de-persona',
  fechaIngreso: 'ingreso-de-persona',
};
const idDeLaPersona = (c: CampoDeLaPersona) => ID_DEL_CAMPO_DE_LA_PERSONA[c];
/** 🔁 Los largos de `CrearPersonaDto` (back): se ataja escribir de más. */
const LARGO_MAXIMO = { nombre: 200, documento: 30, cargo: 120 } as const;

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
  const [vista, setVista] = useState<'activas' | 'retiradas' | 'todas'>('activas');

  return (
    <div className="space-y-6">

      {/* El buscador vive dentro de la tarjeta: al buscar se vuelve a pedir la lista, y la
          tarjeta (con el buscador) se queda en pantalla con la lista anterior mientras llega. */}
      <Cargado
        estado={{ ...estado, cargando: estado.cargando && estado.datos === null }}
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

            {(() => {
              const activas = personas.personas.filter((p) => p.activo);
              const retiradas = personas.personas.filter((p) => !p.activo);
              const vistaReal = retiradas.length === 0 ? 'todas' : vista;
              const visibles = vistaReal === 'activas' ? activas : vistaReal === 'retiradas' ? retiradas : personas.personas;
              const salarios = activas.reduce((t, p) => t + (p.salarioCop ?? 0), 0);
              const cifras = localeDeLasCifras();
              /** Revisora r25 (Personas, C3): sin nadie registrado, sólo el vacío con «Registrar a alguien». */
              const nadie = personas.personas.length === 0 && !busqueda;
              return (
                <>
                  {/* GLOW UP 3.ª vuelta · LA RESPUESTA: cuánta gente está activa y lo que suman sus salarios.
                      Revisora r25 (Personas, UI): a 390 la cifra arriba y el botón debajo (el rótulo se partía). */}
                  {nadie ? null : (
                  <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
                    <CifraHeroe
                      tamano="mediana"
                      rotulo="Personas activas en nómina"
                      cifra={activas.length.toLocaleString(cifras)}
                      contexto={
                        busqueda
                          ? `de las que coinciden con «${busqueda}»`
                          : `con salarios que suman ${formatCurrency(salarios)} al mes`
                      }
                      className="min-w-0 flex-1"
                      // C3 (revisora r25): con nadie activo, UNA línea; el vacío de abajo dice qué hacer.
                      esCero={activas.length === 0 && !busqueda}
                      data-testid="cifra-de-personas"
                    />
                    <Button size="sm" onClick={() => setAbriendo(true)} data-testid="nueva-persona" className="self-start">
                      Registrar a alguien
                    </Button>
                  </div>
                  )}

                  <section className="overflow-hidden rounded-lg border border-border bg-surface" aria-label="Las personas de nómina">
                    {nadie ? null : (
                    <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
                      {retiradas.length > 0 ? (
                        <PestanasDeEstado
                          etiqueta="Estado de las personas"
                          valor={vistaReal}
                          onCambio={setVista}
                          pestanas={[
                            { valor: 'activas', etiqueta: 'Activas', cuantos: activas.length, fija: true },
                            { valor: 'retiradas', etiqueta: 'Retiradas', cuantos: retiradas.length },
                            { valor: 'todas', etiqueta: 'Todas', cuantos: personas.personas.length, fija: true },
                          ]}
                        />
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <Label htmlFor="busqueda-de-personas" className="sr-only">Buscar por nombre o documento</Label>
                        <Input
                          id="busqueda-de-personas"
                          className="w-full sm:max-w-xs"
                          placeholder="Buscar por nombre o documento"
                          value={busqueda}
                          onChange={(e) => setBusqueda(e.target.value)}
                          data-testid="busqueda-de-personas"
                        />
                      </div>
                    </div>
                    )}
              {visibles.length === 0 ? (
                // Revisora r25 (C5): el vacío con su salida (antes una línea gris).
                personas.personas.length === 0 && !busqueda ? (
                  <SinDatos
                    queSon="personas"
                    titulo="Todavía no hay nadie registrado"
                    descripcion="Registra a la primera persona para liquidarle la nómina."
                    accion={
                      <Button hideArrow onClick={() => setAbriendo(true)} data-testid="nueva-persona">
                        Registrar a alguien
                      </Button>
                    }
                  />
                ) : busqueda ? (
                  <SinDatos
                    queSon="personas"
                    titulo="Nadie con ese nombre o documento"
                    descripcion="Prueba con otra parte del nombre o con el número sin puntos."
                    accion={
                      <Button size="sm" variant="secondary" hideArrow onClick={() => setBusqueda('')}>
                        Borrar la búsqueda
                      </Button>
                    }
                  />
                ) : (
                  <p className="p-5 text-body-sm text-fg-muted">Nadie en esta pestaña.</p>
                )
              ) : (
                  <Table data-testid="tabla-de-personas" className="max-md:block">
                    <TableHeader className="max-md:hidden">
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
                    <TableBodyAnimado className="max-md:block">
                      {visibles.map((p) => (
                        <TableRowAnimada
                          key={p.id}
                          data-testid={`persona-${p.id}`}
                          className="max-md:grid max-md:grid-cols-[minmax(0,1fr)_auto] max-md:gap-x-4 max-md:gap-y-1 max-md:border-b max-md:border-border max-md:px-4 max-md:py-3.5 max-md:last:border-0"
                        >
                          <TableCell className="max-md:col-start-1 max-md:row-start-1 max-md:block max-md:p-0">
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
                          <TableCell className="text-caption max-md:col-start-1 max-md:row-start-2 max-md:block max-md:p-0 max-md:text-fg-muted">
                            {p.tipo.replace(/_/g, ' ').toLowerCase()}
                            {p.salarioIntegral ? ' · integral' : ''}
                            {p.etapaAprendizaje
                              ? ` · ${p.etapaAprendizaje.toLowerCase()}`
                              : ''}
                            <span className="md:hidden">
                              {p.cargo ? ` · ${p.cargo}` : ''} · {p.periodicidad.toLowerCase()}
                            </span>
                          </TableCell>
                          <TableCell className="text-caption text-fg-muted max-md:hidden">
                            {p.cargo ?? '—'}
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums max-md:col-start-2 max-md:row-start-1 max-md:block max-md:p-0">
                            {p.salarioCop != null
                              ? formatCurrency(p.salarioCop)
                              : '—'}
                          </TableCell>
                          <TableCell className="text-caption max-md:hidden">
                            {p.periodicidad.toLowerCase()}
                          </TableCell>
                          <TableCell className="text-caption max-md:col-start-1 max-md:row-start-3 max-md:block max-md:p-0 max-md:text-fg-muted">
                            <span className="md:hidden">ARL </span>
                            {p.claseRiesgoArl ?? (
                              <span className="text-warning">sin clase</span>
                            )}
                          </TableCell>
                          <TableCell className="text-caption max-md:col-start-2 max-md:row-start-2 max-md:block max-md:p-0 max-md:text-right">
                            {p.activo
                              ? 'Activo'
                              : `Retirado${p.fechaRetiro ? ` el ${fechaCorta(p.fechaRetiro.slice(0, 10))}` : ''}`}
                          </TableCell>
                        </TableRowAnimada>
                      ))}
                    </TableBodyAnimado>
                  </Table>
              )}
                  </section>

                  <MasDetalles etiqueta="Los cuatro tipos y qué implica cada uno" etiquetaAbierto="Ocultar los tipos" montadoSiempre>
                    <div className="space-y-3">
                      <p className="text-body-sm text-fg-muted">
                        El tipo decide cómo se liquida. No se deduce del cargo ni del salario: se elige, y el
                        sistema rechaza las combinaciones imposibles. Quien se retira no se borra: sus
                        liquidaciones y su certificado de retenciones tienen que sobrevivir.
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {catalogo.tipos.map((t) => (
                          <div
                            key={t.tipo}
                            className="space-y-1 rounded-lg border border-border bg-surface p-4"
                            data-testid={`tipo-${t.tipo}`}
                          >
                            <p className="text-body-sm font-medium text-fg">{t.nombre}</p>
                            <p className="text-caption leading-relaxed text-fg-muted">
                              {t.descripcion}
                            </p>
                          </div>
                        ))}
                      </div>
                      <p className="text-caption text-fg-muted">{catalogo.fuenteArl}</p>
                    </div>
                  </MasDetalles>
                </>
              );
            })()}

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
  const errores = useErroresDelFormulario<CampoDeLaPersona>(idDeLaPersona);

  const descripcion = catalogo.tipos.find((t) => t.tipo === tipo)?.descripcion;

  // 🔁 El tope del back (`SALARIO_MAXIMO_DEL_MES_COP`), con su misma frase.
  const salarioFueraDeRango = pasaDe(salario, SALARIO_MAXIMO_DEL_MES_COP)
    ? MENSAJES_DE_NOMINA.salarioMaximo
    : null;
  const errorDe = (campo: CampoDeLaPersona): string | undefined =>
    (campo === 'salarioCop' ? salarioFueraDeRango : null) ?? errores.delServidor[campo];

  const crear = async () => {
    if (salarioFueraDeRango) {
      document.getElementById(idDeLaPersona('salarioCop'))?.focus();
      return;
    }
    setGuardando(true);
    errores.limpiar();
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
      errores.repartir(error, {
        campos: CAMPOS_DE_LA_PERSONA,
        porDefecto: 'No se pudo registrar a la persona.',
        accion: 'registrar a la persona',
      });
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
                maxLength={LARGO_MAXIMO.nombre}
                onChange={(e) => {
                  errores.olvidar('nombre');
                  setNombre(e.target.value);
                }}
                data-testid="campo-nombre"
                {...atributosDelError('nombre-de-persona', errorDe('nombre'))}
              />
              <ErrorDelCampo id="nombre-de-persona-error" mensaje={errorDe('nombre')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="documento-de-persona">Documento</Label>
              <Input
                id="documento-de-persona"
                value={documento}
                maxLength={LARGO_MAXIMO.documento}
                onChange={(e) => {
                  errores.olvidar('documento');
                  setDocumento(e.target.value);
                }}
                data-testid="campo-documento"
                {...atributosDelError('documento-de-persona', errorDe('documento'))}
              />
              <ErrorDelCampo id="documento-de-persona-error" mensaje={errorDe('documento')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cargo-de-persona">Cargo</Label>
              <Input
                id="cargo-de-persona"
                value={cargo}
                maxLength={LARGO_MAXIMO.cargo}
                onChange={(e) => {
                  errores.olvidar('cargo');
                  setCargo(e.target.value);
                }}
                data-testid="campo-cargo"
                {...atributosDelError('cargo-de-persona', errorDe('cargo'))}
              />
              <ErrorDelCampo id="cargo-de-persona-error" mensaje={errorDe('cargo')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="salario-de-persona">
                {tipo === 'APRENDIZ' ? 'Apoyo de sostenimiento' : 'Salario mensual'}
              </Label>
              <Input
                id="salario-de-persona"
                type="number"
                value={salario}
                onChange={(e) => {
                  errores.olvidar('salarioCop');
                  setSalario(e.target.value);
                }}
                data-testid="campo-salario"
                {...atributosDelError('salario-de-persona', errorDe('salarioCop'))}
              />
              <ErrorDelCampo id="salario-de-persona-error" mensaje={errorDe('salarioCop')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ingreso-de-persona">Fecha de ingreso</Label>
              <CampoDeDia
                {...ariaDelCampoDeDia(atributosDelError('ingreso-de-persona', errorDe('fechaIngreso')))}
                id="ingreso-de-persona"
                value={fechaIngreso}
                onChange={(v) => {
                  errores.olvidar('fechaIngreso');
                  setFechaIngreso(v);
                }}
                testid="campo-ingreso"
              />
              <ErrorDelCampo id="ingreso-de-persona-error" mensaje={errorDe('fechaIngreso')} />
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
          <Button variant="outline" hideArrow onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Button>
          <Button
            hideArrow
            onClick={() => void crear()}
            disabled={guardando || nombre.trim().length < 3 || !fechaIngreso}
            isLoading={guardando}
            data-testid="guardar-persona"
          >
            Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
