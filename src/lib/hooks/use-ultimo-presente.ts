'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Conserva el último valor presente mientras el que llega es nulo.
 *
 * ── El problema que resuelve ───────────────────────────────────────────────
 * 🔴 Media docena de cajones y diálogos estaban escritos así:
 *
 *     if (!candidato) return null;
 *     return <Sheet open onOpenChange={…}>…</Sheet>;
 *
 * Con ese patrón el `Sheet` SIEMPRE está abierto mientras existe, y cerrar es
 * desmontarlo de golpe. Radix anima la salida sólo si el contenido sigue
 * montado con `data-state="closed"` el tiempo que dura la animación — al
 * devolver `null` no queda nada que animar. Por eso abrían suave y cerraban de
 * un tirón (Nico, 2026-09-04: «la animación de apertura suave sí está, pero la
 * de cierre no, es súper brusco»). No era la animación: era el desmontaje.
 *
 * ── Por qué hace falta este hook y no alcanza con `open={Boolean(x)}` ──────
 * Pasar `open` de verdad arregla la animación, pero el cuerpo del cajón lee
 * `candidato` — y en el mismo render en que se cierra, `candidato` ya es null.
 * El cajón se vaciaría de golpe y saldría deslizándose EN BLANCO, que se ve
 * peor que el corte. Este hook devuelve el último valor real, así el contenido
 * sigue ahí mientras se va.
 */
export function useUltimoPresente<T>(valor: T | null | undefined): T | null {
  const [ultimo, setUltimo] = useState<T | null>(valor ?? null);
  // El ref evita un render de más: sólo se actualiza el estado cuando el valor
  // cambia de verdad, no en cada render del padre.
  const anterior = useRef<T | null>(valor ?? null);

  useEffect(() => {
    if (valor !== null && valor !== undefined && valor !== anterior.current) {
      anterior.current = valor;
      setUltimo(valor);
    }
  }, [valor]);

  // En el render en que llega un valor nuevo hay que devolverlo YA: esperar al
  // efecto pintaría un cuadro con el contenido viejo, que es justo lo que este
  // hook existe para evitar del otro lado.
  return valor ?? ultimo;
}
