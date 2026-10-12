'use client';

/**
 * Las acciones masivas de Solicitudes · PQRS (Nico, 10-10-2026; eligió Operación).
 *
 *  - «Asignar a…» — el MISMO cambio de la ficha (`asignadoAUserId`), a todas.
 *  - «Mover a…» — En proceso o En cotización. «Resuelta» no: pide la
 *    respuesta escrita de cada una (Ley 1755), y eso es de una en una.
 *
 * No tiene tope por persona: corre de a pocas en el centro de procesos y dice
 * cuáles no se pudieron (el back vuelve a validar cada una).
 */

import { useEffect, useState } from 'react';
import { ArrowRight, UserCircle } from '@phosphor-icons/react';

import { BarraDeAccionesMasivas } from '@/components/ui/acciones-masivas';
import { Button } from '@/components/ui/button';
import { DropdownList, DropdownListContent, DropdownListItem, DropdownListTrigger } from '@/components/ui/dropdown-menu';
import { ANCHO_DEL_MENU_DE_ACCIONES } from '@/components/ui/ancho-del-menu-de-acciones';
import { pqrsApi } from '@/lib/api/pqrs-agencia.service';
import type { Pqrs, PqrsEstado, ResponsableDePqrs } from '@/lib/api/pqrs-agencia.types';
import { avisarDelBloque, hacerEnBloque } from '@/lib/masivas/en-bloque';

const plural = (n: number, uno: string, varios: string) => (n === 1 ? `1 ${uno}` : `${n} ${varios}`);

export const ESTADOS_EN_BLOQUE: { estado: PqrsEstado; nombre: string }[] = [
  { estado: 'EN_PROCESO', nombre: 'En proceso' },
  { estado: 'EN_COTIZACION', nombre: 'En cotización' },
];

export function PqrsMarcadas({
  marcadas,
  onQuitar,
  onCambiaron,
}: {
  marcadas: readonly Pqrs[];
  onQuitar: () => void;
  onCambiaron: () => void;
}) {
  const [ocupado, setOcupado] = useState(false);
  const [responsables, setResponsables] = useState<ResponsableDePqrs[] | null>(null);
  const hay = marcadas.length > 0;

  useEffect(() => {
    if (!hay || responsables) return;
    pqrsApi.responsables().then(setResponsables).catch(() => setResponsables([]));
  }, [hay, responsables]);

  // Una resuelta o cerrada no se reabre en bloque.
  const abiertas = marcadas.filter((p) => p.estado !== 'RESUELTA' && p.estado !== 'CERRADA');

  const cambiar = async (titulo: string, todas: string, cambio: Parameters<typeof pqrsApi.actualizar>[1]) => {
    if (abiertas.length === 0) return;
    setOcupado(true);
    try {
      const r = await hacerEnBloque({
        titulo,
        tipo: 'APROBACION_MASIVA',
        filas: abiertas.map((p) => ({ id: p.id, nombre: `${p.radicado} · ${p.solicitanteNombre}` })),
        tarea: (f) => pqrsApi.actualizar(f.id, cambio),
        accion: 'cambiar la solicitud',
        recursos: ['pqrs'],
      });
      avisarDelBloque(r, { todas, ninguna: 'No cambió ninguna solicitud' });
      onCambiaron();
      onQuitar();
    } finally {
      setOcupado(false);
    }
  };

  return (
    <BarraDeAccionesMasivas
      variant="pie"
      testid="pqrs-marcadas"
      className="max-md:hidden"
      marcadas={marcadas.length}
      queSon={['solicitud', 'solicitudes']}
      onQuitar={onQuitar}
      ocupado={ocupado}
      cuandoNoHayNada="Marca solicitudes para asignarlas o moverlas de estado de una vez."
    >
      <DropdownList>
        <DropdownListTrigger asChild>
          <Button variant="secondary" size="sm" hideArrow disabled={ocupado || abiertas.length === 0} data-testid="mover-marcadas">
            <ArrowRight className="h-4 w-4" />
            Mover a…
          </Button>
        </DropdownListTrigger>
        <DropdownListContent align="end" className={ANCHO_DEL_MENU_DE_ACCIONES}>
          {ESTADOS_EN_BLOQUE.map((e) => (
            <DropdownListItem
              key={e.estado}
              onSelect={() => void cambiar(`Mover ${plural(abiertas.length, 'solicitud', 'solicitudes')} a «${e.nombre}»`, `Las movimos a «${e.nombre}»`, { estado: e.estado })}
            >
              <span className="text-sm">{e.nombre}</span>
            </DropdownListItem>
          ))}
        </DropdownListContent>
      </DropdownList>
      <DropdownList>
        <DropdownListTrigger asChild>
          <Button size="sm" hideArrow disabled={ocupado || abiertas.length === 0} data-testid="asignar-marcadas">
            <UserCircle className="h-4 w-4" />
            Asignar a…
          </Button>
        </DropdownListTrigger>
        <DropdownListContent align="end" className={ANCHO_DEL_MENU_DE_ACCIONES}>
          {(responsables ?? []).length === 0 ? (
            <DropdownListItem disabled>
              <span className="text-sm">{responsables ? 'No hay a quién asignar' : 'Cargando…'}</span>
            </DropdownListItem>
          ) : (
            (responsables ?? []).map((r) => (
              <DropdownListItem
                key={r.userId}
                onSelect={() => void cambiar(`Asignar ${plural(abiertas.length, 'solicitud', 'solicitudes')} a ${r.nombre}`, `Quedaron a cargo de ${r.nombre}`, { asignadoAUserId: r.userId })}
              >
                <span className="text-sm">{r.nombre}</span>
              </DropdownListItem>
            ))
          )}
        </DropdownListContent>
      </DropdownList>
    </BarraDeAccionesMasivas>
  );
}
