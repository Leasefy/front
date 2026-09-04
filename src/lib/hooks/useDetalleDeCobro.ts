'use client';

/**
 * Lo que la lista de cobros NO trae: el desglose del total adeudado y los
 * recibos de caja del cobro.
 *
 * Son dos peticiones y van en paralelo porque son independientes:
 *   - `GET /inmobiliaria/cobros/:id` → `conceptos` (el desglose).
 *   - `GET /inmobiliaria/recibos-de-caja/por-cobro/:id` → el historial.
 *
 * 🔴 Por qué el historial NO sale del detalle, si el detalle ya trae
 * `recibosDeCaja`: ese campo trae SÓLO LOS VIVOS. Un recibo anulado es plata
 * que volvió al saldo y tiene que seguir viéndose; el endpoint por-cobro es el
 * que existe para eso. El `recibosDeCaja` del detalle queda como respaldo para
 * cuando la otra petición falla, así la pantalla nunca se queda sin historial.
 *
 * 🔴 `allSettled` y no `all`: si una de las dos falla, la otra igual se pinta.
 * Con `all` un desglose caído se llevaba puesto el historial que sí llegó.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { cobrosApi } from '@/lib/api/inmobiliaria.service';
import { recibosDeCajaApi } from '@/lib/api/recibos-de-caja.service';
import type {
  CobroConDesglose,
  ConceptoDelCobro,
  ReciboDeCaja,
  RespuestaDeRecibo,
} from '@/lib/api/recibos-de-caja.types';

export interface DetalleDeCobro {
  /** El cobro con desglose. `null` hasta que llega (o si falló). */
  detalle: CobroConDesglose | null;
  /** `undefined` mientras carga; `[]` = la agencia no tiene el motor de conceptos. */
  conceptos: ConceptoDelCobro[] | undefined;
  recibos: ReciboDeCaja[];
  cargando: boolean;
  /** Falló el desglose (`GET /cobros/:id`). */
  falloDesglose: boolean;
  /** Falló el historial (`GET /por-cobro/:id`) y tampoco había respaldo. */
  falloRecibos: boolean;
  recargar: () => void;
  /**
   * Mete en pantalla lo que devolvió una mutación, sin volver a pedir nada.
   * Un recibo que ya estaba se REEMPLAZA (así el anulado queda marcado en la
   * lista en vez de desaparecer); uno nuevo se agrega.
   */
  aplicarRespuesta: (res: RespuestaDeRecibo) => void;
}

export function useDetalleDeCobro(cobroId: string | null, activo: boolean): DetalleDeCobro {
  const [detalle, setDetalle] = useState<CobroConDesglose | null>(null);
  const [conceptos, setConceptos] = useState<ConceptoDelCobro[] | undefined>(undefined);
  const [recibos, setRecibos] = useState<ReciboDeCaja[]>([]);
  const [cargando, setCargando] = useState(false);
  const [falloDesglose, setFalloDesglose] = useState(false);
  const [falloRecibos, setFalloRecibos] = useState(false);

  /**
   * Se abre un cobro, se cierra y se abre otro antes de que conteste el
   * primero: sin esto, la respuesta vieja pisa la nueva y la pantalla muestra
   * el desglose del cobro equivocado. Es el peor error posible acá.
   */
  const peticion = useRef(0);

  const cargar = useCallback(() => {
    if (!cobroId) {
      setDetalle(null);
      setConceptos(undefined);
      setRecibos([]);
      setFalloDesglose(false);
      setFalloRecibos(false);
      return;
    }

    const mia = ++peticion.current;
    setCargando(true);
    setFalloDesglose(false);
    setFalloRecibos(false);

    void Promise.allSettled([cobrosApi.getById(cobroId), recibosDeCajaApi.porCobro(cobroId)]).then(
      ([resDetalle, resRecibos]) => {
        if (mia !== peticion.current) return;

        if (resDetalle.status === 'fulfilled') {
          setDetalle(resDetalle.value);
          setConceptos(resDetalle.value.conceptos ?? []);
        } else {
          setFalloDesglose(true);
        }

        if (resRecibos.status === 'fulfilled') {
          setRecibos(resRecibos.value);
        } else if (resDetalle.status === 'fulfilled' && resDetalle.value.recibosDeCaja) {
          // Respaldo: los vivos que venían en el detalle. Mejor eso que nada.
          setRecibos(resDetalle.value.recibosDeCaja);
        } else {
          setRecibos([]);
          setFalloRecibos(true);
        }

        setCargando(false);
      },
    );
  }, [cobroId]);

  useEffect(() => {
    if (!activo) return;
    cargar();
  }, [activo, cargar]);

  // Cerrar el panel invalida cualquier respuesta en vuelo y limpia el estado:
  // al reabrir no se ve por un instante el desglose del cobro anterior.
  useEffect(() => {
    if (activo) return;
    peticion.current += 1;
    setDetalle(null);
    setConceptos(undefined);
    setRecibos([]);
    setCargando(false);
    setFalloDesglose(false);
    setFalloRecibos(false);
  }, [activo]);

  const aplicarRespuesta = useCallback((res: RespuestaDeRecibo) => {
    setDetalle(res.cobro);
    if (res.cobro.conceptos) setConceptos(res.cobro.conceptos);
    setRecibos((previos) => {
      const yaEsta = previos.some((r) => r.id === res.recibo.id);
      return yaEsta
        ? previos.map((r) => (r.id === res.recibo.id ? res.recibo : r))
        : [...previos, res.recibo];
    });
  }, []);

  return {
    detalle,
    conceptos,
    recibos,
    cargando,
    falloDesglose,
    falloRecibos,
    recargar: cargar,
    aplicarRespuesta,
  };
}
