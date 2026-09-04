'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { toast } from 'sonner';
import type { Property } from '@/lib/types/property';
import { wishlistsApi } from '@/lib/api/wishlists.service';
import { useAuth } from '@/lib/auth';
import { useOptionalI18n } from '@/lib/i18n';

const STORAGE_KEY = 'arriendo-facil-wishlist';

interface WishlistContextTextT {
  /** Array of wishlisted property IDs */
  wishlist: string[];
  /** Check if a property is wishlisted */
  isWishlisted: (propertyId: string) => boolean;
  /** Toggle wishlist status for a property */
  toggleWishlist: (propertyId: string) => void;
  /** Add a property to wishlist */
  addToWishlist: (propertyId: string) => void;
  /** Remove a property from wishlist */
  removeFromWishlist: (propertyId: string) => void;
  /** Get all wishlisted properties from provided array */
  getWishlistedProperties: (properties: Property[]) => Property[];
  /** Count of wishlisted properties */
  count: number;
}

const WishlistContext = createContext<WishlistContextTextT | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Espejo de `wishlist` para leer el estado de HOY sin depender del render que
  // creó el callback (y sin meter efectos dentro de un updater — ver
  // `toggleWishlist`). Se actualiza en el mismo tick que el estado.
  const wishlistActual = useRef<string[]>([]);
  wishlistActual.current = wishlist;

  // WishlistProvider vive en el root layout, por encima de cualquier I18nProvider
  // de route-group, así que la variante non-throwing es obligatoria acá.
  const i18n = useOptionalI18n();

  // Wishlists son sólo para TENANT — los landlord/agency no las cargan.
  const isTenant = isAuthenticated && user?.role === 'tenant';

  // Mensaje de error de favoritos: usa i18n cuando hay provider, con fallback ES.
  const wishlistErrorMessage = useCallback(
    () =>
      i18n?.t('wishlist.errors.saveFailed') ??
      'No se pudo actualizar tus favoritos. Intenta de nuevo.',
    [i18n],
  );

  /*
   * El corazón AVISA, y no miente sobre dónde quedó guardado.
   *
   * Nico (2026-09-04): «¿ese corazón de favorito sí se le ve reflejado en el
   * panel de inquilinos cuando le dan clic? […] porque toast ninguno de los dos
   * da». Los dos hechos:
   *   · Antes sólo salía un toast cuando FALLABA. Al usuario no le llegaba
   *     ninguna señal de que se había guardado.
   *   · Sin ser inquilino autenticado el favorito vive SÓLO en el localStorage
   *     de ese navegador y NUNCA aparece en `/inquilino/guardados`. Decir
   *     «guardado» a secas ahí es prometer algo que no va a pasar.
   *
   * Va acá y no en cada corazón (`PropertyCard`, `PropertyDetailSheet`,
   * `StickyCTA`, …) para que la señal sea la misma en toda la app.
   */
  const avisarGuardado = useCallback(() => {
    if (isTenant) {
      toast.success(i18n?.t('wishlist.toast.guardado') ?? 'Lo guardamos en tus favoritos');
      return;
    }
    toast.success(
      i18n?.t('wishlist.toast.guardadoLocal') ?? 'Lo guardamos en este navegador',
      {
        description:
          i18n?.t('wishlist.toast.guardadoLocalDetalle') ??
          'Iniciá sesión como inquilino para tenerlo en tus guardados.',
      },
    );
  }, [i18n, isTenant]);

  const avisarQuitado = useCallback(() => {
    toast(i18n?.t('wishlist.toast.quitado') ?? 'Lo quitamos de tus favoritos');
  }, [i18n]);

  // Cargar wishlist: API si es tenant autenticado, fallback a localStorage.
  // CRÍTICO: NO llamar a supabase.auth.getSession() acá — choca con el AuthProvider
  // por el navigator.locks de Supabase y produce AbortError que cuelga el cliente.
  useEffect(() => {
    if (authLoading) return;

    let cancelled = false;
    async function loadWishlist() {
      if (isTenant) {
        try {
          const ids = await wishlistsApi.getMine();
          if (cancelled) return;
          setWishlist(ids);
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
          } catch { /* ignore */ }
          setIsLoaded(true);
          return;
        } catch {
          // API falló, caemos al localStorage
        }
      }

      // Fallback: localStorage
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && !cancelled) {
            setWishlist(parsed);
          }
        }
      } catch {
        console.warn('Could not load wishlist from localStorage');
      }
      if (!cancelled) setIsLoaded(true);
    }

    loadWishlist();
    return () => { cancelled = true; };
  }, [authLoading, isTenant]);

  // Save to localStorage whenever wishlist changes (always, as cache)
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(wishlist));
      } catch {
        console.warn('Could not save wishlist to localStorage');
      }
    }
  }, [wishlist, isLoaded]);

  const isWishlisted = useCallback((propertyId: string) => {
    return wishlist.includes(propertyId);
  }, [wishlist]);

  const addToWishlist = useCallback((propertyId: string) => {
    if (wishlistActual.current.includes(propertyId)) return;
    // El espejo se adelanta al re-render: dos clics seguidos en el mismo tick
    // mandaban dos veces al back (y ahora sacarían dos toasts).
    wishlistActual.current = [...wishlistActual.current, propertyId];
    if (isTenant) {
      // Optimista: se agrega abajo. Si falla, se saca y se avisa.
      wishlistsApi.add(propertyId).catch(() => {
        setWishlist((cur) => cur.filter((id) => id !== propertyId));
        toast.error(wishlistErrorMessage());
      });
    }
    setWishlist((prev) => (prev.includes(propertyId) ? prev : [...prev, propertyId]));
    avisarGuardado();
  }, [avisarGuardado, isTenant, wishlistErrorMessage]);

  const removeFromWishlist = useCallback((propertyId: string) => {
    if (!wishlistActual.current.includes(propertyId)) return;
    wishlistActual.current = wishlistActual.current.filter((id) => id !== propertyId);
    if (isTenant) {
      // Optimista: se quita abajo. Si falla, se repone y se avisa.
      wishlistsApi.remove(propertyId).catch(() => {
        setWishlist((cur) => (cur.includes(propertyId) ? cur : [...cur, propertyId]));
        toast.error(wishlistErrorMessage());
      });
    }
    setWishlist((prev) => prev.filter((id) => id !== propertyId));
    avisarQuitado();
  }, [avisarQuitado, isTenant, wishlistErrorMessage]);

  /*
   * Delega en agregar/quitar en vez de decidir dentro del updater de estado.
   * Los efectos —el llamado al back y el toast— vivían DENTRO de
   * `setWishlist(prev => …)`, y un updater es una función pura que React puede
   * volver a ejecutar (StrictMode la corre dos veces): el mismo clic mandaba
   * dos veces al back y, ahora que hay toast, saldría duplicado.
   */
  const toggleWishlist = useCallback((propertyId: string) => {
    if (wishlistActual.current.includes(propertyId)) removeFromWishlist(propertyId);
    else addToWishlist(propertyId);
  }, [addToWishlist, removeFromWishlist]);

  const getWishlistedProperties = useCallback((properties: Property[]) => {
    return properties.filter((p) => wishlist.includes(p.id));
  }, [wishlist]);

  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        isWishlisted,
        toggleWishlist,
        addToWishlist,
        removeFromWishlist,
        getWishlistedProperties,
        count: wishlist.length,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
}
