/**
 * 🔴 QUIÉN GESTIONA LA REPARACIÓN (reunión con Portofino, Nico 29-10-2026).
 *
 * «Gestionado por»: quién se encarga de que la reparación se haga — la
 * inmobiliaria (por defecto), el propietario, la administración de la
 * copropiedad (típico en inmuebles nuevos) o el inquilino. Es OTRA cosa que
 * «a cargo de» (quién paga, que se decide al aprobar una cotización).
 *
 * Si NO es la inmobiliaria: no hay cotizaciones de la inmobiliaria, ni
 * descuentos al propietario, ni cobros. Queda un SEGUIMIENTO POR AVISOS: la
 * inmobiliaria registra en qué va (visita, en arreglo, terminado), cada paso
 * con nota. El back (`gestionado-por/gestionado-por.ts`) rechaza cotizar,
 * aprobar, la emergencia y el costo final con 400 `GESTIONADA_POR_OTRO`; acá
 * esos botones ni se ofrecen.
 *
 * Los textos van en español y se traducen donde se pintan (`tr(...)`).
 */
import type {
  EtapaDelSeguimiento,
  GestionadoPor,
  MantenimientoStatus,
  PasoDelSeguimientoExterno,
  SolicitudMantenimiento,
} from '@/lib/types/inmobiliaria';

export const GESTIONADO_POR: readonly GestionadoPor[] = ['inmobiliaria', 'propietario', 'administracion', 'inquilino'];

export const ETAPAS_DEL_SEGUIMIENTO: readonly EtapaDelSeguimiento[] = ['visita', 'en_arreglo', 'terminado'];

/** El mismo tope del back (`MAX_LARGO_NOTA_DEL_SEGUIMIENTO`). */
export const MAX_LARGO_NOTA_DEL_SEGUIMIENTO = 500;

export function esGestionadoPor(v: unknown): v is GestionadoPor {
  return typeof v === 'string' && (GESTIONADO_POR as readonly string[]).includes(v);
}

export function esEtapaDelSeguimiento(v: unknown): v is EtapaDelSeguimiento {
  return typeof v === 'string' && (ETAPAS_DEL_SEGUIMIENTO as readonly string[]).includes(v);
}

/**
 * Quién la gestiona DE VERDAD. Lo que manda el back; sin el campo (back
 * anterior) o con un valor raro, la inmobiliaria.
 *
 * «La hace el propietario» (22-10) ES gestionada por el propietario: el back
 * nuevo ya la manda como `propietario`; uno anterior sólo trae
 * `laHaceElPropietario`, y se lee igual. Así la marca de la tarjeta, el filtro
 * y lo que el detalle esconde dicen lo mismo con los dos.
 */
export function gestionDeLaSolicitud(
  s: Pick<SolicitudMantenimiento, 'gestionadoPor' | 'laHaceElPropietario'>,
): GestionadoPor {
  const g = esGestionadoPor(s.gestionadoPor) ? s.gestionadoPor : 'inmobiliaria';
  if (g === 'inmobiliaria' && s.laHaceElPropietario) return 'propietario';
  return g;
}

/** ¿La gestiona otro? Entonces no se cotiza, no se aprueba y no se descuenta ni cobra nada. */
export function laGestionaOtro(s: Pick<SolicitudMantenimiento, 'gestionadoPor' | 'laHaceElPropietario'>): boolean {
  return gestionDeLaSolicitud(s) !== 'inmobiliaria';
}

/** Los pasos, del más viejo al más nuevo. Sin el campo (back anterior), ninguno. */
export function seguimientoDeLaSolicitud(
  s: Pick<SolicitudMantenimiento, 'seguimientoExterno'>,
): PasoDelSeguimientoExterno[] {
  const pasos = Array.isArray(s.seguimientoExterno) ? s.seguimientoExterno : [];
  return pasos
    .filter((p) => p && esEtapaDelSeguimiento(p.etapa))
    .slice()
    .sort((a, b) => Date.parse(a.fecha) - Date.parse(b.fecha));
}

/**
 * El paso que normalmente sigue: sin pasos, la visita; después de la visita, el
 * arreglo; después del arreglo, terminado. Ya terminada (o la tarjeta cerrada),
 * ninguno.
 */
export function siguienteEtapa(
  pasos: readonly PasoDelSeguimientoExterno[],
  estado: MantenimientoStatus,
): EtapaDelSeguimiento | null {
  if (estado === 'completed' || estado === 'cancelled') return null;
  const ultima = pasos[pasos.length - 1]?.etapa;
  if (!ultima) return estado === 'in_progress' ? 'terminado' : 'visita';
  if (ultima === 'visita') return 'en_arreglo';
  if (ultima === 'en_arreglo') return 'terminado';
  return null;
}

/** ¿Se puede registrar un paso? Abierta y que la gestione otro. */
export function seLeRegistraSeguimiento(
  s: Pick<SolicitudMantenimiento, 'gestionadoPor' | 'laHaceElPropietario' | 'status'>,
): boolean {
  return laGestionaOtro(s) && s.status !== 'completed' && s.status !== 'cancelled';
}

/**
 * Pasarla a otro sólo antes de aprobar una cotización (después ya hay plata
 * comprometida; el back responde 409 `GESTION_CON_COTIZACION_APROBADA`).
 * Devuelve por qué no, o `null` si se puede.
 */
export function porQueNoSePasaAOtro(
  s: Pick<SolicitudMantenimiento, 'selectedQuoteId' | 'approvedAmount' | 'cargoAlInquilino'>,
): string | null {
  if (s.selectedQuoteId || s.approvedAmount != null || s.cargoAlInquilino) {
    return 'Ya tiene una cotización aprobada por la inmobiliaria: ya no se le puede pasar la gestión a otro. Cancélala primero si la va a gestionar otro.';
  }
  return null;
}

/** Cada opción del selector, con lo que significa (formulario y detalle). */
export const OPCIONES_DE_GESTION: readonly { valor: GestionadoPor; etiqueta: string; ayuda: string }[] = [
  {
    valor: 'inmobiliaria',
    etiqueta: 'La inmobiliaria',
    ayuda: 'Cotizas, apruebas y se descuenta o cobra a quien corresponda, como siempre.',
  },
  {
    valor: 'propietario',
    etiqueta: 'El propietario',
    ayuda: 'La arregla él con su gente. Tú registras en qué va.',
  },
  {
    valor: 'administracion',
    etiqueta: 'La administración',
    ayuda: 'La copropiedad: típico en inmuebles nuevos o zonas comunes. Tú registras en qué va.',
  },
  {
    valor: 'inquilino',
    etiqueta: 'El inquilino',
    ayuda: 'La arregla el inquilino. Queda como información.',
  },
];

/** La etiqueta de la opción («El propietario»). */
export function etiquetaDeLaGestion(g: GestionadoPor): string {
  return OPCIONES_DE_GESTION.find((o) => o.valor === g)?.etiqueta ?? 'La inmobiliaria';
}

/** La marca discreta de la tarjeta («Gestiona: el propietario»). La inmobiliaria no lleva marca. */
export const MARCA_DE_LA_GESTION: Record<GestionadoPor, string> = {
  inmobiliaria: 'Gestiona: la inmobiliaria',
  propietario: 'Gestiona: el propietario',
  administracion: 'Gestiona: la administración',
  inquilino: 'Gestiona: el inquilino',
};

/** Cada opción del filtro de la página («Gestiona el propietario»). */
export const FILTRO_DE_LA_GESTION: Record<GestionadoPor, string> = {
  inmobiliaria: 'Gestiona la inmobiliaria',
  propietario: 'Gestiona el propietario',
  administracion: 'Gestiona la administración',
  inquilino: 'Gestiona el inquilino',
};

/**
 * Por qué el detalle no ofrece cotizar, aprobar, la emergencia, el costo final
 * ni descuentos (una línea, Nico 29-10).
 */
export const POR_QUE_NO_SE_COTIZA: Record<Exclude<GestionadoPor, 'inmobiliaria'>, string> = {
  propietario:
    'La gestiona el propietario: no hay cotizaciones, aprobación, costo final ni descuentos. Registras en qué va.',
  administracion:
    'La gestiona la administración: no hay cotizaciones, aprobación, costo final ni descuentos. Registras en qué va.',
  inquilino:
    'La gestiona el inquilino: es informativa, sin cotizaciones, aprobación, costo final ni cobros. Registras en qué va.',
};

/** El nombre de cada paso. */
export const ETIQUETA_DE_LA_ETAPA: Record<EtapaDelSeguimiento, string> = {
  visita: 'Visita',
  en_arreglo: 'En arreglo',
  terminado: 'Terminado',
};

/** Qué le pasa a la tarjeta con cada paso (lo hace el back). */
export const QUE_HACE_LA_ETAPA: Record<EtapaDelSeguimiento, string> = {
  visita: 'La tarjeta se queda donde está.',
  en_arreglo: 'La tarjeta pasa a «En arreglo».',
  terminado: 'La tarjeta pasa a «Completada».',
};

/** El ejemplo de la nota de cada paso. */
export const EJEMPLO_DE_LA_NOTA: Record<EtapaDelSeguimiento, string> = {
  visita: 'Ej.: Fue el técnico de la administración y vuelve el jueves con el repuesto.',
  en_arreglo: 'Ej.: Empezaron hoy; dicen que terminan en dos días.',
  terminado: 'Ej.: El inquilino confirmó que ya no gotea.',
};

/** El paso que mueve la tarjeta a cada columna del tablero (arrastrar una gestionada por otro). */
export function etapaDeLaColumna(destino: MantenimientoStatus): EtapaDelSeguimiento | null {
  if (destino === 'in_progress') return 'en_arreglo';
  if (destino === 'completed') return 'terminado';
  return null;
}

/** Las solicitudes que gestiona `filtro` (`null` = todas). */
export function filtrarPorGestion<T extends Pick<SolicitudMantenimiento, 'gestionadoPor' | 'laHaceElPropietario'>>(
  lista: readonly T[],
  filtro: GestionadoPor | null,
): T[] {
  return filtro ? lista.filter((s) => gestionDeLaSolicitud(s) === filtro) : [...lista];
}
