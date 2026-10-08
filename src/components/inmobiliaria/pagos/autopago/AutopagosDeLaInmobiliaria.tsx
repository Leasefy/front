'use client';

/**
 * Autopago, visto por la inmobiliaria — SÓLO LECTURA (`GET /inmobiliaria/autopago`).
 *
 * Quién inscribió el cobro automático de su cuota, con qué tope, y cómo salió
 * el último intento. Lo inscribe, lo pausa o lo cancela el inquilino desde su
 * portal (`components/tenant/AutopagoSection.tsx`); acá no se toca.
 *
 * 🔴 Con `cobroAutomaticoActivo=false` (la llave
 * `AUTOPAGO_COBRO_AUTOMATICO_ENABLED` del servidor, apagada hasta que Nico lo
 * pruebe en QA) lo dice arriba de la lista: un «Activo» en la fila no quiere
 * decir que se esté cobrando.
 */

import type { Icon } from '@phosphor-icons/react';
import {
  CheckCircle,
  HourglassMedium,
  PauseCircle,
  Power,
  Repeat,
  WarningCircle,
  XCircle,
} from '@phosphor-icons/react';

import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { EsqueletoTabla } from '@/components/estado/EsqueletoTabla';
import { SinDatos } from '@/components/estado/SinDatos';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useIsMobile } from '@/hooks/use-mobile';
import { formatCurrency } from '@/lib/format';
import { useAutopagosDeLaInmobiliaria } from '@/lib/hooks/use-payu';
import { instanteEnBogota } from '@/lib/payu/links-de-pago';
import type { AutopagoDeContrato, EstadoDelIntentoDeAutopago } from '@/lib/types/payu';

const INTENTO: Record<
  EstadoDelIntentoDeAutopago,
  { variant: NonNullable<BadgeProps['variant']>; icon: Icon; palabra: string; nota?: string }
> = {
  APROBADO: { variant: 'success', icon: CheckCircle, palabra: 'Aprobado' },
  RECHAZADO: { variant: 'destructive', icon: XCircle, palabra: 'Rechazado' },
  PENDIENTE: {
    variant: 'warning',
    icon: HourglassMedium,
    palabra: 'Pendiente',
    nota: 'La pasarela todavía no confirma este cobro.',
  },
  ERROR: { variant: 'destructive', icon: WarningCircle, palabra: 'Error' },
};

function AvisoDelCobroAutomatico({ activo }: { activo: boolean }) {
  if (activo) {
    return (
      <div
        role="status"
        className="flex items-start gap-3 rounded-md border border-border bg-success-soft p-3"
        data-testid="cobro-automatico"
        data-activo="si"
      >
        <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-success" weight="fill" aria-hidden="true" />
        <p className="text-body-sm text-fg">
          El cobro automático está prendido: cada autopago activo se cobra solo, sin pasar el tope que puso el
          inquilino.
        </p>
      </div>
    );
  }
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-md border border-border bg-warning-soft p-3"
      data-testid="cobro-automatico"
      data-activo="no"
    >
      <Power className="mt-0.5 h-5 w-5 flex-shrink-0 text-warning" weight="bold" aria-hidden="true" />
      <div>
        <p className="text-body-sm font-medium text-fg">El cobro automático está apagado en el servidor.</p>
        <p className="mt-0.5 text-body-sm text-fg-muted">
          Leasefy lo está probando antes de prenderlo. Mientras siga apagado, ningún autopago de esta lista se cobra
          solo, aunque diga «Activo».
        </p>
      </div>
    </div>
  );
}

function EstadoDelAutopago({ activo }: { activo: boolean }) {
  return activo ? (
    <Badge variant="success" data-testid="autopago-activo" data-activo="si">
      <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" weight="bold" aria-hidden="true" />
      Activo
    </Badge>
  ) : (
    <Badge variant="secondary" data-testid="autopago-activo" data-activo="no">
      <PauseCircle className="h-3.5 w-3.5 flex-shrink-0" weight="bold" aria-hidden="true" />
      Inactivo
    </Badge>
  );
}

function UltimoIntento({ a }: { a: AutopagoDeContrato }) {
  const intento = a.ultimoIntento;
  if (!intento) {
    return (
      <p className="text-caption text-fg-muted" data-testid="ultimo-intento" data-estado="nunca">
        Nunca se ha intentado cobrar.
      </p>
    );
  }
  const { variant, icon: Icono, palabra, nota } = INTENTO[intento.estado];
  return (
    <div className="min-w-0 space-y-1" data-testid="ultimo-intento" data-estado={intento.estado}>
      <Badge variant={variant}>
        <Icono className="h-3.5 w-3.5 flex-shrink-0" weight="bold" aria-hidden="true" />
        {palabra}
      </Badge>
      <p className="text-caption text-fg-muted">
        <span className="font-mono tabular-nums text-fg">{formatCurrency(intento.montoCop)}</span> ·{' '}
        {instanteEnBogota(intento.fecha)}
      </p>
      {intento.motivo && <p className="text-caption text-fg-muted">{intento.motivo}</p>}
      {nota && <p className="text-caption text-fg-muted">{nota}</p>}
    </div>
  );
}

function Tabla({ items }: { items: AutopagoDeContrato[] }) {
  return (
    <Table data-testid="tabla-de-autopagos">
      <TableHeader>
        <TableRow>
          <TableHead>Contrato</TableHead>
          <TableHead>Inquilino</TableHead>
          <TableHead>Autopago</TableHead>
          <TableHead className="text-right">Tope</TableHead>
          <TableHead>Último intento</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((a) => (
          <TableRow key={a.contratoId} data-testid={`autopago-${a.contratoId}`}>
            <TableCell className="align-top">
              <p className="font-mono tabular-nums text-fg">{a.contratoNumero}</p>
              <p className="text-caption text-fg-muted">{a.inmueble}</p>
            </TableCell>
            <TableCell className="align-top text-fg">{a.inquilino}</TableCell>
            <TableCell className="align-top">
              <EstadoDelAutopago activo={a.activo} />
            </TableCell>
            <TableCell className="whitespace-nowrap text-right align-top font-mono tabular-nums">
              {formatCurrency(a.topeCop)}
            </TableCell>
            <TableCell className="align-top">
              <UltimoIntento a={a} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/** En el teléfono, una fila por contrato. */
function Lista({ items }: { items: AutopagoDeContrato[] }) {
  return (
    <ul className="divide-y divide-border-faint" data-testid="lista-de-autopagos">
      {items.map((a) => (
        <li key={a.contratoId} className="space-y-2 px-4 py-3" data-testid={`autopago-${a.contratoId}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium text-fg">{a.inquilino}</p>
              <p className="text-caption text-fg-muted">
                <span className="font-mono tabular-nums">{a.contratoNumero}</span> · {a.inmueble}
              </p>
            </div>
            <EstadoDelAutopago activo={a.activo} />
          </div>
          <p className="text-caption text-fg-muted">
            Tope <span className="font-mono tabular-nums text-fg">{formatCurrency(a.topeCop)}</span>
          </p>
          <UltimoIntento a={a} />
        </li>
      ))}
    </ul>
  );
}

export function AutopagosDeLaInmobiliaria() {
  const { data, cargando, error, recargar } = useAutopagosDeLaInmobiliaria();
  const esMovil = useIsMobile();

  return (
    <EstadoDeDatos
      cargando={cargando && !data}
      error={error}
      queEs="los autopagos"
      onReintentar={recargar}
      principal
      esqueleto={<EsqueletoTabla filas={4} columnas={5} />}
    >
      {data && (
        <div className="space-y-4">
          <AvisoDelCobroAutomatico activo={data.cobroAutomaticoActivo} />
          <section
            aria-label="Contratos con autopago"
            className="rounded-lg border border-border bg-surface"
            data-testid="autopagos"
          >
            {data.items.length === 0 ? (
              <SinDatos
                queSon="autopagos"
                icono={Repeat}
                titulo="Ningún inquilino tiene autopago"
                descripcion="El inquilino lo inscribe desde su portal, con un tope que él mismo pone. Cuando alguno lo haga, aparece acá."
              />
            ) : esMovil ? (
              <Lista items={data.items} />
            ) : (
              <Tabla items={data.items} />
            )}
          </section>
        </div>
      )}
    </EstadoDeDatos>
  );
}
