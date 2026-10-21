/**
 * Las características del inmueble: la ÚNICA lista del front (Juan y Nico,
 * 21-10-2026: «agregar esas características extra, porque yo estaba creando
 * un inmueble, inclusive los que migramos no quedaron con características»).
 *
 * Antes había tres listas que no coincidían: `PROPERTY_AMENITIES` (12, la que
 * pinta la ficha), `AMENITIES_OPTIONS` (15, la de los formularios) y la del
 * back (15). La ficha descartaba en silencio lo que no conocía: un inmueble
 * con «Zona infantil», «Aire acondicionado» o «Calefacción» las guardaba y no
 * las mostraba. Ahora las dos de `types/` salen de acá.
 *
 * 🔴 Espejo de `AMENIDADES_VALIDAS` del back
 * (`back/src/properties/dto/limites-del-inmueble.ts`): el back rechaza un id
 * que no esté allá. Los ids se guardan tal cual; nunca se renombra uno.
 */

export type GrupoDeCaracteristicas = 'inmueble' | 'conjunto' | 'sector';

export interface Caracteristica {
  id: string;
  nombre: string;
  grupo: GrupoDeCaracteristicas;
  /** Cómo la escribe un archivo o un aviso, sin tildes y en minúscula (el importador). */
  otrosNombres?: string[];
}

export const NOMBRE_DEL_GRUPO: Record<GrupoDeCaracteristicas, string> = {
  inmueble: 'Del inmueble',
  conjunto: 'Del edificio o conjunto',
  sector: 'Del sector',
};

export const CARACTERISTICAS: readonly Caracteristica[] = [
  // Del inmueble
  { id: 'furnished', nombre: 'Amoblado', grupo: 'inmueble', otrosNombres: ['amueblado', 'amoblada', 'amueblada'] },
  { id: 'balcony', nombre: 'Balcón', grupo: 'inmueble', otrosNombres: ['balcones'] },
  { id: 'terrace', nombre: 'Terraza', grupo: 'inmueble', otrosNombres: ['terrazas'] },
  { id: 'patio', nombre: 'Patio', grupo: 'inmueble' },
  { id: 'garden', nombre: 'Jardín', grupo: 'inmueble', otrosNombres: ['jardin interior'] },
  { id: 'study', nombre: 'Estudio', grupo: 'inmueble', otrosNombres: ['estudio independiente'] },
  { id: 'integral_kitchen', nombre: 'Cocina integral', grupo: 'inmueble', otrosNombres: ['cocina integral abierta', 'cocina abierta'] },
  { id: 'laundry', nombre: 'Zona de ropas', grupo: 'inmueble', otrosNombres: ['lavanderia', 'zona de lavado', 'patio de ropas', 'cuarto de ropas'] },
  { id: 'storage', nombre: 'Depósito o cuarto útil', grupo: 'inmueble', otrosNombres: ['deposito', 'cuarto util', 'util'] },
  { id: 'closets', nombre: 'Clósets', grupo: 'inmueble', otrosNombres: ['closet', 'closets', 'closeth', 'armarios'] },
  { id: 'walk_in_closet', nombre: 'Vestier', grupo: 'inmueble', otrosNombres: ['walk in closet', 'vestidor'] },
  { id: 'water_heater', nombre: 'Calentador de agua', grupo: 'inmueble', otrosNombres: ['calentador', 'agua caliente'] },
  { id: 'natural_gas', nombre: 'Gas natural', grupo: 'inmueble', otrosNombres: ['gas'] },
  { id: 'fireplace', nombre: 'Chimenea', grupo: 'inmueble' },
  { id: 'ac', nombre: 'Aire acondicionado', grupo: 'inmueble', otrosNombres: ['a c', 'aire'] },
  { id: 'heating', nombre: 'Calefacción', grupo: 'inmueble' },
  { id: 'exterior_view', nombre: 'Vista exterior', grupo: 'inmueble', otrosNombres: ['exterior', 'vista panoramica'] },
  { id: 'pets', nombre: 'Acepta mascotas', grupo: 'inmueble', otrosNombres: ['mascotas', 'pet friendly', 'se aceptan mascotas'] },
  // Del edificio o conjunto
  { id: 'parking', nombre: 'Parqueadero', grupo: 'conjunto', otrosNombres: ['parqueaderos', 'garaje', 'garajes', 'parqueadero privado', 'parqueadero cubierto'] },
  { id: 'visitor_parking', nombre: 'Parqueadero de visitantes', grupo: 'conjunto', otrosNombres: ['parqueadero visitantes', 'parqueaderos de visitantes'] },
  { id: 'elevator', nombre: 'Ascensor', grupo: 'conjunto', otrosNombres: ['ascensores', 'elevador'] },
  { id: 'security', nombre: 'Portería o vigilancia 24 h', grupo: 'conjunto', otrosNombres: ['porteria', 'vigilancia', 'seguridad 24h', 'seguridad 24 horas', 'porteria 24 horas', 'vigilancia 24 horas', 'seguridad privada', 'seguridad'] },
  { id: 'gated', nombre: 'Conjunto cerrado', grupo: 'conjunto', otrosNombres: ['unidad cerrada', 'unidad residencial cerrada'] },
  { id: 'intercom', nombre: 'Citófono', grupo: 'conjunto', otrosNombres: ['citofono', 'citofonia', 'interfono'] },
  { id: 'power_plant', nombre: 'Planta eléctrica', grupo: 'conjunto', otrosNombres: ['planta electrica de emergencia'] },
  { id: 'pool', nombre: 'Piscina', grupo: 'conjunto', otrosNombres: ['piscinas'] },
  { id: 'gym', nombre: 'Gimnasio', grupo: 'conjunto', otrosNombres: ['gym'] },
  { id: 'bbq', nombre: 'Zona BBQ', grupo: 'conjunto', otrosNombres: ['bbq', 'asador', 'zona de asados', 'kiosko bbq'] },
  { id: 'playground', nombre: 'Zona infantil', grupo: 'conjunto', otrosNombres: ['parque infantil', 'juegos infantiles', 'zona de juegos'] },
  { id: 'social_room', nombre: 'Salón social', grupo: 'conjunto', otrosNombres: ['salon comunal', 'salon de eventos'] },
  { id: 'sports_court', nombre: 'Cancha deportiva', grupo: 'conjunto', otrosNombres: ['cancha', 'canchas', 'cancha multiple', 'cancha de squash'] },
  { id: 'green_areas', nombre: 'Zonas verdes', grupo: 'conjunto', otrosNombres: ['zona verde', 'zonas comunes verdes'] },
  { id: 'sauna', nombre: 'Sauna o turco', grupo: 'conjunto', otrosNombres: ['sauna', 'turco', 'baño turco'] },
  { id: 'jacuzzi', nombre: 'Jacuzzi', grupo: 'conjunto', otrosNombres: ['jacuzzy', 'hidromasaje'] },
  { id: 'coworking', nombre: 'Zona de coworking', grupo: 'conjunto', otrosNombres: ['coworking', 'cowork'] },
  { id: 'bike_parking', nombre: 'Bicicletero', grupo: 'conjunto', otrosNombres: ['cicloparqueadero', 'parqueadero de bicicletas'] },
  { id: 'accessible', nombre: 'Acceso para silla de ruedas', grupo: 'conjunto', otrosNombres: ['acceso para discapacitados', 'rampa de acceso', 'accesible'] },
  // Del sector
  { id: 'near_transport', nombre: 'Cerca al transporte público', grupo: 'sector', otrosNombres: ['cerca al metro', 'transporte publico', 'cerca a transporte publico', 'cerca a vias principales'] },
  { id: 'near_shopping', nombre: 'Cerca a centros comerciales', grupo: 'sector', otrosNombres: ['cerca a centro comercial', 'centros comerciales', 'centro comercial'] },
  { id: 'near_schools', nombre: 'Cerca a colegios', grupo: 'sector', otrosNombres: ['colegios', 'cerca a universidades', 'universidades'] },
  { id: 'near_parks', nombre: 'Cerca a parques', grupo: 'sector', otrosNombres: ['parques'] },
];

const POR_ID = new Map(CARACTERISTICAS.map((c) => [c.id, c]));

/** El nombre de una característica; un id que no está (dato viejo o raro), `null`. */
export function nombreDeLaCaracteristica(id: string): string | null {
  return POR_ID.get(id)?.nombre ?? null;
}

export function esCaracteristica(id: string): boolean {
  return POR_ID.has(id);
}

/** Las características en sus tres grupos, en el orden de la lista. */
export function caracteristicasPorGrupo(): Array<{ grupo: GrupoDeCaracteristicas; nombre: string; items: Caracteristica[] }> {
  return (Object.keys(NOMBRE_DEL_GRUPO) as GrupoDeCaracteristicas[]).map((grupo) => ({
    grupo,
    nombre: NOMBRE_DEL_GRUPO[grupo],
    items: CARACTERISTICAS.filter((c) => c.grupo === grupo),
  }));
}

/** Cuántas puede tener un inmueble (el `@ArrayMaxSize` del back). */
export const CARACTERISTICAS_MAXIMAS = 30;

function sinTildes(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Cada nombre conocido (sin tildes) → su id. El más largo gana: «parqueadero de visitantes» antes que «parqueadero». */
const NOMBRES: Array<[string, string]> = CARACTERISTICAS.flatMap((c) =>
  [c.nombre, c.id.replace(/_/g, ' '), ...(c.otrosNombres ?? [])].map((n): [string, string] => [sinTildes(n), c.id]),
).sort((a, b) => b[0].length - a[0].length);

/**
 * Lo que dice una celda de «Características» de un archivo o un aviso
 * («Piscina, gimnasio; Parqueadero de visitantes / Balcón») en ids. Cada parte
 * se reconoce por su nombre completo, nunca por un pedazo: «Parqueadero de
 * visitantes» no suma también «Parqueadero». Lo que no se reconoce se
 * devuelve aparte, tal cual, para decirlo (la migración no inventa nada).
 */
export function caracteristicasDelTexto(texto: string | null | undefined): { ids: string[]; sinReconocer: string[] } {
  const ids: string[] = [];
  const sinReconocer: string[] = [];
  // «A/C» y «N/A» llevan la barra adentro: se leen antes de partir por «/».
  const sinBarrasPropias = (texto ?? '').replace(/\ba\/c\b/gi, 'a c').replace(/\bn\/a\b/gi, '');
  for (const parte of sinBarrasPropias.split(/[,;|/\n•·]+|\s+-\s+/)) {
    const limpia = sinTildes(parte).replace(/^[\s.\-*]+|[\s.]+$/g, '');
    if (!limpia || /^(si|no|ninguna?|-)$/.test(limpia)) continue;
    const encontrada = NOMBRES.find(([nombre]) => nombre === limpia);
    if (!encontrada) {
      sinReconocer.push(parte.trim());
      continue;
    }
    if (!ids.includes(encontrada[1])) ids.push(encontrada[1]);
  }
  return { ids: ids.slice(0, CARACTERISTICAS_MAXIMAS), sinReconocer };
}
