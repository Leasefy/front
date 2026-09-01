/**
 * El loop que crea las fichas de un lote entero, por tandas.
 *
 * ── Por qué no es una sola llamada ──────────────────────────────────────────
 *
 * Crear 600 inquilinos son 600 escrituras Y 600 invitaciones por correo:
 * minutos dentro de UNA petición HTTP. Cualquier proxy con timeout la corta
 * con el servidor todavía trabajando, y la persona ve un error de red sin
 * saber cuántos quedaron creados.
 *
 * El back toma un tope por llamada y devuelve `restantes`. Acá se llama
 * mientras queden, sumando los informes en uno solo. Es reanudable por
 * construcción: cada llamada vuelve a preguntar quién sigue listo, así que un
 * corte a mitad no repite ni pierde nada — volver a apretar el botón sigue
 * donde quedó.
 *
 * Vive aparte del componente para poder probar el loop sin pintar nada, igual
 * que `activarLoteCompleto` en la importación de inmuebles.
 */

import type {
  ResumenDeAplicacion,
  ResultadoDeFila,
} from '@/lib/api/migracion-terceros.service';

/**
 * Tope de vueltas. Con 100 filas por tanda cubre 10.000 — el doble del máximo
 * de un lote. No es una optimización: es lo que impide que un back que
 * siempre devuelve `restantes > 0` deje al navegador girando para siempre.
 */
export const MAX_TANDAS = 100;

export interface ProgresoDeAplicacion {
  /** Cuántas fichas se crearon hasta ahora. */
  aplicadas: number;
  /** Cuántas faltan, según lo último que dijo el servidor. */
  restantes: number;
}

/**
 * Llama a `aplicar` hasta que no queden filas listas.
 *
 * Un error de red a mitad NO se traga: se propaga con lo que ya se hizo
 * pegado (`AplicacionInterrumpida`), porque el mensaje «se crearon 250 antes
 * del corte» es la diferencia entre reintentar tranquilo y no saber qué pasó.
 */
export async function aplicarLoteDeTerceros(
  lote: string,
  aplicar: (lote: string) => Promise<ResumenDeAplicacion>,
  onProgreso?: (p: ProgresoDeAplicacion) => void,
): Promise<ResumenDeAplicacion> {
  const acumulado: ResumenDeAplicacion = {
    lote,
    intentadas: 0,
    aplicadas: 0,
    fallidas: 0,
    invitados: 0,
    sinInvitar: 0,
    resultados: [],
    restantes: 0,
  };

  for (let vuelta = 0; vuelta < MAX_TANDAS; vuelta++) {
    let tanda: ResumenDeAplicacion;
    try {
      tanda = await aplicar(lote);
    } catch (e) {
      // Lo hecho, hecho está: el error viaja con el parcial adentro.
      throw new AplicacionInterrumpida(acumulado, e);
    }

    acumulado.intentadas += tanda.intentadas;
    acumulado.aplicadas += tanda.aplicadas;
    acumulado.fallidas += tanda.fallidas;
    acumulado.invitados += tanda.invitados;
    acumulado.sinInvitar = (acumulado.sinInvitar ?? 0) + (tanda.sinInvitar ?? 0);
    acumulado.resultados.push(...(tanda.resultados as ResultadoDeFila[]));
    acumulado.restantes = tanda.restantes ?? 0;

    onProgreso?.({ aplicadas: acumulado.aplicadas, restantes: acumulado.restantes });

    if (!tanda.restantes) break;
    /*
     * Una tanda que no intentó NADA y aun así dice que quedan es un back que
     * no avanza: cortar acá evita un loop infinito disfrazado de progreso.
     */
    if (tanda.intentadas === 0) break;
  }

  return acumulado;
}

/** Un corte a mitad del loop, con lo que sí se alcanzó a crear. */
export class AplicacionInterrumpida extends Error {
  constructor(
    public readonly parcial: ResumenDeAplicacion,
    public readonly causa: unknown,
  ) {
    super(causa instanceof Error ? causa.message : 'No pudimos crear las fichas.');
    this.name = 'AplicacionInterrumpida';
  }
}
