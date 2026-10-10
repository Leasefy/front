'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

import { useAuth } from '@/lib/auth/use-auth';
import { marketplaceApi, type InmobiliariaQueSigues, type TarjetaDeInmobiliaria } from '@/lib/api/marketplace.service';

/**
 * Lo de las inmobiliarias en el marketplace (09-10-2026), del lado del
 * navegador: sus tarjetas (con «% la recomienda», el sello y la portada),
 * seguirlas y la lista de las que sigues.
 *
 * Las tarjetas se guardan en memoria por id mientras la pestaña vive: la
 * conversación, la galería y la ficha piden las mismas y no tiene sentido
 * pedirlas tres veces.
 */

const tarjetas = new Map<string, TarjetaDeInmobiliaria>();
const enVuelo = new Map<string, Promise<void>>();

function pedir(ids: string[]): Promise<void> {
  const faltan = ids.filter((id) => !tarjetas.has(id) && !enVuelo.has(id));
  if (faltan.length === 0) return Promise.all(ids.map((id) => enVuelo.get(id))).then(() => undefined);
  const promesa = marketplaceApi
    .inmobiliarias({ ids: faltan })
    .then((lista) => {
      for (const t of lista) tarjetas.set(t.id, t);
    })
    .catch(() => undefined)
    .finally(() => {
      for (const id of faltan) enVuelo.delete(id);
    });
  for (const id of faltan) enVuelo.set(id, promesa);
  return Promise.all(ids.map((id) => enVuelo.get(id) ?? Promise.resolve())).then(() => undefined);
}

/** Las tarjetas de estas inmobiliarias (lo que no se pudo leer, no está). */
export function useTarjetasDeInmobiliarias(ids: (string | null | undefined)[]): Map<string, TarjetaDeInmobiliaria> {
  const clave = useMemo(() => [...new Set(ids.filter((id): id is string => Boolean(id)))].sort().join(','), [ids]);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (!clave) return;
    let vigente = true;
    pedir(clave.split(',')).then(() => vigente && setVersion((v) => v + 1));
    return () => {
      vigente = false;
    };
  }, [clave]);
  return useMemo(() => {
    const r = new Map<string, TarjetaDeInmobiliaria>();
    for (const id of clave ? clave.split(',') : []) {
      const t = tarjetas.get(id);
      if (t) r.set(id, t);
    }
    return r;
    // `version` cambia cuando llegan: vuelve a armar el mapa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, version]);
}

/** «Inmobiliarias en Leasefy»: las que tienen algo publicado. */
export function useInmobiliariasDelMarketplace(limite = 12) {
  const [lista, setLista] = useState<TarjetaDeInmobiliaria[] | null>(null);
  useEffect(() => {
    let vigente = true;
    marketplaceApi
      .inmobiliarias({ limite })
      .then((r) => {
        for (const t of r) tarjetas.set(t.id, t);
        if (vigente) setLista(r);
      })
      .catch(() => vigente && setLista([]));
    return () => {
      vigente = false;
    };
  }, [limite]);
  return lista;
}

/** Esta misma página (ruta + búsqueda): a dónde vuelve quien entra desde la ventana de la cuenta. */
export function useAqui(): string {
  const ruta = usePathname();
  const params = useSearchParams();
  return `${ruta}${params.toString() ? `?${params.toString()}` : ''}`;
}

/**
 * «Seguir» sin sesión (QA del marketplace, 10-10-2026): antes sacaba a la
 * persona a /auth. Ahora se abre la ventana de la cuenta encima y se recuerda
 * a quién quería seguir; al volver con sesión (AuthForm recarga esta página),
 * se la sigue sola. Vive en la pestaña: si no entra, no queda nada pendiente.
 */
const LLAVE_SEGUIR_AL_ENTRAR = 'leasefy:seguir-al-entrar';

function recordarSeguirAlEntrar(agencyId: string) {
  try {
    sessionStorage.setItem(LLAVE_SEGUIR_AL_ENTRAR, agencyId);
  } catch {
    /* sin almacenamiento: tocará volver a tocar «Seguir» */
  }
}

/** Si quedó pendiente seguir a ESTA inmobiliaria, lo devuelve y lo borra (lo toma uno solo). */
function tomarSeguirAlEntrar(agencyId: string): boolean {
  try {
    if (sessionStorage.getItem(LLAVE_SEGUIR_AL_ENTRAR) !== agencyId) return false;
    sessionStorage.removeItem(LLAVE_SEGUIR_AL_ENTRAR);
    return true;
  } catch {
    return false;
  }
}

const oyentes = new Set<() => void>();
let siguiendoCache: InmobiliariaQueSigues[] | null = null;

function avisarCambio() {
  for (const o of oyentes) o();
}

/** Las que sigue quien tiene sesión (sin sesión, `null`). */
export function useInmobiliariasQueSigues(): {
  lista: InmobiliariaQueSigues[] | null;
  recargar: () => void;
} {
  const { isAuthenticated } = useAuth();
  const [lista, setLista] = useState<InmobiliariaQueSigues[] | null>(siguiendoCache);
  const recargar = useCallback(() => {
    if (!isAuthenticated) return;
    marketplaceApi
      .siguiendo()
      .then((r) => {
        siguiendoCache = r;
        setLista(r);
      })
      .catch(() => setLista((x) => x ?? []));
  }, [isAuthenticated]);
  useEffect(() => {
    if (!isAuthenticated) {
      setLista(null);
      return;
    }
    recargar();
    oyentes.add(recargar);
    return () => {
      oyentes.delete(recargar);
    };
  }, [isAuthenticated, recargar]);
  return { lista: isAuthenticated ? lista : null, recargar };
}

/**
 * El botón «Seguir» (Nico: SÓLO con cuenta). Sin sesión, tocarlo abre la
 * ventana de la cuenta (`pideCuenta`) y, al volver con sesión, la sigue sola.
 */
export function useSeguir(agencyId: string, seguidoresIniciales = 0) {
  const { isAuthenticated } = useAuth();
  const [pideCuenta, setPideCuenta] = useState(false);
  const [siguiendo, setSiguiendo] = useState(false);
  const [seguidores, setSeguidores] = useState(seguidoresIniciales);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setSeguidores(seguidoresIniciales), [seguidoresIniciales]);
  useEffect(() => {
    if (!isAuthenticated) {
      setSiguiendo(false);
      return;
    }
    let vigente = true;
    // Volvió de crear la cuenta o de entrar para seguirla: se sigue sola.
    if (tomarSeguirAlEntrar(agencyId)) {
      setSiguiendo(true);
      marketplaceApi
        .seguir(agencyId)
        .then((r) => {
          if (!vigente) return;
          setSiguiendo(r.siguiendo);
          setSeguidores(r.seguidores);
          const t = tarjetas.get(agencyId);
          if (t) tarjetas.set(agencyId, { ...t, seguidores: r.seguidores });
          avisarCambio();
        })
        .catch(() => vigente && setSiguiendo(false));
      return () => {
        vigente = false;
      };
    }
    const ya = siguiendoCache?.some((s) => s.id === agencyId);
    if (ya !== undefined) setSiguiendo(ya);
    marketplaceApi
      .laSigo(agencyId)
      .then((r) => vigente && setSiguiendo(r.siguiendo))
      .catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, [agencyId, isAuthenticated]);

  const cambiar = useCallback(async (): Promise<{ siguiendo: boolean; seguidores: number } | null> => {
    if (!isAuthenticated) {
      recordarSeguirAlEntrar(agencyId);
      setPideCuenta(true);
      return null;
    }
    if (ocupado) return null;
    setOcupado(true);
    setError(null);
    const antes = siguiendo;
    setSiguiendo(!antes);
    try {
      const r = antes ? await marketplaceApi.dejarDeSeguir(agencyId) : await marketplaceApi.seguir(agencyId);
      setSiguiendo(r.siguiendo);
      setSeguidores(r.seguidores);
      const t = tarjetas.get(agencyId);
      if (t) tarjetas.set(agencyId, { ...t, seguidores: r.seguidores });
      avisarCambio();
      return r;
    } catch (e) {
      setSiguiendo(antes);
      setError(e instanceof Error ? e.message : 'No pudimos guardar. Intenta otra vez.');
      return null;
    } finally {
      setOcupado(false);
    }
  }, [agencyId, isAuthenticated, ocupado, siguiendo]);

  return { siguiendo, seguidores, cambiar, ocupado, error, conCuenta: isAuthenticated, pideCuenta, setPideCuenta };
}
