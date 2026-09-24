'use client';

/**
 * Sedes: los centros de costo de la inmobiliaria.
 *
 * Una inmobiliaria con oficina en el Poblado y otra en Laureles quiere saber
 * cuánto recauda y cuánto le cuesta CADA UNA. Por eso la sede es un centro de
 * costo y no una etiqueta: el tablero financiero filtra por ella y el
 * deterioro se puede calcular por sede.
 *
 * ── Lo que esta pantalla dice y nadie más dice ──────────────────────────────
 *
 * **Cuántos inmuebles y contratos quedaron SIN asignar.** Una sede nueva no
 * reparte nada sola; mientras haya inmuebles sin sede, el consolidado y la
 * suma de las sedes no van a cuadrar, y quien mire el tablero por sede va a
 * creer que la diferencia es del negocio. Se dice arriba, con el número.
 */

import { useCallback, useEffect, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Storefront } from '@phosphor-icons/react';

import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { SinLaMigracion } from '@/components/finanzas/piezas';
import { explicar } from '@/components/finanzas/TasasDeUsura';
import { Badge } from '@/components/ui/badge';
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
import { finanzasApi } from '@/lib/api/finanzas.service';
import type { Sede, Sedes } from '@/lib/api/finanzas.types';
import { EsqueletoDeSeccion, VacioDeSeccion } from './piezas';

const NUMERO = new Intl.NumberFormat('es-CO');

export function SeccionSedes() {
  const [datos, setDatos] = useState<Sedes | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [editando, setEditando] = useState<Sede | 'nueva' | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setDatos(await finanzasApi.sedes());
    } catch (e) {
      setError(e);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const disponible = datos?.disponible !== false;
  const sedes = datos?.sedes ?? [];
  const sinAsignar = datos?.sinAsignar ?? { inmuebles: 0, contratos: 0 };

  async function marcarPorDefecto(sede: Sede) {
    try {
      await finanzasApi.editarSede(sede.id, { esPorDefecto: true });
      toast.success(`«${sede.nombre}» es la sede por defecto.`, {
        description: 'Lo que se cree sin sede explícita va a caer ahí.',
      });
      await cargar();
    } catch (e) {
      toast.error('No se pudo cambiar la sede por defecto.', {
        description: explicar(e, 'No se pudo cambiar la sede por defecto.'),
      });
    }
  }

  return (
    <EstadoDeDatos
      cargando={cargando && !datos}
      error={error}
      vacio={!cargando && !datos}
      queEs="las sedes"
      onReintentar={cargar}
      esqueleto={<EsqueletoDeSeccion filas={3} />}
      cuandoVacio={
        <VacioDeSeccion
          icono={Storefront}
          titulo="Todavía no pudimos leer tus sedes"
          ayuda="Vuelve a intentar en un momento: las sedes cuelgan de tu inmobiliaria."
        />
      }
    >
      {datos ? (
        <div className="space-y-5" data-testid="seccion-sedes">
          {!datos.disponible ? (
            <SinLaMigracion motivo={datos.motivo} queSeEspera="crear y editar sedes" />
          ) : null}

          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="max-w-2xl text-sm text-fg-muted">
              Cada sede es un centro de costo: el tablero financiero se puede mirar consolidado o
              por sede, y el deterioro de cartera también. Un inmueble o un contrato pertenece a
              una sola.
            </p>
            <Button size="sm" hideArrow disabled={!disponible} onClick={() => setEditando('nueva')}>
              Crear una sede
            </Button>
          </div>

          {sinAsignar.inmuebles > 0 || sinAsignar.contratos > 0 ? (
            <p
              className="rounded-md border border-warning/40 bg-warning-soft px-4 py-3 text-sm text-fg"
              data-testid="sin-asignar"
              role="status"
            >
              {NUMERO.format(sinAsignar.inmuebles)}{' '}
              {sinAsignar.inmuebles === 1 ? 'inmueble' : 'inmuebles'} y{' '}
              {NUMERO.format(sinAsignar.contratos)}{' '}
              {sinAsignar.contratos === 1 ? 'contrato' : 'contratos'} no tienen sede. Mientras sea
              así, el consolidado va a ser mayor que la suma de las sedes, y esa diferencia no es
              del negocio: es lo que falta repartir.
            </p>
          ) : null}

          <div className="overflow-hidden rounded-lg border border-border">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sede</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Ciudad</TableHead>
                    <TableHead className="text-right">Inmuebles</TableHead>
                    <TableHead className="text-right">Contratos</TableHead>
                    <TableHead>&nbsp;</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sedes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-sm text-fg-muted">
                        Todavía no hay sedes. Sin ellas el tablero muestra la inmobiliaria entera,
                        que es exactamente lo que hacía hasta ahora.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sedes.map((s) => (
                      <TableRow key={s.id} data-testid={`sede-${s.codigo}`}>
                        <TableCell className="font-medium text-fg">
                          <span className="flex flex-wrap items-center gap-2">
                            {s.nombre}
                            {s.esPorDefecto ? <Badge variant="secondary">Por defecto</Badge> : null}
                            {!s.activa ? <Badge variant="outline">Inactiva</Badge> : null}
                          </span>
                          {s.direccion ? (
                            <span className="block text-xs text-fg-muted">{s.direccion}</span>
                          ) : null}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{s.codigo}</TableCell>
                        <TableCell className="text-fg-muted">{s.ciudad || '—'}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {NUMERO.format(s.inmuebles)}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {NUMERO.format(s.contratos)}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            {!s.esPorDefecto ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                hideArrow
                                disabled={!disponible}
                                onClick={() => void marcarPorDefecto(s)}
                              >
                                Hacerla por defecto
                              </Button>
                            ) : null}
                            <Button
                              variant="ghost"
                              size="sm"
                              hideArrow
                              disabled={!disponible}
                              onClick={() => setEditando(s)}
                            >
                              Editar
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      ) : null}

      <EditorDeSede
        abierto={editando !== null}
        sede={editando === 'nueva' ? null : editando}
        onCerrar={() => setEditando(null)}
        onGuardada={() => {
          setEditando(null);
          void cargar();
        }}
      />
    </EstadoDeDatos>
  );
}

function EditorDeSede({
  abierto,
  sede,
  onCerrar,
  onGuardada,
}: {
  abierto: boolean;
  sede: Sede | null;
  onCerrar: () => void;
  onGuardada: () => void;
}) {
  const [nombre, setNombre] = useState('');
  const [codigo, setCodigo] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [direccion, setDireccion] = useState('');
  const [porDefecto, setPorDefecto] = useState(false);
  const [activa, setActiva] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    setNombre(sede?.nombre ?? '');
    setCodigo(sede?.codigo ?? '');
    setCiudad(sede?.ciudad ?? '');
    setDireccion(sede?.direccion ?? '');
    setPorDefecto(sede?.esPorDefecto ?? false);
    setActiva(sede?.activa ?? true);
  }, [abierto, sede]);

  const valida = nombre.trim().length > 0 && codigo.trim().length > 0;

  async function guardar() {
    setGuardando(true);
    try {
      const datos = {
        nombre: nombre.trim(),
        codigo: codigo.trim(),
        ciudad: ciudad.trim() || undefined,
        direccion: direccion.trim() || undefined,
        esPorDefecto: porDefecto,
      };
      if (sede) await finanzasApi.editarSede(sede.id, { ...datos, activa });
      else await finanzasApi.crearSede(datos);
      toast.success(sede ? 'Sede guardada.' : 'Sede creada.', {
        description: 'Los inmuebles y contratos no se reparten solos: se asignan.',
      });
      onGuardada();
    } catch (e) {
      toast.error('No se pudo guardar la sede.', {
        description: explicar(e, 'No se pudo guardar la sede.'),
      });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className="max-w-md" data-testid="editor-de-sede">
        <DialogHeader>
          <DialogTitle>{sede ? 'Editar la sede' : 'Crear una sede'}</DialogTitle>
          <DialogDescription>
            El código es el que va a ver el contador en los informes por centro de costo.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="sede-nombre">Nombre</Label>
            <Input id="sede-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sede-codigo">Código</Label>
            <Input
              id="sede-codigo"
              className="font-mono"
              placeholder="POB"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sede-ciudad">Ciudad</Label>
            <Input id="sede-ciudad" value={ciudad} onChange={(e) => setCiudad(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sede-direccion">Dirección</Label>
            <Input
              id="sede-direccion"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
            />
          </div>
          <label className="flex items-start gap-2 text-sm text-fg">
            <Checkbox className="mt-1" checked={porDefecto} data-testid="sede-por-defecto" onCheckedChange={(marcada: boolean) => setPorDefecto(marcada)} />
            <span>
              Que sea la sede por defecto
              <span className="block text-xs text-fg-muted">
                Lo que se cree sin sede explícita cae ahí. Sólo puede haber una.
              </span>
            </span>
          </label>
          {sede ? (
            <label className="flex items-start gap-2 text-sm text-fg">
              <Checkbox className="mt-1" checked={activa} data-testid="sede-activa" onCheckedChange={(marcada: boolean) => setActiva(marcada)} />
              <span>
                Activa
                <span className="block text-xs text-fg-muted">
                  Desactivarla la saca del selector; lo que ya está asignado no se mueve.
                </span>
              </span>
            </label>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" hideArrow onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Button>
          <Button hideArrow onClick={() => void guardar()} disabled={!valida} isLoading={guardando}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
