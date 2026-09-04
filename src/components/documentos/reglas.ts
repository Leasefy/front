/**
 * Las reglas del diálogo de «Generar documento», sin React.
 *
 * Están acá y no dentro del componente porque son las que deciden si el botón
 * se puede apretar: qué hace falta elegir para cada tipo, cuándo un incremento
 * se pasa del tope legal, y qué documento cae bajo cada filtro. Probarlas no
 * debería exigir montar un diálogo.
 */

import type {
  CategoriaDeDocumento,
  CodigoDeDocumentoLegal,
  DocumentoGenerado,
  EstadoDeDocumento,
  CampoDeDocumento,
  PlantillaLegalDelSistema,
  RevisionDelIncremento,
} from '@/lib/api/documentos.service';

// ─── Etiquetas ───────────────────────────────────────────────────────────────

export const ESTADO_LABEL: Record<EstadoDeDocumento, string> = {
  DOC_DRAFT: 'Borrador',
  PENDING_SIGNATURE: 'Por firmar',
  DOC_SIGNED: 'Firmado',
  DOC_EXPIRED: 'Vencido',
};

export const ESTADO_BADGE: Record<EstadoDeDocumento, string> = {
  DOC_DRAFT: 'bg-surface-muted text-fg-muted',
  PENDING_SIGNATURE: 'bg-warning-soft text-warning',
  DOC_SIGNED: 'bg-success-soft text-success',
  DOC_EXPIRED: 'bg-danger-soft text-danger',
};

export const CATEGORIA_LABEL: Record<CategoriaDeDocumento, string> = {
  CONTRATO: 'Contrato',
  ACTA: 'Acta',
  INVENTARIO: 'Inventario',
  POLIZA: 'Póliza',
  CARTA: 'Carta',
  OTRO: 'Otro',
};

/** De qué inmueble o contrato habla el documento, para la columna de la tabla. */
export function etiquetaDelInmueble(doc: DocumentoGenerado): string | null {
  if (doc.contract) {
    const direccion = doc.contract.propertyAddress ?? doc.consignacion?.propertyTitle ?? null;
    return direccion ? `#${doc.contract.code} · ${direccion}` : `Contrato #${doc.contract.code}`;
  }
  return doc.consignacion?.propertyTitle ?? null;
}

/** Entre quiénes es. Sale del contrato, que es el único que las tiene juntas. */
export function etiquetaDePartes(doc: DocumentoGenerado): string | null {
  const partes = [doc.contract?.landlordName, doc.contract?.tenantName].filter(
    (p): p is string => Boolean(p),
  );
  return partes.length > 0 ? partes.join(' · ') : null;
}

// ─── Filtros de la tabla ─────────────────────────────────────────────────────

export interface FiltrosDeDocumentos {
  texto: string;
  categoria: CategoriaDeDocumento | 'todas';
  estado: EstadoDeDocumento | 'todos';
}

export const FILTROS_VACIOS: FiltrosDeDocumentos = {
  texto: '',
  categoria: 'todas',
  estado: 'todos',
};

export function hayFiltros(f: FiltrosDeDocumentos): boolean {
  return f.texto.trim() !== '' || f.categoria !== 'todas' || f.estado !== 'todos';
}

export function filtrarDocumentos(
  documentos: readonly DocumentoGenerado[],
  f: FiltrosDeDocumentos,
): DocumentoGenerado[] {
  const texto = f.texto.trim().toLowerCase();
  return documentos.filter((d) => {
    if (f.estado !== 'todos' && d.status !== f.estado) return false;
    if (f.categoria !== 'todas' && d.template?.category !== f.categoria) return false;
    if (!texto) return true;
    const buscable = [
      d.name,
      etiquetaDelInmueble(d),
      etiquetaDePartes(d),
      d.template?.name,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return buscable.includes(texto);
  });
}

// ─── Qué pide cada tipo ──────────────────────────────────────────────────────

export type EleccionDeFuente = 'contrato' | 'contrato-o-inmueble';

/**
 * Si con lo elegido alcanza para pedirle al backend los campos prellenados.
 * Un contrato de arrendamiento o una carta de incremento NO se pueden armar
 * sobre un inmueble suelto: no hay partes, ni canon, ni plazo.
 */
export function puedePreparar(
  plantilla: Pick<PlantillaLegalDelSistema, 'requiere'> | null,
  eleccion: { contractId?: string; consignacionId?: string },
): boolean {
  if (!plantilla) return false;
  if (plantilla.requiere === 'contrato') return Boolean(eleccion.contractId);
  // `||` y no `??`: el diálogo guarda «nada elegido» como cadena vacía, y `??`
  // sólo cae con null/undefined. Con `??`, elegir SOLO un inmueble nunca
  // preparaba nada — la cadena vacía del contrato ganaba y devolvía false.
  return Boolean(eleccion.contractId || eleccion.consignacionId);
}

/** El texto del vacío mientras no se eligió sobre qué generar. */
export function queFaltaElegir(
  plantilla: Pick<PlantillaLegalDelSistema, 'requiere'> | null,
): string {
  if (!plantilla) return 'Elegí qué documento querés generar.';
  return plantilla.requiere === 'contrato'
    ? 'Elegí el contrato sobre el que se genera.'
    : 'Elegí un contrato o un inmueble.';
}

// ─── Campos ──────────────────────────────────────────────────────────────────

/** Los campos requeridos que están vacíos, en el orden en que se muestran. */
export function camposFaltantes(
  campos: readonly CampoDeDocumento[],
  valores: Record<string, string>,
): CampoDeDocumento[] {
  return campos.filter((c) => {
    if (!c.requerida) return false;
    const valor = valores[c.nombre] ?? c.valor;
    return valor.trim() === '';
  });
}

// ─── Tope legal del incremento (Ley 820 de 2003, art. 20) ────────────────────

/** «5,10» y «5.10» son el mismo número. Vacío o no numérico → null. */
export function parsearPorcentaje(texto: string): number | null {
  const limpio = texto.trim().replace(',', '.');
  if (!limpio) return null;
  const n = Number(limpio);
  return Number.isFinite(n) ? n : null;
}

export interface AvisoDelIncremento {
  /** Impide generar. */
  bloquea: boolean;
  texto: string;
}

/**
 * Lo que la pantalla tiene que decir sobre un incremento propuesto.
 *
 * El backend vuelve a hacer esta cuenta y corta con 400 — acá se hace para no
 * mandar a la persona a un error evitable, no para reemplazarla.
 */
export function avisoDelIncremento(
  revision: RevisionDelIncremento | null,
  porcentajePropuesto: string,
): AvisoDelIncremento | null {
  if (!revision) return null;

  if (revision.topeLegal === null || revision.ipcAno === null) {
    return {
      bloquea: true,
      texto:
        'El DANE todavía no publicó el IPC del año calendario anterior a esa fecha. Revisá la fecha de vigencia.',
    };
  }

  if (!revision.cumpleLosDoceMeses) {
    return {
      bloquea: true,
      texto: `El canon lleva ${revision.mesesBajoElMismoPrecio} meses sin variación. El artículo 20 de la Ley 820 de 2003 exige doce.`,
    };
  }

  const propuesto = parsearPorcentaje(porcentajePropuesto);
  const tope = formatearPorcentaje(revision.topeLegal);

  if (propuesto === null) {
    return {
      bloquea: true,
      texto: `Escribí el incremento. El tope legal es ${tope}: el IPC de ${revision.ipcAno}.`,
    };
  }

  if (propuesto <= 0) {
    return { bloquea: true, texto: 'El incremento tiene que ser mayor que cero.' };
  }

  if (propuesto > revision.topeLegal) {
    return {
      bloquea: true,
      texto: `${formatearPorcentaje(propuesto)} supera el tope legal de ${tope} (100 % del IPC de ${revision.ipcAno}, Ley 820 de 2003 art. 20).`,
    };
  }

  return {
    bloquea: false,
    texto: `Tope legal ${tope} — el IPC de ${revision.ipcAno} certificado por el DANE.`,
  };
}

/** `5.1` → «5,10 %». El mismo formato que usa el DANE. */
export function formatearPorcentaje(valor: number): string {
  return `${valor.toFixed(2).replace('.', ',')} %`;
}

/** `2500000` → «$ 2.500.000». Pesos enteros. */
export function formatearPesos(valor: number): string {
  return `$ ${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(valor)}`;
}

// ─── Puede generarse ─────────────────────────────────────────────────────────

export function puedeGenerar(entrada: {
  plantilla: Pick<PlantillaLegalDelSistema, 'requiere' | 'codigo'> | null;
  contractId?: string;
  consignacionId?: string;
  campos: readonly CampoDeDocumento[];
  valores: Record<string, string>;
  incremento: RevisionDelIncremento | null;
}): boolean {
  if (!puedePreparar(entrada.plantilla, entrada)) return false;
  if (camposFaltantes(entrada.campos, entrada.valores).length > 0) return false;

  if (entrada.plantilla?.codigo === 'CARTA_INCREMENTO') {
    const propuesto =
      entrada.valores.porcentajeIncremento ??
      entrada.campos.find((c) => c.nombre === 'porcentajeIncremento')?.valor ??
      '';
    const aviso = avisoDelIncremento(entrada.incremento, propuesto);
    if (aviso?.bloquea) return false;
  }

  return true;
}

/** Los códigos que la pantalla sabe ordenar, por si el backend suma otro. */
export const ORDEN_DE_TIPOS: CodigoDeDocumentoLegal[] = [
  'CONTRATO_VIVIENDA',
  'CONTRATO_COMERCIAL',
  'ACTA_ENTREGA',
  'ACTA_DEVOLUCION',
  'INVENTARIO',
  'CARTA_INCREMENTO',
];
