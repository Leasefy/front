'use client';

/**
 * EL CALENDARIO DE DÍAS HÁBILES.
 *
 * ── Por qué esta pantalla existe ────────────────────────────────────────────
 *
 * La aceptación tácita de la factura electrónica corre a los 3 días HÁBILES
 * (Nico, 17-09) y el SLA de una PQRS son 15 (Ley 1755, art. 14). Hasta el 17-09
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
import { Plus, Trash } from '@phosphor-icons/react';

import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { SinLaMigracion, TituloDeBloque } from '@/components/finanzas/piezas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/toast';
import { tesoreriaApi } from '@/lib/api/tesoreria.service';
import type { CalendarioDelAnio } from '@/lib/api/tesoreria.types';

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/** El día de la semana de un `YYYY-MM-DD`, leído en UTC como lo cuenta el back. */
function diaDeLaSemana(fecha: string): string {
  return DIAS[new Date(`${fecha}T00:00:00.000Z`).getUTCDay()] ?? '';
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
      await cargar();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar el día.');
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
      toast.error(error instanceof Error ? error.message : 'No se pudo apagar el día.');
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
      toast.error(error instanceof Error ? error.message : 'No se pudo borrar la corrección.');
    } finally {
      setTrabajando(false);
    }
  };

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
                queSeEspera="corregir el calendario a mano (los festivos calculados YA se usan)"
                testId="calendario-sin-migracion"
              />
            ) : null}

            <TituloDeBloque
              titulo={`Festivos de ${datos.anio}`}
              explicacion={`${datos.activos} festivo(s) en ${datos.diasDistintos} día(s) distintos. Se calculan con la Ley 51 de 1983 (los trasladables caen el lunes siguiente) y la Pascua. Dos festivos pueden caer el mismo día: en 2025 el Sagrado Corazón y San Pedro cayeron los dos el 30 de junio.`}
              accion={
                <div className="space-y-1">
                  <Label htmlFor="anio-del-calendario">Año</Label>
                  <Input
                    id="anio-del-calendario"
                    type="number"
                    min={1984}
                    max={2200}
                    value={anio}
                    onChange={(e) => setAnio(Number(e.target.value) || anio)}
                    className="w-28"
                    data-testid="anio-del-calendario"
                  />
                </div>
              }
            />

            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm" data-testid="calendario">
                <thead className="bg-bg text-xs text-fg-muted">
                  <tr>
                    <th className="p-3 text-left">Fecha</th>
                    <th className="p-3 text-left">Día</th>
                    <th className="p-3 text-left">Festivo</th>
                    <th className="p-3 text-left">De dónde sale</th>
                    <th className="p-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.dias.map((d) => (
                    <tr
                      key={`${d.fecha}-${d.nombre}`}
                      className="border-t border-border"
                      data-testid={`dia-${d.fecha}`}
                    >
                      <td className="p-3 font-mono tabular-nums">{d.fecha}</td>
                      <td className="p-3 text-fg-muted">{diaDeLaSemana(d.fecha)}</td>
                      <td className="p-3">
                        <span className={d.activo ? 'text-fg' : 'text-fg-muted line-through'}>
                          {d.nombre}
                        </span>
                      </td>
                      <td className="p-3 text-xs text-fg-muted">
                        {d.origen === 'CALCULADO' ? (
                          d.trasladado ? (
                            <Badge variant="outline">Trasladado al lunes (Ley 51 de 1983)</Badge>
                          ) : (
                            <Badge variant="outline">Calculado</Badge>
                          )
                        ) : (
                          <Badge variant={d.deLaInmobiliaria ? 'secondary' : 'warning'}>
                            {d.deLaInmobiliaria ? 'Tu inmobiliaria lo agregó' : 'Corrección nacional'}
                          </Badge>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {!datos.puedeCorregir ? null : d.correccionId ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => void borrar(d.correccionId!)}
                            disabled={trabajando}
                            data-testid={`borrar-${d.fecha}`}
                          >
                            <Trash className="h-4 w-4" aria-hidden="true" />
                            Quitar la corrección
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => void apagar(d)}
                            disabled={trabajando}
                            data-testid={`apagar-${d.fecha}`}
                          >
                            Marcar como día hábil
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {datos.puedeCorregir ? (
              <section className="space-y-3 rounded-lg border border-border bg-surface p-5">
                <TituloDeBloque
                  titulo="Agregar un día"
                  explicacion="Un festivo que la ley creó y el cálculo todavía no conoce, o un día que tu inmobiliaria no trabaja. Los días que agregues NO cuentan como hábiles para los plazos."
                />
                <div className="grid gap-3 sm:grid-cols-[auto_1fr_auto]">
                  <div className="space-y-1.5">
                    <Label htmlFor="fecha-del-festivo">Fecha</Label>
                    <Input
                      id="fecha-del-festivo"
                      type="date"
                      value={fecha}
                      onChange={(e) => setFecha(e.target.value)}
                      data-testid="fecha-del-festivo"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="nombre-del-festivo">Nombre</Label>
                    <Input
                      id="nombre-del-festivo"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      placeholder="Día de la familia"
                      maxLength={120}
                      data-testid="nombre-del-festivo"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={() => void agregar()}
                      disabled={trabajando || !fecha || nombre.trim().length === 0}
                      data-testid="agregar-festivo"
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      Agregar
                    </Button>
                  </div>
                </div>
                <label className="flex items-start gap-2 text-sm text-fg-muted">
                  <Checkbox
                    checked={nacional}
                    onCheckedChange={(v) => setNacional(v === true)}
                    data-testid="alcance-nacional"
                  />
                  <span>
                    Es un festivo de LEY, para todas las inmobiliarias. Marca esto sólo si el
                    Congreso creó un festivo nuevo — no para un día que sólo tu oficina no
                    trabaja.
                  </span>
                </label>
              </section>
            ) : null}
          </>
        ) : null}
      </EstadoDeDatos>
    </div>
  );
}
