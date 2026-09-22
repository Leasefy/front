'use client';

/**
 * 🔴 EL REGISTRO DE PROVEEDORES DE MANTENIMIENTO (H-04, Nico 18-09-2026).
 *
 * «Registro de proveedores por inmobiliaria (RUT, seguridad social,
 * calificación)». El back quedó completo el 18-09 —controlador, servicio,
 * migración y pruebas— y **sin una sola pantalla**: había cómo guardar un
 * proveedor y ninguna forma de hacerlo.
 *
 * 🔴 Los AVISOS los calcula el back. Que falte el RUT o esté vencida la
 * seguridad social no es una decisión de presentación: es la misma regla que
 * decide si a ese proveedor se le puede pagar. Vive en `proveedores.service.ts`
 * y acá sólo se muestra, sin volver a razonarla.
 *
 * 🔴 CALIFICAR no se hace acá, y es a propósito. El back exige la `solicitudId`
 * del trabajo que se califica —«calificación después de cada trabajo»—, así que
 * la estrella se pone al cerrar la solicitud, no desde una lista donde no hay
 * ningún trabajo a la vista. Acá se LEE el historial.
 *
 * 🔴 Va como FILA del menú y no como sección de Mantenimientos: Mantenimientos
 * no tiene secciones, y el riel no se dibuja con una card sola, así que una
 * única sub-pantalla quedaría inalcanzable desde el menú (la misma razón por la
 * que «Portales» es fila y no sub-pantalla de Inmuebles).
 *
 * 🔴 19-09-2026 · LA LISTA SE VOLVIÓ TABLA (Nico: «esto parece ser una tabla;
 * si es una tabla, organízala y colócale todo lo que tienen nuestras tablas»).
 * Acá quedan la pantalla, el formulario y el historial; la tabla con su chasis
 * —cajones, oficio, buscador, alcance, orden, vacío adentro y paginado— vive en
 * `@/components/mantenimientos/TablaDeProveedores`, con el porqué escrito ahí.
 */

import { useCallback, useEffect, useState } from 'react';
import { Plus, Star, X } from '@phosphor-icons/react';
import { Eyebrow } from '@leasefy/cadence';

import { PageGuard } from '@/components/auth/PageGuard';
import { Button, Badge, Input } from '@/components/ui';
import { TablaDeProveedores } from '@/components/mantenimientos/TablaDeProveedores';
import { ESPECIALIDADES } from '@/components/mantenimientos/especialidades';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useLenis } from '@/components/providers/SmoothScroll';
import { toast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import {
  proveedoresDeMantenimientoApi,
  type ProveedorDeMantenimiento,
  type CalificacionDelProveedor,
  type GuardarProveedor,
} from '@/lib/api/proveedores-de-mantenimiento.service';

function ContenidoDeProveedores() {
  const { canAccess } = usePermissions();
  const puedeEditar = canAccess('operaciones', 'edit');

  const [proveedores, setProveedores] = useState<ProveedorDeMantenimiento[] | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [editando, setEditando] = useState<ProveedorDeMantenimiento | 'nuevo' | null>(null);
  const [historialDe, setHistorialDe] = useState<ProveedorDeMantenimiento | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setProveedores(await proveedoresDeMantenimientoApi.listar());
    } catch (e) {
      setError(e);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const desactivar = async (p: ProveedorDeMantenimiento) => {
    try {
      await proveedoresDeMantenimientoApi.desactivar(p.id);
      toast.success(`${p.nombre} queda inactivo. Su historial se conserva.`);
      await cargar();
    } catch (e) {
      toast.error(mensajeDeError(e, 'No se pudo desactivar el proveedor'));
    }
  };

  const reactivar = async (p: ProveedorDeMantenimiento) => {
    try {
      await proveedoresDeMantenimientoApi.actualizar(p.id, { activo: true });
      toast.success(`${p.nombre} vuelve a estar activo.`);
      await cargar();
    } catch (e) {
      toast.error(mensajeDeError(e, 'No se pudo reactivar el proveedor'));
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* 🔴 Sin «Volver a Mantenimientos» (Nico, 18-09-2026: «¿para qué el
          devolverse?»). Proveedores es una FILA del menú, no una sub-pantalla
          de Mantenimientos: el botón prometía subir un nivel que no existe. */}
      <div className="space-y-6 p-4 md:p-6">
        {/* El encabezado de la casa: eyebrow, título y qué es —el mismo de
            Contratos y Renovaciones—. El icono se fue al encabezado de la
            tarjeta, que es donde lo llevan las demás tablas. */}
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <Eyebrow>Operación</Eyebrow>
            <h1 className="text-h2 text-fg">Proveedores</h1>
            <p className="max-w-2xl text-sm text-fg-muted">
              A quién llamas para cada oficio, con sus papeles al día y cómo le ha
              ido. La calificación se pone al cerrar cada trabajo, no desde aquí.
            </p>
          </div>
          {puedeEditar && (
            <Button hideArrow onClick={() => setEditando('nuevo')}>
              <Plus className="mr-1.5 h-4 w-4" />
              Registrar proveedor
            </Button>
          )}
        </header>

        <TablaDeProveedores
          proveedores={proveedores ?? []}
          cargando={cargando}
          error={error}
          onReintentar={cargar}
          puedeEditar={puedeEditar}
          onRegistrar={() => setEditando('nuevo')}
          onEditar={setEditando}
          onDesactivar={(p) => void desactivar(p)}
          onReactivar={(p) => void reactivar(p)}
          onVerHistorial={setHistorialDe}
        />
      </div>

      {editando && (
        <FormularioDeProveedor
          proveedor={editando === 'nuevo' ? null : editando}
          onCerrar={() => setEditando(null)}
          onGuardado={() => {
            setEditando(null);
            void cargar();
          }}
        />
      )}

      {historialDe && (
        <HistorialDeCalificaciones
          proveedor={historialDe}
          onCerrar={() => setHistorialDe(null)}
        />
      )}
    </div>
  );
}

/**
 * 🔴 DESIGN §8: todo modal para a Lenis mientras está abierto y lo vuelve a
 * arrancar al cerrar (incluido el cleanup). Sin esto la rueda del mouse queda
 * secuestrada y el cuerpo del modal se ve congelado. El contenedor que scrollea
 * además lleva `data-lenis-prevent`.
 */
function useLenisQuieto() {
  const lenis = useLenis();
  useEffect(() => {
    lenis.stop();
    return () => lenis.start();
  }, [lenis]);
}

// ── El formulario ───────────────────────────────────────────────────────────

function FormularioDeProveedor({
  proveedor,
  onCerrar,
  onGuardado,
}: {
  proveedor: ProveedorDeMantenimiento | null;
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  useLenisQuieto();
  const [form, setForm] = useState<GuardarProveedor>({
    nombre: proveedor?.nombre ?? '',
    documento: proveedor?.documento ?? '',
    telefono: proveedor?.telefono ?? '',
    correo: proveedor?.correo ?? '',
    especialidades: proveedor?.especialidades ?? [],
    rutNombre: proveedor?.rut?.nombre ?? '',
    rutVigenteHasta: proveedor?.rut?.vigenteHasta ?? '',
    seguridadSocialNombre: proveedor?.seguridadSocial?.nombre ?? '',
    seguridadSocialVigenteHasta: proveedor?.seguridadSocial?.vigenteHasta ?? '',
    notas: proveedor?.notas ?? '',
  });
  const [guardando, setGuardando] = useState(false);
  const [falla, setFalla] = useState<string | null>(null);

  const alternar = (valor: string) => {
    const actuales = form.especialidades ?? [];
    setForm({
      ...form,
      especialidades: actuales.includes(valor)
        ? actuales.filter((v) => v !== valor)
        : [...actuales, valor],
    });
  };

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (guardando) return;
    setGuardando(true);
    setFalla(null);
    // Los vacíos no viajan: el back distingue «no lo mandó» de «lo borró».
    const limpio = Object.fromEntries(
      Object.entries(form).filter(([, v]) =>
        Array.isArray(v) ? true : v !== '' && v !== undefined,
      ),
    ) as GuardarProveedor;
    try {
      if (proveedor) {
        await proveedoresDeMantenimientoApi.actualizar(proveedor.id, limpio);
      } else {
        await proveedoresDeMantenimientoApi.crear(limpio);
      }
      toast.success(proveedor ? 'Proveedor actualizado' : 'Proveedor registrado');
      onGuardado();
    } catch (err) {
      setFalla(mensajeDeError(err, 'No se pudo guardar el proveedor'));
    } finally {
      setGuardando(false);
    }
  };

  const puedeEnviar =
    form.nombre.trim().length > 0 && form.documento.trim().length > 0 && !guardando;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={guardando ? undefined : onCerrar}
      />
      <div data-lenis-prevent
        style={{ overscrollBehavior: 'contain' }}
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-background">
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-background px-6 py-4">
          <h2 className="text-base font-semibold text-fg">
            {proveedor ? `Editar a ${proveedor.nombre}` : 'Registrar proveedor'}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            hideArrow
            onClick={onCerrar}
            disabled={guardando}
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={enviar} className="space-y-4 p-6">
          <Campo label="Nombre" requerido>
            {/* 🔴 21-09 · Con `placeholder`. Nico: «¿por qué estos inputs no
                tienen placeholder?». Un campo en blanco al lado de un rótulo de
                una palabra deja a la persona adivinando el FORMATO: si el
                nombre es el de la empresa o el del plomero que contesta. El
                ejemplo lo resuelve sin gastar una línea de ayuda. */}
            <Input
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              maxLength={200}
              placeholder="Plomería Andina S.A.S. o Jorge Martínez"
              required
            />
          </Campo>

          <Campo
            label="NIT o cédula"
            requerido
            ayuda="Con eso se le paga y se le retiene."
          >
            <Input
              value={form.documento}
              onChange={(e) => setForm({ ...form, documento: e.target.value })}
              maxLength={20}
              placeholder="900123456-7 o 71234567"
              required
            />
          </Campo>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Campo label="Teléfono">
              <Input
                type="tel"
                value={form.telefono ?? ''}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                maxLength={20}
                placeholder="3001234567"
              />
            </Campo>
            <Campo label="Correo">
              <Input
                type="email"
                value={form.correo ?? ''}
                onChange={(e) => setForm({ ...form, correo: e.target.value })}
                maxLength={200}
                placeholder="contacto@proveedor.com"
              />
            </Campo>
          </div>

          <fieldset>
            <legend className="mb-1 block text-xs font-medium text-foreground">
              Qué hace
            </legend>
            <div className="flex flex-wrap gap-2">
              {ESPECIALIDADES.map((e) => {
                const puesta = (form.especialidades ?? []).includes(e.valor);
                return (
                  <button
                    key={e.valor}
                    type="button"
                    onClick={() => alternar(e.valor)}
                    aria-pressed={puesta}
                    className={cn(
                      'rounded-full border px-3 py-1 text-xs transition-colors',
                      puesta
                        ? 'border-primary bg-primary-soft text-primary'
                        : 'border-border text-fg-muted hover:border-primary/40',
                    )}
                  >
                    {e.label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Campo
              label="RUT"
              ayuda="Sin él no se le puede facturar ni retener."
            >
              <Input
                value={form.rutNombre ?? ''}
                onChange={(e) => setForm({ ...form, rutNombre: e.target.value })}
                placeholder="Nombre del archivo"
                maxLength={255}
              />
            </Campo>
            <Campo label="RUT vigente hasta">
              <Input
                type="date"
                value={form.rutVigenteHasta ?? ''}
                onChange={(e) =>
                  setForm({ ...form, rutVigenteHasta: e.target.value })
                }
              />
            </Campo>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Campo
              label="Seguridad social"
              ayuda="Si se accidenta dentro del inmueble, el riesgo es de la inmobiliaria."
            >
              <Input
                value={form.seguridadSocialNombre ?? ''}
                onChange={(e) =>
                  setForm({ ...form, seguridadSocialNombre: e.target.value })
                }
                placeholder="Nombre del archivo"
                maxLength={255}
              />
            </Campo>
            <Campo label="Vigente hasta">
              <Input
                type="date"
                value={form.seguridadSocialVigenteHasta ?? ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    seguridadSocialVigenteHasta: e.target.value,
                  })
                }
              />
            </Campo>
          </div>

          <Campo label="Notas">
            <textarea
              value={form.notas ?? ''}
              onChange={(e) => setForm({ ...form, notas: e.target.value })}
              maxLength={2000}
              rows={3}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </Campo>

          {falla && (
            <div
              role="alert"
              className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-danger"
            >
              {falla}
            </div>
          )}

          {/*
            🔴 19-09 (visto en el navegador, no en una prueba): el pie NO era
            pegajoso y el encabezado sí. Con el alto real de una pantalla
            (806 px) el formulario mide 860 y «Registrar» caía en y=836: fuera
            de vista, sin ninguna señal de que hubiera algo más abajo. Alguien
            llenaba Nombre y NIT —los dos únicos obligatorios— y no encontraba
            con qué guardar. El mismo defecto de siempre: el control que
            necesitás no está donde estás mirando.
          */}
          <div className="sticky bottom-0 -mx-6 -mb-6 flex gap-2 border-t border-border bg-background px-6 py-4">
            <Button
              type="button"
              variant="secondary"
              hideArrow
              onClick={onCerrar}
              disabled={guardando}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              hideArrow
              isLoading={guardando}
              disabled={!puedeEnviar}
              className="flex-1"
            >
              {proveedor ? 'Guardar' : 'Registrar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Campo({
  label,
  ayuda,
  requerido,
  children,
}: {
  label: string;
  ayuda?: string;
  requerido?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-foreground">
        {label}
        {requerido && <span className="ml-0.5 text-danger">*</span>}
      </span>
      {children}
      {ayuda && <span className="mt-1 block text-[11px] text-fg-muted">{ayuda}</span>}
    </label>
  );
}

// ── El historial ────────────────────────────────────────────────────────────

function HistorialDeCalificaciones({
  proveedor,
  onCerrar,
}: {
  proveedor: ProveedorDeMantenimiento;
  onCerrar: () => void;
}) {
  useLenisQuieto();
  const [filas, setFilas] = useState<CalificacionDelProveedor[] | null>(null);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    proveedoresDeMantenimientoApi
      .calificaciones(proveedor.id)
      .then(setFilas)
      .catch(setError);
  }, [proveedor.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCerrar} />
      <div data-lenis-prevent
        style={{ overscrollBehavior: 'contain' }}
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-background">
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-background px-6 py-4">
          <h2 className="text-base font-semibold text-fg">
            Cómo le ha ido a {proveedor.nombre}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            hideArrow
            onClick={onCerrar}
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-3 p-6">
          {error ? (
            <p role="alert" className="text-sm text-danger">
              No se pudo cargar el historial.
            </p>
          ) : null}
          {!error && filas === null && (
            <p className="text-sm text-fg-muted">Cargando…</p>
          )}
          {filas?.length === 0 && (
            <p className="text-sm text-fg-muted">Todavía no lo han calificado.</p>
          )}
          {filas?.map((c) => (
            <div key={c.id} className="rounded-md border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1 text-sm">
                  <Star className="h-4 w-4 text-warning" weight="fill" />
                  <span className="font-medium tabular-nums">{c.estrellas}</span>
                </span>
                <span className="text-xs text-fg-muted tabular-nums">
                  {new Date(c.fecha).toLocaleDateString('es-CO')}
                </span>
              </div>
              {c.porGarantia && (
                <Badge variant="secondary" className="mt-2">
                  Fue una reapertura por garantía
                </Badge>
              )}
              {c.comentario && (
                <p className="mt-2 text-sm text-fg-muted">{c.comentario}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * El 503 del back trae su motivo redactado (`PROVEEDORES_NO_DISPONIBLES`:
 * falta la migración). Mostrarlo tal cual vale más que un «algo salió mal».
 */
function mensajeDeError(e: unknown, porDefecto: string): string {
  if (e && typeof e === 'object' && 'message' in e) {
    const m = (e as { message?: unknown }).message;
    if (typeof m === 'string' && m.trim()) return m;
  }
  return porDefecto;
}

export default function ProveedoresPage() {
  return (
    <PageGuard module="operaciones">
      <ContenidoDeProveedores />
    </PageGuard>
  );
}
