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
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Wrench,
  Plus,
  Star,
  WarningCircle,
  ArrowCounterClockwise,
  X,
} from '@phosphor-icons/react';

import { PageGuard } from '@/components/auth/PageGuard';
import { BackButton } from '@/components/ui/back-button';
import { Button, Badge, Input } from '@/components/ui';
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { EsqueletoTabla } from '@/components/estado/EsqueletoTabla';
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

/** Las especialidades, en palabras. Los valores son los del enum del back. */
const ESPECIALIDADES: Array<{ valor: string; label: string }> = [
  { valor: 'PLUMBING', label: 'Plomería' },
  { valor: 'ELECTRICAL', label: 'Electricidad' },
  { valor: 'APPLIANCE', label: 'Electrodomésticos' },
  { valor: 'STRUCTURAL', label: 'Estructural' },
  { valor: 'PAINTING', label: 'Pintura' },
  { valor: 'LOCKS', label: 'Cerrajería' },
  { valor: 'OTHER_MAINT', label: 'Otros' },
];

const EN_PALABRAS = new Map(ESPECIALIDADES.map((e) => [e.valor, e.label]));

function ContenidoDeProveedores() {
  const { canAccess } = usePermissions();
  const puedeEditar = canAccess('operaciones', 'edit');

  const [proveedores, setProveedores] = useState<ProveedorDeMantenimiento[] | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [busqueda, setBusqueda] = useState('');
  const [verInactivos, setVerInactivos] = useState(false);
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

  const visibles = useMemo(() => {
    const lista = proveedores ?? [];
    const q = busqueda.trim().toLowerCase();
    return lista
      .filter((p) => (verInactivos ? true : p.activo))
      .filter(
        (p) =>
          !q ||
          p.nombre.toLowerCase().includes(q) ||
          p.documento.toLowerCase().includes(q),
      );
  }, [proveedores, busqueda, verInactivos]);

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
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <BackButton label="Volver a Mantenimientos" />
        </div>

        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="flex items-center gap-2 text-h2 text-fg">
              <Wrench className="h-6 w-6 text-primary" weight="duotone" />
              Proveedores
            </h1>
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

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o documento"
            className="max-w-xs"
            aria-label="Buscar proveedor"
          />
          <label className="flex items-center gap-2 text-sm text-fg-muted">
            <input
              type="checkbox"
              checked={verInactivos}
              onChange={(e) => setVerInactivos(e.target.checked)}
            />
            Ver también los inactivos
          </label>
        </div>

        <EstadoDeDatos
          cargando={cargando}
          error={error}
          vacio={!cargando && !error && visibles.length === 0}
          queEs="los proveedores"
          onReintentar={() => void cargar()}
          esqueleto={<EsqueletoTabla columnas={3} filas={5} />}
          cuandoVacio={
            <div className="rounded-lg border border-dashed border-border p-8 text-center">
              <p className="text-sm text-fg">
                {busqueda.trim()
                  ? 'Ningún proveedor coincide con esa búsqueda.'
                  : 'Todavía no hay proveedores registrados.'}
              </p>
              <p className="mt-1 text-xs text-fg-muted">
                Registrar a quién llamas te deja exigirle el RUT y la seguridad
                social antes de mandarlo a un inmueble.
              </p>
            </div>
          }
        >
          <ul className="space-y-3">
            {visibles.map((p) => (
              <FilaDeProveedor
                key={p.id}
                proveedor={p}
                puedeEditar={puedeEditar}
                onEditar={() => setEditando(p)}
                onDesactivar={() => void desactivar(p)}
                onReactivar={() => void reactivar(p)}
                onVerHistorial={() => setHistorialDe(p)}
              />
            ))}
          </ul>
        </EstadoDeDatos>
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

// ── Una fila ────────────────────────────────────────────────────────────────

function FilaDeProveedor({
  proveedor: p,
  puedeEditar,
  onEditar,
  onDesactivar,
  onReactivar,
  onVerHistorial,
}: {
  proveedor: ProveedorDeMantenimiento;
  puedeEditar: boolean;
  onEditar: () => void;
  onDesactivar: () => void;
  onReactivar: () => void;
  onVerHistorial: () => void;
}) {
  return (
    <li
      data-testid="proveedor"
      className={cn(
        'rounded-lg border bg-card p-4',
        p.activo ? 'border-border' : 'border-dashed border-border opacity-70',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-fg">{p.nombre}</p>
            {!p.activo && <Badge variant="secondary">Inactivo</Badge>}
            <Estrellas
              calificacion={p.calificacion}
              trabajos={p.trabajosCalificados}
            />
          </div>
          <p className="mt-0.5 text-xs text-fg-muted tabular-nums">
            {p.documento}
            {p.telefono ? ` · ${p.telefono}` : ''}
            {p.correo ? ` · ${p.correo}` : ''}
          </p>
          {p.especialidades.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {p.especialidades.map((e) => (
                <Badge key={e} variant="secondary">
                  {EN_PALABRAS.get(e) ?? e}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="flex shrink-0 gap-2">
          {p.trabajosCalificados > 0 && (
            <Button variant="ghost" hideArrow onClick={onVerHistorial}>
              Historial
            </Button>
          )}
          {puedeEditar && (
            <>
              <Button variant="secondary" hideArrow onClick={onEditar}>
                Editar
              </Button>
              {p.activo ? (
                <Button variant="ghost" hideArrow onClick={onDesactivar}>
                  Desactivar
                </Button>
              ) : (
                <Button variant="ghost" hideArrow onClick={onReactivar}>
                  <ArrowCounterClockwise className="mr-1 h-4 w-4" />
                  Reactivar
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/*
        🔴 Los avisos vienen del back ya redactados. No se reordenan ni se
        resumen: cada uno dice qué falta y por qué importa.
      */}
      {p.avisos.length > 0 && (
        <ul className="mt-3 space-y-1" data-testid="avisos-del-proveedor">
          {p.avisos.map((a) => (
            <li
              key={a}
              className="flex items-start gap-1.5 text-xs text-warning"
            >
              <WarningCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{a}</span>
            </li>
          ))}
        </ul>
      )}

      {p.reaperturasPorGarantia > 0 && (
        <p className="mt-2 text-xs text-fg-muted">
          {p.reaperturasPorGarantia === 1
            ? 'Un trabajo suyo hubo que rehacerlo dentro de la garantía.'
            : `${p.reaperturasPorGarantia} trabajos suyos hubo que rehacerlos dentro de la garantía.`}
        </p>
      )}
    </li>
  );
}

function Estrellas({
  calificacion,
  trabajos,
}: {
  calificacion: number | null;
  trabajos: number;
}) {
  if (calificacion === null) {
    return <span className="text-xs text-fg-muted">Sin calificar todavía</span>;
  }
  return (
    <span className="flex items-center gap-1 text-xs text-fg-muted">
      <Star className="h-3.5 w-3.5 text-warning" weight="fill" />
      <span className="tabular-nums font-medium text-fg">
        {calificacion.toFixed(1)}
      </span>
      <span>
        ({trabajos} {trabajos === 1 ? 'trabajo' : 'trabajos'})
      </span>
    </span>
  );
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
            <Input
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              maxLength={200}
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
              />
            </Campo>
            <Campo label="Correo">
              <Input
                type="email"
                value={form.correo ?? ''}
                onChange={(e) => setForm({ ...form, correo: e.target.value })}
                maxLength={200}
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

          <div className="flex gap-2 pt-2">
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
