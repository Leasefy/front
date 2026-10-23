'use client';

/**
 * El proveedor con el que se va a trabajar, OPCIONAL al crear la solicitud
 * (reunión con Portofino, 22-10-2026, Juliana: «al hacer la solicitud, elegir
 * con qué proveedor vamos a trabajar»).
 *
 * Se escoge de Proveedores o, si no está, se registra aquí mismo sin salir del
 * formulario. Con él, la tarjeta dice con quién se trabaja, la cotización llega
 * ya con ese proveedor y Fixi no le pide cotización a otros.
 *
 * 🔴 Va dentro del <form> de la solicitud: el registro rápido no puede ser otro
 * <form> (anidados no existen en HTML) y un Enter en sus campos NO debe enviar
 * la solicitud. Por eso sus botones son `type="button"` y el Enter registra.
 */

import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { Info, Plus, X } from '@phosphor-icons/react';
import { Presence } from '@leasefy/cadence';

import { Button, Input } from '@/components/ui';
import { Combobox } from '@/components/ui/combobox';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { toast } from '@/components/ui/toast';
import { EN_PALABRAS } from '@/components/mantenimientos/especialidades';
import { TipoDeDocumentoDelProveedor } from './TipoDeDocumentoDelProveedor';
import {
  proveedoresDeMantenimientoApi,
  type ProveedorDeMantenimiento,
} from '@/lib/api/proveedores-de-mantenimiento.service';
import {
  EJEMPLO_DEL_TIPO_DE_DOCUMENTO,
  revisarDocumentoDelProveedor,
  type TipoDeDocumentoDelProveedor as TipoDelDocumento,
} from '@/lib/mantenimiento/documento-del-proveedor';
import {
  MAX_LARGO_NOMBRE_DEL_PROVEEDOR,
  MAX_LARGO_TELEFONO_DEL_PROVEEDOR,
} from '@/lib/mantenimiento/limites-del-mantenimiento';
import { repartirErroresDelServidor, traeErroresPorCampo } from '@/lib/errores/errores-en-el-formulario';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { ApiError } from '@/lib/api/client';
import type { MantenimientoType } from '@/lib/types/inmobiliaria';

/** La opción de la lista que abre el registro de uno nuevo. */
const NUEVO = '__nuevo__';

/** El oficio del back para el tipo de la solicitud (`plumbing` → `PLUMBING`). */
export const oficioDelBack = (tipo: string) => (tipo === 'other' ? 'OTHER_MAINT' : tipo.toUpperCase());

type CampoDelRegistro = 'nombre' | 'tipoDocumento' | 'documento' | 'telefono' | 'correo';
const CAMPOS_DEL_REGISTRO: readonly CampoDelRegistro[] = ['nombre', 'tipoDocumento', 'documento', 'telefono', 'correo'];

const VACIO = { nombre: '', tipoDocumento: '' as TipoDelDocumento | '', documento: '', telefono: '', correo: '' };

/** Las mismas reglas del registro rápido de «Agregar cotización». */
function erroresDelRegistro(c: typeof VACIO): Partial<Record<CampoDelRegistro, string>> {
  const e: Partial<Record<CampoDelRegistro, string>> = {};
  if (!c.nombre.trim()) e.nombre = 'Escribe el nombre del proveedor.';
  if (!c.tipoDocumento) {
    e.tipoDocumento = 'Elige el tipo de documento del proveedor.';
  } else {
    const r = revisarDocumentoDelProveedor(c.tipoDocumento, c.documento);
    if (!r.ok) e.documento = r.mensaje;
    if (
      !e.nombre &&
      c.tipoDocumento !== 'NIT' &&
      c.nombre.trim().split(/\s+/).filter((p) => p.length > 1).length < 2
    ) {
      e.nombre = 'Escribe el nombre completo de la persona: nombre y apellido.';
    }
  }
  if (c.telefono.trim()) {
    const digitos = c.telefono.replace(/\D/g, '').replace(/^57(?=\d{10}$)/, '');
    if (!/^(3\d{9}|60\d{8})$/.test(digitos)) {
      e.telefono = 'Escribe un celular de 10 dígitos (3001234567) o un fijo con indicativo (6041234567).';
    }
  }
  if (c.correo.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c.correo.trim())) {
    e.correo = 'Revisa el correo: debe verse como nombre@empresa.com.';
  }
  return e;
}

export function ProveedorDeLaSolicitud({
  tipo,
  valor,
  onCambiar,
  error,
}: {
  /** El tipo de la solicitud: los de ese oficio salen primero. */
  tipo: MantenimientoType | '';
  valor: string | undefined;
  onCambiar: (proveedorId: string | undefined) => void;
  /** Lo que rechazó el back para este campo. */
  error?: string;
}) {
  const [proveedores, setProveedores] = useState<ProveedorDeMantenimiento[] | null>(null);
  const [registrando, setRegistrando] = useState(false);
  const [campos, setCampos] = useState(VACIO);
  const [errores, setErrores] = useState<Partial<Record<CampoDelRegistro, string>>>({});
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let vivo = true;
    proveedoresDeMantenimientoApi
      .listar({ activos: true })
      .then((lista) => {
        if (vivo) setProveedores(Array.isArray(lista) ? lista : []);
      })
      .catch(() => {
        // Sin la lista el campo sigue siendo opcional: se puede registrar uno.
        if (vivo) setProveedores([]);
      });
    return () => {
      vivo = false;
    };
  }, []);

  const oficio = tipo ? oficioDelBack(tipo) : '';
  const opciones = useMemo(() => {
    const ordenados = [...(proveedores ?? [])].sort(
      (a, b) =>
        Number(b.especialidades.includes(oficio)) - Number(a.especialidades.includes(oficio)) ||
        a.nombre.localeCompare(b.nombre, 'es'),
    );
    return [
      ...ordenados.map((p) => ({
        value: p.id,
        label: [
          p.nombre,
          p.especialidades.map((e) => EN_PALABRAS.get(e) ?? e).join(', '),
          p.calificacion !== null ? `${p.calificacion.toFixed(1).replace('.', ',')} ★` : null,
        ]
          .filter(Boolean)
          .join(' · '),
      })),
      { value: NUEVO, label: '+ Registrar un proveedor nuevo' },
    ];
  }, [proveedores, oficio]);

  const elegido = (proveedores ?? []).find((p) => p.id === valor) ?? null;

  const poner = (campo: CampoDelRegistro, v: string) => {
    setCampos((c) => ({ ...c, [campo]: v }));
    setErrores((e) => (e[campo] ? { ...e, [campo]: undefined } : e));
  };
  const aria = (campo: CampoDelRegistro) =>
    errores[campo]
      ? { 'aria-invalid': true as const, 'aria-describedby': `proveedor-nuevo-${campo}-error` }
      : {};

  const abrirRegistro = () => {
    setCampos(VACIO);
    setErrores({});
    setRegistrando(true);
  };

  const escoger = (v: string | undefined) => {
    if (v === NUEVO) {
      abrirRegistro();
      return;
    }
    onCambiar(v);
  };

  const registrar = async () => {
    if (guardando) return;
    const nuevos = erroresDelRegistro(campos);
    setErrores(nuevos);
    const primero = CAMPOS_DEL_REGISTRO.find((c) => nuevos[c]);
    if (primero) {
      document.getElementById(`proveedor-nuevo-${primero}`)?.focus();
      return;
    }
    const revision = revisarDocumentoDelProveedor(campos.tipoDocumento as TipoDelDocumento, campos.documento);
    setGuardando(true);
    try {
      const nuevo = await proveedoresDeMantenimientoApi.crear({
        nombre: campos.nombre.trim(),
        tipoDocumento: campos.tipoDocumento as TipoDelDocumento,
        documento: revision.ok ? revision.numero : campos.documento.trim(),
        ...(campos.telefono.trim() ? { telefono: campos.telefono.trim() } : {}),
        ...(campos.correo.trim() ? { correo: campos.correo.trim().toLowerCase() } : {}),
        especialidades: oficio ? [oficio] : [],
      });
      setProveedores((l) => [...(l ?? []), nuevo]);
      onCambiar(nuevo.id);
      setRegistrando(false);
      toast.success(`${nuevo.nombre} quedó en Proveedores`, {
        description: 'Ya está elegido para esta solicitud.',
      });
    } catch (e) {
      // Ya estaba registrado con ese documento: se elige ése, no se pide otro.
      const yaEstaba =
        e instanceof ApiError && e.status === 409
          ? (proveedores ?? []).find((p) => revision.ok && p.documento === revision.numero)
          : undefined;
      if (yaEstaba) {
        onCambiar(yaEstaba.id);
        setRegistrando(false);
        toast.info(`${yaEstaba.nombre} ya estaba en Proveedores`, { description: 'Lo elegimos para esta solicitud.' });
      } else if (traeErroresPorCampo(e)) {
        const reparto = repartirErroresDelServidor<CampoDelRegistro>(e, {
          campos: CAMPOS_DEL_REGISTRO,
          accion: 'registrar el proveedor',
        });
        setErrores(reparto.porCampo);
        if (reparto.sueltos.length > 0) {
          toast.error('No se pudo registrar el proveedor', { description: reparto.sueltos.join(' · ') });
        }
      } else {
        toast.error('No se pudo registrar el proveedor', {
          description: mensajeParaLaPersona(e, { accion: 'registrar el proveedor' }),
        });
      }
    } finally {
      setGuardando(false);
    }
  };

  /** Enter dentro del registro registra; nunca envía la solicitud. */
  const alTeclear = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void registrar();
    }
  };

  if (proveedores === null) {
    return <div className="h-11 animate-pulse rounded-lg bg-surface-muted" aria-hidden="true" />;
  }

  return (
    <div className="space-y-3" data-testid="proveedor-de-la-solicitud">
      <p className="text-sm text-fg-muted">
        Si ya sabes con quién vas a trabajar. La cotización llega con él y no se le pide a otros.
      </p>

      {!registrando && proveedores.length > 0 && (
        <div className="space-y-2">
          <Combobox
            data-testid="proveedor-de-la-solicitud-lista"
            value={valor}
            onChange={escoger}
            options={opciones}
            placeholder="Escoge un proveedor registrado"
            searchPlaceholder="Buscar por nombre u oficio"
            invalid={Boolean(error)}
          />
          <ErrorDelCampo id="mantenimiento-proveedorId-error" mensaje={error} />
          {elegido && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-caption">
              <span className={elegido.avisos.length > 0 ? 'text-warning-700 dark:text-warning-100' : 'text-fg-muted'} data-testid="proveedor-elegido-avisos">
                {elegido.avisos.length > 0
                  ? elegido.avisos.join(' · ')
                  : [elegido.telefono, elegido.correo].filter(Boolean).join(' · ') || 'Sin teléfono ni correo registrados.'}
              </span>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-fg-muted hover:text-fg"
                onClick={() => onCambiar(undefined)}
                data-testid="proveedor-de-la-solicitud-quitar"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                Quitar
              </button>
            </div>
          )}
        </div>
      )}

      {!registrando && proveedores.length === 0 && (
        <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border bg-surface-muted px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2 text-sm text-fg-muted">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            Todavía no tienes proveedores registrados.
          </p>
          <Button type="button" variant="secondary" size="sm" hideArrow onClick={abrirRegistro} data-testid="proveedor-registrar-primero">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Registrar uno
          </Button>
        </div>
      )}

      <Presence show={registrando} direction="down">
        {/* Glow up 23-10: el registro rápido en arena, sin una tarjeta con borde dentro del formulario. */}
        <div className="space-y-3 rounded-xl bg-surface-muted p-4" data-testid="proveedor-nuevo">
          <div className="flex items-center justify-between gap-2">
            <p className="text-body-sm text-fg">Registrar un proveedor nuevo</p>
            <button type="button" className="text-body-sm text-primary underline-offset-4 hover:underline" onClick={() => setRegistrando(false)}>
              {proveedores.length > 0 ? 'Escoger de los registrados' : 'Cancelar'}
            </button>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="proveedor-nuevo-nombre" className="block text-sm font-medium text-fg">
              Nombre o razón social <span className="text-danger">*</span>
            </label>
            <Input
              id="proveedor-nuevo-nombre"
              aria-required="true"
              value={campos.nombre}
              maxLength={MAX_LARGO_NOMBRE_DEL_PROVEEDOR}
              placeholder="Ej.: Plomería El Rayo S.A.S."
              onChange={(e) => poner('nombre', e.target.value)}
              onKeyDown={alTeclear}
              {...aria('nombre')}
            />
            <ErrorDelCampo id="proveedor-nuevo-nombre-error" mensaje={errores.nombre} />
          </div>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)]">
            <div className="min-w-0 space-y-1.5">
              <label htmlFor="proveedor-nuevo-tipoDocumento" className="block text-sm font-medium text-fg">
                Tipo de documento <span className="text-danger">*</span>
              </label>
              <TipoDeDocumentoDelProveedor
                id="proveedor-nuevo-tipoDocumento"
                valor={campos.tipoDocumento}
                onCambiar={(t) => poner('tipoDocumento', t)}
                conError={Boolean(errores.tipoDocumento)}
                describedBy={errores.tipoDocumento ? 'proveedor-nuevo-tipoDocumento-error' : undefined}
              />
              <ErrorDelCampo id="proveedor-nuevo-tipoDocumento-error" mensaje={errores.tipoDocumento} />
            </div>
            <div className="min-w-0 space-y-1.5">
              <label htmlFor="proveedor-nuevo-documento" className="block text-sm font-medium text-fg">
                Número <span className="text-danger">*</span>
              </label>
              <Input
                id="proveedor-nuevo-documento"
                aria-required="true"
                value={campos.documento}
                inputMode={campos.tipoDocumento === 'PASSPORT' ? 'text' : 'numeric'}
                placeholder={campos.tipoDocumento ? EJEMPLO_DEL_TIPO_DE_DOCUMENTO[campos.tipoDocumento] : 'Elige primero el tipo'}
                onChange={(e) => poner('documento', e.target.value)}
                onKeyDown={alTeclear}
                {...aria('documento')}
              />
              <ErrorDelCampo id="proveedor-nuevo-documento-error" mensaje={errores.documento} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="min-w-0 space-y-1.5">
              <label htmlFor="proveedor-nuevo-telefono" className="block text-sm font-medium text-fg">
                Celular <span className="font-normal text-fg-muted">(opcional)</span>
              </label>
              <Input
                id="proveedor-nuevo-telefono"
                value={campos.telefono}
                inputMode="tel"
                maxLength={MAX_LARGO_TELEFONO_DEL_PROVEEDOR}
                placeholder="3001234567"
                onChange={(e) => poner('telefono', e.target.value)}
                onKeyDown={alTeclear}
                {...aria('telefono')}
              />
              <ErrorDelCampo id="proveedor-nuevo-telefono-error" mensaje={errores.telefono} />
            </div>
            <div className="min-w-0 space-y-1.5">
              <label htmlFor="proveedor-nuevo-correo" className="block text-sm font-medium text-fg">
                Correo <span className="font-normal text-fg-muted">(opcional)</span>
              </label>
              <Input
                id="proveedor-nuevo-correo"
                type="email"
                value={campos.correo}
                placeholder="contacto@proveedor.com"
                onChange={(e) => poner('correo', e.target.value)}
                onKeyDown={alTeclear}
                {...aria('correo')}
              />
              <ErrorDelCampo id="proveedor-nuevo-correo-error" mensaje={errores.correo} />
            </div>
          </div>
          <p className="text-caption text-fg-muted">
            Queda en Proveedores con el oficio de esta solicitud. El RUT y la seguridad social los subes allá.
          </p>
          <div className="flex justify-end">
            {/* En tinta: el azul del cajón es el de crear la solicitud. */}
            <Button type="button" variant="ink" hideArrow isLoading={guardando} onClick={() => void registrar()} data-testid="proveedor-nuevo-registrar">
              Registrar y elegir
            </Button>
          </div>
        </div>
      </Presence>
    </div>
  );
}
