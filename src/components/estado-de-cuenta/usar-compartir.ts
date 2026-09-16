'use client';

/**
 * Las tres formas de distribuir el estado de cuenta, sin el menú.
 *
 * Separado del componente a propósito: el menú es Radix y no se monta en las
 * pruebas (necesita eventos de puntero reales), así que lo que importa —a quién
 * se le escribe, cuántos enlaces se emiten, qué pasa sin portapapeles— quedaría
 * sin fijar. Acá la regla es código llano y se prueba llamando funciones.
 *
 * ── Lo que cambió (auditoría de casos de error 13-09) ─────────────────────
 *
 *   · E2 — mandar por correo o WhatsApp es un envío REAL a un cliente, y era un
 *     clic. Ahora el menú PIDE el envío (`pedirEnvio`) y sale sólo cuando la
 *     persona confirma (`confirmarEnvio`), después de leer a quién y por dónde.
 *   · E3 — un enlace revocado desde la pantalla deja de reutilizarse
 *     (`olvidarEnlace`): si no, «Copiar enlace» seguía copiando uno que ya
 *     responde 404.
 *   · E5 — los fallos se tragaban con `catch {}` y un mensaje fijo: un 403, la
 *     red caída y un 500 decían lo mismo. Ahora cada uno dice lo suyo.
 */

import * as React from 'react';

import { toast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api/client';
import { estadoDeCuentaApi } from '@/lib/api/estado-de-cuenta.service';
import { clasificarFallo } from '@/lib/errores/clasificar';
import type { EnlaceCompartido } from '@/lib/types/estado-de-cuenta';
import { fechaLegible } from './filas';
import { texto } from './textos';

export type TareaDeCompartir = 'enlace' | 'correo' | 'whatsapp';
export type CanalDeEnvio = 'CORREO' | 'WHATSAPP';

export interface UsarCompartir {
  copiarEnlace: () => Promise<void>;
  /** Manda YA, sin preguntar. El menú usa `pedirEnvio`. */
  enviarPorCorreo: () => Promise<void>;
  enviarPorWhatsapp: () => Promise<void>;
  ocupado: TareaDeCompartir | null;
  /** E2: el canal que espera confirmación, o `null`. */
  envioPorConfirmar: CanalDeEnvio | null;
  pedirEnvio: (canal: CanalDeEnvio) => void;
  cancelarEnvio: () => void;
  confirmarEnvio: () => Promise<void>;
  /** E3: tras revocar un enlace, que «Copiar enlace» no lo vuelva a dar. */
  olvidarEnlace: (enlaceId: string) => void;
}

export interface OpcionesDeCompartir {
  tipo: 'inquilino' | 'propietario';
  /** `tenantRef` o `propietarioId`. */
  id: string;
}

/**
 * Por qué falló compartir, en palabras (E5).
 *
 * El `respaldo` es lo que se estaba intentando («No se pudo mandar el
 * correo.»); se usa cuando el fallo es del servidor y no hay nada más preciso
 * que decir. Un 4xx del back trae su mensaje en castellano y dice QUÉ pasó
 * (el cliente no tiene contratos, el enlace no existe): ése gana.
 */
export function motivoDeCompartir(error: unknown, respaldo: string): string {
  const fallo = clasificarFallo(error);
  switch (fallo.tipo) {
    case 'sinPermiso':
      // E1: el del propietario pide `dispersiones:view` y el del inquilino
      // `cobros:view`. Quien no puede verlo, no puede mandarlo. El guard del
      // back lo explica en castellano; el «Forbidden resource» de Nest, no.
      if (error instanceof ApiError && error.message && !/forbidden/i.test(error.message)) {
        return error.message;
      }
      return 'Tu rol no puede compartir este estado de cuenta. Pídele a un administrador que te dé acceso.';
    case 'sinSesion':
      return 'Tu sesión se venció: vuelve a entrar y compártelo de nuevo.';
    case 'red':
      return `${respaldo} No hubo conexión con el servidor, así que no pudimos confirmarlo. Revisa tu internet y prueba de nuevo.`;
    case 'limitado':
      return 'Hubo demasiados envíos seguidos. Espera un momento y prueba de nuevo.';
    default:
      if (
        error instanceof ApiError &&
        error.status >= 400 &&
        error.status < 500 &&
        error.message
      ) {
        return error.message;
      }
      return `${respaldo} Fue un problema del servidor: prueba de nuevo en un momento.`;
  }
}

export function useCompartirEstado({
  tipo,
  id,
}: OpcionesDeCompartir): UsarCompartir {
  const [ocupado, setOcupado] = React.useState<TareaDeCompartir | null>(null);
  const [envioPorConfirmar, setEnvioPorConfirmar] = React.useState<CanalDeEnvio | null>(null);
  /*
   * El enlace se pide UNA vez y se reutiliza mientras la pantalla siga abierta:
   * cada POST emite un token nuevo, y diez tokens vivos por cliente son diez
   * puertas abiertas a la misma información.
   */
  const enlace = React.useRef<EnlaceCompartido | null>(null);

  React.useEffect(() => {
    // Otro cliente, otro enlace.
    enlace.current = null;
    setEnvioPorConfirmar(null);
  }, [tipo, id]);

  const pedirEnlace = React.useCallback(async (): Promise<EnlaceCompartido> => {
    if (enlace.current) return enlace.current;
    const nuevo = await estadoDeCuentaApi.compartir(tipo, id);
    enlace.current = nuevo;
    return nuevo;
  }, [tipo, id]);

  const copiarEnlace = React.useCallback(async () => {
    setOcupado('enlace');
    try {
      const { url, venceEl } = await pedirEnlace();
      const vence = texto('estadoDeCuenta.enlaceVence', { fecha: fechaLegible(venceEl) });
      try {
        await navigator.clipboard.writeText(url);
        toast.success(texto('estadoDeCuenta.enlaceCopiado'), { description: vence });
      } catch {
        // Sin portapapeles (contexto inseguro, permisos) se muestra el enlace
        // para copiarlo a mano: un error a secas deja a la persona sin salida.
        toast.info(texto('estadoDeCuenta.copialoAMano'), {
          description: url,
          duration: 30000,
        });
      }
    } catch (error) {
      toast.error(motivoDeCompartir(error, texto('estadoDeCuenta.falloEnlace')));
    } finally {
      setOcupado(null);
    }
  }, [pedirEnlace]);

  /**
   * Mandar el enlace, por el canal que sea.
   *
   * 🔴 La decisión de si se PUEDE mandar es del back: él sabe si hay correo, si
   * hay cuenta del portal, si hay teléfono y si la persona aceptó WhatsApp.
   * Responde `{ enviado: false, motivo }` con la razón en palabras y deja el
   * enlace creado. Preguntarle acá primero sería otra copia de la misma regla,
   * y el día que cambie una de las dos quedaría mintiendo.
   */
  const mandar = React.useCallback(
    async (canal: CanalDeEnvio) => {
      setOcupado(canal === 'CORREO' ? 'correo' : 'whatsapp');
      const respaldo = texto(
        canal === 'CORREO' ? 'estadoDeCuenta.falloCorreo' : 'estadoDeCuenta.sinWhatsapp',
      );
      try {
        const r = await estadoDeCuentaApi.enviar(tipo, id, canal);
        // El enlace que devuelve el envío sirve para el «Copiar enlace» de
        // después: no hace falta emitir otro.
        enlace.current = r.enlace ?? enlace.current;
        if (r.enviado) {
          toast.success(
            texto(
              canal === 'CORREO'
                ? 'estadoDeCuenta.correoEnviado'
                : 'estadoDeCuenta.whatsappEnviado',
              { correo: r.destino, telefono: r.destino },
            ),
          );
        } else {
          toast.error(r.motivo ?? respaldo);
        }
      } catch (error) {
        toast.error(motivoDeCompartir(error, respaldo));
      } finally {
        setOcupado(null);
      }
    },
    [tipo, id],
  );

  const enviarPorCorreo = React.useCallback(() => mandar('CORREO'), [mandar]);
  const enviarPorWhatsapp = React.useCallback(() => mandar('WHATSAPP'), [mandar]);

  const pedirEnvio = React.useCallback((canal: CanalDeEnvio) => {
    setEnvioPorConfirmar(canal);
  }, []);

  const cancelarEnvio = React.useCallback(() => {
    setEnvioPorConfirmar(null);
  }, []);

  const confirmarEnvio = React.useCallback(async () => {
    const canal = envioPorConfirmar;
    if (!canal || ocupado !== null) return;
    try {
      await mandar(canal);
    } finally {
      // El resultado lo dice el aviso; el diálogo ya cumplió.
      setEnvioPorConfirmar(null);
    }
  }, [envioPorConfirmar, mandar, ocupado]);

  const olvidarEnlace = React.useCallback((enlaceId: string) => {
    // Sin id conocido no se puede saber si es el mismo: se olvida por las
    // dudas. Pedir otro enlace cuesta un POST; copiar uno revocado, un cliente
    // que no puede abrirlo.
    if (!enlace.current?.id || enlace.current.id === enlaceId) enlace.current = null;
  }, []);

  return {
    copiarEnlace,
    enviarPorCorreo,
    enviarPorWhatsapp,
    ocupado,
    envioPorConfirmar,
    pedirEnvio,
    cancelarEnvio,
    confirmarEnvio,
    olvidarEnlace,
  };
}
