'use client';

/**
 * EL CALENDARIO DE DÍAS HÁBILES.
 *
 * ── Por qué esta pantalla existe ────────────────────────────────────────────
 *
 * La aceptación tácita de la factura electrónica corre a los 3 días HÁBILES
 * (Nico, 17-09) y el plazo de una PQRS son 15 (Ley 1755, art. 14). Hasta el 17-09
 * el producto descontaba sábados y domingos y NO los festivos: con un festivo en
 * medio, el plazo caía antes del tercer día hábil real. Eso es un derecho que se
 * le recorta al cliente, en silencio.
 *
 * ── Y por qué los festivos se CALCULAN ──────────────────────────────────────
 *
 * Los 18 festivos de Colombia son deterministas (Ley 51 de 1983 para los siete
 * que se corren al lunes, y la Pascua para los cinco móviles). Una tabla que
 * alguien tiene que llenar todos los años es una tabla que un año nadie llena — y
 * ese año los plazos se cuentan mal sin que nadie se entere.
 *
 * Esta pantalla muestra el calendario CALCULADO y permite CORREGIRLO: agregar un
 * día que la ley cree, apagar uno que el cálculo produzca mal, o marcar un día
 * que esta inmobiliaria no trabaja.
 */

import { useCallback, useEffect, useState } from 'react';
import { CaretLeft, CaretRight, DotsThreeVertical, Plus } from '@phosphor-icons/react';

import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { SinLaMigracion } from '@/components/finanzas/piezas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  DropdownList,
  DropdownListContent,
  DropdownListItem,
  DropdownListTrigger,
} from '@/components/ui/dropdown-menu';
import { ANCHO_DEL_MENU_DE_ACCIONES } from '@/components/ui/ancho-del-menu-de-acciones';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CifraHeroe } from '@/components/pantalla/CifraHeroe';
import { PestanasDeEstado } from '@/components/pantalla/PestanasDeEstado';
import { toast } from '@/components/ui/toast';
import { tesoreriaApi } from '@/lib/api/tesoreria.service';
import type { CalendarioDelAnio } from '@/lib/api/tesoreria.types';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario';
import {
  errorDeLaFechaDelFestivo,
  errorDelNombreDelFestivo,
} from '@/lib/tesoreria/limites-de-tesoreria';
import { fechaCorta } from '@/lib/fechas/fecha-de-la-casa';
import { CampoDeDia } from '@/components/contabilidad/CampoDeDia';
import { Cajon, CajonCabecera, CajonCuerpo, CajonPie } from '@/components/ui/cajon';

/** Los dos campos de «Agregar un día», y el id de cada uno. */
type CampoDelFestivo = 'fecha' | 'nombre';
const ID_DEL_CAMPO: Record<CampoDelFestivo, string> = {
  fecha: 'fecha-del-festivo',
  nombre: 'nombre-del-festivo',
};

function enfocar(campo: CampoDelFestivo | undefined) {
  if (campo) document.getElementById(ID_DEL_CAMPO[campo])?.focus();
}

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/** El día de la semana de un `YYYY-MM-DD`, leído en UTC como lo cuenta el back. */
function diaDeLaSemana(fecha: string): string {
  return DIAS[new Date(`${fecha}T00:00:00.000Z`).getUTCDay()] ?? '';
}

/** «1 festivo» / «18 festivos»: PG-13 (03-10-2026) — antes «18 festivo(s) en 18 día(s)». */
export function cuantosFestivos(activos: number, diasDistintos: number): string {
  const festivos = `${activos} ${activos === 1 ? 'festivo' : 'festivos'}`;
  const dias = `${diasDistintos} ${diasDistintos === 1 ? 'día distinto' : 'días distintos'}`;
  return `${festivos} en ${dias}`;
}

export function CalendarioDeFestivosPanel() {
  const [anio, setAnio] = useState(() =>
    new Date(Date.now() - 5 * 60 * 60 * 1000).getUTCFullYear(),
  );
  const [datos, setDatos] = useState<CalendarioDelAnio | null>(null);
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState<unknown>(null);
  const [trabajando, setTrabajando] = useState(false);
  const [fecha, setFecha] = useState('');
  const [nombre, setNombre] = useState('');
  const [nacional, setNacional] = useState(false);
  const [errores, setErrores] = useState<Partial<Record<CampoDelFestivo, string>>>({});
  const [vista, setVista] = useState<'todos' | 'calculados' | 'corregidos'>('todos');
  /* Ronda 30 (revisora r27): «Agregar un día» abre un cajón (antes un formulario abierto al pie). */
  const [agregando, setAgregando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setFallo(null);
    try {
      setDatos(await tesoreriaApi.calendario(anio));
    } catch (error) {
      setFallo(error);
    } finally {
      setCargando(false);
    }
  }, [anio]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const agregar = async () => {
    // 🔁 Espejo del tope del back: un día real, entre el 2000 y el 2100.
    const delCliente: Partial<Record<CampoDelFestivo, string>> = {};
    const eFecha = errorDeLaFechaDelFestivo(fecha);
    const eNombre = errorDelNombreDelFestivo(nombre);
    if (eFecha) delCliente.fecha = eFecha;
    if (eNombre) delCliente.nombre = eNombre;
    if (delCliente.fecha || delCliente.nombre) {
      setErrores(delCliente);
      enfocar(delCliente.fecha ? 'fecha' : 'nombre');
      return;
    }
    setErrores({});
    setTrabajando(true);
    try {
      await tesoreriaApi.corregirCalendario({
        fecha,
        nombre,
        activo: true,
        alcance: nacional ? 'NACIONAL' : 'INMOBILIARIA',
      });
      toast.success(`${fecha} agregado al calendario.`);
      setFecha('');
      setNombre('');
      setAgregando(false);
      await cargar();
    } catch (error) {
      // Un 400 por campo va debajo de su campo; lo demás, al aviso.
      const reparto = repartirErroresDelServidor<CampoDelFestivo>(error, {
        campos: ['fecha', 'nombre'],
        porDefecto: 'No se pudo guardar el día.',
        accion: 'agregar el día al calendario',
      });
      setErrores(reparto.porCampo);
      enfocar(reparto.orden[0]);
      if (reparto.sueltos.length > 0) toast.error(reparto.sueltos.join(' · '));
    } finally {
      setTrabajando(false);
    }
  };

  const apagar = async (dia: CalendarioDelAnio['dias'][number]) => {
    setTrabajando(true);
    try {
      await tesoreriaApi.corregirCalendario({
        fecha: dia.fecha,
        nombre: dia.nombre,
        activo: false,
        alcance: 'INMOBILIARIA',
      });
      toast.success(`${dia.fecha} deja de contar como festivo para esta inmobiliaria.`);
      await cargar();
    } catch (error) {
      toast.error(
        mensajeParaLaPersona(error, {
          porDefecto: 'No se pudo apagar el día.',
          accion: 'marcar el día como hábil',
        }),
      );
    } finally {
      setTrabajando(false);
    }
  };

  const borrar = async (id: string) => {
    setTrabajando(true);
    try {
      await tesoreriaApi.borrarCorreccion(id);
      toast.success('La corrección se borró: el día vuelve a lo que diga el cálculo.');
      await cargar();
    } catch (error) {
      toast.error(
        mensajeParaLaPersona(error, {
          porDefecto: 'No se pudo borrar la corrección.',
          accion: 'borrar la corrección',
        }),
      );
    } finally {
      setTrabajando(false);
    }
  };

  const hoy = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const proximo = datos?.dias.find((d) => d.activo && d.fecha >= hoy) ?? null;
  const corregidos = datos?.dias.filter((d) => d.origen !== 'CALCULADO').length ?? 0;
  const visibles =
    datos?.dias.filter((d) =>
      vista === 'todos' ? true : vista === 'corregidos' ? d.origen !== 'CALCULADO' : d.origen === 'CALCULADO',
    ) ?? [];

  return (
    <div className="space-y-6">
      <EstadoDeDatos
        cargando={cargando}
        error={fallo}
        queEs="el calendario de festivos"
        onReintentar={cargar}
        conservarContenido
      >
        {datos ? (
          <>
            {!datos.puedeCorregir ? (
              <SinLaMigracion
                motivo={datos.motivo}
                queSeEspera="corregir el calendario a mano (los festivos calculados ya se usan)"
                testId="calendario-sin-migracion"
              />
            ) : null}

            {/* LA RESPUESTA: cuántos días no cuentan este año y cuál es el próximo. */}
            <div className="flex flex-wrap items-end justify-between gap-4">
              {/* Ronda 30 (revisora r27, «el 18 cuatro veces»): LA RESPUESTA es el próximo festivo; cuántos
                  hay en el año lo dicen las pestañas de la tabla. */}
              <CifraHeroe
                tamano="mediana"
                rotulo={proximo ? 'El próximo festivo' : `Festivos de ${datos.anio}`}
                cifra={proximo ? `${diaDeLaSemana(proximo.fecha)} ${fechaCorta(proximo.fecha)}` : 'Ninguno por delante'}
                contexto={
                  proximo ? (
                    <span className="text-fg">{proximo.nombre}</span>
                  ) : (
                    <>{cuantosFestivos(datos.activos, datos.diasDistintos)}: ya pasaron todos.</>
                  )
                }
                className="min-w-0 flex-1"
                data-testid="cifra-de-festivos"
              />
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  hideArrow
                  aria-label="Año anterior"
                  onClick={() => setAnio((a) => Math.max(1984, a - 1))}
                  data-testid="anio-anterior"
                >
                  <CaretLeft className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Label htmlFor="anio-del-calendario" className="sr-only">
                  Año
                </Label>
                <Input
                  id="anio-del-calendario"
                  type="number"
                  min={1984}
                  max={2200}
                  value={anio}
                  onChange={(e) => setAnio(Number(e.target.value) || anio)}
                  className="h-9 w-24 text-center font-mono tabular-nums"
                  data-testid="anio-del-calendario"
                />
                <Button
                  variant="outline"
                  size="sm"
                  hideArrow
                  aria-label="Año siguiente"
                  onClick={() => setAnio((a) => Math.min(2200, a + 1))}
                  data-testid="anio-siguiente"
                >
                  <CaretRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>

            <section className="overflow-hidden rounded-lg border border-border bg-surface" aria-label={`Los festivos de ${datos.anio}`}>
              <div className="border-b border-border px-4 py-3 empty:hidden">
                <PestanasDeEstado
                  etiqueta="Qué días ver"
                  valor={vista}
                  onCambio={setVista}
                  pestanas={[
                    { valor: 'todos', etiqueta: 'Todos', cuantos: datos.dias.length, fija: true },
                    { valor: 'calculados', etiqueta: 'Calculados', cuantos: datos.dias.length - corregidos, fija: true },
                    // Ronda 30: en cero no se pinta (la regla de las pestañas), salvo si es la abierta.
                    { valor: 'corregidos', etiqueta: 'Corregidos a mano', cuantos: corregidos },
                  ]}
                  data-testid="vista-del-calendario"
                />
              </div>
              {datos.puedeCorregir ? (
                <div className="flex justify-end border-b border-border px-4 py-3">
                  <Button size="sm" hideArrow onClick={() => setAgregando(true)} data-testid="abrir-agregar-festivo">
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Agregar un día
                  </Button>
                </div>
              ) : null}
              <Table data-testid="calendario">
                <TableHeader className="max-md:hidden">
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Festivo</TableHead>
                    <TableHead>De dónde sale</TableHead>
                    <TableHead className="w-12">
                      <span className="sr-only">Acciones</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="max-md:block">
                  {visibles.length === 0 ? (
                    <TableRow className="max-md:block">
                      <TableCell colSpan={4} className="max-md:block">
                        <p className="py-6 text-center text-body-sm text-fg-muted">
                          {vista === 'corregidos'
                            ? 'Nadie ha corregido el calendario de este año: rige el cálculo.'
                            : 'No hay festivos para este año.'}
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    visibles.map((d) => (
                      <TableRow
                        key={`${d.fecha}-${d.nombre}`}
                        data-testid={`dia-${d.fecha}`}
                        className="max-md:grid max-md:grid-cols-[minmax(0,1fr)_auto] max-md:gap-x-4 max-md:gap-y-1 max-md:border-b max-md:border-border max-md:px-4 max-md:py-3 max-md:last:border-0"
                      >
                        {/* PG-13: la fecha de la casa («1 ene 2026»), no el ISO crudo; el día de la semana al lado. */}
                        <TableCell className="whitespace-nowrap max-md:col-start-1 max-md:row-start-2 max-md:block max-md:p-0">
                          <span className="font-mono tabular-nums text-fg">{fechaCorta(d.fecha)}</span>{' '}
                          <span className="text-caption text-fg-muted">{diaDeLaSemana(d.fecha)}</span>
                        </TableCell>
                        <TableCell className="max-md:col-start-1 max-md:row-start-1 max-md:block max-md:p-0">
                          <span className={d.activo ? 'text-fg' : 'text-fg-muted line-through'}>{d.nombre}</span>
                        </TableCell>
                        <TableCell className="max-md:col-span-2 max-md:row-start-3 max-md:block max-md:p-0">
                          {d.origen === 'CALCULADO' ? (
                            <Badge variant="outline">{d.trasladado ? 'Trasladado al lunes (Ley 51 de 1983)' : 'Calculado'}</Badge>
                          ) : (
                            <Badge variant={d.deLaInmobiliaria ? 'secondary' : 'warning'}>
                              {d.deLaInmobiliaria ? 'Tu inmobiliaria lo agregó' : 'Corrección nacional'}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right max-md:col-start-2 max-md:row-span-2 max-md:row-start-1 max-md:block max-md:self-start max-md:p-0">
                          {!datos.puedeCorregir ? null : (
                            <DropdownList>
                              <DropdownListTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  hideArrow
                                  disabled={trabajando}
                                  aria-label={`Acciones de ${d.nombre}`}
                                  data-testid={`acciones-${d.fecha}`}
                                >
                                  <DotsThreeVertical className="h-4 w-4" weight="bold" aria-hidden="true" />
                                </Button>
                              </DropdownListTrigger>
                              <DropdownListContent align="end" className={ANCHO_DEL_MENU_DE_ACCIONES}>
                                {d.correccionId ? (
                                  <DropdownListItem onClick={() => void borrar(d.correccionId!)} data-testid={`borrar-${d.fecha}`}>
                                    Quitar la corrección
                                  </DropdownListItem>
                                ) : (
                                  <DropdownListItem onClick={() => void apagar(d)} data-testid={`apagar-${d.fecha}`}>
                                    Marcar como día hábil
                                  </DropdownListItem>
                                )}
                              </DropdownListContent>
                            </DropdownList>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </section>

            {datos.puedeCorregir ? (
              <Cajon abierto={agregando} onOpenChange={setAgregando} tamano="sm">
                <CajonCabecera
                  titulo="Agregar un día"
                  descripcion="Un festivo que la ley creó y el cálculo todavía no conoce, o un día que tu inmobiliaria no trabaja. Los días que agregues no cuentan como hábiles para los plazos."
                />
                <CajonCuerpo className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
                  <div className="space-y-1.5">
                    <Label htmlFor="fecha-del-festivo">Fecha</Label>
                    <CampoDeDia
                      id="fecha-del-festivo"
                      value={fecha}
                      onChange={(v) => {
                        setFecha(v);
                        setErrores((previos) => ({ ...previos, fecha: undefined }));
                      }}
                      invalido={Boolean(errores.fecha)}
                      describedBy={errores.fecha ? 'fecha-del-festivo-error' : undefined}
                      testid="fecha-del-festivo"
                    />
                    <ErrorDelCampo id="fecha-del-festivo-error" mensaje={errores.fecha} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="nombre-del-festivo">Nombre</Label>
                    <Input
                      id="nombre-del-festivo"
                      value={nombre}
                      onChange={(e) => {
                        setNombre(e.target.value);
                        setErrores((previos) => ({ ...previos, nombre: undefined }));
                      }}
                      placeholder="Día de la familia"
                      maxLength={120}
                      aria-invalid={errores.nombre ? true : undefined}
                      aria-describedby={errores.nombre ? 'nombre-del-festivo-error' : undefined}
                      data-testid="nombre-del-festivo"
                    />
                    <ErrorDelCampo id="nombre-del-festivo-error" mensaje={errores.nombre} />
                  </div>
                </div>
                {/* Revisora r25: la casilla va ANTES del botón (antes quedaba debajo de «Agregar»). */}
                <label className="flex items-start gap-2 text-body-sm text-fg-muted">
                  <Checkbox
                    checked={nacional}
                    onCheckedChange={(v) => setNacional(v === true)}
                    data-testid="alcance-nacional"
                  />
                  <span>
                    Es un festivo de ley, para todas las inmobiliarias. Márcalo sólo si el Congreso
                    creó un festivo nuevo, no para un día que sólo tu oficina no trabaja.
                  </span>
                </label>
                </CajonCuerpo>
                <CajonPie>
                  <Button variant="ghost" size="sm" hideArrow onClick={() => setAgregando(false)}>
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    hideArrow
                    onClick={() => void agregar()}
                    disabled={trabajando || !fecha || nombre.trim().length === 0}
                    data-testid="agregar-festivo"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Agregar el día
                  </Button>
                </CajonPie>
              </Cajon>
            ) : null}
          </>
        ) : null}
      </EstadoDeDatos>
    </div>
  );
}
