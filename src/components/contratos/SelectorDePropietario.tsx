"use client";

/**
 * Elegir un propietario que YA existe, buscándolo.
 *
 * Nace de un pedido concreto: en la revisión de contratos migrados, el
 * propietario venía como un campo de texto libre. Escribir un nombre encima de
 * uno equivocado no corrige nada — crea una TERCERA ficha, y la plata se parte
 * entre las tres. Elegir de una lista es la única forma de que corregir
 * signifique corregir.
 *
 * Es un combobox y no un `<select>` nativo a propósito: una inmobiliaria real
 * tiene cientos de propietarios y ninguna lista de 600 opciones se recorre con
 * la rueda. Se busca contra el back (nombre o documento), que es la misma
 * llave con la que la migración enlaza.
 *
 * ── Dos cosas que hace a propósito ──────────────────────────────────────────
 *
 * 1. **Un fallo de la búsqueda se dice.** Una lista vacía porque la petición
 *    falló se lee exactamente igual que «no existe ese propietario», y quien
 *    lo lea así va a crear el duplicado que este componente evita.
 * 2. **No cierra al perder el foco por un click adentro.** El cierre va por
 *    `pointerdown` fuera del contenedor: `onBlur` dispara antes del `click` de
 *    la opción y la selección se pierde — el clásico «no me deja elegir nada».
 */

import { useEffect, useRef, useState } from "react";
import { CaretDown, MagnifyingGlass } from "@phosphor-icons/react";

import { Input } from "@/components/ui/input";
import { propietariosApi } from "@/lib/api/inmobiliaria.service";
import type { Propietario } from "@/lib/types/inmobiliaria";

/** Cuántos resultados se piden. Más no caben en pantalla sin scroll propio. */
const MAXIMO = 8;

export interface SelectorDePropietarioProps {
  /** El que está puesto hoy, para mostrarlo cuando el buscador está cerrado. */
  actual?: { nombre: string; documento: string } | null;
  onElegir: (p: Propietario) => void;
  disabled?: boolean;
  /** Para distinguirlo en una tabla con 25 de estos. */
  testId?: string;
}

export function SelectorDePropietario({
  actual,
  onElegir,
  disabled,
  testId = "selector-propietario",
}: SelectorDePropietarioProps) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [opciones, setOpciones] = useState<Propietario[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [fallo, setFallo] = useState(false);
  const caja = useRef<HTMLDivElement>(null);

  // Cerrar al clickear afuera. `pointerdown` y no `blur`: ver el encabezado.
  useEffect(() => {
    if (!abierto) return;
    const afuera = (e: PointerEvent) => {
      if (!caja.current?.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener("pointerdown", afuera);
    return () => document.removeEventListener("pointerdown", afuera);
  }, [abierto]);

  useEffect(() => {
    if (!abierto) return;
    const q = busqueda.trim();
    if (q.length < 2) {
      setOpciones([]);
      setFallo(false);
      return;
    }
    let vigente = true;
    setBuscando(true);
    const t = setTimeout(() => {
      propietariosApi
        .getAll({ search: q, limit: MAXIMO })
        .then((r) => {
          if (!vigente) return;
          setOpciones(r);
          setFallo(false);
        })
        .catch(() => {
          if (!vigente) return;
          setOpciones([]);
          setFallo(true);
        })
        .finally(() => {
          if (vigente) setBuscando(false);
        });
    }, 250);
    return () => {
      vigente = false;
      clearTimeout(t);
    };
  }, [busqueda, abierto]);

  if (!abierto) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setAbierto(true);
          setBusqueda("");
        }}
        data-testid={testId}
        className="flex w-full items-center justify-between gap-2 rounded-md border border-border px-2.5 py-1.5 text-left text-sm transition-colors hover:border-border-strong disabled:cursor-not-allowed disabled:opacity-50"
      >
        {actual ? (
          <span className="min-w-0">
            <span className="block truncate text-foreground">
              {actual.nombre}
            </span>
            <span className="block truncate font-mono text-[11px] text-fg-subtle">
              {actual.documento}
            </span>
          </span>
        ) : (
          <span className="text-muted-foreground">Elegir propietario…</span>
        )}
        <CaretDown className="h-3.5 w-3.5 shrink-0 text-fg-subtle" />
      </button>
    );
  }

  return (
    <div ref={caja} className="relative">
      <div className="relative">
        <MagnifyingGlass className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
        <Input
          autoFocus
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setAbierto(false);
          }}
          placeholder="Nombre o documento…"
          className="pl-8"
          data-testid={`${testId}-buscar`}
        />
      </div>

      <div
        className="absolute z-20 mt-1 w-full min-w-[220px] overflow-hidden rounded-md border border-border bg-surface shadow-md"
        data-testid={`${testId}-opciones`}
      >
        {busqueda.trim().length < 2 ? (
          <p className="px-3 py-2 text-xs text-muted-foreground">
            Escribí al menos dos letras del nombre, o el documento.
          </p>
        ) : buscando ? (
          <p className="px-3 py-2 text-xs text-muted-foreground">Buscando…</p>
        ) : fallo ? (
          /*
           * Un fallo NO puede parecer «no existe»: quien lo lea así va a
           * crear la ficha duplicada que este selector existe para evitar.
           */
          <p
            className="px-3 py-2 text-xs text-warning"
            data-testid={`${testId}-fallo`}
          >
            No pudimos buscar. Probá de nuevo en un momento — el propietario
            que ya está no se perdió.
          </p>
        ) : opciones.length === 0 ? (
          <p className="px-3 py-2 text-xs text-muted-foreground">
            Ninguno coincide. Si es un propietario nuevo, cargalo en el paso de
            Propietarios.
          </p>
        ) : (
          <ul>
            {opciones.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => {
                    onElegir(p);
                    setAbierto(false);
                  }}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-surface-muted"
                >
                  <span className="truncate">{p.name}</span>
                  <span className="shrink-0 font-mono text-xs text-fg-subtle">
                    {p.documentNumber}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
