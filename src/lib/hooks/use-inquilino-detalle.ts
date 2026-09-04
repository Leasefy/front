'use client';

/**
 * use-inquilino-detalle — todo lo que se sabe de UNA persona, para el cajón.
 *
 * ── Por qué no alcanza con la fila ─────────────────────────────────────────
 * La fila de la tabla trae la persona TAL COMO LA FILTRÓ LA LISTA: con el
 * filtro en «activos», sus arriendos terminados no vienen. El cajón se abre
 * justamente para ver todo, así que vuelve a pedir la persona por
 * `GET /inmobiliaria/inquilinos/:tenantId`, que el back resuelve con
 * `estado: 'todos'`.
 *
 * Mientras esa respuesta llega se muestra lo que ya trajo la fila. Un cajón en
 * blanco durante medio segundo se lee como que no hay datos.
 *
 * ── Y por qué los pagos se piden POR CONTRATO ──────────────────────────────
 * 🔴 No hay ningún endpoint que devuelva los cobros de un inquilino. `Cobro`
 * tiene `tenantId`, pero `GET /cobros` sólo filtra por `month`, `status` y
 * `propietarioId`: pedir «los cobros de esta persona» sería traerse el mes
 * entero de la inmobiliaria y filtrarlo acá — y aun así sólo se vería UN mes.
 *
 * El camino real es el contrato: `GET /contracts/:id/cobros` devuelve los
 * cobros de ese contrato con su desglose. Como la persona ya trae sus
 * `contractId`, se piden todos en paralelo y se juntan. Es el único cruce que
 * no adivina nada — cada cobro sale del contrato que lo generó.
 */

import { useCallback, useEffect, useState } from 'react';

import { contractsApi } from '@/lib/api/contracts.service';
import { inquilinosApi, type Inquilino } from '@/lib/api/inquilinos.service';
import type { CobroConDesglose } from '@/lib/api/recibos-de-caja.types';

export interface DetalleDeInquilino {
  /** La persona: la del back si llegó, la de la fila mientras tanto. */
  persona: Inquilino;
  /** `true` mientras se piden TODOS sus arriendos. */
  cargandoArriendos: boolean;
  /**
   * El detalle falló y se está mostrando lo que trajo la fila. No es un error
   * de pantalla: es «puede faltar un arriendo terminado», y hay que decirlo.
   */
  arriendosIncompletos: boolean;
  cobros: CobroConDesglose[];
  cargandoPagos: boolean;
  /** Ningún contrato contestó. */
  errorPagos: boolean;
  /** Alguno contestó y otro no: lo que se ve es cierto, pero está incompleto. */
  pagosIncompletos: boolean;
  reintentar: () => void;
}

/** Los contratos de la persona, sin repetir. Dos arriendos pueden compartirlo. */
function contratosDe(persona: Inquilino): string[] {
  return Array.from(
    new Set(persona.arriendos.map((a) => a.contractId).filter((id): id is string => Boolean(id))),
  );
}

/** Del más reciente al más viejo. `month` es 'YYYY-MM', así que ordena como texto. */
function porMesDescendente(a: CobroConDesglose, b: CobroConDesglose): number {
  return b.month.localeCompare(a.month);
}

/**
 * @param semilla La persona que trajo la fila, o `null` con el cajón cerrado.
 *                Con `null` el hook no pide nada.
 */
export function useInquilinoDetalle(semilla: Inquilino | null): DetalleDeInquilino | null {
  const tenantId = semilla?.tenantId ?? null;

  const [persona, setPersona] = useState<Inquilino | null>(semilla);
  const [cargandoArriendos, setCargandoArriendos] = useState(false);
  const [arriendosIncompletos, setArriendosIncompletos] = useState(false);

  const [cobros, setCobros] = useState<CobroConDesglose[]>([]);
  const [cargandoPagos, setCargandoPagos] = useState(false);
  const [errorPagos, setErrorPagos] = useState(false);
  const [pagosIncompletos, setPagosIncompletos] = useState(false);

  const [recarga, setRecarga] = useState(0);
  const reintentar = useCallback(() => setRecarga((n) => n + 1), []);

  /*
   * La persona que se muestra AHORA.
   *
   * Se calcula en el render, no en un efecto: si el cambio de persona se
   * hiciera con un `setPersona` en un `useEffect`, habría un frame con la
   * persona anterior —el cajón de la segunda persona mostrando el nombre de la
   * primera— y otro con nada mientras se abre. Comparar el `tenantId` cierra
   * las dos ventanas de un tirón.
   */
  const efectiva = persona && persona.tenantId === tenantId ? persona : semilla;

  // Los cobros sí viven en estado, así que hay que borrarlos al cambiar de
  // persona: los de la anterior se leerían como suyos.
  useEffect(() => {
    setCobros([]);
    setArriendosIncompletos(false);
    setErrorPagos(false);
    setPagosIncompletos(false);
  }, [tenantId]);

  useEffect(() => {
    if (!tenantId) return;
    let vigente = true;
    setCargandoArriendos(true);

    inquilinosApi
      .obtener(tenantId)
      .then((completa) => {
        if (!vigente) return;
        setPersona(completa);
        setArriendosIncompletos(false);
      })
      .catch(() => {
        // Se conserva la persona de la fila: tiene nombre, contacto y los
        // arriendos del filtro. Perderlos por no haber podido traer los
        // terminados sería cambiar un cajón incompleto por uno vacío.
        if (!vigente) return;
        setArriendosIncompletos(true);
      })
      .finally(() => {
        if (vigente) setCargandoArriendos(false);
      });

    return () => {
      vigente = false;
    };
  }, [tenantId, recarga]);

  const contratos = efectiva ? contratosDe(efectiva) : [];
  // Una llave estable: el efecto de pagos no puede correr por cada render sólo
  // porque `contratosDe` devuelve un array nuevo.
  const llaveDeContratos = contratos.join('|');

  useEffect(() => {
    if (!tenantId) return;
    const ids = llaveDeContratos ? llaveDeContratos.split('|') : [];
    if (ids.length === 0) {
      setCobros([]);
      setCargandoPagos(false);
      setErrorPagos(false);
      setPagosIncompletos(false);
      return;
    }

    let vigente = true;
    setCargandoPagos(true);
    setErrorPagos(false);
    setPagosIncompletos(false);

    Promise.allSettled(ids.map((id) => contractsApi.cobros(id)))
      .then((resultados) => {
        if (!vigente) return;
        const buenos = resultados.filter(
          (r): r is PromiseFulfilledResult<CobroConDesglose[]> => r.status === 'fulfilled',
        );
        // Todos fallaron = error. Algunos = lo que se ve es cierto pero
        // incompleto, y decirlo importa: un saldo a medias parece un saldo.
        if (buenos.length === 0) {
          setErrorPagos(true);
          setCobros([]);
          return;
        }
        setPagosIncompletos(buenos.length < resultados.length);
        setCobros(buenos.flatMap((r) => r.value).sort(porMesDescendente));
      })
      .finally(() => {
        if (vigente) setCargandoPagos(false);
      });

    return () => {
      vigente = false;
    };
  }, [tenantId, llaveDeContratos, recarga]);

  if (!efectiva) return null;

  return {
    persona: efectiva,
    cargandoArriendos,
    arriendosIncompletos,
    cobros,
    cargandoPagos,
    errorPagos,
    pagosIncompletos,
    reintentar,
  };
}
