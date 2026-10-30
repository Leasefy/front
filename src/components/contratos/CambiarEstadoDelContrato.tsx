'use client';

/**
 * Nico, 29-10-2026: junto a la etiqueta del estado se puede CAMBIAR el estado,
 * con los pasos que permite la máquina de estados del back
 * (`ContractStateMachine`): borrador → activo (ya viene firmado: el contrato
 * que se crea en el panel ya está firmado) o cancelado; firmado → activo;
 * activo → terminado (por el flujo de terminación de siempre). Lo
 * irreversible se confirma; cancelar y terminar abren sus propios pasos.
 */
import { useState } from 'react';
import { CaretDown } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { confirmar } from '@/components/ui/confirmar';
import {
  DropdownList,
  DropdownListContent,
  DropdownListItem,
  DropdownListTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/components/ui/toast';
import { contratoAlCrearApi } from '@/lib/api/contrato-al-crear.service';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import type { ContractStatus } from '@/lib/types/contract';

type Paso = 'activar-ya-firmado' | 'activar' | 'cancelar' | 'terminar';

/** Lo que se puede hacer desde cada estado (espejo de la máquina del back). */
export function pasosDesde(status: ContractStatus): Array<{ paso: Paso; etiqueta: string }> {
  switch (status) {
    case 'draft':
      return [
        { paso: 'activar-ya-firmado', etiqueta: 'Activo (ya está firmado)' },
        { paso: 'cancelar', etiqueta: 'Cancelado' },
      ];
    case 'pending_tenant':
    case 'pending_landlord':
    case 'rejected_pending_modifications':
      return [{ paso: 'cancelar', etiqueta: 'Cancelado' }];
    case 'signed':
      return [{ paso: 'activar', etiqueta: 'Activo' }];
    case 'active':
      return [{ paso: 'terminar', etiqueta: 'Terminado' }];
    default:
      return [];
  }
}

export function CambiarEstadoDelContrato({
  contractId,
  status,
  onActivar,
  onCancelar,
  onTerminar,
  onCambiado,
}: {
  contractId: string;
  status: ContractStatus;
  /** El activar de siempre (contrato firmado). */
  onActivar: () => Promise<unknown> | unknown;
  onCancelar: () => void;
  onTerminar: () => void;
  onCambiado: () => void;
}) {
  const [enCurso, setEnCurso] = useState(false);
  const pasos = pasosDesde(status);
  if (pasos.length === 0) return null;

  const elegir = async (paso: Paso) => {
    if (paso === 'cancelar') return onCancelar();
    if (paso === 'terminar') return onTerminar();
    if (paso === 'activar') return onActivar();
    const ok = await confirmar({
      titulo: '¿Activar el contrato?',
      descripcion:
        'Queda como firmado y activo: nacen sus cuotas y cobros y el inmueble pasa a arrendado. No se puede volver a borrador.',
      accion: 'Activar contrato',
      tipo: 'advertencia',
    });
    if (!ok) return;
    setEnCurso(true);
    try {
      const { porEmpezar } = await contratoAlCrearApi.activarYaFirmado(contractId);
      toast.success(porEmpezar ? 'Contrato firmado. Se activa solo el día que empieza.' : 'Contrato activo.');
      onCambiado();
    } catch (err) {
      toast.error('No se pudo activar el contrato.', { description: mensajeParaLaPersona(err) });
    } finally {
      setEnCurso(false);
    }
  };

  return (
    <DropdownList>
      <DropdownListTrigger asChild>
        <Button type="button" variant="ghost" hideArrow disabled={enCurso} data-testid="cambiar-estado-del-contrato">
          Cambiar estado
          <CaretDown className="w-4 h-4" />
        </Button>
      </DropdownListTrigger>
      <DropdownListContent align="start">
        {pasos.map((p) => (
          <DropdownListItem key={p.paso} onSelect={() => void elegir(p.paso)}>
            {p.etiqueta}
          </DropdownListItem>
        ))}
      </DropdownListContent>
    </DropdownList>
  );
}
