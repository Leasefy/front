'use client';

/**
 * Paso 4 de la migración: el plan de cuentas.
 *
 * ── Por qué por ROLES y no por `module="configuracion"` ─────────────────────
 *
 * Esta pantalla habla con `/inmobiliaria/contabilidad/puc/*`, y ese controller
 * NO usa `@RequirePermission`: lee con `AgencyMemberGuard` y escribe con
 * `ContabilidadEscrituraGuard`, cuyo `ROLES_QUE_ESCRIBEN` es exactamente
 * `[ADMIN, CONTADOR]` (back-erp, `contabilidad/guards/`). Con
 * `module="configuracion"` el front era MÁS estricto que el back: `CONTADOR`
 * tiene `configuracion: []` en `role-defaults.ts`, así que el contador —el rol
 * que existe para armar el PUC— hacía clic y volvía a la portada sin
 * explicación, sobre un recurso que el back sí le abre.
 *
 * Espejar la lista de roles del guard del back es lo más cerca que se puede
 * estar de él desde acá: `configuracion` es de la migración de TERCEROS (esa
 * sí lleva `@RequirePermission('configuracion', …)`), no de la contabilidad.
 */

import { PageGuard } from '@/components/auth/PageGuard';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { BackButton } from '@/components/ui/back-button';
import { PlanDeCuentas } from '@/components/migracion/PlanDeCuentas';
import { AGENCY_ROLES } from '@/lib/auth/agency-roles';
import { useI18n } from '@/lib/i18n';

export default function PlanDeCuentasPage() {
  return (
    <PageGuard roles={[AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR]}>
      <ContenidoDelPuc />
    </PageGuard>
  );
}

function ContenidoDelPuc() {
  const { t } = useI18n();

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="space-y-3">
        <BackButton href="/panel/inmobiliaria/contabilidad" label={t('inmobiliaria.nav.contabilidad')} />
        <EncabezadoDePantalla
          seccion={t('migracion.eyebrow')}
          titulo={t('migracion.puc.titulo')}
          descripcion={t('migracion.puc.subtitulo')}
        />
      </div>

      <PlanDeCuentas />
    </div>
  );
}
