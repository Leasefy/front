"use client";

/**
 * Elegir A MANO el inmueble de una fila de migración.
 *
 * ── Por qué hace falta ──────────────────────────────────────────────────────
 *
 * El contrato se pega al inmueble por dos caminos automáticos: el «Código» que
 * el archivo trae, y la dirección EXACTA. Los dos fallan a la vez en un caso
 * muy común: la inmobiliaria todavía no cargó ese inmueble.
 *
 * Medido sobre el archivo real de Nico el 2026-09-10 (`Contracts Payment CSV
 * (2).csv`, 1.851 contratos, contra la base de la agencia f1849975):
 *
 *   - 639 se pegaron por código.
 *   - 1.212 quedaron sin inmueble, y **1.211 de ellos apuntan a un código que
 *     SÍ está en `Propiedades.csv`** — el inmueble existe en su sistema, pero
 *     nunca entró a Leasefy: de 2.895 inmuebles del archivo sólo se cargaron
 *     1.512, los de código 1370 en adelante.
 *   - La dirección no rescata ninguno, y no por el parser: esas direcciones no
 *     están en la base porque el inmueble no está. (Archivo contra archivo, la
 *     dirección exacta resuelve 1.844 de 1.850 y las 1.844 apuntan al código
 *     correcto — cero falsos positivos.)
 *
 * Los «parecidos» que el resolutor ofrece son cinco como mucho, elegidos por
 * los números de la dirección. Cuando ninguno sirve no había salida: o crear
 * el inmueble otra vez —duplicándolo— o dejar la fila tirada. Esto abre el
 * portafolio entero.
 *
 * ── Dos decisiones, las mismas que en `SelectorDePropietario` ───────────────
 *
 * 1. **La lista se carga UNA vez para toda la pantalla.** Una página muestra
 *    hasta veinticinco filas y cada una necesita su desplegable: con búsqueda
 *    por servidor, veinticinco desplegables dispararían una petición por
 *    tecla. El filtro del `Combobox` es local, y por eso es instantáneo.
 * 2. **El código y el título van DENTRO de la etiqueta.** El filtro mira
 *    `label`, así que pegarlos ahí es lo que hace que se pueda buscar por
 *    «2945», por «Sabaneta» o por la dirección — que son las tres formas en
 *    que alguien reconoce su propio inmueble.
 */

import { useEffect, useMemo, useState } from "react";

import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import {
  contractsApi,
  type InmuebleCandidato,
} from "@/lib/api/contracts.service";

export interface SelectorDeInmuebleProps {
  /** Todos los de la agencia, cargados una vez por la pantalla. */
  inmuebles: readonly InmuebleCandidato[];
  onElegir: (inmueble: InmuebleCandidato) => void;
  disabled?: boolean;
  /** Para distinguirlo en una lista con veinticinco de estos. */
  testId?: string;
}

/** Código, dirección y título juntos: es lo que hace buscable cada uno. */
export function etiquetaDeInmueble(i: InmuebleCandidato): string {
  return [
    i.externalId ? `#${i.externalId}` : i.code != null ? `#${i.code}` : null,
    i.address,
    i.title || null,
    i.city || null,
    // Un inmueble con otro contrato vivo casi nunca es el que se busca. Se
    // ofrece igual —un contrato migrado a veces ES ese contrato vivo— pero
    // dicho, para que nadie lo elija sin verlo.
    i.ocupado ? "ocupado" : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function SelectorDeInmueble({
  inmuebles,
  onElegir,
  disabled,
  testId = "selector-inmueble",
}: SelectorDeInmuebleProps) {
  const opciones = useMemo<ComboboxOption[]>(
    () =>
      inmuebles.map((i) => ({
        value: i.id,
        label: etiquetaDeInmueble(i),
      })),
    [inmuebles],
  );

  return (
    <div data-testid={testId}>
      <Combobox
        /*
         * Sin `value`: esto no muestra un estado, dispara una acción. En
         * cuanto se elige, la fila se resuelve en el servidor y el bloque
         * entero desaparece — dejar el control «seleccionado» mostraría algo
         * que ya no existe.
         */
        onChange={(id) => {
          if (!id) return;
          const elegido = inmuebles.find((i) => i.id === id);
          if (elegido) onElegir(elegido);
        }}
        options={opciones}
        placeholder="Buscar en mis inmuebles…"
        searchPlaceholder="Código, dirección o título…"
        disabled={disabled || opciones.length === 0}
      />
    </div>
  );
}

// ── La carga compartida ─────────────────────────────────────────────────────

/**
 * El portafolio, pedido UNA vez y compartido por todas las filas de la
 * pantalla.
 *
 * Sin esto, veinticinco filas montadas a la vez dispararían veinticinco
 * peticiones idénticas. El módulo guarda la promesa EN VUELO, no sólo el
 * resultado: si las veinticinco montan en el mismo tick, las veinticinco se
 * cuelgan de la primera petición.
 */
let enVuelo: Promise<InmuebleCandidato[]> | null = null;

/** Lo que pide el front. Por encima de esto la lista viene recortada. */
const TOPE = 3000;

function cargarPortafolio(): Promise<InmuebleCandidato[]> {
  if (!enVuelo) {
    /*
     * El `try` no es decorativo: si la llamada revienta de forma SÍNCRONA
     * —el cliente sin configurar, o un doble que no trae este método— el
     * error saldría del `useEffect` y tumbaría la fila entera en vez de
     * quedar como el aviso que el hook ya sabe mostrar.
     */
    try {
      enVuelo = contractsApi.migracion.buscarInmuebles("", TOPE);
    } catch (e) {
      return Promise.reject(e instanceof Error ? e : new Error(String(e)));
    }
    enVuelo = enVuelo.catch((e) => {
      // Un fallo no se cachea: la siguiente fila que monte vuelve a intentar.
      enVuelo = null;
      throw e;
    });
  }
  return enVuelo;
}

/**
 * Olvidar lo cargado. Se llama después de CREAR un inmueble desde una fila:
 * si no, el inmueble recién creado no aparecería en el desplegable de las
 * otras filas y alguien lo crearía por segunda vez.
 */
export function olvidarPortafolio(): void {
  enVuelo = null;
}

export interface PortafolioDeLaAgencia {
  inmuebles: InmuebleCandidato[];
  cargando: boolean;
  /** `true` si el back devolvió justo el tope: la lista puede estar recortada. */
  recortado: boolean;
  error: string | null;
}

export function usePortafolioDeLaAgencia(
  activo: boolean,
): PortafolioDeLaAgencia {
  const [inmuebles, setInmuebles] = useState<InmuebleCandidato[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activo) return;
    let vigente = true;
    setCargando(true);
    cargarPortafolio()
      .then((lista) => {
        if (!vigente) return;
        setInmuebles(lista);
        setError(null);
      })
      .catch((e: unknown) => {
        if (!vigente) return;
        /*
         * Un fallo NO puede parecer «no tienes inmuebles»: con esa lectura la
         * persona crearía uno que ya existe. Se dice que falló, y los
         * parecidos y el botón de crear siguen ahí.
         */
        setError(
          e instanceof Error ? e.message : "No pudimos traer tus inmuebles.",
        );
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [activo]);

  return {
    inmuebles,
    cargando,
    recortado: inmuebles.length >= TOPE,
    error,
  };
}
