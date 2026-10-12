'use client';

/**
 * Las acciones masivas de Mantenimientos (Nico, 10-10-2026; eligió Operación).
 *
 *  - «Mover a…» — el MISMO cambio de estado de arrastrar la tarjeta en el
 *    tablero (`updateStatus`), a todos los marcados. «Completada» no está:
 *    cerrar un arreglo pide sus notas y fotos, y eso es de uno en uno.
 *  - «Cancelar» — confirma antes; cada una la valida el back.
 *
 * Cambiar estados no tiene tope por persona: corre de a pocos en el centro de
 * procesos (`hacerEnBloque`) y al final dice cuáles no se pudieron y por qué.
 */

import { useState } from 'react';
import { ArrowRight, Prohibit } from '@phosphor-icons/react';

import { BarraDeAccionesMasivas } from '@/components/ui/acciones-masivas';
import { Button } from '@/components/ui/button';
import { confirmar } from '@/components/ui/confirmar';
import { DropdownList, DropdownListContent, DropdownListItem, DropdownListTrigger } from '@/components/ui/dropdown-menu';
import { ANCHO_DEL_MENU_DE_ACCIONES } from '@/components/ui/ancho-del-menu-de-acciones';
import { mantenimientoApi } from '@/lib/api/inmobiliaria.service';
import { useI18n } from '@/lib/i18n';
import { avisarDelBloque, hacerEnBloque } from '@/lib/masivas/en-bloque';
import type { MantenimientoStatus, SolicitudMantenimiento } from '@/lib/types/inmobiliaria';

const plural = (n: number, uno: string, varios: string) => (n === 1 ? `1 ${uno}` : `${n} ${varios}`);

/** A dónde se puede mover en bloque: todo menos completar (pide notas y fotos) y cancelar (botón propio). */
export const DESTINOS_EN_BLOQUE: { estado: MantenimientoStatus; clave: string }[] = [
  { estado: 'reported', clave: 'inmobiliaria.mantenimiento.statusReported' },
  { estado: 'quoted', clave: 'inmobiliaria.mantenimiento.statusQuoted' },
  { estado: 'approved', clave: 'inmobiliaria.mantenimiento.statusApproved' },
  { estado: 'in_progress', clave: 'inmobiliaria.mantenimiento.statusInProgress' },
];

/** Los marcados que de verdad cambian (los que ya están ahí, o cerrados, no). Pura. */
export function losQueCambian(marcados: readonly SolicitudMantenimiento[], destino: MantenimientoStatus) {
  return marcados.filter((s) => s.status !== destino && s.status !== 'completed' && s.status !== 'cancelled');
}

export function MantenimientosMarcados({
  marcados,
  onQuitar,
  onCambiaron,
}: {
  marcados: readonly SolicitudMantenimiento[];
  onQuitar: () => void;
  /** Para volver a leer la lista. */
  onCambiaron: () => void;
}) {
  const { t } = useI18n();
  const [ocupado, setOcupado] = useState(false);

  const mover = async (destino: MantenimientoStatus, nombreDelDestino: string, cancelar = false) => {
    const cambian = losQueCambian(marcados, destino);
    if (cambian.length === 0) return;
    if (cancelar) {
      const ok = await confirmar({
        tipo: 'destructivo',
        titulo: `¿Cancelamos ${plural(cambian.length, 'arreglo', 'arreglos')}?`,
        descripcion: `Salen del tablero como cancelados. Se puede volver a abrir uno moviéndolo de columna.${
          marcados.length - cambian.length > 0 ? ` ${plural(marcados.length - cambian.length, 'ya está cerrado y se salta', 'ya están cerrados y se saltan')}.` : ''
        }`,
        accion: `Cancelar ${plural(cambian.length, 'arreglo', 'arreglos')}`,
      });
      if (!ok) return;
    }
    setOcupado(true);
    try {
      const r = await hacerEnBloque({
        titulo: cancelar ? `Cancelar ${plural(cambian.length, 'arreglo', 'arreglos')}` : `Mover ${plural(cambian.length, 'arreglo', 'arreglos')} a «${nombreDelDestino}»`,
        tipo: 'APROBACION_MASIVA',
        filas: cambian.map((s) => ({ id: s.id, nombre: `${s.title} · ${s.propertyTitle}` })),
        tarea: (f) => mantenimientoApi.updateStatus(f.id, destino),
        accion: cancelar ? 'cancelar el arreglo' : 'mover el arreglo',
        recursos: ['mantenimientos'],
      });
      avisarDelBloque(r, {
        todas: cancelar ? 'Cancelamos los arreglos' : `Los movimos a «${nombreDelDestino}»`,
        ninguna: cancelar ? 'No se canceló ningún arreglo' : 'No se movió ningún arreglo',
      });
      onCambiaron();
      onQuitar();
    } finally {
      setOcupado(false);
    }
  };

  const nada = marcados.length === 0;
  return (
    <BarraDeAccionesMasivas
      testid="mantenimientos-marcados"
      className="mt-4 max-md:hidden"
      marcadas={marcados.length}
      queSon={['arreglo', 'arreglos']}
      onQuitar={onQuitar}
      ocupado={ocupado}
      cuandoNoHayNada="Marca arreglos para moverlos de estado o cancelarlos de una vez."
    >
      <Button variant="ghost" size="sm" hideArrow disabled={ocupado || nada} onClick={() => void mover('cancelled', 'Cancelada', true)} data-testid="cancelar-marcados">
        <Prohibit className="h-4 w-4" />
        Cancelar
      </Button>
      <DropdownList>
        <DropdownListTrigger asChild>
          <Button size="sm" hideArrow disabled={ocupado || nada} data-testid="mover-marcados">
            <ArrowRight className="h-4 w-4" />
            Mover a…
          </Button>
        </DropdownListTrigger>
        <DropdownListContent align="end" className={ANCHO_DEL_MENU_DE_ACCIONES}>
          {DESTINOS_EN_BLOQUE.map((d) => (
            <DropdownListItem key={d.estado} onSelect={() => void mover(d.estado, t(d.clave))} data-testid={`mover-a-${d.estado}`}>
              <span className="text-sm">{t(d.clave)}</span>
            </DropdownListItem>
          ))}
        </DropdownListContent>
      </DropdownList>
    </BarraDeAccionesMasivas>
  );
}
