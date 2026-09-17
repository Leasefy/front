'use client';

/**
 * El interruptor que decide si un concepto del contrato entra en la base de la
 * comisión de administración (regla del 17-09).
 *
 * Mover esto cambia lo que la inmobiliaria le cobra al propietario todos los
 * meses, así que sólo se aplica a las cuotas que se generen o se regeneren
 * desde ahora: las que ya tienen plata no se tocan, y la pantalla lo dice.
 */

import { useState } from 'react';

import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/components/ui/toast';
import { mandatoApi } from '@/lib/api/mandato.service';
import { mensajeDelFallo } from '@/lib/contratos/fallo-de-accion';
import { porQueNoEsComisionable, type ConceptoParaComisionar } from '@/lib/mandato/comisionable';

export function ComisionableDelConcepto({
  contractId,
  concepto,
  puedeEditar,
}: {
  contractId: string;
  concepto: ConceptoParaComisionar & { id: string; comisionable?: boolean | null };
  puedeEditar: boolean;
}) {
  const [marcado, setMarcado] = useState(concepto.comisionable === true);
  const [ocupado, setOcupado] = useState(false);
  const porQueNo = porQueNoEsComisionable(concepto);

  if (porQueNo) {
    return (
      <p className="text-[11px] leading-snug text-muted-foreground" data-testid="no-es-comisionable">
        {porQueNo}
      </p>
    );
  }

  async function cambiar(valor: boolean) {
    setOcupado(true);
    // Optimista con vuelta atrás: el interruptor es de plata, no puede quedar
    // diciendo algo que el back no guardó.
    setMarcado(valor);
    try {
      const r = await mandatoApi.marcarComisionable(contractId, concepto.id, valor);
      setMarcado(r.comisionable === true);
      toast.success(
        valor ? 'Entra en la base de la comisión.' : 'Sale de la base de la comisión.',
        { description: 'Aplica a las cuotas que se generen o regeneren desde ahora.' },
      );
    } catch (e) {
      setMarcado(!valor);
      toast.error('No se pudo cambiar.', { description: mensajeDelFallo(e, '') });
    } finally {
      setOcupado(false);
    }
  }

  return (
    <label className="flex items-start gap-2 text-[11px] leading-snug text-muted-foreground">
      <Checkbox
        checked={marcado}
        disabled={!puedeEditar || ocupado}
        onCheckedChange={(v) => void cambiar(v === true)}
        aria-label={`Comisionar ${concepto.nombre}`}
      />
      <span>
        Entra en la base de la comisión de administración.
        {marcado ? '' : ' Hoy no se comisiona.'}
      </span>
    </label>
  );
}
