/**
 * Reglas de mora — los tipos del contrato con `/inmobiliaria/reglas-de-mora`.
 *
 * Calcados de `back/src/inmobiliaria/cobros/reglas-de-mora/reglas-de-mora.dto.ts`
 * y del modelo `ReglaDeMora` de `prisma/schema.prisma`. Los enums son los del
 * back, letra por letra: el front no inventa valores.
 */

/**
 * Lo que una regla puede agregar al cobro. 🔴 Deliberadamente NO es todo el
 * `TipoDeConcepto`: una regla no puede emitir un canon ni un IVA — eso lo arma
 * el motor a partir del contrato. El back lo rechaza con 400.
 */
export const CONCEPTOS_DE_REGLA = ['INTERES_DE_MORA', 'GASTO_ADMINISTRATIVO', 'AJUSTE_MANUAL'] as const;
export type ConceptoDeRegla = (typeof CONCEPTOS_DE_REGLA)[number];

/**
 * `DIAS_DE_MORA`: cuenta desde que se venció el plazo («desde el día 1 de mora»).
 * `DIA_DEL_MES`: un día del calendario («pasado el 15 de cada mes»).
 */
export const DISPARADORES_DE_REGLA = ['DIAS_DE_MORA', 'DIA_DEL_MES'] as const;
export type DisparadorDeRegla = (typeof DISPARADORES_DE_REGLA)[number];

/**
 * `INTERES_DIARIO`: tasa aplicada una vez POR DÍA de mora sobre la base.
 * `PORCENTAJE_DE_LA_BASE`: un porcentaje único de la base, el día que se dispara.
 * `MONTO_FIJO`: un monto en pesos.
 */
export const FORMULAS_DE_REGLA = ['INTERES_DIARIO', 'PORCENTAJE_DE_LA_BASE', 'MONTO_FIJO'] as const;
export type FormulaDeRegla = (typeof FORMULAS_DE_REGLA)[number];

/** Sobre qué plata se calcula. `TOTAL_ADEUDADO` compone: ve los recargos previos. */
export const BASES_DE_CALCULO = ['CANON', 'CANON_MAS_ADMINISTRACION', 'TOTAL_ADEUDADO'] as const;
export type BaseDeCalculo = (typeof BASES_DE_CALCULO)[number];

export interface ReglaDeMora {
  id: string;
  agencyId: string;
  /** Cómo se llama en el estado de cuenta del inquilino. */
  nombre: string;
  concepto: ConceptoDeRegla;
  disparador: DisparadorDeRegla;
  /** Día de mora, o día del mes, según el disparador. */
  disparadorDia: number;
  formula: FormulaDeRegla;
  /**
   * Porcentaje (10 = 10 %) o monto en pesos, según la fórmula. En
   * `INTERES_DIARIO` es el porcentaje POR DÍA.
   */
  valor: number;
  base: BaseDeCalculo;
  /** Techo en pesos de lo que esta regla puede agregar. `null` = sin techo. */
  topeCop: number | null;
  activa: boolean;
  /** Orden de aplicación, de menor a mayor. */
  orden: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * La fila tal cual llega del back. `valor` es un `Decimal` de Prisma y viaja
 * como STRING en el JSON (`"0.0667"`); el service lo convierte una sola vez.
 */
export type ReglaDeMoraCruda = Omit<ReglaDeMora, 'valor' | 'topeCop'> & {
  valor: number | string;
  topeCop?: number | null;
};

/** El cuerpo de `POST` — `CrearReglaDeMoraDto`. */
export interface NuevaReglaDeMora {
  nombre: string;
  concepto: ConceptoDeRegla;
  disparador: DisparadorDeRegla;
  disparadorDia: number;
  formula: FormulaDeRegla;
  valor: number;
  base: BaseDeCalculo;
  topeCop?: number | null;
  activa?: boolean;
  orden?: number;
}

/**
 * El cuerpo de `PUT` — `ActualizarReglaDeMoraDto`. Todo opcional; `topeCop: null`
 * es la única manera de QUITAR un tope que ya existía.
 */
export type CambiosDeReglaDeMora = Partial<NuevaReglaDeMora>;

/**
 * Una regla de la agencia vista desde UN contrato — `GET /contracts/:id/reglas-de-mora`.
 *
 * `valor` y `disparadorDia` son lo EFECTIVO para este contrato (lo propio si
 * lo pisó, si no lo de la agencia); `*DeLaAgencia` va al lado para poder
 * decir «propio» y ofrecer volver a la general. Sin ajuste, `esPropio` es
 * `false` y las dos columnas coinciden.
 */
export interface ReglaDeMoraDelContrato {
  regla: ReglaDeMora;
  /** `false` = esta regla no se le aplica a este contrato. */
  aplica: boolean;
  valor: number;
  valorDeLaAgencia: number;
  disparadorDia: number;
  disparadorDiaDeLaAgencia: number;
  esPropio: boolean;
}

/** Como llega del back: los `valor` son `Decimal` y pueden viajar como string. */
export type ReglaDeMoraDelContratoCruda = Omit<
  ReglaDeMoraDelContrato,
  'regla' | 'valor' | 'valorDeLaAgencia'
> & {
  regla: ReglaDeMoraCruda;
  valor: number | string;
  valorDeLaAgencia: number | string;
};

/**
 * El cuerpo de `PUT /contracts/:id/reglas-de-mora/:reglaId`. `null` es una
 * acción («volvé a lo de la agencia»), distinta de no mandar la clave.
 */
export interface AjusteDeReglaDelContrato {
  aplica?: boolean;
  valor?: number | null;
  disparadorDia?: number | null;
}
