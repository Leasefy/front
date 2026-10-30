'use client';

import { useEffect, useState } from 'react';

import { CONFIRMAR_CON_CODIGO, DESTINOS_PARA_PUBLICAR } from '@/components/marketplace/CuentaParaPublicar';
import { VentanaParaPublicar } from '@/components/marketplace/VentanaParaPublicar';
import {
  MENSAJE_CARGADA,
  MENSAJE_CERRADA,
  MENSAJE_LISTA,
  esElPedidoDeAbrir,
  porLaVentana,
} from '@/lib/publica/ventana-encima';

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
 *
 * Con `?encima=1` la cargó `conexion.js` antes del clic (28-10-2026): espera a que se la pidan (`MENSAJE_ABRIR`) y al
 * cerrarse se queda cargada para la próxima vez. Sin él (sola, o una página de atrás anterior), abre de una.
 */
export default function VentanaEncima() {
  const [abierta, setAbierta] = useState(false);
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
    const esperaElPedido = marco && new URLSearchParams(window.location.search).get('encima') === '1';
    if (!esperaElPedido) {
      setAbierta(true);
      return () => estilo.remove();
    }
    const alMensaje = (e: MessageEvent) => {
      if (esElPedidoDeAbrir(e, window.location.origin, window.parent)) setAbierta(true);
    };
    window.addEventListener('message', alMensaje);
    window.parent.postMessage({ tipo: MENSAJE_CARGADA }, window.location.origin);
    return () => {
      window.removeEventListener('message', alMensaje);
      estilo.remove();
    };
  }, []);

  // Abierta dentro del marco: la página de atrás la muestra cuando ya está pintada (no antes, o se ve el marco vacío).
  useEffect(() => {
    if (!abierta || !enUnMarco) return;
    const cuadro = requestAnimationFrame(() => window.parent.postMessage({ tipo: MENSAJE_LISTA }, window.location.origin));
    return () => cancelAnimationFrame(cuadro);
  }, [abierta, enUnMarco]);

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
