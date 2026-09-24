/**
 * Tarjetas del ejecutor TAL COMO LAS MANDA EL MICRO, para las pruebas del
 * chat (24-09). No son inventos del front: `tarjetas-de-ejecucion.test.ts`
 * valida cada una, en modo estricto, contra el esquema que el micro publica
 * (`AiHubChatTarjetaDeEjecucion` en `contrato-del-chat-del-micro.json`); si
 * el micro cambia la forma, esa prueba se pone roja antes que la pantalla.
 *
 * Sólo las importan pruebas.
 */

export const AGENCIA = '504bdd59-d05f-4ae2-99c5-b71e6accb58c';
export const CONTRATO_24 = '4a23f784-2050-4874-bfc4-bc9d1352794a';
export const EJECUCION = '6a3540bf-5627-49b4-bad0-6c56c1eacf8c';
export const PROCESO = '9d0c2f4e-1b7a-4c35-8e21-5f7a0b3c9d11';

const RIESGO_NINGUNO = {
  muevePlata: false,
  escribeATerceros: false,
  irreversible: false,
  masiva: false,
  fiscal: false,
  dobleControl: null,
  proceso: false,
  tope: null,
  agenteDueno: 'asistente',
};

/** «Voy a abrir la renovación…» con el plan del back como vista previa. */
export function propuestaDeRenovacion(venceEn = '2099-01-01T00:00:00.000Z') {
  return {
    tipo: 'propuesta' as const,
    ejecucionId: EJECUCION,
    accion: 'abrir_renovacion',
    titulo: 'Abrir la renovación del contrato 24',
    frase: 'Voy a abrir la renovación del contrato 24 con el incremento del IPC.',
    pregunta: '¿Lo hago?',
    porQue: 'Estás en Copiloto: te pregunto antes de hacerlo.',
    modo: 'copiloto' as const,
    riesgo: RIESGO_NINGUNO,
    vistaPrevia: {
      estado: 'ok' as const,
      metodo: 'GET' as const,
      ruta: '/inmobiliaria/renovaciones/plan/:contractId',
      datos: {
        contractId: CONTRATO_24,
        canonActual: 1_500_000,
        canonNuevo: 1_580_000,
        incrementoPorcentaje: 5.33,
        fechaDeInicio: '2027-02-01',
        totalDeCuotas: 12,
        cuotas: Array.from({ length: 12 }, (_, i) => ({
          id: `c0000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
          numero: i + 1,
          vence: `2027-${String((i % 12) + 1).padStart(2, '0')}-05`,
          valor: 1_580_000,
        })),
      },
      recortada: false,
      explicacion: null,
    },
    venceEn,
    siConfirmas: { sale: 'ahora' as const, ejecutarDesde: null, cuando: null },
    dobleControl: null,
    ensayo: false,
    siNoFueraEnsayo: null,
  };
}

/** El lote de giros (💸 👥 📦) fuera de horario, con doble control de P-4 para un administrador. */
export function propuestaDelLote(laOtraMitad: 'la_puedes_hacer_tu' | 'otra_persona' = 'la_puedes_hacer_tu') {
  return {
    ...propuestaDeRenovacion(),
    accion: 'armar_lote_de_giros',
    titulo: 'Armar el lote de giros de septiembre',
    frase: 'Voy a armar el lote de 38 giros por $84.210.000.',
    riesgo: {
      ...RIESGO_NINGUNO,
      muevePlata: true,
      irreversible: true,
      masiva: true,
      dobleControl: { paso: 'propone' as const },
      tope: 10,
      agenteDueno: 'pagos',
    },
    vistaPrevia: {
      estado: 'no_disponible' as const,
      metodo: 'GET' as const,
      ruta: '/inmobiliaria/lotes-de-dispersion/candidatos',
      datos: null,
      recortada: false,
      explicacion: 'El ERP no dio la vista previa a tiempo.',
    },
    siConfirmas: {
      sale: 'programada' as const,
      ejecutarDesde: '2026-09-25T13:00:00.000Z',
      cuando: 'mañana a las 8:00 a. m.',
    },
    dobleControl: {
      paso: 'propone' as const,
      laOtraMitad,
      frase:
        laOtraMitad === 'la_puedes_hacer_tu'
          ? 'Tú armas el lote y tú lo apruebas.'
          : 'Ana Gómez o Carlos Ruiz lo aprueban.',
    },
  };
}

export function enCurso(procesoId: string | null = PROCESO) {
  return {
    tipo: 'en_curso' as const,
    ejecucionId: EJECUCION,
    accion: 'emitir_facturas_del_mes',
    titulo: 'Emitir las facturas de septiembre',
    resumen: 'Lo estoy haciendo…',
    procesoId,
    proceso: procesoId ? { estado: 'CORRIENDO' as const, hechos: 1, total: 10, porcentaje: 10, mensaje: null } : null,
    desde: '2026-09-24T14:00:00.000Z',
  };
}

/** Salió en Automático: 1 minuto de gracia con «Deshacer» (P-10). */
export function enGracia(hasta: string, segundos = 60) {
  return {
    tipo: 'resultado' as const,
    ejecucionId: EJECUCION,
    accion: 'mandar_estado_de_cuenta_por_correo',
    titulo: 'Mandarle el estado de cuenta por correo',
    estado: 'en_gracia' as const,
    resumen: 'Le mando el estado de cuenta a Mateo Pérez por correo.',
    gracia: { hasta, segundos },
    deshacer: { etiqueta: 'Deshacer', intencion: { accion: 'deshacer', propuestaId: EJECUCION } },
  };
}

export function hecha(conDeshacer: boolean) {
  return {
    tipo: 'resultado' as const,
    ejecucionId: EJECUCION,
    accion: 'registrar_pago',
    titulo: 'Registrar el pago',
    estado: 'hecha' as const,
    resumen: 'Registré el pago de $1.550.000 (recibo RC-0192).',
    gracia: null,
    deshacer: conDeshacer
      ? { etiqueta: 'Anular el recibo', intencion: { accion: 'deshacer', propuestaId: EJECUCION } }
      : null,
  };
}

export function programada(ejecutarDesde = '2099-01-01T13:00:00.000Z', conDeshacer = true) {
  return {
    tipo: 'programada' as const,
    ejecucionId: EJECUCION,
    accion: 'mandar_estado_de_cuenta_por_whatsapp',
    titulo: 'Mandarle el estado de cuenta por WhatsApp',
    resumen:
      'Está fuera del horario de cobranza (8 a. m. a 7 p. m.): lo programo para mañana a las 8:00 a. m.',
    ejecutarDesde,
    cuando: 'mañana a las 8:00 a. m.',
    ventana: 'cobranza' as const,
    saleSola: true,
    deshacer: conDeshacer
      ? { etiqueta: 'No mandarlo', intencion: { accion: 'deshacer', propuestaId: EJECUCION } }
      : null,
  };
}

export function errorDePermiso(conSegundoFactor: boolean, quienesPueden: string[] | null = ['Ana Gómez', 'Carlos Ruiz']) {
  return {
    tipo: 'error' as const,
    ejecucionId: EJECUCION,
    accion: 'registrar_pago',
    titulo: 'Registrar el pago',
    status: 403,
    code: conSegundoFactor ? 'SEGUNDO_FACTOR_REQUERIDO' : 'SIN_PERMISO_DE_MODULO',
    explicacion: conSegundoFactor
      ? 'Tu rol exige segundo factor para registrar pagos. No se hizo nada.'
      : 'Tu rol no puede registrar recibos de caja. No se hizo nada.',
    permiso: { modulo: 'recibos', accion: 'create' },
    quienesPueden,
    segundoFactor: conSegundoFactor
      ? {
          etiqueta: 'Confirmar mi segundo factor',
          reintento: {
            accion: 'registrar_pago',
            entidad: { tipo: 'contrato', id: CONTRATO_24 },
            datos: { valor: 1_550_000, medio: 'transferencia' },
          },
        }
      : null,
  };
}

/** Un `done` del camino directo con la tarjeta (y, para un panel viejo, la `confirmacion`). */
export function doneConEjecucion(ejecucion: unknown, extra: Record<string, unknown> = {}) {
  return {
    responseText: 'Antes de hacerlo, confírmame:',
    suggestedActions: [],
    dispatches: [],
    pendingApprovals: [],
    accionesPropuestas: [],
    entidades: [],
    bloques: [],
    acciones: [],
    confirmacion: null,
    resultado: null,
    formulario: null,
    ejecucion,
    ensayo: false,
    camino: 'directo:confirmacion',
    turnoId: 't-1',
    generatedAt: '2026-09-24T14:00:00.000Z',
    ...extra,
  };
}
