'use client';

/**
 * El buscador de proveedores de la solicitud (Portofino, 29-10-2026): donde se
 * elige con quién se trabaja o a quién se le pide la cotización, se BUSCA entre
 * los que la inmobiliaria ya tiene en Operación → Proveedores, por nombre,
 * oficio o documento. Al final, «Registrar un proveedor nuevo».
 *
 * Reemplaza al `Combobox` que había: ése sólo buscaba en el texto de la opción
 * (sin el documento y con tildes). Se ve como el buscador del inmueble del
 * mismo formulario: el campo a la vista y la lista debajo.
 *
 * 🔴 Va dentro del <form> de la solicitud: todos sus botones son `type="button"`
 * y Enter en el campo no envía nada.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { MagnifyingGlass, Plus, Star } from '@phosphor-icons/react';
import { Presence } from '@leasefy/cadence';

import { Button, Input } from '@/components/ui';
import { useTr } from '@/lib/i18n/use-tr';
import type { ProveedorDeMantenimiento } from '@/lib/api/proveedores-de-mantenimiento.service';
import { buscarElProveedor, oficiosEnPalabras } from '@/lib/mantenimiento/buscar-el-proveedor';

export interface BuscadorDeProveedorProps {
  /** Para la etiqueta (`htmlFor`) y las pruebas. */
  id: string;
  proveedores: readonly ProveedorDeMantenimiento[];
  /** El oficio de la solicitud en el formato del back (`PLUMBING`): esos salen primero. */
  oficio?: string;
  valor: string | undefined;
  onCambiar: (proveedorId: string | undefined) => void;
  /** Abre el registro rápido de uno nuevo. */
  onRegistrarNuevo: () => void;
  invalid?: boolean;
  describedBy?: string;
}

/** «4,5 ★» — la calificación como la escribe la casa. */
const estrellas = (c: number) => c.toFixed(1).replace('.', ',');

export function BuscadorDeProveedor({
  id,
  proveedores,
  oficio = '',
  valor,
  onCambiar,
  onRegistrarNuevo,
  invalid,
  describedBy,
}: BuscadorDeProveedorProps) {
  const tr = useTr();
  const [consulta, setConsulta] = useState('');
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLInputElement>(null);

  // El clic de afuera y Escape cierran (el patrón del buscador del inmueble: sin manto encima del campo).
  useEffect(() => {
    if (!abierto) return;
    const alClicAfuera = (e: MouseEvent) => {
      if (contenedor.current && !contenedor.current.contains(e.target as Node)) setAbierto(false);
    };
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAbierto(false);
    };
    document.addEventListener('mousedown', alClicAfuera);
    document.addEventListener('keydown', alTeclear);
    return () => {
      document.removeEventListener('mousedown', alClicAfuera);
      document.removeEventListener('keydown', alTeclear);
    };
  }, [abierto]);

  const encontrados = useMemo(() => buscarElProveedor(proveedores, consulta, oficio), [proveedores, consulta, oficio]);
  const elegido = proveedores.find((p) => p.id === valor) ?? null;

  if (elegido) {
    return (
      <div
        className="flex items-start justify-between gap-3 rounded-lg border border-primary/30 bg-primary-soft p-3"
        data-testid={`${id}-elegido`}
      >
        <div className="min-w-0">
          <p className="text-sm font-medium text-fg">{elegido.nombre}</p>
          <DatosDelProveedor proveedor={elegido} />
        </div>
        <Button
          type="button"
          variant="link"
          size="sm"
          hideArrow
          className="h-auto shrink-0 p-0 text-sm"
          onClick={() => {
            onCambiar(undefined);
            setAbierto(true);
            setTimeout(() => campo.current?.focus(), 0);
          }}
        >
          {tr('Cambiar')}
        </Button>
      </div>
    );
  }

  return (
    <div className="relative" ref={contenedor}>
      <div className="relative">
        <MagnifyingGlass className="absolute left-3 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
        <Input
          ref={campo}
          id={id}
          data-testid={id}
          type="text"
          autoComplete="off"
          value={consulta}
          placeholder={tr('Nombre, oficio o documento')}
          onChange={(e) => {
            setConsulta(e.target.value);
            setAbierto(true);
          }}
          onFocus={() => setAbierto(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.preventDefault();
          }}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className="w-full pl-10"
        />
      </div>

      <Presence
        show={abierto}
        direction="down"
        distance="xs"
        className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-lg border border-border bg-surface shadow-flotante dark:border-border-strong dark:bg-bg"
      >
        {encontrados.length > 0 ? (
          encontrados.map((p) => (
            // allowlist: fila de resultado (nombre + 2.ª línea) como UN solo blanco de clic, como la del inmueble.
            <button
              key={p.id}
              type="button"
              onClick={() => {
                onCambiar(p.id);
                setConsulta('');
                setAbierto(false);
              }}
              className="w-full border-b border-border-faint p-3 text-left transition-colors last:border-b-0 hover:bg-surface-muted dark:border-border-strong dark:hover:bg-ink"
              data-testid={`${id}-opcion`}
            >
              <p className="truncate text-sm font-medium text-fg">{p.nombre}</p>
              <DatosDelProveedor proveedor={p} />
            </button>
          ))
        ) : (
          <p className="p-4 text-sm text-fg-muted" data-testid={`${id}-sin-resultados`}>
            {tr('No encontramos ese proveedor entre los tuyos. Prueba con su nombre, su oficio o su documento, o regístralo.')}
          </p>
        )}
        <div className="sticky bottom-0 border-t border-border-faint bg-surface p-2 dark:border-border-strong dark:bg-bg">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            hideArrow
            className="w-full justify-start"
            onClick={() => {
              setAbierto(false);
              onRegistrarNuevo();
            }}
            data-testid={`${id}-registrar`}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {tr('Registrar un proveedor nuevo')}
          </Button>
        </div>
      </Presence>
    </div>
  );
}

/** Oficio · documento · calificación, y el aviso del back si lo hay. */
function DatosDelProveedor({ proveedor }: { proveedor: ProveedorDeMantenimiento }) {
  const oficios = oficiosEnPalabras(proveedor).join(', ');
  return (
    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-caption text-fg-muted">
      {oficios && <span>{oficios}</span>}
      <span className="font-mono">{proveedor.documento}</span>
      {proveedor.calificacion !== null && (
        <span className="inline-flex items-center gap-1 font-mono">
          <Star className="h-3.5 w-3.5" weight="fill" aria-hidden="true" />
          {estrellas(proveedor.calificacion)}
        </span>
      )}
      {proveedor.avisos.length > 0 && (
        <span className="text-warning">{proveedor.avisos[0]}</span>
      )}
    </p>
  );
}
