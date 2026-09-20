'use client';

/**
 * Las facturas de proveedor: la lista, registrar, causar y anular
 * (contrato del 18-09, §3).
 *
 * ── 🔴 Esto es lo que le falta al P&G para tener gastos propios ─────────────
 *
 * Hoy el libro sabe de lo que entra (recibos) y de lo que se le gira al
 * propietario (lotes de dispersión), y nada de lo que la inmobiliaria gasta en sí
 * misma. Por eso el P&G salía sin gastos. Cada factura registrada acá y CAUSADA
 * es una línea de la clase 5 del P&G y una fila del formato 1001 de la exógena.
 *
 * ── Registrada no es causada, y la diferencia importa ──────────────────────
 *
 * Una factura en BORRADOR existe en Leasefy y NO en el libro: no aparece en el
 * P&G, no aparece en la exógena, y el proveedor ya está esperando el pago. Por
 * eso el estado va en su propia columna con su badge, la lista arranca sin filtro
 * de estado, y la portada tiene una alerta que las cuenta.
 *
 * ── 🔴 Causar muestra el asiento que quedó ─────────────────────────────────
 *
 * Después de causar se pide el asiento y se muestran sus líneas. No es
 * decoración: es la única forma de que quien registró la factura vea a qué
 * cuentas fue, y de que descubra un mapeo mal hecho en la primera factura y no
 * en el cierre del mes. El contrato lo pide así.
 *
 * ── Anular reversa, nunca borra ────────────────────────────────────────────
 *
 * Con motivo, en un `AlertDialog` (nunca `confirm()` del navegador: ver
 * `components/ui/sin-dialogos-del-navegador.test.ts`). Y una factura PAGADA no se
 * anula: primero se anula el egreso, porque la plata ya salió del banco. La
 * pantalla lo dice en vez de dejar intentar.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowsClockwise, FileText, Plus, Prohibit } from '@phosphor-icons/react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { mensajeDeContabilidad } from '@/components/migracion/contabilidad-errores';
import { TituloDeBloque } from '@/components/finanzas/piezas';
import {
  contabilidadApi,
  type AsientoContable,
  type CuentaPuc,
} from '@/lib/api/contabilidad.service';
import {
  facturacionElectronicaService,
} from '@/lib/api/facturacion-electronica.service';
import type { ProveedorNoObligado } from '@/lib/api/facturacion-electronica.service';
import { finanzasApi } from '@/lib/api/finanzas.service';
import type { RubroDelPresupuesto, Sede } from '@/lib/api/finanzas.types';
import {
  ESTADOS_DE_FACTURA,
  NOMBRE_DEL_ESTADO_DE_FACTURA,
  NOMBRE_DEL_TIPO_DE_FACTURA,
  gastosApi,
  type EstadoDeFacturaDeProveedor,
  type FacturaDeProveedor,
  type PaginaDeFacturas,
} from '@/lib/api/gastos.service';
import { diaLegible } from '@/lib/contabilidad/fechas';
import { Monto } from '../Monto';
import { AccionConMotivo, FaltaLaMigracion, Nota } from '../piezas';
import { usePuedeEscribir } from '../use-puede-escribir';
import { FormularioDeFactura } from './FormularioDeFactura';

const TONO_DEL_ESTADO: Record<
  EstadoDeFacturaDeProveedor,
  'secondary' | 'outline' | 'destructive' | 'default'
> = {
  BORRADOR: 'outline',
  CAUSADA: 'secondary',
  PAGADA: 'default',
  ANULADA: 'destructive',
};

/** `?estado=` de la alerta de la portada. Lo que no exista no filtra nada. */
export function estadoDe(valor: string | null | undefined): EstadoDeFacturaDeProveedor | '' {
  return ESTADOS_DE_FACTURA.find((e) => e === valor) ?? '';
}

export function FacturasDeProveedor({
  estadoInicial = '',
}: {
  estadoInicial?: EstadoDeFacturaDeProveedor | '';
}) {
  const [pagina, setPagina] = useState<PaginaDeFacturas | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [estado, setEstado] = useState<EstadoDeFacturaDeProveedor | ''>(estadoInicial);
  const [rubroFiltro, setRubroFiltro] = useState('');

  /** Lo que el formulario necesita, cargado una vez. Un fallo no tumba la lista. */
  const [cuentas, setCuentas] = useState<CuentaPuc[]>([]);
  const [proveedores, setProveedores] = useState<ProveedorNoObligado[]>([]);
  const [rubros, setRubros] = useState<RubroDelPresupuesto[]>([]);
  const [sedes, setSedes] = useState<Sede[]>([]);

  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const [causando, setCausando] = useState<string | null>(null);
  /** El asiento que quedó después de causar, para mostrarlo. */
  const [asiento, setAsiento] = useState<AsientoContable | null>(null);
  const [anulando, setAnulando] = useState<FacturaDeProveedor | null>(null);
  const [motivo, setMotivo] = useState('');
  const [enviandoAnulacion, setEnviandoAnulacion] = useState(false);

  const escritura = usePuedeEscribir();

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setPagina(
        await gastosApi.facturas.listar({
          desde: desde || undefined,
          hasta: hasta || undefined,
          estado: estado || undefined,
          rubro: rubroFiltro || undefined,
        }),
      );
    } catch (e) {
      setError(e);
    } finally {
      setCargando(false);
    }
  }, [desde, hasta, estado, rubroFiltro]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  /*
   * Lo del formulario, en cuatro pedidos independientes. Si los proveedores no
   * cargan, el formulario sigue sirviendo con los datos a mano — que es
   * justamente el camino que el contrato deja abierto.
   */
  useEffect(() => {
    let vivo = true;
    void (async () => {
      const [c, p, r, s] = await Promise.allSettled([
        contabilidadApi.puc.listar({ soloActivas: true, soloImputables: true }),
        facturacionElectronicaService.proveedores(),
        finanzasApi.rubros(),
        finanzasApi.sedes(),
      ]);
      if (!vivo) return;
      if (c.status === 'fulfilled') setCuentas(c.value);
      if (p.status === 'fulfilled') setProveedores(p.value.proveedores);
      if (r.status === 'fulfilled') setRubros(r.value.rubros);
      if (s.status === 'fulfilled') setSedes(s.value.sedes);
    })();
    return () => {
      vivo = false;
    };
  }, []);

  const causar = async (factura: FacturaDeProveedor) => {
    setCausando(factura.id);
    setAsiento(null);
    try {
      const causada = await gastosApi.facturas.causar(factura.id);
      toast.success(
        causada.asientoNumero
          ? `Causada con el asiento N.º ${causada.asientoNumero}.`
          : 'Factura causada.',
      );
      // 🔴 El asiento que quedó, para que se vea a qué cuentas fue.
      if (causada.asientoId) {
        try {
          setAsiento(await contabilidadApi.asientos.detalle(causada.asientoId));
        } catch {
          // El asiento existe aunque no se pueda mostrar: no se anuncia un fallo
          // que haría dudar de si la factura quedó causada.
          setAsiento(null);
        }
      }
      await cargar();
    } catch (e) {
      toast.error(mensajeDeContabilidad(e, 'No se pudo causar la factura.'));
    } finally {
      setCausando(null);
    }
  };

  const anular = async () => {
    if (!anulando) return;
    setEnviandoAnulacion(true);
    try {
      await gastosApi.facturas.anular(anulando.id, motivo.trim());
      toast.success('Factura anulada. Su asiento quedó reversado, no borrado.');
      setAnulando(null);
      setMotivo('');
      await cargar();
    } catch (e) {
      toast.error(mensajeDeContabilidad(e, 'No se pudo anular la factura.'));
    } finally {
      setEnviandoAnulacion(false);
    }
  };

  /** Qué se puede hacer con una factura según su estado, con su motivo. */
  const permisos = (f: FacturaDeProveedor) => {
    if (!escritura.puede) {
      return { causar: { puede: false, motivo: escritura.motivo }, anular: { puede: false, motivo: escritura.motivo } };
    }
    if (f.estado === 'ANULADA') {
      const m = 'Esta factura está anulada.';
      return { causar: { puede: false, motivo: m }, anular: { puede: false, motivo: m } };
    }
    if (f.estado === 'PAGADA') {
      return {
        causar: { puede: false, motivo: 'Ya está causada y pagada.' },
        anular: {
          puede: false,
          motivo:
            'Esta factura ya se pagó: la plata salió del banco. Anula primero el egreso, que reversa el pago.',
        },
      };
    }
    if (f.estado === 'CAUSADA') {
      return {
        causar: { puede: false, motivo: `Ya está causada${f.asientoNumero ? ` (asiento N.º ${f.asientoNumero})` : ''}.` },
        anular: { puede: true, motivo: null },
      };
    }
    return { causar: { puede: true, motivo: null }, anular: { puede: true, motivo: null } };
  };

  const totales = pagina?.totales;
  const sinCausar = useMemo(
    () => (pagina?.facturas ?? []).filter((f) => f.estado === 'BORRADOR').length,
    [pagina],
  );

  if (cargando && !pagina) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <Spinner size="lg" />
        <p className="text-sm text-fg-muted">Cargando las facturas…</p>
      </div>
    );
  }
  if (error || !pagina) {
    return <FalloDeCarga error={error} queEs="las facturas de proveedor" onReintentar={cargar} />;
  }

  // Sin la migración 50 no hay tabla `facturas_de_proveedor`.
  if (!pagina.disponible) {
    return (
      <FaltaLaMigracion
        motivo={pagina.motivo}
        queSeEspera="registrar facturas de proveedor"
        mientrasTanto="Mientras no esté, el P&G sale sin los gastos propios de la inmobiliaria y lo dice en sus avisos."
        testId="facturas-sin-migracion"
      />
    );
  }

  return (
    <div className="space-y-6" data-testid="facturas-de-proveedor">
      <TituloDeBloque
        titulo="Facturas de proveedor"
        explicacion="Lo que la inmobiliaria gasta en sí misma: el contador, la luz de la oficina, las cerraduras. Es lo que le da gastos propios al P&G y filas al formato 1001 de la exógena. Lo que se le gira al propietario NO va acá: eso baja un pasivo y no es gasto."
        accion={
          <AccionConMotivo
            puede={escritura.puede}
            motivo={escritura.motivo}
            onClick={() => setFormularioAbierto(true)}
            variant="default"
            testId="abrir-formulario-de-factura"
          >
            <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Registrar una factura
          </AccionConMotivo>
        }
      />

      {/* ── Filtros ───────────────────────────────────────────────────── */}
      <section className="grid gap-3 rounded-lg border border-border bg-surface p-4 sm:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="facturas-desde">Desde</Label>
          <Input
            id="facturas-desde"
            type="date"
            value={desde}
            max={hasta || undefined}
            onChange={(e) => setDesde(e.target.value)}
            data-testid="filtro-desde"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="facturas-hasta">Hasta</Label>
          <Input
            id="facturas-hasta"
            type="date"
            value={hasta}
            min={desde || undefined}
            onChange={(e) => setHasta(e.target.value)}
            data-testid="filtro-hasta"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="facturas-estado">Estado</Label>
          <select
            id="facturas-estado"
            className="h-11 w-full rounded-md border border-border bg-surface px-3 text-sm text-fg"
            value={estado}
            onChange={(e) => setEstado(e.target.value as EstadoDeFacturaDeProveedor | '')}
            data-testid="filtro-estado"
          >
            <option value="">Todas</option>
            {ESTADOS_DE_FACTURA.map((e) => (
              <option key={e} value={e}>
                {NOMBRE_DEL_ESTADO_DE_FACTURA[e]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="facturas-rubro">Rubro</Label>
          <select
            id="facturas-rubro"
            className="h-11 w-full rounded-md border border-border bg-surface px-3 text-sm text-fg"
            value={rubroFiltro}
            onChange={(e) => setRubroFiltro(e.target.value)}
            data-testid="filtro-rubro"
          >
            <option value="">Todos</option>
            {rubros.map((r) => (
              <option key={r.rubro} value={r.rubro}>
                {r.nombre}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* ── Totales del filtro ────────────────────────────────────────── */}
      {totales ? (
        <dl
          className="grid gap-4 rounded-lg border border-border bg-surface p-4 sm:grid-cols-5"
          aria-label="Totales de las facturas del filtro"
          data-testid="totales-de-facturas"
        >
          <div>
            <dt className="text-caption text-fg-muted">Facturas</dt>
            <dd className="font-mono text-lg tabular-nums text-fg">
              {pagina.total.toLocaleString('es-CO')}
            </dd>
          </div>
          <div>
            <dt className="text-caption text-fg-muted">Subtotal</dt>
            <dd>
              <Monto valor={totales.subtotalCop} className="text-lg" />
            </dd>
          </div>
          <div>
            <dt className="text-caption text-fg-muted">IVA</dt>
            <dd>
              <Monto valor={totales.ivaCop} className="text-lg" />
            </dd>
          </div>
          <div>
            <dt className="text-caption text-fg-muted">Retenciones</dt>
            <dd>
              <Monto valor={totales.retencionesCop} className="text-lg" />
            </dd>
          </div>
          <div>
            <dt className="text-caption text-fg-muted">Se les paga (neto)</dt>
            <dd>
              <Monto valor={totales.netoCop} className="text-lg font-medium" />
            </dd>
          </div>
        </dl>
      ) : null}

      {sinCausar > 0 ? (
        <Nota testId="nota-sin-causar">
          <p>
            {sinCausar === 1
              ? 'Hay 1 factura en borrador: no está en el libro.'
              : `Hay ${sinCausar} facturas en borrador: no están en el libro.`}{' '}
            Una factura sin causar no aparece en el P&G ni en la exógena, y el proveedor ya está
            esperando el pago.
          </p>
        </Nota>
      ) : null}

      {/* ── La lista ──────────────────────────────────────────────────── */}
      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        {pagina.facturas.length === 0 ? (
          <p className="p-8 text-center text-sm text-fg-muted">
            No hay facturas con este filtro. Registra la primera con el botón de arriba.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Documento</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Se le paga</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagina.facturas.map((f) => {
                  const p = permisos(f);
                  return (
                    <TableRow key={f.id} data-testid={`factura-${f.id}`}>
                      <TableCell className="whitespace-nowrap">
                        <p className="font-mono text-xs text-fg">
                          {f.prefijoDelProveedor ? `${f.prefijoDelProveedor}-` : ''}
                          {f.numeroDelProveedor}
                        </p>
                        <p className="text-caption text-fg-muted">
                          {NOMBRE_DEL_TIPO_DE_FACTURA[f.tipo]}
                        </p>
                      </TableCell>
                      <TableCell className="max-w-[16rem]">
                        <p className="truncate text-sm text-fg" title={f.proveedorNombre}>
                          {f.proveedorNombre}
                        </p>
                        <p className="text-caption text-fg-muted">
                          {f.proveedorDocumento ?? 'sin documento'}
                          {f.proveedorId === null ? ' · escrito a mano' : ''}
                        </p>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-caption text-fg-muted">
                        {diaLegible(f.fecha)}
                      </TableCell>
                      <TableCell className="max-w-[18rem]">
                        <p className="truncate text-sm text-fg" title={f.concepto}>
                          {f.concepto}
                        </p>
                        {f.rubro ? (
                          <p className="text-caption text-fg-muted">{f.rubro}</p>
                        ) : null}
                        {f.motivoDeLaAnulacion ? (
                          <p className="text-caption text-danger">
                            Anulada: {f.motivoDeLaAnulacion}
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right">
                        <Monto valor={f.totalCop} className="text-sm" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Monto valor={f.netoCop} className="text-sm" />
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge variant={TONO_DEL_ESTADO[f.estado]}>
                          {NOMBRE_DEL_ESTADO_DE_FACTURA[f.estado]}
                        </Badge>
                        {f.asientoNumero ? (
                          <p className="mt-1 text-caption text-fg-muted">
                            Asiento N.º {f.asientoNumero}
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <AccionConMotivo
                            puede={p.causar.puede}
                            motivo={p.causar.motivo}
                            ocupado={causando === f.id}
                            textoOcupado="Causando…"
                            onClick={() => void causar(f)}
                            testId={`causar-${f.id}`}
                          >
                            <ArrowsClockwise className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                            Causar
                          </AccionConMotivo>
                          <AccionConMotivo
                            puede={p.anular.puede}
                            motivo={p.anular.motivo}
                            onClick={() => {
                              setAnulando(f);
                              setMotivo('');
                            }}
                            testId={`anular-${f.id}`}
                          >
                            <Prohibit className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                            Anular
                          </AccionConMotivo>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {/* ── 🔴 El asiento que quedó ───────────────────────────────────── */}
      {asiento ? (
        <section
          className="space-y-3 rounded-lg border border-success/40 bg-success-soft p-4"
          data-testid="asiento-de-la-factura"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
              <FileText className="h-4 w-4" aria-hidden="true" />
              Asiento N.º {asiento.numero} · {diaLegible(asiento.fecha)}
            </h3>
            <Button
              variant="link"
              size="sm"
              hideArrow
              className="h-auto p-0 text-caption"
              onClick={() => setAsiento(null)}
              data-testid="cerrar-asiento"
            >
              Ocultar
            </Button>
          </div>
          <p className="text-caption text-fg-muted">{asiento.descripcion}</p>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cuenta</TableHead>
                  <TableHead>Detalle</TableHead>
                  <TableHead className="text-right">Débito</TableHead>
                  <TableHead className="text-right">Crédito</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {asiento.movimientos.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="whitespace-nowrap font-mono text-xs">
                      {m.cuenta ? `${m.cuenta.codigo} · ${m.cuenta.nombre}` : m.cuentaId}
                    </TableCell>
                    <TableCell className="text-caption text-fg-muted">
                      {m.descripcion ?? '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Monto valor={m.debitoCop} vacioSiCero className="text-sm" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Monto valor={m.creditoCop} vacioSiCero className="text-sm" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-caption text-fg-muted">
            Si alguna cuenta no es la que esperabas, arreglala en el mapeo contable y reversá este
            asiento: un asiento no se edita.
          </p>
        </section>
      ) : null}

      <FormularioDeFactura
        abierto={formularioAbierto}
        onCerrar={() => setFormularioAbierto(false)}
        onRegistrada={(factura, seCauso) => {
          void cargar();
          if (seCauso && factura.asientoId) {
            void contabilidadApi.asientos
              .detalle(factura.asientoId)
              .then(setAsiento)
              .catch(() => setAsiento(null));
          }
        }}
        cuentas={cuentas}
        proveedores={proveedores}
        rubros={rubros}
        sedes={sedes}
      />

      {/* Anular con motivo, en el diálogo del sistema de diseño. */}
      <AlertDialog
        open={anulando !== null}
        onOpenChange={(a) => {
          if (!a && !enviandoAnulacion) {
            setAnulando(null);
            setMotivo('');
          }
        }}
      >
        <AlertDialogContent data-testid="dialogo-de-anulacion">
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Anular la factura {anulando?.prefijoDelProveedor ?? ''}
              {anulando?.numeroDelProveedor}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {anulando?.asientoNumero
                ? `El asiento N.º ${anulando.asientoNumero} se REVERSA con un asiento espejo: no se borra, y los dos quedan en el libro. `
                : 'La factura queda anulada. '}
              El motivo se guarda con la anulación y lo va a leer el contador.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="motivo-de-anulacion">Motivo</Label>
            <Textarea
              id="motivo-de-anulacion"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Llegó repetida; el proveedor la reemplazó por la FE-4530."
              rows={3}
              data-testid="motivo-de-anulacion"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={enviandoAnulacion}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                // Se cierra cuando el back contestó, no con el clic.
                e.preventDefault();
                void anular();
              }}
              disabled={enviandoAnulacion || motivo.trim().length === 0}
              data-testid="confirmar-anulacion"
            >
              {enviandoAnulacion ? 'Anulando…' : 'Anular'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
