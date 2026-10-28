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
  const [enUnMarco, setEnUnMarco] = useState(false);

  useEffect(() => {
    const html = document.documentElement;
    html.style.background = 'transparent';
    document.body.style.background = 'transparent';
    // El marco sólo es transparente si su página y el <iframe> tienen el mismo esquema de color. next-themes le pone
    // `color-scheme: dark` en línea al <html> con el sistema en oscuro, y entonces el navegador pinta el marco opaco
    // (la pantalla negra que vio Nico el 28-10). Con !important gana a ese estilo en línea.
    const estilo = document.createElement('style');
    estilo.textContent = 'html{color-scheme:normal!important;background:transparent!important}body{background:transparent!important}';
    document.head.appendChild(estilo);
    const marco = window.parent !== window;
    setEnUnMarco(marco);
    if (marco) window.parent.postMessage({ tipo: MENSAJE_LISTA }, window.location.origin);
    return () => estilo.remove();
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
      sinVelo={enUnMarco}
    />
  );
}
