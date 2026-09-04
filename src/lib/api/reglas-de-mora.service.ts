/**
 * Reglas de mora — `/inmobiliaria/reglas-de-mora`.
 *
 * Sigue el patrón de `recibos-de-caja.service.ts`: `apiClient` + un cuerpo
 * armado clave por clave.
 *
 * 🔴 Por qué los cuerpos se arman a mano y no con un spread: el back valida
 * con `forbidNonWhitelisted: true`, así que una clave de más no se ignora —
 * devuelve 400. `reglas-de-mora.service.test.ts` fija el juego exacto de
 * claves de cada DTO.
 *
 * 🔴 `valor` viaja como STRING desde el back (`Decimal` de Prisma). Se
 * convierte acá, una sola vez, para que ninguna pantalla haga cuentas con un
 * texto.
 *
 * Nada de esto invalida `cobros`: una regla nueva no cambia un cobro ya
 * emitido — la aplica el recálculo nocturno del motor.
 */

import { apiClient } from '@/lib/api/client';
import type {
  AjusteDeReglaDelContrato,
  CambiosDeReglaDeMora,
  NuevaReglaDeMora,
  ReglaDeMora,
  ReglaDeMoraCruda,
  ReglaDeMoraDelContrato,
  ReglaDeMoraDelContratoCruda,
} from './reglas-de-mora.types';

const BASE = '/inmobiliaria/reglas-de-mora';

/** El back devuelve el arreglo pelado; se tolera `{ data }` por si cambia. */
function comoLista(res: ReglaDeMoraCruda[] | { data: ReglaDeMoraCruda[] } | null): ReglaDeMoraCruda[] {
  if (Array.isArray(res)) return res;
  return res?.data ?? [];
}

export function normalizarRegla(cruda: ReglaDeMoraCruda): ReglaDeMora {
  return {
    ...cruda,
    valor: Number(cruda.valor),
    topeCop: cruda.topeCop ?? null,
  };
}

/** Las reglas se listan como se aplican: por `orden`, y a igual orden, la más vieja primero. */
export function ordenarReglas(reglas: ReglaDeMora[]): ReglaDeMora[] {
  return [...reglas].sort(
    (a, b) => a.orden - b.orden || a.createdAt.localeCompare(b.createdAt),
  );
}

function cuerpoDeCreacion(nueva: NuevaReglaDeMora): Record<string, unknown> {
  const cuerpo: Record<string, unknown> = {
    nombre: nueva.nombre.trim(),
    concepto: nueva.concepto,
    disparador: nueva.disparador,
    disparadorDia: nueva.disparadorDia,
    formula: nueva.formula,
    valor: nueva.valor,
    base: nueva.base,
  };
  // En la creación un tope ausente y un tope `null` son lo mismo para el
  // back (`dto.topeCop ?? null`): no se manda la clave.
  if (nueva.topeCop !== undefined && nueva.topeCop !== null) cuerpo.topeCop = nueva.topeCop;
  if (nueva.activa !== undefined) cuerpo.activa = nueva.activa;
  if (nueva.orden !== undefined) cuerpo.orden = nueva.orden;
  return cuerpo;
}

function cuerpoDeCambios(cambios: CambiosDeReglaDeMora): Record<string, unknown> {
  const cuerpo: Record<string, unknown> = {};
  if (cambios.nombre !== undefined) cuerpo.nombre = cambios.nombre.trim();
  if (cambios.concepto !== undefined) cuerpo.concepto = cambios.concepto;
  if (cambios.disparador !== undefined) cuerpo.disparador = cambios.disparador;
  if (cambios.disparadorDia !== undefined) cuerpo.disparadorDia = cambios.disparadorDia;
  if (cambios.formula !== undefined) cuerpo.formula = cambios.formula;
  if (cambios.valor !== undefined) cuerpo.valor = cambios.valor;
  if (cambios.base !== undefined) cuerpo.base = cambios.base;
  // Acá `null` SÍ viaja: es la única manera de quitar un tope existente.
  if (cambios.topeCop !== undefined) cuerpo.topeCop = cambios.topeCop;
  if (cambios.activa !== undefined) cuerpo.activa = cambios.activa;
  if (cambios.orden !== undefined) cuerpo.orden = cambios.orden;
  return cuerpo;
}

function normalizarDelContrato(cruda: ReglaDeMoraDelContratoCruda): ReglaDeMoraDelContrato {
  return {
    ...cruda,
    regla: normalizarRegla(cruda.regla),
    valor: Number(cruda.valor),
    valorDeLaAgencia: Number(cruda.valorDeLaAgencia),
  };
}

function cuerpoDeAjuste(ajuste: AjusteDeReglaDelContrato): Record<string, unknown> {
  const cuerpo: Record<string, unknown> = {};
  if (ajuste.aplica !== undefined) cuerpo.aplica = ajuste.aplica;
  // `null` SÍ viaja: es «volvé a lo de la agencia».
  if (ajuste.valor !== undefined) cuerpo.valor = ajuste.valor;
  if (ajuste.disparadorDia !== undefined) cuerpo.disparadorDia = ajuste.disparadorDia;
  return cuerpo;
}

export const reglasDeMoraApi = {
  /**
   * Las reglas de la agencia vistas desde UN contrato: todas las activas, con
   * lo efectivo para ese contrato y lo de la agencia al lado.
   */
  async delContrato(contractId: string): Promise<ReglaDeMoraDelContrato[]> {
    const res = await apiClient.get<
      ReglaDeMoraDelContratoCruda[] | { data: ReglaDeMoraDelContratoCruda[] }
    >(`/contracts/${contractId}/reglas-de-mora`);
    const lista = Array.isArray(res) ? res : (res?.data ?? []);
    return lista.map(normalizarDelContrato);
  },

  /**
   * Excluir una regla para el contrato, o pisarle el valor o el día. Puede
   * fallar con 400 y un mensaje en español (tasa sobre el techo legal, día
   * fuera de 1-31): se muestra tal cual.
   */
  async ajustarEnContrato(
    contractId: string,
    reglaId: string,
    ajuste: AjusteDeReglaDelContrato,
  ): Promise<ReglaDeMoraDelContrato> {
    const res = await apiClient.put<ReglaDeMoraDelContratoCruda>(
      `/contracts/${contractId}/reglas-de-mora/${reglaId}`,
      cuerpoDeAjuste(ajuste),
    );
    return normalizarDelContrato(res);
  },

  /** Las reglas de la inmobiliaria, en orden de aplicación. */
  async listar(): Promise<ReglaDeMora[]> {
    const res = await apiClient.get<ReglaDeMoraCruda[] | { data: ReglaDeMoraCruda[] }>(BASE);
    return ordenarReglas(comoLista(res).map(normalizarRegla));
  },

  async obtener(id: string): Promise<ReglaDeMora> {
    const res = await apiClient.get<ReglaDeMoraCruda>(`${BASE}/${id}`);
    return normalizarRegla(res);
  },

  /**
   * Crear una regla. Puede fallar con 400 y un mensaje en español que dice
   * qué hacer (interés diario por día del mes, tasa diaria mayor que 1 %,
   * porcentaje mayor que 100). Ese mensaje se muestra tal cual.
   */
  async crear(nueva: NuevaReglaDeMora): Promise<ReglaDeMora> {
    const res = await apiClient.post<ReglaDeMoraCruda>(BASE, cuerpoDeCreacion(nueva));
    return normalizarRegla(res);
  },

  /** Modificar una regla. Sólo viajan las claves que cambian. */
  async actualizar(id: string, cambios: CambiosDeReglaDeMora): Promise<ReglaDeMora> {
    const res = await apiClient.put<ReglaDeMoraCruda>(`${BASE}/${id}`, cuerpoDeCambios(cambios));
    return normalizarRegla(res);
  },

  /**
   * `DELETE` en el back NO borra: desactiva. Los cobros ya emitidos apuntan a
   * la regla por `reglaId`, y ahí vive la explicación de por qué se cobró eso.
   */
  async desactivar(id: string): Promise<ReglaDeMora> {
    const res = await apiClient.delete<ReglaDeMoraCruda>(`${BASE}/${id}`);
    return normalizarRegla(res);
  },
};

export type {
  AjusteDeReglaDelContrato,
  BaseDeCalculo,
  CambiosDeReglaDeMora,
  ConceptoDeRegla,
  DisparadorDeRegla,
  FormulaDeRegla,
  NuevaReglaDeMora,
  ReglaDeMora,
  ReglaDeMoraCruda,
  ReglaDeMoraDelContrato,
} from './reglas-de-mora.types';
