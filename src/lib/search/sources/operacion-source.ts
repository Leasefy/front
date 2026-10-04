'use client';

/**
 * 🔴 BU-07 (QA del 04-10-2026): el buscador del panel no encontraba PQRS
 * («PQRS-0004», «ruido»), mantenimientos («fuga», «humedad»), proveedores
 * («Plomería»/«Plomeria») ni facturas («LABQA-9», «LABQA 9»): no había fuente
 * para ninguna. Las cuatro salen de UNA ruta del back,
 * `GET /inmobiliaria/busqueda?q=`, que busca en la base y aplica la puerta de
 * cada pantalla según el rol (lo que no le toca a quien busca ni se consulta).
 *
 * Son cuatro fuentes —una por grupo de la paleta— que comparten la misma
 * respuesta: una sola petición por lo escrito, no cuatro.
 */

import type { SearchResult, SearchSource } from '@/lib/hooks/useFederatedSearch';
import { getAccessToken } from '@/lib/api/client';
import { Lifebuoy, Wrench, HardHat, Receipt } from '@phosphor-icons/react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? '';

type TipoDelBuscador = 'pqrs' | 'mantenimiento' | 'proveedor' | 'factura';

interface ResultadoDelBuscador {
  tipo: TipoDelBuscador;
  id: string;
  titulo: string;
  detalle: string;
  href: string;
}

interface RespuestaDelBuscador {
  resultados: ResultadoDelBuscador[];
}

/** Lo que ya se pidió por cada texto, por unos segundos (las cuatro fuentes corren a la vez). */
const enVuelo = new Map<string, { cuando: number; promesa: Promise<ResultadoDelBuscador[]> }>();
const VIGENCIA_MS = 5_000;

async function pedir(q: string): Promise<ResultadoDelBuscador[]> {
  const token = getAccessToken();
  const res = await globalThis.fetch(`${BACKEND_URL}/inmobiliaria/busqueda?q=${encodeURIComponent(q)}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  // Un back anterior sin la ruta: estas fuentes no tienen nada que decir.
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`${res.status}`);
  const cuerpo = (await res.json()) as RespuestaDelBuscador;
  return Array.isArray(cuerpo?.resultados) ? cuerpo.resultados : [];
}

export function buscarEnElPanel(q: string): Promise<ResultadoDelBuscador[]> {
  const clave = q.trim().toLowerCase();
  const ahora = Date.now();
  const previo = enVuelo.get(clave);
  if (previo && ahora - previo.cuando < VIGENCIA_MS) return previo.promesa;
  const promesa = pedir(q.trim());
  enVuelo.set(clave, { cuando: ahora, promesa });
  // Un fallo no se queda guardado: la próxima tecla vuelve a preguntar.
  promesa.catch(() => enVuelo.delete(clave));
  return promesa;
}

/** Sólo para las pruebas. */
export function olvidarLasBusquedasDelPanel(): void {
  enVuelo.clear();
}

function fuente(
  id: string,
  tipo: TipoDelBuscador,
  icon: SearchSource['icon'],
  permission: { module: string; action: string },
): SearchSource {
  return {
    id,
    labelKey: `inmobiliaria.commandPalette.sources.${id}`,
    icon,
    permission,
    async run(query, _ctx, signal) {
      if (!BACKEND_URL || query.trim().length < 2) return [];
      const todos = await buscarEnElPanel(query);
      if (signal.aborted) return [];
      return todos
        .filter((r) => r.tipo === tipo)
        .map(
          (r): SearchResult => ({
            id: `${id}:${r.id}`,
            sourceId: id,
            type: tipo,
            title: r.titulo,
            subtitle: r.detalle,
            href: r.href,
            preview: { type: tipo, id: r.id },
          }),
        );
    },
  };
}

export const pqrsSource = fuente('pqrs', 'pqrs', Lifebuoy, { module: 'operaciones', action: 'view' });
export const mantenimientosSource = fuente('mantenimientos', 'mantenimiento', Wrench, { module: 'operaciones', action: 'view' });
export const proveedoresSource = fuente('proveedores', 'proveedor', HardHat, { module: 'operaciones', action: 'view' });
export const facturasSource = fuente('facturas', 'factura', Receipt, { module: 'cobros', action: 'view' });
