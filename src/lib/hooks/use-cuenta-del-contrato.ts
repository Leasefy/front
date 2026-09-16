'use client';

/**
 * use-cuenta-del-contrato — lo que la ficha del contrato necesita para decir
 * cómo va el arriendo con la plata.
 *
 * ── 🔴 Sólo el ESTADO DE CUENTA, nunca los cobros ───────────────────────────
 * La deuda nace con el contrato y vive en sus cuotas (Nico, 2026-09-15). El
 * cobro es el documento con el que finanzas reclama: un contrato puede deber
 * $19 M sin un solo cobro emitido. Este hook no importa ni un servicio de
 * cobros, y hay una prueba que lo fija.
 *
 * ── Del lado del INQUILINO, por su documento si no tiene cuenta ─────────────
 * La ficha pedía el estado de cuenta con `contract.tenantId` y, si no había,
 * caía al del PROPIETARIO: en los contratos migrados —casi todos sin usuario
 * inquilino— «Resta por pagar» contestaba lo que falta GIRARLE al dueño, no lo
 * que debe el inquilino. El back identifica al inquilino por su cuenta o por
 * su DOCUMENTO (`refDelInquilino`), así que se pide siempre de su lado.
 *
 * ── De ESTE contrato, por su id ─────────────────────────────────────────────
 * El estado de cuenta es del cliente: un inquilino con dos locales trae dos
 * contratos. Se toma el de esta ficha por `Contract.id` —que el documento
 * trae— y no por el número, que en un migrado es el del sistema anterior y no
 * tiene por qué ser único.
 *
 * ── Los términos de la inmobiliaria, sólo si hacen falta ────────────────────
 * Un contrato con `diasDePlazo: null` hereda el plazo de la inmobiliaria, y
 * sin ese número no se puede separar «vencido, en plazo» de «en cartera». Se
 * piden sólo cuando el contrato hereda algo; si fallan, el plazo queda
 * desconocido y la ficha lo dice en vez de suponer cero.
 */

import { useCallback, useEffect, useState } from 'react';

import { estadoDeCuentaApi } from '@/lib/api/estado-de-cuenta.service';
import { agencyApi } from '@/lib/api/inmobiliaria.service';
import { refDelInquilino } from '@/lib/estado-de-cuenta/con-quien-se-abre';
import type { TerminosDeLaAgencia } from '@/lib/contratos/ritmo-de-pago';
import type { Contract } from '@/lib/types/contract';
import type { ContratoDelEstadoDeCuenta } from '@/lib/types/estado-de-cuenta';

export type CuentaDelContrato =
  /** El contrato no se ha activado: todavía no tiene cuotas. No se pide nada. */
  | { estado: 'no-aplica' }
  /** Sin cuenta ni documento del inquilino no hay con quién abrirlo. */
  | { estado: 'sin-inquilino' }
  | { estado: 'cargando' }
  | { estado: 'fallo'; sinPermiso: boolean }
  /** El estado de cuenta llegó, pero este contrato no tiene cuotas en él. */
  | { estado: 'sin-cuotas'; tenantRef: string }
  | { estado: 'listo'; contrato: ContratoDelEstadoDeCuenta; tenantRef: string };

export interface UsoDeLaCuenta {
  cuenta: CuentaDelContrato;
  /**
   * Lo que el contrato hereda de la inmobiliaria. `null` mientras no llega,
   * cuando no hace falta (el contrato define todo) o cuando falló.
   */
  agencia: TerminosDeLaAgencia | null;
  /**
   * `true` mientras el contrato hereda algo y los términos de la inmobiliaria
   * todavía no contestaron. Mientras tanto no se afirma ningún estado que
   * dependa del plazo.
   */
  esperandoAgencia: boolean;
  reintentar: () => void;
}

export type ContratoParaLaCuenta = Pick<
  Contract,
  'id' | 'status' | 'tenantId' | 'tenantDocument' | 'paymentDueDay' | 'diasDePlazo'
>;

/** Sólo un contrato que se activó alguna vez tiene tabla de cuotas. */
export function tieneCuotas(status: Contract['status']): boolean {
  return status === 'active' || status === 'expired';
}

function estadoHttp(error: unknown): number | null {
  const s = (error as { status?: unknown } | null)?.status;
  return typeof s === 'number' ? s : null;
}

function codigo(error: unknown): unknown {
  return (error as { code?: unknown } | null)?.code;
}

export function useCuentaDelContrato(contract: ContratoParaLaCuenta): UsoDeLaCuenta {
  const aplica = tieneCuotas(contract.status);
  const tenantRef = refDelInquilino({
    tenantId: contract.tenantId,
    documento: contract.tenantDocument,
  });
  const heredaAlgo = contract.diasDePlazo == null || !contract.paymentDueDay;

  const [intento, setIntento] = useState(0);
  const reintentar = useCallback(() => setIntento((n) => n + 1), []);

  const [cuenta, setCuenta] = useState<CuentaDelContrato>(() =>
    !aplica ? { estado: 'no-aplica' } : !tenantRef ? { estado: 'sin-inquilino' } : { estado: 'cargando' },
  );
  const [agencia, setAgencia] = useState<TerminosDeLaAgencia | null>(null);
  const [esperandoAgencia, setEsperandoAgencia] = useState(heredaAlgo);

  useEffect(() => {
    if (!aplica) {
      setCuenta({ estado: 'no-aplica' });
      return;
    }
    if (!tenantRef) {
      setCuenta({ estado: 'sin-inquilino' });
      return;
    }

    let vivo = true;
    setCuenta({ estado: 'cargando' });
    estadoDeCuentaApi
      .inquilino(tenantRef)
      .then((doc) => {
        if (!vivo) return;
        const contrato = doc.contratos.find((c) => c.id === contract.id);
        setCuenta(
          contrato ? { estado: 'listo', contrato, tenantRef } : { estado: 'sin-cuotas', tenantRef },
        );
      })
      .catch((error: unknown) => {
        if (!vivo) return;
        // «No tiene contratos» llega como 404 con código: no es un fallo.
        if (codigo(error) === 'SIN_CONTRATOS') {
          setCuenta({ estado: 'sin-cuotas', tenantRef });
          return;
        }
        setCuenta({ estado: 'fallo', sinPermiso: estadoHttp(error) === 403 });
      });

    return () => {
      vivo = false;
    };
  }, [aplica, tenantRef, contract.id, intento]);

  useEffect(() => {
    if (!heredaAlgo) {
      setAgencia(null);
      setEsperandoAgencia(false);
      return;
    }
    let vivo = true;
    setEsperandoAgencia(true);
    agencyApi
      .getMyAgency()
      .then((a) => {
        if (vivo) setAgencia({ diasDePlazo: a.diasDePlazo ?? 0, diaDePago: a.paymentDueDay ?? null });
      })
      .catch(() => {
        /* Sin los términos, el plazo heredado queda desconocido: la ficha lo dice. */
        if (vivo) setAgencia(null);
      })
      .finally(() => {
        if (vivo) setEsperandoAgencia(false);
      });
    return () => {
      vivo = false;
    };
  }, [heredaAlgo, intento]);

  return { cuenta, agencia, esperandoAgencia, reintentar };
}
