'use client';

import { useEffect, useState } from 'react';

import { CONFIRMAR_CON_CODIGO, DESTINOS_PARA_PUBLICAR } from '@/components/marketplace/CuentaParaPublicar';
import { VentanaParaPublicar } from '@/components/marketplace/VentanaParaPublicar';
import { MENSAJE_CERRADA, MENSAJE_LISTA, porLaVentana } from '@/lib/publica/ventana-encima';

const DESTINOS = {
  landlord: porLaVentana(DESTINOS_PARA_PUBLICAR.landlord),
  agency: porLaVentana(DESTINOS_PARA_PUBLICAR.agency),
  agente: porLaVentana(DESTINOS_PARA_PUBLICAR.agente),
  entrar: porLaVentana(DESTINOS_PARA_PUBLICAR.entrar),
};

/**
 * `/publica/ventana` — sólo la ventana «¿Quién va a publicar?», sobre fondo transparente, para abrirla encima de la home
 * y de las internas (que son HTML sin React). Al crear la cuenta pasa por `/publica/ventana/ir`, que lleva a la página de
 * arriba a `/publica`. Cerrarla avisa a la de arriba para que la quite. Abierta sola (sin iframe), cerrar lleva a la home.
 */
export default function VentanaEncima() {
  const [abierta, setAbierta] = useState(true);
  const enUnMarco = typeof window !== 'undefined' && window.parent !== window;

  useEffect(() => {
    const html = document.documentElement;
    html.style.background = 'transparent';
    html.style.colorScheme = 'normal';
    document.body.style.background = 'transparent';
    if (window.parent !== window) window.parent.postMessage({ tipo: MENSAJE_LISTA }, window.location.origin);
  }, []);

  return (
    <VentanaParaPublicar
      abierta={abierta}
      alCambiar={(o) => {
        setAbierta(o);
        if (o) return;
        if (enUnMarco) window.parent.postMessage({ tipo: MENSAJE_CERRADA }, window.location.origin);
        else window.location.assign('/');
      }}
      destinos={DESTINOS}
      confirmarConCodigo={CONFIRMAR_CON_CODIGO}
    />
  );
}
