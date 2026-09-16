'use client';

/**
 * Lo que la comisión de los agentes NO está contando, dicho en pantalla.
 *
 * ── Por qué existe ──────────────────────────────────────────────────────────
 *
 * La comisión de un agente sale de los giros al propietario atribuidos a él
 * por la consignación del inmueble (`GET /inmobiliaria/agentes`). Cuando el
 * inmueble no tiene agente asignado, ese giro no le suma a NADIE, y el ranking
 * pintaba «$0» como si fuera un dato. Medido en dev el 16-09: 0 de 1.040
 * contratos vigentes tenían agente asignado. O sea: todos los «$0» del equipo
 * eran un vacío de datos, no un mal mes.
 *
 * `GET /inmobiliaria/agentes/comisiones` dice cuántos giros quedaron sin
 * agente, cuántos son de agentes que ya no están y cuántos contratos vigentes
 * no tienen agente. Este archivo lo lee y lo convierte en dos cosas:
 *
 *   · `porQueLaComisionNoEsUnHecho` — si una cifra en 0 es un vacío, la razón
 *     (y la celda muestra «—» con esa razón, no «$0»).
 *   · `<AvisoDeComisionesSinAtribuir>` — las frases que dicen qué falta y
 *     dónde se arregla.
 *
 * Si el resumen no se pudo leer, no se afirma nada: las cifras se muestran
 * como llegaron y no hay aviso. Inventar un «puede estar incompleto» sin saberlo
 * sería el mismo defecto al revés.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Info } from '@phosphor-icons/react';

import { apiClient } from '@/lib/api/client';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import { cn } from '@/lib/utils';

/** `GET /inmobiliaria/agentes/comisiones` (back: `ResumenDeComisiones`). */
export interface ResumenDeComisiones {
  /** `YYYY-MM` en Bogotá: el mes de «Comisiones del mes». */
  mes: string;
  giros: {
    total: number;
    deCuotas: number;
    historicos: number;
    descartadosPorDuplicado: number;
  };
  sinAgente: {
    giros: number;
    girosDelMes: number;
    comisionCop: number;
    comisionDelMesCop: number;
  };
  deAgentesFueraDelEquipo: { giros: number; comisionCop: number };
  contratosVigentes: { total: number; sinAgente: number };
}

/** Dónde se asigna el agente: la ficha del inmueble, tarjeta «Agente asignado». */
export const RUTA_DE_LOS_INMUEBLES = '/panel/inmobiliaria/inmuebles';

/**
 * Lee el resumen. `skip` para no pedirlo mientras la vista no se mira.
 * Un fallo deja `resumen` en `null`: no hay nada que afirmar.
 */
export function useResumenDeComisiones(skip = false): {
  resumen: ResumenDeComisiones | null;
} {
  const [resumen, setResumen] = useState<ResumenDeComisiones | null>(null);

  useEffect(() => {
    if (skip) return;
    let vigente = true;
    apiClient
      .get<ResumenDeComisiones>('/inmobiliaria/agentes/comisiones')
      .then((r) => {
        if (vigente) setResumen(r);
      })
      .catch(() => {
        if (vigente) setResumen(null);
      });
    return () => {
      vigente = false;
    };
  }, [skip]);

  return { resumen };
}

const numero = (n: number) => n.toLocaleString('es-CO');

function giros(n: number): string {
  return `${numero(n)} ${n === 1 ? 'giro' : 'giros'}`;
}

/**
 * Si una comisión en 0 NO es un hecho, por qué. `null` cuando la cifra se
 * puede mostrar tal cual: es distinta de 0, no hay resumen, o de verdad no le
 * tocó nada a este agente mientras los giros sí tienen dueño.
 */
export function porQueLaComisionNoEsUnHecho(
  valorCop: number,
  resumen: ResumenDeComisiones | null,
  periodo: 'mes' | 'total',
): string | null {
  if (!resumen || valorCop !== 0) return null;

  const sinAgente =
    periodo === 'mes' ? resumen.sinAgente.girosDelMes : resumen.sinAgente.giros;
  if (sinAgente > 0) {
    return `${giros(sinAgente)} ${periodo === 'mes' ? 'de este mes ' : ''}sin agente asignado: esta cifra no los incluye.`;
  }
  if (resumen.giros.total === 0) {
    return 'Todavía no se le ha girado nada a ningún propietario, y la comisión sale de esos giros.';
  }
  return null;
}

/** Las frases, en orden de lo que más cambia el número. Vacío = nada que decir. */
export function frasesDeComisionesSinAtribuir(
  resumen: ResumenDeComisiones,
): string[] {
  const frases: string[] = [];
  const { sinAgente, deAgentesFueraDelEquipo, contratosVigentes } = resumen;

  if (sinAgente.giros > 0) {
    frases.push(
      `${giros(sinAgente.giros)} sin agente asignado (${formatCurrency(sinAgente.comisionCop)} de comisión que no le suma a nadie): asígnalo en la ficha del inmueble, en «Agente asignado».`,
    );
  }
  if (deAgentesFueraDelEquipo.giros > 0) {
    frases.push(
      `${giros(deAgentesFueraDelEquipo.giros)} de agentes que ya no están en el equipo (${formatCurrency(deAgentesFueraDelEquipo.comisionCop)}): no aparecen en el ranking.`,
    );
  }
  if (resumen.giros.total === 0) {
    frases.push(
      'Todavía no hay giros a propietarios: la comisión de cada agente sale de lo que se le gira al dueño, así que por ahora nadie tiene comisión.',
    );
  }
  if (contratosVigentes.sinAgente > 0) {
    const todos = contratosVigentes.sinAgente === contratosVigentes.total;
    frases.push(
      `${todos ? 'Ninguno de los' : `${numero(contratosVigentes.sinAgente)} de`} ${numero(contratosVigentes.total)} contratos vigentes ${todos ? 'tiene' : 'no tienen'} agente asignado: sus giros no le van a sumar a nadie hasta que lo asignes en la ficha del inmueble.`,
    );
  }
  return frases;
}

export function AvisoDeComisionesSinAtribuir({
  resumen,
  className,
}: {
  resumen: ResumenDeComisiones | null;
  className?: string;
}) {
  if (!resumen) return null;
  const frases = frasesDeComisionesSinAtribuir(resumen);
  if (frases.length === 0) return null;

  return (
    <div
      role="note"
      data-testid="aviso-comisiones-sin-atribuir"
      className={cn(
        'flex gap-3 rounded-lg border border-warning/30 bg-warning-soft p-4 text-sm text-fg',
        className,
      )}
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-warning" weight="fill" aria-hidden />
      <div className="space-y-1.5">
        {frases.map((f) => (
          <p key={f}>{f}</p>
        ))}
        <Link
          href={RUTA_DE_LOS_INMUEBLES}
          className="inline-block font-medium text-primary hover:underline"
        >
          Ir a los inmuebles
        </Link>
      </div>
    </div>
  );
}
