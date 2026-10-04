'use client';

/**
 * La bandeja agrupada de la inmobiliaria (QA 04-10, NO-01/NO-05/NO-08): «Todas»
 * con el total REAL (no el tamaño de la página), los repetidos en un grupo y
 * «Marcar todas como leídas». Se recarga sola cuando llega un aviso nuevo por
 * tiempo real.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  avisosAgrupadosApi,
  type GrupoDeAvisos,
} from '@/lib/api/avisos-agrupados.service';
import { useAuth } from '@/lib/auth/use-auth';
import { useNotificationsRealtime } from './use-notifications-realtime';

export interface OpcionesDeLaBandeja {
  enabled?: boolean;
  porPagina?: number;
  soloSinLeer?: boolean;
  categoria?: string;
}

export function useAvisosAgrupados({
  enabled = true,
  porPagina = 30,
  soloSinLeer = false,
  categoria,
}: OpcionesDeLaBandeja = {}) {
  const { user } = useAuth();
  const [grupos, setGrupos] = useState<GrupoDeAvisos[]>([]);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalGrupos, setTotalGrupos] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(enabled);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const pedido = useRef(0);

  const cargar = useCallback(async () => {
    if (!enabled) return;
    const este = ++pedido.current;
    setCargando(true);
    setError(null);
    try {
      const r = await avisosAgrupadosApi.listar({
        page: 1,
        limit: porPagina,
        soloSinLeer,
        categoria,
      });
      if (este !== pedido.current) return;
      setGrupos(r.grupos);
      setTotal(r.total);
      setUnreadCount(r.unreadCount);
      setTotalGrupos(r.totalGrupos);
      setPagina(1);
    } catch (e) {
      if (este === pedido.current) setError(e);
    } finally {
      if (este === pedido.current) setCargando(false);
    }
  }, [enabled, porPagina, soloSinLeer, categoria]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const cargarMas = useCallback(async () => {
    if (cargandoMas || grupos.length >= totalGrupos) return;
    setCargandoMas(true);
    try {
      const r = await avisosAgrupadosApi.listar({
        page: pagina + 1,
        limit: porPagina,
        soloSinLeer,
        categoria,
      });
      setGrupos((prev) => {
        const vistos = new Set(prev.map((g) => g.clave));
        return [...prev, ...r.grupos.filter((g) => !vistos.has(g.clave))];
      });
      setTotalGrupos(r.totalGrupos);
      setPagina((p) => p + 1);
    } catch (e) {
      setError(e);
    } finally {
      setCargandoMas(false);
    }
  }, [cargandoMas, grupos.length, totalGrupos, pagina, porPagina, soloSinLeer, categoria]);

  // Un aviso nuevo cambia los grupos (se suma a uno o abre otro): se vuelve a leer.
  const alLlegar = useCallback(() => {
    void cargar();
  }, [cargar]);
  useNotificationsRealtime({
    userId: enabled ? user?.id : undefined,
    onInsert: alLlegar,
  });

  const marcarLeido = useCallback(async (g: GrupoDeAvisos) => {
    if (g.read) return;
    await avisosAgrupadosApi.marcarLeido(g);
    setGrupos((prev) =>
      soloSinLeer
        ? prev.filter((x) => x.clave !== g.clave)
        : prev.map((x) => (x.clave === g.clave ? { ...x, read: true, sinLeer: 0 } : x)),
    );
    setUnreadCount((n) => Math.max(0, n - g.sinLeer));
  }, [soloSinLeer]);

  const quitar = useCallback(async (g: GrupoDeAvisos) => {
    await avisosAgrupadosApi.quitar(g);
    setGrupos((prev) => prev.filter((x) => x.clave !== g.clave));
    setTotal((n) => Math.max(0, n - g.cantidad));
    setUnreadCount((n) => Math.max(0, n - g.sinLeer));
    setTotalGrupos((n) => Math.max(0, n - 1));
  }, []);

  const marcarTodasLeidas = useCallback(async () => {
    await avisosAgrupadosApi.marcarTodasLeidas();
    setGrupos((prev) => (soloSinLeer ? [] : prev.map((x) => ({ ...x, read: true, sinLeer: 0 }))));
    setUnreadCount(0);
  }, [soloSinLeer]);

  return {
    grupos,
    total,
    unreadCount,
    totalGrupos,
    hayMas: grupos.length < totalGrupos,
    cargando,
    cargandoMas,
    error,
    recargar: cargar,
    cargarMas,
    marcarLeido,
    quitar,
    marcarTodasLeidas,
  };
}
