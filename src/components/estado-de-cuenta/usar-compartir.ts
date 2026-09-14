'use client';

/**
 * Las tres formas de distribuir el estado de cuenta, sin el menú.
 *
 * Separado del componente a propósito: el menú es Radix y no se monta en las
 * pruebas (necesita eventos de puntero reales), así que lo que importa —a quién
 * se le escribe, cuántos enlaces se emiten, qué pasa sin portapapeles— quedaría
 * sin fijar. Acá la regla es código llano y se prueba llamando funciones.
 */

import * as React from 'react';

import { toast } from '@/components/ui/toast';
import { estadoDeCuentaApi } from '@/lib/api/estado-de-cuenta.service';
import type { EnlaceCompartido } from '@/lib/types/estado-de-cuenta';
import { fechaLegible } from './filas';
import { texto } from './textos';

export type TareaDeCompartir = 'enlace' | 'correo' | 'whatsapp';

export interface UsarCompartir {
  copiarEnlace: () => Promise<void>;
  enviarPorCorreo: () => Promise<void>;
  enviarPorWhatsapp: () => Promise<void>;
  ocupado: TareaDeCompartir | null;
}

export interface OpcionesDeCompartir {
  tipo: 'inquilino' | 'propietario';
  /** `tenantRef` o `propietarioId`. */
  id: string;
}

export function useCompartirEstado({
  tipo,
  id,
}: OpcionesDeCompartir): UsarCompartir {
  const [ocupado, setOcupado] = React.useState<TareaDeCompartir | null>(null);
  /*
   * El enlace se pide UNA vez y se reutiliza mientras la pantalla siga abierta:
   * cada POST emite un token nuevo, y diez tokens vivos por cliente son diez
   * puertas abiertas a la misma información.
   */
  const enlace = React.useRef<EnlaceCompartido | null>(null);

  React.useEffect(() => {
    // Otro cliente, otro enlace.
    enlace.current = null;
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
    } catch {
      toast.error(texto('estadoDeCuenta.falloEnlace'));
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
    async (canal: 'CORREO' | 'WHATSAPP') => {
      setOcupado(canal === 'CORREO' ? 'correo' : 'whatsapp');
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
          toast.error(
            r.motivo ??
              texto(
                canal === 'CORREO'
                  ? 'estadoDeCuenta.falloCorreo'
                  : 'estadoDeCuenta.sinWhatsapp',
              ),
          );
        }
      } catch {
        toast.error(
          texto(
            canal === 'CORREO'
              ? 'estadoDeCuenta.falloCorreo'
              : 'estadoDeCuenta.sinWhatsapp',
          ),
        );
      } finally {
        setOcupado(null);
      }
    },
    [tipo, id],
  );

  const enviarPorCorreo = React.useCallback(() => mandar('CORREO'), [mandar]);
  const enviarPorWhatsapp = React.useCallback(() => mandar('WHATSAPP'), [mandar]);

  return { copiarEnlace, enviarPorCorreo, enviarPorWhatsapp, ocupado };
}
