'use client';

/**
 * La renovación de un contrato de VIVIENDA URBANA, en un paso.
 *
 * Nico (29-10-2026), después de la reunión con Portofino: «Enviar propuesta»,
 * la aceptación y la firma son de los LOCALES COMERCIALES. En vivienda la
 * renovación se da (Ley 820): la acción es «Renovar contrato», que renueva,
 * genera el incremento y avisa al inquilino y al propietario. Portofino: «La
 * renovación igual se da. Lo que entra a proceso de negociación es el valor
 * del incremento».
 *
 * El trabajo: «Renovar el contrato con el incremento de ley y avisarles a las
 * dos partes». En orden: cómo va el inquilino (Vinci: cómo paga, reparaciones,
 * convivencia) → hasta cuándo se renueva (la fecha la calcula la regla y se
 * puede poner a mano) → con qué canon (el incremento sólo si cumple un año de
 * contrato; se negocia hacia abajo, nunca sobre el tope) → a quién se avisa.
 *
 * Los números y las fechas los calcula el back (`reglaDeLaRenovacion`): el
 * cajón no repite la regla, sólo valida lo que se escribe con los MISMOS topes
 * y frases que el back (`fechasDeLaRenovacion`).
 */

import { Callout } from '@leasefy/cadence';
import { CalendarBlank, CheckCircle, Info } from '@phosphor-icons/react';
import { Label } from '@/components/ui/label';
import { MoneyInput } from '@/components/ui/money-input';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { CampoDeFecha } from '@/components/facturacion/CampoDeFecha';
import { RiesgoEnLaRenovacion } from '@/components/retencion/RiesgoEnLaRenovacion';
import { formatCurrency } from '@/lib/format';
import type { ReglaDeLaRenovacion, Renovacion } from '@/lib/types/inmobiliaria';
import { AREAS_DE_LA_RENOVACION, canalDeEnvio } from '@/lib/renovaciones/reglas';

export type CampoDeVivienda = 'canon' | 'admin' | 'desde' | 'hasta';

const soloElDia = (iso: string) => iso.slice(0, 10);
const comoFecha = (iso: string) => new Date(`${soloElDia(iso)}T00:00:00.000Z`);

/** «15 de julio de 2026», leyendo el día civil (sin que la zona horaria lo corra). */
export function fechaDeLaRenovacion(iso: string): string {
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    comoFecha(iso),
  );
}

function sumarAnios(d: Date, anios: number) {
  return new Date(Date.UTC(d.getUTCFullYear() + anios, d.getUTCMonth(), d.getUTCDate()));
}

/**
 * Las fechas puestas a mano, con las MISMAS reglas y frases que el back
 * (`validarFechasDeLaRenovacion`): la renovación alarga el contrato.
 */
export function fechasDeLaRenovacion(
  r: Pick<Renovacion, 'leaseStartDate' | 'leaseEndDate'>,
  desde: string,
  hasta: string,
): Partial<Record<'desde' | 'hasta', string>> {
  const errores: Partial<Record<'desde' | 'hasta', string>> = {};
  const vence = comoFecha(r.leaseEndDate);
  if (!hasta) errores.hasta = 'Elige hasta cuándo va la renovación.';
  else if (comoFecha(hasta).getTime() <= vence.getTime()) {
    errores.hasta = `El fin de la renovación tiene que ser después del vencimiento actual (${fechaDeLaRenovacion(r.leaseEndDate)}).`;
  } else if (comoFecha(hasta).getTime() > sumarAnios(vence, 10).getTime()) {
    errores.hasta = 'El fin de la renovación puede ir, como mucho, 10 años después del vencimiento actual.';
  }
  if (desde) {
    const inicio = comoFecha(desde);
    if (r.leaseStartDate && inicio.getTime() <= comoFecha(r.leaseStartDate).getTime()) {
      errores.desde = `La renovación no puede empezar antes del inicio del contrato (${fechaDeLaRenovacion(r.leaseStartDate)}).`;
    } else if (inicio.getTime() > sumarAnios(vence, 1).getTime()) {
      errores.desde = 'La renovación tiene que empezar, como mucho, un año después del vencimiento actual.';
    } else if (hasta && inicio.getTime() >= comoFecha(hasta).getTime()) {
      errores.desde = 'La renovación tiene que empezar antes de su fecha de fin.';
    }
  }
  return errores;
}

/** El tope legal del canon (IPC del año anterior), sólo cuando la renovación cumple el año y hay IPC. */
export function topeDeVivienda(regla: ReglaDeLaRenovacion): number | null {
  return regla.cumpleElAnio && regla.ipc ? regla.canonConIncremento : null;
}

/** El error del canon en vivienda: sobre el tope legal no se renueva (el back dice lo mismo). */
export function errorDelCanonDeVivienda(regla: ReglaDeLaRenovacion, canon: number): string | null {
  const tope = topeDeVivienda(regla);
  if (tope !== null && canon > tope) {
    return `Como mucho ${formatCurrency(tope)} (IPC de ${regla.ipc!.anio}, Ley 820 art. 20).`;
  }
  return null;
}

const porcentaje = (n: number) => `${n.toLocaleString('es-CO', { maximumFractionDigits: 2 })} %`;

function Rotulo({ children }: { children: React.ReactNode }) {
  return <h3 className="font-mono text-caption uppercase tracking-wide text-fg-muted">{children}</h3>;
}

export function PasoRenovarVivienda({
  renovacion,
  regla,
  canon,
  admin,
  desde,
  hasta,
  errores,
  onCanon,
  onAdmin,
  onDesde,
  onHasta,
  onFechasDeLaRegla,
}: {
  renovacion: Renovacion;
  regla: ReglaDeLaRenovacion;
  canon: number;
  admin: number;
  desde: string;
  hasta: string;
  errores: Partial<Record<CampoDeVivienda, string | null>>;
  onCanon: (v: number) => void;
  onAdmin: (v: number) => void;
  onDesde: (v: string) => void;
  onHasta: (v: string) => void;
  onFechasDeLaRegla: () => void;
}) {
  const incremento = canon - renovacion.currentRent;
  const tope = topeDeVivienda(regla);
  const fechasDeLaRegla = desde === regla.nuevoInicio && hasta === regla.nuevoFin;
  const canal = canalDeEnvio(renovacion);
  const cadaCuanto = regla.periodicidadDelContrato
    ? `Este contrato se renueva cada ${regla.periodicidadDelContrato} meses.`
    : `Se renueva por el mismo término: ${regla.mesesDeLaRenovacion} meses.`;

  const delIncremento = !regla.cumpleElAnio
    ? `No cumple un año de contrato: renueva sin incremento. Subirlo antes del año es una negociación especial.`
    : regla.ipc
      ? `Cumple ${regla.aniosDeContrato === 1 ? 'un año' : `${regla.aniosDeContrato} años`} de contrato: sube con el IPC de ${regla.ipc.anio} (${porcentaje(regla.ipc.rate)}), el tope de ley. Lo que se negocia es el valor del incremento: puedes dejarlo más bajo.`
      : `Cumple el año, pero falta el IPC de ${comoFecha(renovacion.leaseEndDate).getUTCFullYear() - 1}: renueva con el mismo canon hasta que lo cargues en Configuración.`;

  return (
    <section className="space-y-7" data-testid="paso-renovar-vivienda">
      {/* Los tres factores de Portofino («renueva o no renueva») y lo que se negocia. */}
      <RiesgoEnLaRenovacion riesgo={renovacion.riesgoDeRetencion} contractId={renovacion.contractId} vivienda />

      <div className="space-y-3">
        <Rotulo>Hasta cuándo se renueva</Rotulo>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="renovacion-desde" className="text-sm font-medium text-fg">
              Rige desde
            </Label>
            <CampoDeFecha
              id="renovacion-desde"
              testid="renovacion-desde"
              value={desde}
              onChange={onDesde}
              invalido={Boolean(errores.desde)}
            />
            <ErrorDelCampo id="renovacion-desde-error" mensaje={errores.desde} className="mt-0" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="renovacion-hasta" className="text-sm font-medium text-fg">
              Vence el
            </Label>
            <CampoDeFecha
              id="renovacion-hasta"
              testid="renovacion-hasta"
              value={hasta}
              onChange={onHasta}
              invalido={Boolean(errores.hasta)}
            />
            <ErrorDelCampo id="renovacion-hasta-error" mensaje={errores.hasta} className="mt-0" />
          </div>
        </div>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-fg-muted" data-testid="renovacion-cada-cuanto">
          <CalendarBlank className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>
            {cadaCuanto} {fechasDeLaRegla ? 'Leasefy calculó las fechas; cámbialas si hace falta.' : 'Pusiste las fechas a mano.'}
          </span>
          {!fechasDeLaRegla ? (
            <button
              type="button"
              onClick={onFechasDeLaRegla}
              className="font-medium text-primary underline-offset-2 hover:underline"
              data-testid="renovacion-fechas-de-la-regla"
            >
              Volver a las de Leasefy ({fechaDeLaRenovacion(regla.nuevoFin)})
            </button>
          ) : null}
        </p>
      </div>

      <div className="space-y-3">
        <Rotulo>El incremento</Rotulo>
        <Callout
          icon={<Info className="h-5 w-5 text-fg-muted" aria-hidden="true" />}
          data-testid="renovacion-del-incremento"
        >
          {delIncremento}
        </Callout>
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,12rem)]">
          <div className="space-y-1.5">
            <Label htmlFor="renovacion-canon" className="text-sm font-medium text-fg">
              Canon desde la renovación
            </Label>
            <MoneyInput
              id="renovacion-canon"
              data-testid="renovacion-canon"
              aria-invalid={errores.canon ? true : undefined}
              aria-describedby="renovacion-canon-error"
              areas={AREAS_DE_LA_RENOVACION}
              value={canon > 0 ? canon : ''}
              onChange={(crudo) => onCanon(Number(crudo) || 0)}
              placeholder={formatCurrency(renovacion.currentRent)}
              className="h-12 text-lg font-medium"
            />
            <ErrorDelCampo
              id="renovacion-canon-error"
              mensaje={errores.canon}
              pista={
                incremento > 0
                  ? `Sube ${formatCurrency(incremento)} sobre ${formatCurrency(renovacion.currentRent)}${tope !== null && canon < tope ? `; el tope es ${formatCurrency(tope)}` : ''}.`
                  : `Igual al de hoy (${formatCurrency(renovacion.currentRent)}).`
              }
              className="mt-0"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="renovacion-admin" className="text-sm font-medium text-fg">
              Administración
            </Label>
            <MoneyInput
              id="renovacion-admin"
              data-testid="renovacion-admin"
              aria-invalid={errores.admin ? true : undefined}
              aria-describedby="renovacion-admin-error"
              areas={AREAS_DE_LA_RENOVACION}
              value={admin > 0 ? admin : ''}
              onChange={(crudo) => onAdmin(Number(crudo) || 0)}
              placeholder={formatCurrency(renovacion.currentAdminFee ?? 0)}
              className="h-12"
            />
            <ErrorDelCampo id="renovacion-admin-error" mensaje={errores.admin} className="mt-0" />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Rotulo>A quién le avisamos</Rotulo>
        <p className="flex items-start gap-2 text-sm text-fg" data-testid="renovacion-a-quien">
          <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-success" weight="fill" aria-hidden="true" />
          <span>
            Al renovar, al inquilino
            {canal === 'panel_y_correo'
              ? ' en su panel y su correo'
              : canal === 'correo_del_contrato'
                ? ` en el correo del contrato (${renovacion.tenantEmail})`
                : ' (no tiene cuenta ni correo: avísale tú)'}{' '}
            y al propietario les llega el aviso de la renovación con el canon nuevo y la fecha.
          </span>
        </p>
      </div>
    </section>
  );
}

/** Lo que se manda al back: las fechas sólo si alguien las cambió. */
export function datosParaRenovar(
  regla: ReglaDeLaRenovacion,
  valores: { canon: number; admin: number; desde: string; hasta: string; adminDeHoy: number | null | undefined },
) {
  return {
    canon: valores.canon,
    ...(valores.admin > 0 && valores.admin !== (valores.adminDeHoy ?? 0) ? { negotiatedAdminFee: valores.admin } : {}),
    ...(valores.desde && valores.desde !== regla.nuevoInicio ? { newLeaseStartDate: valores.desde } : {}),
    ...(valores.hasta && valores.hasta !== regla.nuevoFin ? { newLeaseEndDate: valores.hasta } : {}),
  };
}
