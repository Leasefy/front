'use client';

/**
 * 🔴 QA-CONT-95 r3 (D-24): la ficha del contrato dice si su cartera está
 * CASTIGADA (o propuesta para castigo) y que sigue debiéndose.
 *
 * El castigo se decidía y se veía sólo en Pagos → Cartera → «Castigada»: quien
 * abría el contrato veía la deuda en mora sin saber que la inmobiliaria ya la
 * había dado por incobrable con dos firmas. Castigar NO perdona la deuda: las
 * cuotas siguen en el estado de cuenta y lo que pague el inquilino entra como
 * recuperación. La tarjeta lo dice con las cifras del back (nada se calcula
 * acá) y lleva al listado.
 *
 * Sin castigos, sin permiso (403) o sin la migración, no pinta nada: no es un
 * dato que el resto de la ficha necesite para funcionar.
 */

import { useEffect, useState } from 'react';

import { AlertaAccionable } from '@/components/ui/alerta-accionable';
import { castigoApi } from '@/lib/api/castigo.service';
import type { CastigoDeCartera } from '@/lib/types/castigo';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import { fechaLegible } from '@/components/estado-de-cuenta/filas';

const CARTERA_CASTIGADA = '/panel/inmobiliaria/pagos/cartera/castigada';

export function CastigoDelContrato({ contractId }: { contractId: string }) {
  const [castigos, setCastigos] = useState<CastigoDeCartera[]>([]);

  useEffect(() => {
    let vivo = true;
    castigoApi
      .listar({ contractId })
      .then((r) => {
        if (vivo && r.disponible) setCastigos(r.castigos);
      })
      .catch(() => {
        // Sin permiso o sin el módulo: la ficha sigue igual.
      });
    return () => {
      vivo = false;
    };
  }, [contractId]);

  const castigada = castigos.find((c) => c.estado === 'CASTIGADA');
  const propuesta = castigos.find((c) => c.estado === 'PROPUESTO');
  if (!castigada && !propuesta) return null;

  if (castigada) {
    const cuotas = `${castigada.cuotas} ${castigada.cuotas === 1 ? 'cuota' : 'cuotas'}`;
    return (
      <AlertaAccionable
        severidad="warning"
        titulo={`Cartera castigada${castigada.castigadaAt ? ` el ${fechaLegible(castigada.castigadaAt.slice(0, 10))}` : ''}: ${formatCurrency(castigada.capitalCop)} en ${cuotas}`}
        accion={{ label: 'Ver en Cartera castigada', href: CARTERA_CASTIGADA }}
        data-testid="castigo-del-contrato"
        data-estado="CASTIGADA"
      >
        Sigue debiéndose: las cuotas no se borran del estado de cuenta, y lo que pague el inquilino
        entra como recuperación.
        {castigada.recuperadoCop > 0
          ? ` Recuperado hasta hoy: ${formatCurrency(castigada.recuperadoCop)}; falta ${formatCurrency(castigada.sinRecuperarCop)}.`
          : ''}
      </AlertaAccionable>
    );
  }

  return (
    <AlertaAccionable
      severidad="warning"
      titulo={`Castigo de cartera propuesto: ${formatCurrency(propuesta!.capitalCop)} en ${propuesta!.cuotas} ${propuesta!.cuotas === 1 ? 'cuota' : 'cuotas'}`}
      accion={{ label: 'Ver la propuesta', href: CARTERA_CASTIGADA }}
      data-testid="castigo-del-contrato"
      data-estado="PROPUESTO"
    >
      {propuesta!.queFalta ?? 'Espera las firmas del administrador y del contador.'} Mientras tanto la deuda
      se sigue cobrando como siempre.
    </AlertaAccionable>
  );
}
