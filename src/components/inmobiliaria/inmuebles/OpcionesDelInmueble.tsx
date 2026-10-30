'use client';

/**
 * Las acciones de UN inmueble, en una sola definición: el menú de los tres
 * puntos de la fila en Inmuebles y el del encabezado de su ficha salen de aquí.
 *
 * 🔴 Nico (reunión con Portofino, 29-10-2026): el menú del detalle no tenía lo
 * que tenía el de la tabla —«Copiar ficha», «súper importante»—. Antes cada
 * menú armaba sus opciones a mano y se separaron; ahora el orden, el texto, el
 * ícono y el permiso de cada acción viven aquí. Cada pantalla sólo dice qué
 * puede hacer (los manejadores) y quién está mirando (los permisos).
 */
import {
  ArrowSquareOut,
  CalendarPlus,
  ClipboardText,
  CloudArrowDown,
  EyeSlash,
  Storefront,
  Trash,
  Users,
  type Icon,
} from '@phosphor-icons/react';
import { DropdownListItem } from '@/components/ui';
import { useI18n } from '@/lib/i18n';

export interface ManejadoresDelInmueble {
  onAgendarVisita?: () => void;
  onCandidatos?: () => void;
  onVerAviso?: () => void;
  onCopiarFicha?: () => void;
  /** `undefined` = no se sabe si está publicado: la opción no se ofrece. */
  publicado?: boolean;
  onCambiarPublicacion?: (publicar: boolean) => void;
  onPrepararSinSenal?: () => void;
  onEliminar?: () => void;
}

export interface PermisosDelInmueble {
  /** `operaciones:edit`: pedir citas. */
  puedePedirCita: boolean;
  /** `portafolio:view`: guardar la copia para trabajar sin señal. */
  puedeVerPortafolio: boolean;
  /** `portafolio:edit`: publicar o quitar del marketplace. */
  puedeEditar: boolean;
  /** `portafolio:delete`: retirar el inmueble. */
  puedeRetirar: boolean;
}

export interface AccionDelInmueble {
  id: 'agendarVisita' | 'candidatos' | 'verAviso' | 'copiarFicha' | 'marketplace' | 'sinSenal' | 'eliminar';
  /** Clave de i18n. */
  etiqueta: string;
  Icono: Icon;
  testid?: string;
  peligro?: boolean;
  alHacer: () => void;
}

/** Lo que se ofrece, en orden: lo de todos los días primero y lo destructivo al final. */
export function accionesDelInmueble(m: ManejadoresDelInmueble, p: PermisosDelInmueble): AccionDelInmueble[] {
  const acciones: Array<AccionDelInmueble | null> = [
    m.onAgendarVisita && p.puedePedirCita
      ? { id: 'agendarVisita', etiqueta: 'inmobiliaria.agenda.pedirCita', Icono: CalendarPlus, testid: 'menu-agendar-visita', alHacer: m.onAgendarVisita }
      : null,
    m.onCandidatos
      ? { id: 'candidatos', etiqueta: 'inmobiliaria.inmuebles.acciones.candidatos', Icono: Users, testid: 'menu-candidatos', alHacer: m.onCandidatos }
      : null,
    m.onVerAviso
      ? { id: 'verAviso', etiqueta: 'inmobiliaria.inmuebles.acciones.verAviso', Icono: ArrowSquareOut, testid: 'menu-ver-aviso', alHacer: m.onVerAviso }
      : null,
    m.onCopiarFicha
      ? { id: 'copiarFicha', etiqueta: 'inmobiliaria.inmuebles.acciones.copiarFicha', Icono: ClipboardText, testid: 'copiar-ficha', alHacer: m.onCopiarFicha }
      : null,
    m.onCambiarPublicacion && m.publicado !== undefined && p.puedeEditar
      ? {
          id: 'marketplace',
          etiqueta: m.publicado
            ? 'inmobiliaria.inmuebles.acciones.quitarDelMarketplace'
            : 'inmobiliaria.inmuebles.acciones.publicarEnElMarketplace',
          Icono: m.publicado ? EyeSlash : Storefront,
          testid: m.publicado ? 'quitar-del-marketplace' : 'publicar-en-el-marketplace',
          alHacer: () => m.onCambiarPublicacion?.(!m.publicado),
        }
      : null,
    m.onPrepararSinSenal && p.puedeVerPortafolio
      ? { id: 'sinSenal', etiqueta: 'inmobiliaria.sinSenal.preparar', Icono: CloudArrowDown, testid: 'menu-sin-senal', alHacer: m.onPrepararSinSenal }
      : null,
    m.onEliminar && p.puedeRetirar
      ? { id: 'eliminar', etiqueta: 'inmobiliaria.inmuebles.acciones.eliminar', Icono: Trash, testid: 'menu-eliminar', peligro: true, alHacer: m.onEliminar }
      : null,
  ];
  return acciones.filter((a): a is AccionDelInmueble => a !== null);
}

/** Las opciones dentro de un `DropdownListContent` (fila o encabezado). */
export function OpcionesDelInmueble({ acciones }: { acciones: AccionDelInmueble[] }) {
  const { t } = useI18n();
  return (
    <>
      {acciones.map(({ id, etiqueta, Icono, testid, peligro, alHacer }) => (
        <DropdownListItem
          key={id}
          className={peligro ? 'gap-3 text-danger focus:text-danger' : 'gap-3'}
          onClick={alHacer}
          data-testid={testid}
        >
          <Icono className="h-4 w-4" />
          <span className="text-sm">{t(etiqueta)}</span>
        </DropdownListItem>
      ))}
    </>
  );
}
