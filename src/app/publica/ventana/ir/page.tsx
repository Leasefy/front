'use client';

import { use, useEffect } from 'react';

import { CargaDeMarca } from '@/components/ui/carga-de-marca';
import { MENSAJE_IR, destinoSeguro } from '@/lib/publica/ventana-encima';

/** Ya creó la cuenta (o entró) en la ventana de encima: la página de arriba sigue al destino. Sin marco, va aquí mismo. */
export default function IrDesdeLaVentana({ searchParams }: { searchParams: Promise<{ a?: string }> }) {
  const { a } = use(searchParams);
  useEffect(() => {
    const destino = destinoSeguro(a);
    if (window.parent !== window) window.parent.postMessage({ tipo: MENSAJE_IR, a: destino }, window.location.origin);
    else window.location.replace(destino);
  }, [a]);
  return (
    <div className="flex min-h-screen items-center justify-center">
      <CargaDeMarca tamano="lg" />
    </div>
  );
}
