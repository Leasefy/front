import { useCallback, useRef, useState } from 'react';
import type { AvisoDelCorreo } from '@/lib/equipo/aviso-del-correo';

export type RevisarCorreo = (correo: string, nombre: string) => Promise<AvisoDelCorreo | null>;
/**
 * El aviso del formulario. `revisar` pregunta al back y se queda con la ÚLTIMA
 * respuesta (una vieja que llega tarde no pisa a la nueva). Si la pregunta
 * falla no se avisa nada: el 409 al enviar es la red de abajo.
 */
export function useAvisoDelCorreo(preguntar?: RevisarCorreo) {
  const [aviso, setAviso] = useState<AvisoDelCorreo | null>(null);
  const ultima = useRef(0);

  const revisar = useCallback(
    async (correo: string, nombre: string) => {
      if (!preguntar) return;
      const esta = ++ultima.current;
      try {
        const respuesta = await preguntar(correo, nombre);
        if (esta === ultima.current) setAviso(respuesta);
      } catch {
        if (esta === ultima.current) setAviso(null);
      }
    },
    [preguntar],
  );

  const limpiar = useCallback(() => {
    ultima.current++;
    setAviso(null);
  }, []);

  const mostrar = useCallback((a: AvisoDelCorreo) => {
    ultima.current++;
    setAviso(a);
  }, []);

  return { aviso, revisar, limpiar, mostrar };
}
