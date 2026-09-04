/**
 * El esquema del formulario de una regla de mora, y las dos plantillas.
 *
 * Las validaciones cruzadas replican, con el MISMO texto, las de
 * `ReglasDeMoraService.exigirCoherencia` del back: así la persona ve el
 * error al escribir y no después de un viaje a la red. El back sigue siendo
 * quien manda — si el front se queda atrás, el 400 llega igual y se muestra
 * tal cual.
 *
 * No hay `@hookform/resolvers` en el proyecto; `resolverDeZod` es el puente
 * mínimo entre zod y react-hook-form.
 */

import { z } from 'zod';
import type { FieldErrors, Resolver } from 'react-hook-form';
import type { NuevaReglaDeMora } from '@/lib/api/reglas-de-mora.types';
import {
  BASES_DE_CALCULO,
  CONCEPTOS_DE_REGLA,
  DISPARADORES_DE_REGLA,
  FORMULAS_DE_REGLA,
} from '@/lib/api/reglas-de-mora.types';

export const esquemaDeRegla = z
  .object({
    nombre: z
      .string({ required_error: 'Ponele un nombre.' })
      .trim()
      .min(3, 'El nombre necesita al menos 3 letras.')
      .max(120, 'El nombre no puede pasar de 120 letras.'),
    concepto: z.enum(CONCEPTOS_DE_REGLA),
    disparador: z.enum(DISPARADORES_DE_REGLA),
    disparadorDia: z
      .number({ invalid_type_error: 'Poné el día.', required_error: 'Poné el día.' })
      .int('Tiene que ser un número entero.')
      .min(0, 'No puede ser negativo.')
      .max(365, 'Como mucho 365.'),
    formula: z.enum(FORMULAS_DE_REGLA),
    valor: z
      .number({ invalid_type_error: 'Poné el valor.', required_error: 'Poné el valor.' })
      .min(0, 'No puede ser negativo.'),
    base: z.enum(BASES_DE_CALCULO),
    topeCop: z
      .number({ invalid_type_error: 'El tope es un monto en pesos.' })
      .int('El tope va en pesos enteros.')
      .min(0, 'El tope no puede ser negativo.')
      .nullable(),
    orden: z
      .number({ invalid_type_error: 'Poné el orden.', required_error: 'Poné el orden.' })
      .int('Tiene que ser un número entero.')
      .min(0, 'No puede ser negativo.')
      .max(100, 'Como mucho 100.'),
    activa: z.boolean(),
  })
  .superRefine((v, ctx) => {
    // Los cuatro mensajes son los del back, letra por letra.
    if (v.disparador === 'DIA_DEL_MES' && (v.disparadorDia < 1 || v.disparadorDia > 31)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['disparadorDia'],
        message: 'Un disparador por día del mes tiene que estar entre 1 y 31.',
      });
    }
    if (v.formula === 'INTERES_DIARIO' && v.disparador === 'DIA_DEL_MES') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['disparador'],
        message:
          'Un interés diario se dispara por días de mora, no por día del mes: ' +
          'atado a una fecha del calendario cobraría lo mismo el día 16 que el 30.',
      });
    }
    if (v.formula === 'INTERES_DIARIO' && v.valor > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['valor'],
        message:
          `Una tasa DIARIA de ${v.valor}% son ${(v.valor * 30).toFixed(1)}% al mes. ` +
          'Si querés esa cifra mensual, la diaria es ese número dividido 30.',
      });
    }
    if (v.formula === 'PORCENTAJE_DE_LA_BASE' && v.valor > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['valor'],
        message: 'Un porcentaje mayor que 100 cobraría más que la deuda entera.',
      });
    }
  });

/** Lo que el formulario maneja. Los enums salen de las tuplas del contrato, así que quedan tipados como los del back. */
export type ValoresDeRegla = z.infer<typeof esquemaDeRegla>;

export const VALORES_INICIALES: ValoresDeRegla = {
  nombre: '',
  concepto: 'INTERES_DE_MORA',
  disparador: 'DIAS_DE_MORA',
  disparadorDia: 1,
  formula: 'INTERES_DIARIO',
  valor: Number.NaN,
  base: 'CANON',
  topeCop: null,
  orden: 0,
  activa: true,
};

/**
 * Resolver de react-hook-form sobre un esquema zod. El primer error por campo
 * gana; `root` para los que no apuntan a ningún campo.
 */
export function resolverDeZod<T extends z.ZodTypeAny>(
  esquema: T,
): Resolver<z.input<T>, unknown, z.output<T>> {
  return async (valores) => {
    const resultado = esquema.safeParse(valores);
    if (resultado.success) {
      return { values: resultado.data, errors: {} };
    }
    const errores: Record<string, { type: string; message: string }> = {};
    for (const issue of resultado.error.issues) {
      const ruta = issue.path.length ? issue.path.join('.') : 'root';
      if (!errores[ruta]) errores[ruta] = { type: issue.code, message: issue.message };
    }
    return { values: {}, errors: errores as FieldErrors<z.input<T>> };
  };
}

/** `2 % mensual` expresado por día, redondeado a cuatro decimales: `0.0667`. */
export const TASA_DIARIA_DEL_2_MENSUAL = Math.round((2 / 30) * 10000) / 10000;

export interface PlantillaDeRegla {
  id: 'interes-diario' | 'gasto-administrativo';
  titulo: string;
  explicacion: string;
  valores: NuevaReglaDeMora;
}

/**
 * Las dos reglas con las que cobra una inmobiliaria de verdad. Se ofrecen
 * como sugerencia en el estado vacío; la persona decide.
 */
export const PLANTILLAS: readonly PlantillaDeRegla[] = [
  {
    id: 'interes-diario',
    titulo: 'Interés diario después del plazo',
    explicacion:
      'Cada día de atraso suma 0,0667 % del canon —2 % al mes— a partir del primer día después del plazo. Es el interés corriente de la mora.',
    valores: {
      nombre: 'Interés de mora',
      concepto: 'INTERES_DE_MORA',
      disparador: 'DIAS_DE_MORA',
      disparadorDia: 1,
      formula: 'INTERES_DIARIO',
      valor: TASA_DIARIA_DEL_2_MENSUAL,
      base: 'CANON',
      orden: 0,
    },
  },
  {
    id: 'gasto-administrativo',
    titulo: '10 % de gasto administrativo desde el 15',
    explicacion:
      'El día 15 de cada mes, si el canon sigue sin pagarse, se suma una sola vez un 10 % del canon como honorario de cobranza.',
    valores: {
      nombre: 'Gasto administrativo de cobranza',
      concepto: 'GASTO_ADMINISTRATIVO',
      disparador: 'DIA_DEL_MES',
      disparadorDia: 15,
      formula: 'PORCENTAJE_DE_LA_BASE',
      valor: 10,
      base: 'CANON',
      orden: 1,
    },
  },
];
