/**
 * Tarjetas del PLAN tal como las manda el micro (24-09, paquete H), para las
 * pruebas del chat. `plan-del-chat.test.ts` valida cada una, estricta, contra
 * el esquema que el micro publica (`AiHubChatTarjetaPlan`, dentro de
 * `AiHubChatPiezasNuevasDelDone.plan` en `contrato-del-chat-del-micro.json`).
 *
 * Sólo las importan pruebas.
 */

export const PLAN = '0b9e8d7c-6a5f-4e3d-9c2b-1a0f9e8d7c6b';
export const EJECUCION_DEL_PASO_1 = '5c4b3a29-1807-4f6e-8d5c-4b3a29180700';

const RIESGO_PLATA = {
  muevePlata: true,
  escribeATerceros: false,
  irreversible: false,
  masiva: false,
  fiscal: false,
  dobleControl: null,
  proceso: false,
  tope: null,
  agenteDueno: 'conciliacion',
};
const RIESGO_CORREO = { ...RIESGO_PLATA, muevePlata: false, escribeATerceros: true, agenteDueno: 'cobranza' };

const pasoDelPago = (extra: Record<string, unknown> = {}) => ({
  n: 1,
  accion: 'registrar_pago',
  titulo: 'Registrar un pago',
  frase: 'Voy a registrar un pago de $500.000 de Mateo Pérez Jaramillo en el contrato #24 (Transferencia); se aplica a la deuda más vieja.',
  riesgo: RIESGO_PLATA,
  estado: 'pendiente' as const,
  resumen: null,
  ejecucionId: null,
  deshacer: null,
  campos: [] as unknown[],
  dependeDe: null,
  ...extra,
});

const pasoDelCorreo = (extra: Record<string, unknown> = {}) => ({
  n: 2,
  accion: 'mandar_estado_de_cuenta_por_correo',
  titulo: 'Mandar el estado de cuenta por correo',
  frase: 'Voy a mandarle el estado de cuenta del contrato #24 a Mateo Pérez Jaramillo por correo (mateo.perez@example.com).',
  riesgo: RIESGO_CORREO,
  estado: 'pendiente' as const,
  resumen: null,
  ejecucionId: null,
  deshacer: null,
  campos: [] as unknown[],
  dependeDe: null,
  ...extra,
});

const base = {
  tipo: 'plan' as const,
  planId: PLAN,
  titulo: 'Plan de 2 pasos',
  cita: 'regístrale un pago de 500 mil al contrato 24 y mándale el estado de cuenta por correo',
  modo: 'copiloto' as const,
  pregunta: '¿Hago todo?',
  porQue: 'Paso 1: Estás en Copiloto: te pregunto antes de hacerlo.',
  venceEn: '2099-01-01T00:00:00.000Z',
  seDetieneAntesDe: null,
  detenido: null,
  seguir: null,
  ensayo: false,
};

/** Recién armado: la fecha del pago falta (se pide en la tarjeta), un «Hacer todo» y un «No». */
export function planPropuesto() {
  return {
    ...base,
    estado: 'propuesto' as const,
    pasos: [
      pasoDelPago({
        campos: [
          {
            clave: 'p1_fecha',
            etiqueta: 'Día en que entró la plata',
            tipo: 'fecha',
            requerido: true,
            opciones: [],
            ayuda: 'Hoy o un día pasado; nunca una fecha futura.',
            valor: null,
          },
        ],
      }),
      pasoDelCorreo(),
    ],
    hacerTodo: { etiqueta: 'Hacer todo', intencion: { accion: 'hacer_plan', planId: PLAN } },
    cancelar: { etiqueta: 'No', intencion: { accion: 'cancelar_plan', planId: PLAN } },
  };
}

/** Se detuvo en el paso 2 (el back contestó 409): el 1 quedó hecho con su «Deshacer». */
export function planDetenido() {
  return {
    ...base,
    estado: 'detenido' as const,
    pasos: [
      pasoDelPago({
        estado: 'hecho',
        resumen: 'Registré el pago de $500.000 en el contrato #24: quedó aplicado a la deuda más vieja.',
        ejecucionId: EJECUCION_DEL_PASO_1,
        deshacer: { etiqueta: 'Anular el recibo', intencion: { accion: 'deshacer', propuestaId: EJECUCION_DEL_PASO_1 } },
      }),
      pasoDelCorreo({ estado: 'fallido', resumen: 'El inquilino no tiene correo registrado.', ejecucionId: '7d6c5b4a-3928-4170-9e6d-5c4b3a291807' }),
    ],
    detenido: { n: 2, tipo: 'fallo' as const, porQue: 'El inquilino no tiene correo registrado.' },
    hacerTodo: null,
    cancelar: { etiqueta: 'No seguir', intencion: { accion: 'cancelar_plan', planId: PLAN } },
    seguir: { etiqueta: 'Reintentar desde el paso 2', intencion: { accion: 'seguir_plan', planId: PLAN } },
  };
}

/** «Genera el contrato y créalo con ese PDF»: el plan se detiene antes del paso 2 y lo dice. */
export function planQueSeDetieneAntes() {
  return {
    ...base,
    titulo: 'Plan de 1 paso',
    estado: 'propuesto' as const,
    pasos: [
      {
        ...pasoDelPago(),
        accion: 'generar_contrato',
        titulo: 'Generar un contrato nuevo con la plantilla legal',
        frase: 'Voy a generar el contrato de vivienda del inmueble «Apartamento en Laureles» con la plantilla legal.',
        riesgo: { ...RIESGO_PLATA, muevePlata: false, agenteDueno: 'contratos' },
      },
    ],
    seDetieneAntesDe: {
      n: 2,
      que: 'crear el contrato con el PDF que se acaba de generar',
      porQue: 'eso todavía no lo puedo hacer desde el chat: la ficha del inmueble no ofrece crear el contrato con un PDF.',
    },
    hacerTodo: { etiqueta: 'Hacer todo', intencion: { accion: 'hacer_plan', planId: PLAN } },
    cancelar: { etiqueta: 'No', intencion: { accion: 'cancelar_plan', planId: PLAN } },
  };
}
