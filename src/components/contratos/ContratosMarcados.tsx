'use client';

/**
 * Las acciones masivas de Contratos (Nico, 10-10-2026: «hay muchas tablas que
 * les hace falta acciones masivas»; eligió Directorio).
 *
 *  - «Estado de cuenta por correo / por WhatsApp» — al INQUILINO de cada
 *    contrato, uno por persona (`cobros:view`). Lo decide el back igual que
 *    «Compartir» en la ficha.
 *  - «Invitar al portal» — la misma de la ficha del contrato
 *    (`contratos:create`): a quien no tiene cuenta, o reenvía a quien no ha
 *    entrado. El que ya entró o el contrato sin correo se saltan y se dicen.
 *  - «Exportar» — una fila por contrato.
 *
 * Los envíos van en UNA petición al back, que los recorre en el centro de
 * procesos (`enBloqueEnElServidor`).
 */

import { useState } from 'react';
import { EnvelopeSimple, FileXls, UserPlus, WhatsappLogo } from '@phosphor-icons/react';

import { BarraDeAccionesMasivas } from '@/components/ui/acciones-masivas';
import { Button } from '@/components/ui/button';
import { confirmar } from '@/components/ui/confirmar';
import { toast } from '@/components/ui/toast';
import { contractsApi } from '@/lib/api/contracts.service';
import { estadoDeCuentaApi } from '@/lib/api/estado-de-cuenta.service';
import { descargarContratos, inquilinosDeLosContratos } from '@/lib/contratos/exportar-contratos';
import { enBloqueEnElServidor } from '@/lib/masivas/en-bloque';
import type { Contract } from '@/lib/types/contract';

const plural = (n: number, uno: string, varios: string) => (n === 1 ? `1 ${uno}` : `${n} ${varios}`);

export function ContratosMarcados({
  marcados,
  onQuitar,
  puedeCompartir,
  puedeInvitar,
  estadoDe,
}: {
  marcados: readonly Contract[];
  onQuitar: () => void;
  puedeCompartir: boolean;
  puedeInvitar: boolean;
  /** El estado como lo dice la lista, para el Excel. */
  estadoDe: (c: Contract) => string;
}) {
  const [ocupado, setOcupado] = useState(false);
  const { clientes, sinInquilino } = inquilinosDeLosContratos(marcados);

  const mandarEstado = async (canal: 'CORREO' | 'WHATSAPP') => {
    const porDonde = canal === 'CORREO' ? 'por correo' : 'por WhatsApp';
    const ok = await confirmar({
      titulo: `¿Les mandamos el estado de cuenta ${porDonde} a ${plural(clientes.length, 'inquilino', 'inquilinos')}?`,
      descripcion: `Uno por persona: quien tiene varios de estos contratos recibe uno solo, con todo.${
        sinInquilino > 0
          ? ` ${plural(sinInquilino, 'contrato no tiene inquilino', 'contratos no tienen inquilino')} y se ${sinInquilino === 1 ? 'salta' : 'saltan'}.`
          : ''
      }`,
      accion: `Mandar ${porDonde}`,
      icono: canal === 'CORREO' ? <EnvelopeSimple weight="bold" /> : <WhatsappLogo weight="bold" />,
    });
    if (!ok) return;
    setOcupado(true);
    try {
      const arranco = await enBloqueEnElServidor({
        titulo: `Estado de cuenta ${porDonde} a ${plural(clientes.length, 'inquilino', 'inquilinos')}`,
        pedir: () => estadoDeCuentaApi.enviarEnBloque('inquilino', canal, clientes),
        accion: 'mandar los estados de cuenta',
      });
      if (arranco) onQuitar();
    } finally {
      setOcupado(false);
    }
  };

  const invitar = async () => {
    const ok = await confirmar({
      titulo: `¿Invitamos al portal al inquilino de ${plural(marcados.length, 'contrato', 'contratos')}?`,
      descripcion:
        'Le llega un enlace para crear su contraseña. A quien ya entró al portal no se le manda nada, y el contrato sin correo del inquilino se salta: el centro de procesos dice cuáles.',
      accion: 'Mandar las invitaciones',
      icono: <UserPlus weight="bold" />,
    });
    if (!ok) return;
    setOcupado(true);
    try {
      const arranco = await enBloqueEnElServidor({
        titulo: `Invitar al portal al inquilino de ${plural(marcados.length, 'contrato', 'contratos')}`,
        pedir: () => contractsApi.invitarInquilinosEnElCentro(marcados.map((c) => c.id)),
        accion: 'mandar las invitaciones',
        recursos: ['contracts'],
      });
      if (arranco) onQuitar();
    } finally {
      setOcupado(false);
    }
  };

  const exportar = async () => {
    setOcupado(true);
    try {
      const archivo = await descargarContratos(marcados, estadoDe);
      toast.success('Exportamos lo marcado', { description: `${archivo}: ${plural(marcados.length, 'contrato', 'contratos')}.` });
    } catch {
      toast.error('No pudimos armar el Excel', { description: 'Prueba de nuevo en un momento.' });
    } finally {
      setOcupado(false);
    }
  };

  const nada = marcados.length === 0;
  return (
    <BarraDeAccionesMasivas
      variant="pie"
      testid="contratos-marcados"
      className="max-md:hidden"
      marcadas={marcados.length}
      queSon={['contrato', 'contratos']}
      onQuitar={onQuitar}
      ocupado={ocupado}
      cuandoNoHayNada="Marca contratos para mandarles el estado de cuenta a sus inquilinos, invitarlos al portal o exportarlos."
    >
      <Button variant="ghost" size="sm" hideArrow disabled={ocupado || nada} onClick={() => void exportar()} data-testid="exportar-marcados">
        <FileXls className="h-4 w-4" />
        Exportar
      </Button>
      {puedeInvitar && (
        <Button variant="ghost" size="sm" hideArrow disabled={ocupado || nada} onClick={() => void invitar()} data-testid="invitar-marcados">
          <UserPlus className="h-4 w-4" />
          Invitar al portal
        </Button>
      )}
      {puedeCompartir && (
        <>
          <Button variant="secondary" size="sm" hideArrow disabled={ocupado || clientes.length === 0} onClick={() => void mandarEstado('WHATSAPP')} data-testid="estado-por-whatsapp-marcados">
            <WhatsappLogo className="h-4 w-4" />
            Por WhatsApp
          </Button>
          <Button size="sm" hideArrow disabled={ocupado || clientes.length === 0} onClick={() => void mandarEstado('CORREO')} data-testid="estado-por-correo-marcados">
            <EnvelopeSimple className="h-4 w-4" />
            Estado de cuenta por correo
          </Button>
        </>
      )}
    </BarraDeAccionesMasivas>
  );
}
