'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
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

  const toggleWishlist = useCallback((propertyId: string) => {
    setWishlist((prev) => {
      const removing = prev.includes(propertyId);
      if (isTenant) {
        if (removing) {
          // Optimista: ya removido abajo. Si falla, re-agregar y avisar.
          wishlistsApi.remove(propertyId).catch(() => {
            setWishlist((cur) => (cur.includes(propertyId) ? cur : [...cur, propertyId]));
            toast.error(wishlistErrorMessage());
          });
        } else {
          // Optimista: ya agregado abajo. Si falla, remover y avisar.
          wishlistsApi.add(propertyId).catch(() => {
            setWishlist((cur) => cur.filter((id) => id !== propertyId));
            toast.error(wishlistErrorMessage());
          });
        }
      }
      if (removing) {
        return prev.filter((id) => id !== propertyId);
      }
      return [...prev, propertyId];
    });
  }, [isTenant, wishlistErrorMessage]);

  const addToWishlist = useCallback((propertyId: string) => {
    setWishlist((prev) => {
      if (prev.includes(propertyId)) return prev;
      if (isTenant) {
        wishlistsApi.add(propertyId).catch(() => {
          setWishlist((cur) => cur.filter((id) => id !== propertyId));
          toast.error(wishlistErrorMessage());
        });
      }
      return [...prev, propertyId];
    });
  }, [isTenant, wishlistErrorMessage]);

  const removeFromWishlist = useCallback((propertyId: string) => {
    if (isTenant) {
      wishlistsApi.remove(propertyId).catch(() => {
        setWishlist((cur) => (cur.includes(propertyId) ? cur : [...cur, propertyId]));
        toast.error(wishlistErrorMessage());
      });
    }
    setWishlist((prev) => prev.filter((id) => id !== propertyId));
  }, [isTenant, wishlistErrorMessage]);

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
