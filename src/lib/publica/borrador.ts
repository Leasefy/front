/**
 * El publicador rápido (Juan y Nico, 19-10-2026: «que pueda publicar muy rápido
 * uno o muchos, que se sienta rápido»). Lo puro: el inmueble que se está
 * llenando, qué le falta para publicarse, su título y cómo se guarda en el
 * navegador mientras la persona escribe. Las fotos NO se guardan (son
 * archivos): al volver hay que elegirlas otra vez, y se dice.
 */

export type Operacion = 'rent' | 'sale';

export type TipoRapido = 'APARTMENT' | 'HOUSE' | 'STUDIO' | 'ROOM' | 'COMMERCIAL' | 'OFFICE' | 'WAREHOUSE';

export const TIPOS: { valor: TipoRapido; nombre: string }[] = [
  { valor: 'APARTMENT', nombre: 'Apartamento' },
  { valor: 'HOUSE', nombre: 'Casa' },
  { valor: 'STUDIO', nombre: 'Apartaestudio' },
  { valor: 'ROOM', nombre: 'Habitación' },
  { valor: 'COMMERCIAL', nombre: 'Local' },
  { valor: 'OFFICE', nombre: 'Oficina' },
  { valor: 'WAREHOUSE', nombre: 'Bodega' },
];

export interface InmuebleRapido {
  /** Sólo de la pantalla: identifica la tarjeta. */
  clave: string;
  operacion: Operacion;
  tipo: TipoRapido | null;
  direccion: string;
  ciudad: string;
  barrio: string;
  latitud?: number;
  longitud?: number;
  /** Pesos, sin puntos. `null` = no lo ha escrito. */
  precio: number | null;
  habitaciones: number | null;
  banos: number | null;
  area: number | null;
  descripcion: string;
}

export function inmuebleVacio(clave: string, base?: Partial<InmuebleRapido>): InmuebleRapido {
  return {
    clave,
    operacion: base?.operacion ?? 'rent',
    tipo: base?.tipo ?? null,
    direccion: '',
    ciudad: base?.ciudad ?? '',
    barrio: '',
    precio: null,
    habitaciones: null,
    banos: null,
    area: null,
    descripcion: '',
  };
}

export type CampoQueFalta = 'tipo' | 'direccion' | 'ciudad' | 'precio' | 'fotos';

const FRASES: Record<CampoQueFalta, string> = {
  tipo: 'el tipo',
  direccion: 'la dirección',
  ciudad: 'la ciudad',
  precio: 'el precio',
  fotos: 'al menos una foto',
};

/** Lo que le falta para publicarse, en el orden en que se llena la tarjeta. */
export function loQueFalta(i: InmuebleRapido, fotos: number): CampoQueFalta[] {
  const faltan: CampoQueFalta[] = [];
  if (fotos < 1) faltan.push('fotos');
  if (!i.tipo) faltan.push('tipo');
  if (!i.direccion.trim()) faltan.push('direccion');
  if (!i.ciudad.trim()) faltan.push('ciudad');
  if (!i.precio || i.precio <= 0) faltan.push('precio');
  return faltan;
}

/** «Falta la dirección y el precio.» */
export function fraseDeLoQueFalta(faltan: CampoQueFalta[]): string {
  if (faltan.length === 0) return 'Listo para publicar.';
  const partes = faltan.map((f) => FRASES[f]);
  const lista = partes.length === 1 ? partes[0] : `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`;
  return `Falta ${lista}.`;
}

/** «Apartamento en arriendo en Laureles, 3 habitaciones»: lo que dice la tarjeta del marketplace. */
export function tituloDe(i: InmuebleRapido): string {
  const tipo = TIPOS.find((t) => t.valor === i.tipo)?.nombre ?? 'Inmueble';
  const operacion = i.operacion === 'sale' ? 'en venta' : 'en arriendo';
  const donde = i.barrio.trim() || i.ciudad.trim();
  const habs =
    i.habitaciones && i.habitaciones > 0 && i.tipo !== 'ROOM'
      ? `, ${i.habitaciones} ${i.habitaciones === 1 ? 'habitación' : 'habitaciones'}`
      : '';
  return `${tipo} ${operacion}${donde ? ` en ${donde}` : ''}${habs}`.slice(0, 200);
}

/** Lo que va a `POST /properties`. El estado AVAILABLE + en el marketplace: es publicar. */
export function paraCrear(i: InmuebleRapido) {
  const venta = i.operacion === 'sale';
  return {
    title: tituloDe(i),
    ...(i.descripcion.trim().length >= 20 ? { description: i.descripcion.trim() } : {}),
    type: i.tipo as string,
    city: i.ciudad.trim(),
    neighborhood: i.barrio.trim() || null,
    address: i.direccion.trim(),
    listingType: venta ? ('sale' as const) : ('rent' as const),
    monthlyRent: venta ? null : i.precio,
    ...(venta ? { salePrice: i.precio } : {}),
    bedrooms: i.habitaciones,
    bathrooms: i.banos,
    area: i.area,
    ...(i.latitud != null && i.longitud != null ? { latitude: i.latitud, longitude: i.longitud } : {}),
    status: 'AVAILABLE',
    publicadoEnMarketplace: true,
  };
}

// ── Lo que se guarda en el navegador mientras escribe ────────────────────────

const CLAVE = 'leasefy.publica.borrador.v1';

export function guardarBorrador(usuario: string, inmuebles: InmuebleRapido[]): void {
  try {
    window.localStorage.setItem(`${CLAVE}:${usuario}`, JSON.stringify({ inmuebles, guardado: Date.now() }));
  } catch {
    // Sin almacenamiento (privado, lleno): se sigue sin guardar.
  }
}

export function leerBorrador(usuario: string): InmuebleRapido[] | null {
  try {
    const crudo = window.localStorage.getItem(`${CLAVE}:${usuario}`);
    if (!crudo) return null;
    const { inmuebles } = JSON.parse(crudo) as { inmuebles?: unknown };
    if (!Array.isArray(inmuebles) || inmuebles.length === 0) return null;
    return inmuebles as InmuebleRapido[];
  } catch {
    return null;
  }
}

export function borrarBorrador(usuario: string): void {
  try {
    window.localStorage.removeItem(`${CLAVE}:${usuario}`);
  } catch {
    // nada
  }
}
