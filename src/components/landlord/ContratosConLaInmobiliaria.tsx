'use client';

/**
 * Los contratos que una INMOBILIARIA le administra a este propietario.
 *
 * 🔴 QA 22-09 (P1): el portal del propietario se contradecía. Su estado de
 * cuenta cuadraba con la base (cuatro contratos, lo girado y lo que falta),
 * pero «Contratos» decía «TOTAL CONTRATOS 0» y el inicio «No tienes propiedades
 * publicadas · Publicar propiedad». Esas dos pantallas leen los contratos por
 * `landlordId`, que en un contrato de inmobiliaria es el usuario de la
 * inmobiliaria, no el propietario — así que para él siempre son cero.
 *
 * La fuente que SÍ lo resuelve es la del estado de cuenta (`GET
 * /portal/estado-de-cuenta`: ficha por correo → consignaciones → contratos).
 * Esto la lee y dice cuántos contratos le administran, con el enlace a su
 * estado de cuenta. No inventa nada que no venga ahí.
 */

import * as React from 'react';
import Link from 'next/link';
import { Buildings, CaretRight } from '@phosphor-icons/react';

import { estadoDe, selloDelContrato } from '@/lib/estado-de-cuenta/sello-del-contrato';
import { estadoDeCuentaApi } from '@/lib/api/estado-de-cuenta.service';
import { informesDelPropietarioApi } from '@/lib/api/informes-del-propietario.service';
import { numeroDelContratoDelEstado } from '@/components/estado-de-cuenta/numero';
import type { EstadoDeCuenta } from '@/lib/types/estado-de-cuenta';

export interface ContratosAdministrados {
  doc: EstadoDeCuenta | null;
  cargando: boolean;
  /**
   * QA-PROP-95 PO-27 (04-10, decidido por el coordinador): tiene ficha en una
   * inmobiliaria (por su correo, la regla del portal) pero todavía ningún
   * contrato. Es propietario DE INMOBILIARIA igual: menú corto e Inicio con el
   * vacío honesto, nunca el panel del independiente (en pausa: 503).
   */
  fichaSinContratos?: { inmobiliaria: string } | null;
}

/** ¿Lo que tiene es una ficha sin contratos? (tras el 404 `SIN_CONTRATOS` del portal). */
async function fichaSinContratos(): Promise<{ inmobiliaria: string } | null> {
  try {
    const d = await informesDelPropietarioApi.disponibles();
    return d.fichas.length > 0 ? { inmobiliaria: d.fichas[0].agencia } : null;
  } catch {
    return null;
  }
}

const esSinContratos = (e: unknown) =>
  typeof e === 'object' && e !== null && (e as { code?: unknown }).code === 'SIN_CONTRATOS';

/**
 * El estado de cuenta del que mira, sólo si trae contratos del lado
 * PROPIETARIO. Un fallo NO se convierte en «no tienes contratos»: queda `doc`
 * en null y la pantalla que lo usa sigue con lo suyo.
 */
export function useContratosAdministrados(): ContratosAdministrados {
  const [estado, setEstado] = React.useState<ContratosAdministrados>({ doc: null, cargando: true });
  React.useEffect(() => {
    let vivo = true;
    estadoDeCuentaApi
      .mio()
      .then((doc) => {
        if (!vivo) return;
        const propios = doc.contratos.filter((c) => c.rol === 'PROPIETARIO');
        setEstado({ doc: propios.length > 0 ? { ...doc, contratos: propios } : null, cargando: false, fichaSinContratos: null });
      })
      .catch(async (e: unknown) => {
        // Sólo el «no tienes contratos» pregunta por la ficha: otro fallo no se adivina.
        const ficha = esSinContratos(e) ? await fichaSinContratos() : null;
        if (vivo) setEstado({ doc: null, cargando: false, fichaSinContratos: ficha });
      });
    return () => {
      vivo = false;
    };
  }, []);
  return estado;
}

export function ContratosConLaInmobiliaria({ doc }: { doc: EstadoDeCuenta }) {
  // QA-PROP-95 (PO-01): un firmado que todavía no empieza no es «vigente».
  const vigentes = doc.contratos.filter((c) => estadoDe(c) === 'VIGENTE').length;
  const quien = doc.inmobiliaria.razonSocial || 'Tu inmobiliaria';
  return (
    <section
      data-testid="contratos-con-la-inmobiliaria"
      className="rounded-lg border border-border bg-surface"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-muted">
            <Buildings className="h-5 w-5 text-fg-muted" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="text-subtitle text-fg">Tus contratos con {quien}</h2>
            <p className="text-body-sm text-fg-muted">
              {doc.contratos.length === 1 ? '1 contrato' : `${doc.contratos.length} contratos`}
              {' · '}
              {vigentes === 1 ? '1 vigente' : `${vigentes} vigentes`}. La inmobiliaria los administra y te gira lo
              recaudado.
            </p>
          </div>
        </div>
        <Link
          href="/panel/estado-de-cuenta"
          className="inline-flex items-center gap-1 text-body-sm font-medium text-primary hover:underline"
        >
          Ver mi estado de cuenta
          <CaretRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>
      <ul className="divide-y divide-border-faint">
        {doc.contratos.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
            <div className="min-w-0">
              <p className="text-body-sm font-medium text-fg">
                Contrato <span className="font-mono">{numeroDelContratoDelEstado(c).principal}</span>
              </p>
              <p className="truncate text-body-sm text-fg-muted" title={c.inmueble.direccion}>
                {c.inmueble.direccion}
              </p>
            </div>
            <span
              className={
                selloDelContrato(c).vivo
                  ? 'rounded-full bg-success-soft px-2.5 py-0.5 text-body-sm text-success'
                  : 'rounded-full bg-surface-muted px-2.5 py-0.5 text-body-sm text-fg-muted'
              }
            >
              {selloDelContrato(c).texto}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
