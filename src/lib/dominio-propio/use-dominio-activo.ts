'use client';

import { useEffect, useState } from 'react';

import { dominioPropioApi } from '@/lib/api/dominio-propio.service';

/**
 * El dominio propio ACTIVO de la inmobiliaria de la sesión, para que lo que se comparte desde el panel salga con él
 * (Nico, 31-10-2026). Una sola pregunta por sesión, compartida por todos los botones de compartir; sin dominio, sin la
 * ruta, sin permiso o con el back caído: `null`, y el enlace sale con leasefy.co como siempre. Sólo en el panel.
 */
let pedido: Promise<string | null> | null = null;

function dominioDeLaSesion(): Promise<string | null> {
  pedido ??= dominioPropioApi
    .ver()
    .then((d) => (d.estado === 'ACTIVO' && d.dominio ? d.dominio : null))
    .catch(() => null);
  return pedido;
}

/** Al guardar o quitar el dominio en Configuración: la próxima pregunta lee el nuevo. */
export function olvidarElDominioActivo(): void {
  pedido = null;
}

export function useDominioActivo(): string | null {
  const [dominio, setDominio] = useState<string | null>(null);
  useEffect(() => {
    let vivo = true;
    void dominioDeLaSesion().then((d) => vivo && setDominio(d));
    return () => {
      vivo = false;
    };
  }, []);
  return dominio;
}
