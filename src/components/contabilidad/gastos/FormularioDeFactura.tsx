'use client';

/**
 * Registrar la factura de un proveedor (contrato del 18-09, §3).
 *
 * ── 🔴 El proveedor se puede escribir a mano, y eso es una decisión ─────────
 *
 * El registro de proveedores ya existe
 * (`GET /inmobiliaria/facturacion/documento-soporte/proveedores`) y es lo que se
 * ofrece primero. Pero una factura se puede registrar SIN él, escribiendo los
 * datos: los del plomero que vino una vez y no va a volver. Y una vez elegido el
 * proveedor del registro, sus datos quedan CONGELADOS en la factura — un
 * documento tributario no cambia porque alguien editó una ficha, y el back los
 * guarda copiados por eso mismo.
 *
 * ── 🔴 El total que viaja es el del PAPEL, no el que calculó el navegador ───
 *
 * El formulario suma las líneas y el IVA, pero lo que manda en `totalCop` es el
 * número que la persona leyó en la factura. Si no coinciden, el aviso lo dice con
 * LOS DOS números y el back rechaza con 400 `TOTALES_NO_CUADRAN`. Corregirlo
 * automáticamente taparía un error de digitación —o un IVA que el proveedor
 * calculó distinto— y dejaría la contabilidad cuadrada contra un papel que dice
 * otra cosa. La cuenta está en `lib/contabilidad/factura-de-proveedor.ts`.
 *
 * ── Qué le falta se dice en palabras, no con un botón gris ──────────────────
 *
 * `problemasDeLaFactura` devuelve las frases; el botón se deshabilita y las
 * muestra. Un «Registrar» apagado sin explicación con doce campos arriba manda a
 * buscar cuál falta.
 *
 * ── Sin cuenta en la línea NO es un error ──────────────────────────────────
 *
 * La línea puede quedarse sin `cuentaId`: ahí el back usa la cuenta del rubro o,
 * sin rubro, la del evento `GASTO_SIN_RUBRO`. Es para eso que ese evento existe,
 * y la pantalla lo dice en vez de exigir que alguien elija una cuenta del PUC
 * para cada cerradura.
 */

import { useMemo, useState } from 'react';
import { Plus, Trash } from '@phosphor-icons/react';

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
import { toast } from '@/components/ui/toast';
import { mensajeDeContabilidad } from '@/components/migracion/contabilidad-errores';
import { Monto } from '../Monto';
import { Nota } from '../piezas';
import { SelectorDeCuenta } from '../SelectorDeCuenta';
import {
  gastosApi,
  NOMBRE_DEL_TIPO_DE_FACTURA,
  TIPOS_DE_FACTURA,
  type FacturaDeProveedor,
  type FacturaNueva,
  type TipoDeFacturaDeProveedor,
} from '@/lib/api/gastos.service';
import type { CuentaPuc } from '@/lib/api/contabilidad.service';
import type { ProveedorNoObligado } from '@/lib/api/facturacion-electronica.service';
import type { RubroDelPresupuesto, Sede } from '@/lib/api/finanzas.types';
import {
  avisoDeTotalQueNoCuadra,
  ivaDeLaLinea,
  lineaVacia,
  lineasParaElBack,
  netoAPagar,
  problemasDeLaFactura,
  sumaDeRetenciones,
  totalesDeLasLineas,
  type BorradorDeFactura,
  type LineaEnCurso,
} from '@/lib/contabilidad/factura-de-proveedor';
import { hoy } from '@/lib/contabilidad/fechas';
import { formatCurrency } from '@/lib/types/inmobiliaria';

export interface FormularioDeFacturaProps {
  abierto: boolean;
  onCerrar: () => void;
  /** Se llama con la factura que quedó, para que la lista se refresque. */
  onRegistrada: (factura: FacturaDeProveedor, seCauso: boolean) => void;
  cuentas: readonly CuentaPuc[];
  proveedores: readonly ProveedorNoObligado[];
  rubros: readonly RubroDelPresupuesto[];
  sedes: readonly Sede[];
}

/** Un número que puede estar vacío: `''` no es `0`. */
function aNumero(texto: string): number | null {
  if (texto.trim() === '') return null;
  const n = Number(texto.replace(/[^\d-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

export function FormularioDeFactura({
  abierto,
  onCerrar,
  onRegistrada,
  cuentas,
  proveedores,
  rubros,
  sedes,
}: FormularioDeFacturaProps) {
  const [tipo, setTipo] = useState<TipoDeFacturaDeProveedor>('FACTURA');
  /** `''` = el proveedor se escribe a mano. */
  const [proveedorId, setProveedorId] = useState('');
  const [proveedorNombre, setProveedorNombre] = useState('');
  const [proveedorTipoDocumento, setProveedorTipoDocumento] = useState('NIT');
  const [proveedorDocumento, setProveedorDocumento] = useState('');
  const [proveedorCiudad, setProveedorCiudad] = useState('');
  const [proveedorDireccion, setProveedorDireccion] = useState('');
  const [prefijo, setPrefijo] = useState('');
  const [numero, setNumero] = useState('');
  const [fecha, setFecha] = useState(() => hoy());
  const [vencimiento, setVencimiento] = useState('');
  const [concepto, setConcepto] = useState('');
  const [rubro, setRubro] = useState('');
  const [sedeId, setSedeId] = useState('');
  const [lineas, setLineas] = useState<LineaEnCurso[]>(() => [lineaVacia()]);
  const [totalDelPapel, setTotalDelPapel] = useState<number | null>(null);
  const [retefuente, setRetefuente] = useState(0);
  const [reteiva, setReteiva] = useState(0);
  const [reteica, setReteica] = useState(0);
  const [guardando, setGuardando] = useState(false);

  const borrador: BorradorDeFactura = {
    proveedorNombre,
    proveedorDocumento,
    numeroDelProveedor: numero,
    fecha,
    concepto,
    lineas,
    totalCop: totalDelPapel,
    retefuenteCop: retefuente,
    reteivaCop: reteiva,
    reteicaCop: reteica,
  };

  const totales = useMemo(() => totalesDeLasLineas(lineas), [lineas]);
  const problemas = useMemo(() => problemasDeLaFactura(borrador), [borrador]);
  const avisoDelTotal = avisoDeTotalQueNoCuadra(borrador, formatCurrency);
  const retenciones = sumaDeRetenciones(borrador);
  const neto = totalDelPapel === null ? null : netoAPagar(totalDelPapel, borrador);

  /** Elegir un proveedor del registro copia sus datos en la factura. */
  const elegirProveedor = (id: string) => {
    setProveedorId(id);
    const p = proveedores.find((x) => x.id === id);
    if (!p) return;
    setProveedorNombre(p.nombre);
    if (p.tipoDocumento) setProveedorTipoDocumento(p.tipoDocumento);
    if (p.documento) setProveedorDocumento(p.documento);
    if (p.ciudad) setProveedorCiudad(p.ciudad);
    if (p.direccion) setProveedorDireccion(p.direccion);
  };

  const cambiarLinea = (indice: number, cambios: Partial<LineaEnCurso>) =>
    setLineas((previas) => previas.map((l, i) => (i === indice ? { ...l, ...cambios } : l)));

  const guardar = async (causar: boolean) => {
    setGuardando(true);
    try {
      const cuerpo: FacturaNueva = {
        tipo,
        ...(proveedorId ? { proveedorId } : {}),
        proveedorNombre: proveedorNombre.trim(),
        ...(proveedorTipoDocumento ? { proveedorTipoDocumento } : {}),
        ...(proveedorDocumento ? { proveedorDocumento: proveedorDocumento.trim() } : {}),
        ...(proveedorCiudad ? { proveedorCiudad: proveedorCiudad.trim() } : {}),
        ...(proveedorDireccion ? { proveedorDireccion: proveedorDireccion.trim() } : {}),
        ...(prefijo ? { prefijoDelProveedor: prefijo.trim() } : {}),
        numeroDelProveedor: numero.trim(),
        fecha,
        ...(vencimiento ? { fechaDeVencimiento: vencimiento } : {}),
        concepto: concepto.trim(),
        ...(rubro ? { rubro } : {}),
        ...(sedeId ? { sedeId } : {}),
        lineas: lineasParaElBack(lineas),
        retefuenteCop: retefuente,
        reteivaCop: reteiva,
        reteicaCop: reteica,
        // 🔴 El total del PAPEL, no el calculado.
        totalCop: totalDelPapel as number,
        ...(causar ? { causar: true } : {}),
      };
      const factura = await gastosApi.facturas.registrar(cuerpo);
      toast.success(
        causar
          ? `Factura registrada y causada${factura.asientoNumero ? ` (asiento N.º ${factura.asientoNumero})` : ''}.`
          : 'Factura registrada. Queda en borrador hasta que la causes.',
      );
      onRegistrada(factura, causar);
      onCerrar();
    } catch (e) {
      // El diálogo queda abierto: no se pierde lo digitado.
      toast.error(mensajeDeContabilidad(e, 'No se pudo registrar la factura.'));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={abierto} onOpenChange={(a) => !a && !guardando && onCerrar()}>
      <DialogContent
        className="max-h-[90vh] max-w-3xl overflow-y-auto"
        data-lenis-prevent
        data-testid="formulario-de-factura"
      >
        <DialogHeader>
          <DialogTitle>Registrar una factura de proveedor</DialogTitle>
          <DialogDescription>
            Lo que la inmobiliaria gasta en sí misma. Esto NO es un giro al propietario: el canon
            que se gira baja un pasivo y no es gasto de la inmobiliaria.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* ── El proveedor ──────────────────────────────────────────── */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-fg">Proveedor</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="factura-proveedor">Del registro</Label>
                <select
                  id="factura-proveedor"
                  className="h-11 w-full rounded-md border border-border bg-surface px-3 text-sm text-fg"
                  value={proveedorId}
                  onChange={(e) => elegirProveedor(e.target.value)}
                  data-testid="factura-proveedor"
                >
                  <option value="">Escribir los datos a mano</option>
                  {proveedores.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                      {p.documento ? ` · ${p.documento}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="factura-tipo">Tipo de documento</Label>
                <select
                  id="factura-tipo"
                  className="h-11 w-full rounded-md border border-border bg-surface px-3 text-sm text-fg"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as TipoDeFacturaDeProveedor)}
                  data-testid="factura-tipo"
                >
                  {TIPOS_DE_FACTURA.map((t) => (
                    <option key={t} value={t}>
                      {NOMBRE_DEL_TIPO_DE_FACTURA[t]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="factura-nombre">Nombre o razón social</Label>
                <Input
                  id="factura-nombre"
                  value={proveedorNombre}
                  onChange={(e) => setProveedorNombre(e.target.value)}
                  data-testid="factura-nombre"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="factura-tipo-doc">Tipo de documento del proveedor</Label>
                <Input
                  id="factura-tipo-doc"
                  value={proveedorTipoDocumento}
                  onChange={(e) => setProveedorTipoDocumento(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="factura-doc">Documento</Label>
                <Input
                  id="factura-doc"
                  value={proveedorDocumento}
                  onChange={(e) => setProveedorDocumento(e.target.value)}
                  data-testid="factura-documento"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="factura-ciudad">Ciudad</Label>
                <Input
                  id="factura-ciudad"
                  value={proveedorCiudad}
                  onChange={(e) => setProveedorCiudad(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="factura-direccion">Dirección</Label>
                <Input
                  id="factura-direccion"
                  value={proveedorDireccion}
                  onChange={(e) => setProveedorDireccion(e.target.value)}
                />
              </div>
            </div>
            {proveedorId ? (
              <Nota testId="nota-proveedor-congelado">
                <p>
                  Estos datos quedan copiados en la factura: si después se edita la ficha del
                  proveedor, la factura no cambia. Un documento tributario no se reescribe.
                </p>
              </Nota>
            ) : null}
          </section>

          {/* ── El documento ──────────────────────────────────────────── */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-fg">El documento</h3>
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="space-y-1.5">
                <Label htmlFor="factura-prefijo">Prefijo</Label>
                <Input
                  id="factura-prefijo"
                  value={prefijo}
                  onChange={(e) => setPrefijo(e.target.value)}
                  placeholder="FE"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="factura-numero">Número</Label>
                <Input
                  id="factura-numero"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  data-testid="factura-numero"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="factura-fecha">Fecha</Label>
                <Input
                  id="factura-fecha"
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  data-testid="factura-fecha"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="factura-vence">Vence</Label>
                <Input
                  id="factura-vence"
                  type="date"
                  value={vencimiento}
                  min={fecha || undefined}
                  onChange={(e) => setVencimiento(e.target.value)}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="factura-concepto">Concepto</Label>
                <Input
                  id="factura-concepto"
                  value={concepto}
                  onChange={(e) => setConcepto(e.target.value)}
                  placeholder="Cerraduras para la oficina"
                  data-testid="factura-concepto"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="factura-rubro">Rubro del P&G</Label>
                <select
                  id="factura-rubro"
                  className="h-11 w-full rounded-md border border-border bg-surface px-3 text-sm text-fg"
                  value={rubro}
                  onChange={(e) => setRubro(e.target.value)}
                  data-testid="factura-rubro"
                >
                  <option value="">Sin rubro</option>
                  {rubros.map((r) => (
                    <option key={r.rubro} value={r.rubro}>
                      {r.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="factura-sede">Sede</Label>
                <select
                  id="factura-sede"
                  className="h-11 w-full rounded-md border border-border bg-surface px-3 text-sm text-fg"
                  value={sedeId}
                  onChange={(e) => setSedeId(e.target.value)}
                  data-testid="factura-sede"
                >
                  <option value="">Sin sede</option>
                  {sedes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre} ({s.codigo})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* ── Las líneas ────────────────────────────────────────────── */}
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-fg">Líneas</h3>
              <Button
                variant="outline"
                size="sm"
                hideArrow
                onClick={() => setLineas((p) => [...p, lineaVacia()])}
                data-testid="agregar-linea"
              >
                <Plus className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                Agregar línea
              </Button>
            </div>

            <ul className="space-y-3">
              {lineas.map((l, i) => (
                <li
                  key={i}
                  className="grid gap-2 rounded-lg border border-border bg-surface-muted p-3 sm:grid-cols-12"
                  data-testid={`linea-${i}`}
                >
                  <div className="space-y-1.5 sm:col-span-4">
                    <Label htmlFor={`linea-desc-${i}`}>Descripción</Label>
                    <Input
                      id={`linea-desc-${i}`}
                      value={l.descripcion}
                      onChange={(e) => cambiarLinea(i, { descripcion: e.target.value })}
                      data-testid={`linea-descripcion-${i}`}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-3">
                    <Label htmlFor={`linea-cuenta-${i}`}>Cuenta del gasto</Label>
                    <SelectorDeCuenta
                      cuentas={cuentas}
                      value={l.cuentaId}
                      onChange={(cuentaId) => cambiarLinea(i, { cuentaId })}
                      soloImputables
                      placeholder="La del rubro"
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor={`linea-base-${i}`}>Base</Label>
                    <Input
                      id={`linea-base-${i}`}
                      inputMode="numeric"
                      value={l.baseCop === null ? '' : String(l.baseCop)}
                      onChange={(e) => cambiarLinea(i, { baseCop: aNumero(e.target.value) })}
                      data-testid={`linea-base-${i}`}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-1">
                    <Label htmlFor={`linea-iva-${i}`}>IVA %</Label>
                    <Input
                      id={`linea-iva-${i}`}
                      inputMode="numeric"
                      value={String(l.ivaPct)}
                      onChange={(e) => cambiarLinea(i, { ivaPct: aNumero(e.target.value) ?? 0 })}
                      data-testid={`linea-iva-${i}`}
                    />
                  </div>
                  <div className="flex items-end justify-between gap-2 sm:col-span-2">
                    <div className="space-y-0.5">
                      <p className="text-caption text-fg-muted">IVA</p>
                      <Monto
                        valor={ivaDeLaLinea(l.baseCop ?? 0, l.ivaPct)}
                        className="text-sm"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      hideArrow
                      aria-label={`Quitar la línea ${i + 1}`}
                      disabled={lineas.length === 1}
                      onClick={() => setLineas((p) => p.filter((_, j) => j !== i))}
                      data-testid={`quitar-linea-${i}`}
                    >
                      <Trash className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>

            <Nota testId="nota-de-la-cuenta">
              <p>
                Una línea sin cuenta no es un error: el asiento usa la cuenta del rubro y, sin
                rubro, la del evento «Gasto sin rubro» del mapeo contable.
              </p>
            </Nota>
          </section>

          {/* ── Los totales ───────────────────────────────────────────── */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-fg">Totales y retenciones</h3>
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="space-y-1.5">
                <Label htmlFor="factura-total">Total de la factura</Label>
                <Input
                  id="factura-total"
                  inputMode="numeric"
                  value={totalDelPapel === null ? '' : String(totalDelPapel)}
                  onChange={(e) => setTotalDelPapel(aNumero(e.target.value))}
                  data-testid="factura-total"
                />
                <p className="text-caption text-fg-muted">
                  El número que dice el papel, no el que calculamos.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="factura-retefuente">Retefuente</Label>
                <Input
                  id="factura-retefuente"
                  inputMode="numeric"
                  value={String(retefuente)}
                  onChange={(e) => setRetefuente(aNumero(e.target.value) ?? 0)}
                  data-testid="factura-retefuente"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="factura-reteiva">ReteIVA</Label>
                <Input
                  id="factura-reteiva"
                  inputMode="numeric"
                  value={String(reteiva)}
                  onChange={(e) => setReteiva(aNumero(e.target.value) ?? 0)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="factura-reteica">ReteICA</Label>
                <Input
                  id="factura-reteica"
                  inputMode="numeric"
                  value={String(reteica)}
                  onChange={(e) => setReteica(aNumero(e.target.value) ?? 0)}
                  data-testid="factura-reteica"
                />
              </div>
            </div>

            <dl className="grid gap-3 rounded-lg border border-border bg-surface p-4 sm:grid-cols-4">
              <div>
                <dt className="text-caption text-fg-muted">Subtotal de las líneas</dt>
                <dd>
                  <Monto valor={totales.subtotalCop} className="text-sm" />
                </dd>
              </div>
              <div>
                <dt className="text-caption text-fg-muted">IVA de las líneas</dt>
                <dd>
                  <Monto valor={totales.ivaCop} className="text-sm" />
                </dd>
              </div>
              <div>
                <dt className="text-caption text-fg-muted">Retenciones</dt>
                <dd>
                  <Monto valor={retenciones} className="text-sm" />
                </dd>
              </div>
              <div>
                <dt className="text-caption text-fg-muted">Se le paga (neto)</dt>
                <dd data-testid="factura-neto">
                  {neto === null ? (
                    <span className="text-sm text-fg-subtle">—</span>
                  ) : (
                    <Monto valor={neto} className="text-sm font-medium" />
                  )}
                </dd>
              </div>
            </dl>

            {avisoDelTotal ? (
              <div
                className="rounded-lg border border-warning/40 bg-warning-soft p-3 text-sm text-fg"
                role="alert"
                data-testid="aviso-total-no-cuadra"
              >
                {avisoDelTotal}
              </div>
            ) : null}
          </section>

          {problemas.length > 0 ? (
            <ul
              className="space-y-1 rounded-lg border border-border bg-surface-muted p-3 text-caption text-fg-muted"
              data-testid="problemas-de-la-factura"
            >
              {problemas.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          ) : null}
        </div>

        <DialogFooter className="flex-wrap gap-2">
          <Button variant="ghost" hideArrow onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Button>
          <Button
            variant="outline"
            hideArrow
            onClick={() => void guardar(false)}
            disabled={guardando || problemas.length > 0}
            title={problemas[0]}
            data-testid="registrar-factura"
          >
            {guardando ? 'Registrando…' : 'Registrar en borrador'}
          </Button>
          <Button
            hideArrow
            onClick={() => void guardar(true)}
            disabled={guardando || problemas.length > 0}
            title={problemas[0]}
            data-testid="registrar-y-causar"
          >
            {guardando ? 'Registrando…' : 'Registrar y causar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
