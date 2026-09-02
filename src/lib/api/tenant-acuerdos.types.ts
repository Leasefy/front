/**
 * Acuerdos de pago — contrato de tipos del lado inquilino (v7-07, frontend-first).
 *
 * El registro de un acuerdo de pago es UN SOLO shape: el `CarteraPaymentPlanDetailResponse`
 * del agente (`Leasefy/agent`, motor de cartera/payment-plans), ya generado en
 * `./generated/agent`. Aquí se RE-EXPORTA — NUNCA se re-declara — para que exista una
 * única fuente de verdad del saldo (PITFALLS 9 / A5): el frontend no mantiene un segundo
 * modelo del acuerdo ni recomputa totales. Toda la matriz de política + `requiresHumanReview()`
 * viven ENTERAMENTE en el agente; estos campos son de SOLO LECTURA en el lado inquilino.
 *
 * Al momento de entregar, las rutas tenant-scoped (RLS) del agente todavía no existen
 * (Assumptions A1–A4), así que el servicio degrada a vacío/no-disponible de forma honesta
 * ("Próximamente", DESIGN.md §11). Estos tipos describen el shape estable que las olas 2-5
 * consumen; NO hay data falsa hasta que exista el motor.
 */

import type { components } from './generated/agent';

/**
 * El registro único del acuerdo (deuda total, cuotas, estado, paymentUrl, fechas).
 * SOLO LECTURA tenant-side: `discountKind`, `discountAppliedPct` y demás internos de política
 * se muestran, nunca se editan — el agente los computa y aprueba. Saldo y montos se leen
 * verbatim de `totalDueCop` + `installments[]`, sin aritmética del cliente.
 */
export type AcuerdoDetail = components['schemas']['CarteraPaymentPlanDetailResponse'];

/**
 * Resultado que devuelve el agente al aceptar un acuerdo (`planId`, `status`, `acceptedAt`).
 * El `status` lo fija el AGENTE (transición offered→active) — nunca se asume optimistamente
 * en el cliente.
 */
export type AcuerdoAcceptResult = components['schemas']['CarteraPaymentPlanAcceptResponse'];

/**
 * Una cuota del plan, derivada verbatim del registro (`number/dueDate/amountCop/status/paidAt`)
 * para que una fila de cuota mapee 1:1. NO se declara un tipo `Cuota` a mano — se proyecta el
 * shape del agente.
 */
export type AcuerdoInstallment = AcuerdoDetail['installments'][number];

/**
 * Body del POST de aceptación: la firma (PNG en base64) + un token OTP de un solo uso.
 * El agente persiste la firma y realiza la transición offered→active; el cliente solo captura.
 */
export interface AcuerdoAcceptInput {
  signatureData: string;
  otpVerificationToken: string;
}

/**
 * Solicitud de un plan de pago pre-mora (ACUE-04) — INTENCIÓN ÚNICAMENTE: propone un plan y
 * alimenta el pipeline de aprobación de la inmobiliaria; NUNCA fija términos y no lleva campos
 * de descuento / cuota / consecuencia (el agente + la agencia calculan y aprueban). Omite
 * deliberadamente cualquier campo de causa de atraso (Ley 2300/2023 art. 7) y cualquier
 * referencia a reportes ante entidades de historial crediticio (Ley 1266/2008 + 2157/2021).
 */
export interface PremoraPlanRequestInput {
  leaseId: string;
}
