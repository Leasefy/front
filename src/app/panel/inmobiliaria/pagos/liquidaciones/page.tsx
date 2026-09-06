'use client';

/**
 * Liquidaciones — el neto por propietario del mes, con datos REALES.
 *
 * Hasta el 2026-09-05 esta pantalla era una vitrina: una constante `EJEMPLO`
 * con un canon de $2.500.000 escrito a mano, la fórmula pintada sobre esa
 * constante con un badge «Ejemplo», y la tabla de egresos con un `EmptyState`
 * fijo — cero `fetch`. El back ya calculaba exactamente esto y nadie lo
 * llamaba: `GET /inmobiliaria/dispersiones/preview` devuelve, propietario por
 * propietario, canon recaudado, comisión, conceptos a favor y a cargo, y el
 * neto a girar. Es la MISMA cuenta que `generate`, así que lo que se ve acá es
 * lo que se va a girar en Dispersiones — no una fórmula parecida.
 *
 * El desglose de IVA no se muestra: el back lo devuelve dentro de los conceptos
 * y separarlo acá sería una cuenta distinta de la del giro. La columna «IVA
 * com.» se retiró en vez de rellenarse con un cálculo del navegador.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Wallet, PaperPlaneTilt, Receipt, Sparkle, ArrowClockwise, WarningCircle } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { SectionLabel } from '@/components/ui/section-label';
import { EmptyState } from '@/components/ui/empty-state';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button, Badge } from '@/components/ui';
import { PageGuard } from '@/components/auth/PageGuard';
import { AGENCY_ROLES } from '@/lib/auth/agency-roles';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import type { VistaPreviaDeDispersiones } from '@/lib/types/inmobiliaria';
import { dispersionesApi } from '@/lib/api/inmobiliaria.service';

const COLUMNS = [
  'colPropietario', 'colCanon', 'colComision', 'colAFavor', 'colDescuentos', 'colNeto', 'colCuenta', 'colEstado', 'colComprobante',
];

/** El mes en curso, en el formato que espera el back (`2026-02`). */
function mesEnCurso(): string {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
}

type Propietario = VistaPreviaDeDispersiones['propietarios'][number];

function TesoreriaContent() {
  const { t } = useI18n();
  const k = (s: string) => `inmobiliaria.tesoreria.${s}`;
  const [month] = useState(mesEnCurso);

  const [vista, setVista] = useState<VistaPreviaDeDispersiones | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setVista(await dispersionesApi.preview(month));
    } catch (e) {
      // El motivo real, no un «algo salió mal»: si el back explica por qué no
      // pudo liquidar (por ejemplo un inmueble con copropietarios e impuestos),
      // esa frase es justo lo que hay que leer.
      setError(e instanceof Error ? e.message : String(e));
      setVista(null);
    } finally {
      setCargando(false);
    }
  }, [month]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const propietarios: Propietario[] = vista?.propietarios ?? [];
  const suma = (campo: keyof Propietario) =>
    propietarios.reduce((s, p) => s + (p[campo] as number), 0);

  // La fórmula, sobre la plata de VERDAD del mes. Las cuatro filas cierran
  // contra el neto por construcción: el back lo calcula igual.
  const resumen = [
    { labelKey: 'fCanon', value: suma('totalCollected'), sign: '', tone: 'text-fg' },
    { labelKey: 'fComision', value: suma('totalCommission'), sign: '−', tone: 'text-danger' },
    { labelKey: 'fAFavor', value: suma('totalConceptosAFavor'), sign: '+', tone: 'text-fg' },
    { labelKey: 'fACargo', value: suma('totalConceptosACargo'), sign: '−', tone: 'text-danger' },
  ];
  const neto = suma('netToPropietario');

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-1.5">
          <SectionLabel>{t(k('label'))}</SectionLabel>
          <h1 className="text-h2 text-fg">{t(k('title'))}</h1>
          <p className="text-sm text-fg-muted max-w-2xl line-clamp-2">{t(k('subtitle'))}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
          <Button asChild variant="secondary" hideArrow>
            <Link href="/panel/inmobiliaria/pagos/dispersiones">
              <PaperPlaneTilt className="w-4 h-4" />
              {t(k('processCta'))}
            </Link>
          </Button>
          <Button asChild hideArrow>
            <Link href="/panel/inmobiliaria/pagos/cxp/nueva" data-testid="tesoreria-registrar-factura">
              <Receipt className="w-4 h-4" weight="bold" />
              {t(k('registrarFacturaCta'))}
            </Link>
          </Button>
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-danger/30 bg-danger/5 p-4 flex items-start gap-3"
        >
          <WarningCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" weight="fill" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-fg">{t(k('errorTitle'))}</p>
            <p className="text-xs text-fg-muted mt-0.5 break-words">{error}</p>
          </div>
          <Button variant="secondary" hideArrow onClick={() => void cargar()} className="flex-shrink-0">
            <ArrowClockwise className="w-4 h-4" />
            {t(k('retry'))}
          </Button>
        </div>
      )}

      {/* Facturas de proveedores — captura desde foto/PDF con IA */}
      <section className="rounded-lg border border-border bg-card p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-md bg-primary-soft flex items-center justify-center flex-shrink-0">
            <Sparkle className="w-[18px] h-[18px] text-primary" weight="fill" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-fg">{t(k('facturasCardTitle'))}</h2>
            <p className="text-xs text-fg-muted mt-0.5 max-w-xl">{t(k('facturasCardDesc'))}</p>
          </div>
        </div>
        <Button asChild variant="secondary" hideArrow className="flex-shrink-0">
          <Link href="/panel/inmobiliaria/pagos/cxp/nueva">
            <Receipt className="w-4 h-4" />
            {t(k('facturasCardCta'))}
          </Link>
        </Button>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* El mes en plata — sumas reales, no una fórmula de ejemplo */}
        <section className="lg:col-span-1 rounded-lg border border-border bg-card p-5 space-y-4 h-fit">
          <div className="flex items-center justify-between">
            <SectionLabel>{t(k('resumenLabel'))}</SectionLabel>
            <Badge variant="secondary">{month}</Badge>
          </div>
          <div className="space-y-2.5">
            {resumen.map((row) => (
              <div key={row.labelKey} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t(k(row.labelKey))}</span>
                <span className={cn('font-mono tabular-nums', row.tone)}>
                  {row.sign}{formatCurrency(row.value)}
                </span>
              </div>
            ))}
            <div className="border-t border-border pt-2.5 flex items-center justify-between">
              <span className="text-sm font-semibold text-fg flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-success" />
                {t(k('fNeto'))}
              </span>
              <span
                className="font-mono tabular-nums font-semibold text-success"
                data-testid="tesoreria-neto-total"
              >
                {formatCurrency(neto)}
              </span>
            </div>
          </div>
        </section>

        {/* Egresos table */}
        <section className="lg:col-span-2 rounded-lg border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-3 p-5 border-b border-border">
            <div className="w-9 h-9 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center flex-shrink-0">
              <Wallet className="w-[18px] h-[18px] text-neutral-600 dark:text-neutral-300" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-fg">{t(k('egresosTitle'))}</h2>
              <p className="text-xs text-fg-muted mt-0.5">{t(k('egresosDesc'))}</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {COLUMNS.map((c) => (
                    <TableHead key={c} className="whitespace-nowrap">
                      {t(k(c))}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {cargando && (
                  <TableRow>
                    <TableCell colSpan={COLUMNS.length} className="py-10 text-center text-sm text-fg-muted">
                      {t(k('cargando'))}
                    </TableCell>
                  </TableRow>
                )}

                {!cargando && propietarios.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={COLUMNS.length} className="p-0">
                      <EmptyState
                        icon={Wallet}
                        title={t(k('emptyTitle'))}
                        description={t(k('emptyDesc'))}
                        action={{ label: t(k('processCta')), href: '/panel/inmobiliaria/pagos/dispersiones' }}
                      />
                    </TableCell>
                  </TableRow>
                )}

                {!cargando &&
                  propietarios.map((p) => (
                    <TableRow key={p.propietarioId} data-testid="tesoreria-fila">
                      <TableCell className="font-medium text-fg">{p.propietarioName}</TableCell>
                      <TableCell className="font-mono tabular-nums">{formatCurrency(p.totalCollected)}</TableCell>
                      <TableCell className="font-mono tabular-nums text-danger">−{formatCurrency(p.totalCommission)}</TableCell>
                      <TableCell className="font-mono tabular-nums">{p.totalConceptosAFavor > 0 ? `+${formatCurrency(p.totalConceptosAFavor)}` : '—'}</TableCell>
                      <TableCell className="font-mono tabular-nums text-danger">{p.totalConceptosACargo > 0 ? `−${formatCurrency(p.totalConceptosACargo)}` : '—'}</TableCell>
                      <TableCell className="font-mono tabular-nums font-semibold text-success">{formatCurrency(p.netToPropietario)}</TableCell>
                      <TableCell className="text-xs text-fg-muted whitespace-nowrap">
                        {p.propietarioBankAccount
                          ? `${p.propietarioBankName ?? ''} ${p.propietarioBankAccount}`.trim()
                          : t(k('sinCuenta'))}
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.yaExiste ? 'secondary' : 'outline'}>
                          {t(k(p.yaExiste ? 'estadoGenerada' : 'estadoPendiente'))}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button asChild variant="ghost" hideArrow className="h-8 px-2 text-xs">
                          <Link href="/panel/inmobiliaria/pagos/dispersiones">{t(k('verDispersiones'))}</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function TesoreriaPage() {
  // El sidebar ofrece esta fila a ADMIN y CONTADOR (`CONTADOR_ROLES` en
  // `arquitectura-del-panel.ts`). Con `adminOnly` el contador la veía y rebotaba
  // al inicio sin explicación: una fila que se ve y no se puede abrir es una
  // promesa rota. El gate ahora dice lo mismo que la arquitectura.
  return (
    <PageGuard roles={[AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR]}>
      <TesoreriaContent />
    </PageGuard>
  );
}
