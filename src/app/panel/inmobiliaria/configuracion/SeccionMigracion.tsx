'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowsClockwise, BellSimple, Buildings, FileText, ListNumbers, Users } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/use-auth';
import {
  EVENTO_DECISION_DE_MIGRACION,
  guardarDecisionDeMigracion,
  leerDecisionDeMigracion,
  type DecisionDeMigracion,
} from '@/lib/migracion/decision-de-migracion';
import { TarjetaDeAjustes, FilaDeAjuste } from './piezas';

/**
 * Configuración → Migración: siempre se puede migrar, se haya elegido «en
 * otro momento» o «no requiero migración» al entrar (Nico, 2026-09-07: «si
 * llega a arrepentirse por más que haya descartado, que tenga la posibilidad
 * de migrar»). Cada importador tiene su pantalla; acá están las cuatro, y el
 * recordatorio del sidebar se prende o se apaga.
 */
const PASOS = [
  {
    icono: Users,
    titulo: 'Propietarios e inquilinos',
    descripcion: 'Tu archivo de terceros, con cuentas bancarias y documentos.',
    href: '/panel/inmobiliaria/migracion/terceros',
  },
  {
    icono: Buildings,
    titulo: 'Inmuebles y contratos',
    descripcion: 'Los contratos vigentes con su inmueble, canon y fechas.',
    href: '/panel/inmobiliaria/contratos/migrar',
  },
  {
    icono: ListNumbers,
    titulo: 'Plan de cuentas (PUC)',
    descripcion: 'Tus cuentas contables, para que los asientos salgan con tu plan.',
    href: '/panel/inmobiliaria/migracion/puc',
  },
  {
    icono: FileText,
    titulo: 'Saldos contables',
    descripcion: 'Los saldos iniciales para arrancar la contabilidad cuadrada.',
    href: '/panel/inmobiliaria/migracion/contables',
  },
] as const;

export function SeccionMigracion() {
  const router = useRouter();
  const { agency } = useAuth();
  const agencyId = agency?.id ?? null;
  const [decision, setDecision] = useState<DecisionDeMigracion | null>(null);

  useEffect(() => {
    const leer = () => setDecision(leerDecisionDeMigracion(agencyId));
    leer();
    window.addEventListener(EVENTO_DECISION_DE_MIGRACION, leer);
    return () => window.removeEventListener(EVENTO_DECISION_DE_MIGRACION, leer);
  }, [agencyId]);

  const recordando = decision === 'luego';

  return (
    <div className="space-y-4" data-testid="seccion-migracion">
      <TarjetaDeAjustes>
        {PASOS.map((paso) => (
          <FilaDeAjuste key={paso.href} icono={paso.icono} titulo={paso.titulo} descripcion={paso.descripcion}>
            <Button type="button" variant="outline" size="sm" hideArrow onClick={() => router.push(paso.href)}>
              Abrir
            </Button>
          </FilaDeAjuste>
        ))}
      </TarjetaDeAjustes>

      <TarjetaDeAjustes>
        <FilaDeAjuste
          icono={recordando ? BellSimple : ArrowsClockwise}
          titulo="Recordatorio en el menú"
          descripcion={
            recordando
              ? 'Dijiste que migrarías en otro momento: el recordatorio sigue anclado en el menú.'
              : 'Sin recordatorio. Puedes migrar desde acá cuando quieras.'
          }
        >
          <Button
            type="button"
            variant="outline"
            size="sm"
            hideArrow
            data-testid="alternar-recordatorio-de-migracion"
            onClick={() => guardarDecisionDeMigracion(agencyId, recordando ? 'nunca' : 'luego')}
          >
            {recordando ? 'Descartar' : 'Recordármelo'}
          </Button>
        </FilaDeAjuste>
      </TarjetaDeAjustes>
    </div>
  );
}
