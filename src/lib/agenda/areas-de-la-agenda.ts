/**
 * La agenda por ÁREA (Nico y Portofino, 29-10-2026): «que la agenda se pueda
 * dividir por área o categoría». Cada tarea o cita cae en un área de una lista
 * CERRADA (validada aquí, no con un CHECK en la base: sumar un área no pide
 * migración) y la agenda se filtra por ella.
 *
 * De dónde sale el área de un evento:
 *   · lo que no es una tarea, de su TIPO (una visita es comercial; una firma o
 *     un vencimiento, de contratos; un acta en curso, de inspecciones);
 *   · una tarea, del área GUARDADA si la hay (la que eligió la persona, o la
 *     automática que se guardó al crearla) y, si no, se DEDUCE de lo que dice:
 *       1. la firma del agente que la dejó («Vidi la agendó», «Niti la dejó»…),
 *       2. el título, 3. la nota, 4. la etiqueta del vínculo (con las mismas
 *          palabras clave, en el orden de `REGLAS_DE_AREA`),
 *       5. un vínculo a un CONTRATO → contratos; si nada, «General».
 *
 * 🔴 La MISMA regla corre en SQL (`areaDeducidaEnSql`) para que el filtro y los
 * conteos los resuelva la base sin la columna (`area-de-la-tarea.pglite.spec.ts`
 * compara las dos sobre los mismos textos). Por eso el texto se normaliza con
 * un mapa explícito de tildes (no `normalize('NFD')`) y las palabras clave sólo
 * llevan letras, números y espacios: un `LIKE` y un `includes` dicen lo mismo.
 *
 * 🔁 ESPEJO del back: `src/inmobiliaria/agenda/areas/area-de-la-tarea.ts`
 * (copiado sin la parte de SQL). Aquí sólo sirve para mostrar en el formulario
 * el área que la tarea va a tomar; la que manda es la del back.
 */

export const AREAS_DE_LA_AGENDA = [
  'comercial',
  'contratos',
  'inspecciones',
  'cobranza',
  'mantenimientos',
  'servicios_publicos',
  'general',
] as const;
export type AreaDeLaAgenda = (typeof AREAS_DE_LA_AGENDA)[number];

export const NOMBRE_DEL_AREA: Record<AreaDeLaAgenda, string> = {
  comercial: 'Comercial',
  contratos: 'Contratos',
  inspecciones: 'Inspecciones',
  cobranza: 'Cobranza',
  mantenimientos: 'Mantenimientos',
  servicios_publicos: 'Servicios públicos',
  general: 'General',
};


export function esAreaDeLaAgenda(v: unknown): v is AreaDeLaAgenda {
  return (
    typeof v === 'string' &&
    (AREAS_DE_LA_AGENDA as readonly string[]).includes(v)
  );
}

/** Los tipos de evento del feed (`AgendaService`). */
export type TipoDeEventoDeAgenda =
  | 'visita'
  | 'firma_pendiente'
  | 'vencimiento_contrato'
  | 'seguimiento'
  | 'inspeccion'
  | 'tarea';

/** El área de lo que el sistema pone solo (todo menos las tareas). */
export const AREA_DEL_TIPO: Record<
  Exclude<TipoDeEventoDeAgenda, 'tarea'>,
  AreaDeLaAgenda
> = {
  visita: 'comercial',
  firma_pendiente: 'contratos',
  vencimiento_contrato: 'contratos',
  inspeccion: 'inspecciones',
  seguimiento: 'general',
};

/**
 * La firma de cada agente: el nombre con que se presenta en la nota («Vidi la
 * agendó»). Es la señal más fuerte de QUIÉN creó la tarea, por eso va primero.
 */
export const AGENTES_POR_AREA: readonly {
  area: AreaDeLaAgenda;
  palabras: readonly string[];
}[] = [
  { area: 'servicios_publicos', palabras: [' servi '] },
  { area: 'cobranza', palabras: [' mori ', ' cobri '] },
  { area: 'mantenimientos', palabras: [' fixi '] },
  { area: 'inspecciones', palabras: [' vidi '] },
  { area: 'contratos', palabras: [' vinci '] },
  { area: 'comercial', palabras: [' niti ', ' imana '] },
];

/**
 * Las palabras clave de cada área, sobre el texto normalizado y con un espacio
 * a cada lado (`' mora '` es la palabra entera; `' mantenimient'`, el comienzo).
 * El ORDEN importa: gana la primera área que calza («cobrar el canon» es
 * cobranza aunque «canon» sea comercial).
 */
export const REGLAS_DE_AREA: readonly {
  area: AreaDeLaAgenda;
  palabras: readonly string[];
}[] = [
  {
    area: 'servicios_publicos',
    palabras: [
      ' servicios publicos',
      ' servicio publico',
      ' epm ',
      ' acueducto',
      ' alcantarillado',
      ' energia ',
      ' gas natural',
      ' recibo de luz',
      ' recibo de la luz',
      ' recibo del agua',
      ' recibo de agua',
      ' recibo del gas',
      ' recibo de gas',
      ' factura de luz',
      ' factura de agua',
      ' factura del agua',
      ' factura de gas',
      ' factura de energia',
      ' emcali',
      ' vanti ',
      ' enel ',
      ' afinia',
      ' reconexion',
      ' corte del servicio',
      ' suspension del servicio',
    ],
  },
  {
    area: 'cobranza',
    palabras: [
      ' cobranza',
      ' cobrar',
      ' cobro',
      ' cartera',
      ' mora ',
      ' moroso',
      ' morosa',
      ' deuda',
      ' acuerdo de pago',
      ' promesa de pago',
      ' recordatorio de pago',
      ' pago atrasado',
      ' pago pendiente',
      ' paz y salvo',
      ' saldo pendiente',
      ' juridico',
      ' recaudo',
      ' estado de cuenta',
    ],
  },
  {
    area: 'mantenimientos',
    palabras: [
      ' mantenimient',
      ' reparacion',
      ' reparar',
      ' arreglo',
      ' arreglar',
      ' plomer',
      ' electricista',
      ' cerrajer',
      ' gotera',
      ' fuga',
      ' humedad',
      ' dano',
      ' averia',
      ' tecnico',
      ' pintura',
      ' pintar',
      ' impermeabiliz',
      ' filtracion',
      ' destapar',
      ' calentador',
    ],
  },
  {
    area: 'inspecciones',
    palabras: [
      ' inspeccion',
      ' acta de entrega',
      ' acta de devolucion',
      ' acta de recibo',
      ' inventario',
      ' entrega del inmueble',
      ' entregar el inmueble',
      ' recibir el inmueble',
      ' devolucion del inmueble',
      ' entrega de llaves',
      ' entregar las llaves',
      ' recibir las llaves',
    ],
  },
  {
    area: 'contratos',
    palabras: [
      ' contrato',
      ' firma',
      ' renovacion',
      ' renovar',
      ' vencimiento',
      ' vence ',
      ' incremento',
      ' reajuste',
      ' prorroga',
      ' terminacion',
      ' desocupacion',
      ' preaviso',
      ' poliza',
      ' codeudor',
      ' deudor solidario',
      ' otrosi',
      ' restitucion',
    ],
  },
  {
    area: 'comercial',
    palabras: [
      ' visita',
      ' captacion',
      ' captar',
      ' publicar',
      ' publicacion',
      ' aviso',
      ' anuncio',
      ' interesado',
      ' prospecto',
      ' lead ',
      ' arrendar',
      ' desocupado',
      ' canon',
      ' postulacion',
      ' postulante',
      ' mostrar',
      ' fotos',
      ' ficha',
      ' marketplace',
      ' mandato',
      ' consignacion',
      ' consignar',
      ' avaluo',
      ' precio',
    ],
  },
];

const CON_TILDE = 'áéíóúüñÁÉÍÓÚÜÑ';
const SIN_TILDE = 'aeiouunaeiouun';

/**
 * El texto como lo compara la regla: minúsculas, sin tildes, todo lo que no es
 * letra o número vuelto un espacio, y un espacio a cada lado. Es EXACTAMENTE
 * lo que hace `textoNormalizadoEnSql`.
 */
export function textoNormalizado(texto: string | null | undefined): string {
  let s = (texto ?? '').toLowerCase();
  s = [...s]
    .map((c) => {
      const i = CON_TILDE.indexOf(c);
      return i >= 0 ? SIN_TILDE[i] : c;
    })
    .join('');
  return ` ${s.replace(/[^a-z0-9]+/g, ' ')} `;
}

function areaPorPalabras(
  texto: string,
  reglas: readonly { area: AreaDeLaAgenda; palabras: readonly string[] }[],
): AreaDeLaAgenda | null {
  for (const r of reglas)
    if (r.palabras.some((p) => texto.includes(p))) return r.area;
  return null;
}

export interface DatosDeLaTarea {
  /** El área guardada en la tarea (con la migración), si la hay. */
  area?: string | null;
  titulo?: string | null;
  nota?: string | null;
  vinculoTipo?: string | null;
  vinculoLabel?: string | null;
}

/** El área de una tarea: la guardada si es válida; si no, la que se deduce de lo que dice. */
export function areaDeLaTarea(t: DatosDeLaTarea): AreaDeLaAgenda {
  if (esAreaDeLaAgenda(t.area)) return t.area;
  const titulo = textoNormalizado(t.titulo);
  const nota = textoNormalizado(t.nota);
  const vinculo = textoNormalizado(t.vinculoLabel);
  return (
    areaPorPalabras(`${titulo}${nota}`, AGENTES_POR_AREA) ??
    areaPorPalabras(titulo, REGLAS_DE_AREA) ??
    areaPorPalabras(nota, REGLAS_DE_AREA) ??
    areaPorPalabras(vinculo, REGLAS_DE_AREA) ??
    (String(t.vinculoTipo ?? '').toUpperCase() === 'CONTRATO'
      ? 'contratos'
      : 'general')
  );
}

/** El área de cualquier evento del feed. */
export function areaDelEvento(
  tipo: TipoDeEventoDeAgenda,
  tarea?: DatosDeLaTarea,
): AreaDeLaAgenda {
  return tipo === 'tarea' ? areaDeLaTarea(tarea ?? {}) : AREA_DEL_TIPO[tipo];
}
