'use client';
import { StatusBadge } from '@leasefy/cadence';

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
import { CaretRight } from '@phosphor-icons/react';

import { estadoDe, selloDelContrato } from '@/lib/estado-de-cuenta/sello-del-contrato';
import { estadoDeCuentaApi } from '@/lib/api/estado-de-cuenta.service';
import { informesDelPropietarioApi } from '@/lib/api/informes-del-propietario.service';
import { numeroDelContratoDelEstado } from '@/components/estado-de-cuenta/numero';
import type { EstadoDeCuenta } from '@/lib/types/estado-de-cuenta';
import {
  portalDelPropietarioApi,
  type FichaDelInmueble,
  type GiroDelPropietario,
} from '@/lib/api/portal-del-propietario.service';
import {
  CLASES_DEL_TONO,
  avanceDelContrato,
  fraseDelGiroDelMes,
  fraseDelMesDelInquilino,
  teGiraronAunqueNoPago,
} from '@/lib/propietario/el-mes-del-contrato';
import { hoyEnColombia } from '@/lib/fechas/fecha-de-la-casa';
import { nombreDelMes } from '@/lib/recaudo/meses';
import { concurrencia } from '@/lib/procesos/en-el-centro';

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

/** Cuántos contratos del Inicio leen su ficha (una lectura por contrato). */
const CON_DETALLE = 8;

type Ficha = FichaDelInmueble | 'fallo';

/**
 * Cómo va cada contrato vigente (tablero, Nico 21-10-2026): la ficha de su
 * inmueble (el mes del inquilino, inicio y fin) y los giros del propietario.
 * Cada lectura falla sola: si una no responde, esa fila queda como antes.
 */
function useComoVaCadaContrato(ids: readonly string[]): {
  fichas: Record<string, Ficha>;
  giros: GiroDelPropietario[] | null;
} {
  const [fichas, setFichas] = React.useState<Record<string, Ficha>>({});
  const [giros, setGiros] = React.useState<GiroDelPropietario[] | null>(null);
  const clave = ids.slice(0, CON_DETALLE).join(',');
  React.useEffect(() => {
    let vivo = true;
    const lista = clave ? clave.split(',') : [];
    if (lista.length === 0) return;
    portalDelPropietarioApi
      .giros()
      .then((r) => vivo && setGiros(Array.isArray(r?.giros) ? r.giros : []))
      .catch(() => undefined);
    // De a tres: un propietario con muchos inmuebles no dispara todo de una vez.
    void concurrencia(lista, 3, async (id) => {
      try {
        const f = await portalDelPropietarioApi.inmueble(id);
        if (vivo) setFichas((x) => ({ ...x, [id]: f }));
      } catch {
        if (vivo) setFichas((x) => ({ ...x, [id]: 'fallo' }));
      }
    });
    return () => {
      vivo = false;
    };
  }, [clave]);
  return { fichas, giros };
}

/** La línea de «cómo va» de un contrato: inquilino, avance, su mes y el giro. */
function ComoVa({ ficha, giros }: { ficha: FichaDelInmueble; giros: GiroDelPropietario[] | null }) {
  const avance = avanceDelContrato(ficha.contrato.inicio, ficha.contrato.fin, hoyEnColombia());
  const delInquilino = ficha.mesActual ? fraseDelMesDelInquilino(ficha.mesActual) : null;
  const delGiro = ficha.mesActual ? fraseDelGiroDelMes(giros, ficha.mesActual.mes) : null;
  const aunqueNoPago = teGiraronAunqueNoPago(ficha.mesActual, giros);
  return (
    <div className="mt-2 w-full space-y-2" data-testid="como-va-el-contrato">
      {(ficha.inquilino?.nombre || avance) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {ficha.inquilino?.nombre ? (
            <span className="text-body-sm text-fg">Inquilino: {ficha.inquilino.nombre}</span>
          ) : null}
          {avance ? (
            <span className="inline-flex items-center gap-2" data-testid="avance-del-contrato">
              <span className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-muted" aria-hidden>
                <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.round((avance.mes / avance.de) * 100)}%` }} />
              </span>
              <span className="font-mono text-caption tabular-nums text-fg-muted">
                Mes {avance.mes} de {avance.de}
              </span>
            </span>
          ) : null}
        </div>
      )}
      {(delInquilino || delGiro) && (
        <div className="flex flex-wrap gap-2">
          {delInquilino ? (
            <span className={`rounded-full px-2.5 py-0.5 text-caption ${CLASES_DEL_TONO[delInquilino.tono]}`} data-testid="mes-del-inquilino">
              {delInquilino.texto}
            </span>
          ) : null}
          {delGiro ? (
            <span className={`rounded-full px-2.5 py-0.5 text-caption ${CLASES_DEL_TONO[delGiro.tono]}`} data-testid="giro-del-mes">
              Inmobiliaria: {delGiro.texto.charAt(0).toLowerCase()}{delGiro.texto.slice(1)}
            </span>
          ) : null}
        </div>
      )}
      {aunqueNoPago ? (
        <p className="text-caption text-fg-muted" data-testid="te-giraron-aunque-no-pago">
          Tu inquilino todavía no paga {ficha.mesActual ? nombreDelMes(ficha.mesActual.mes) : 'el mes'}, y tu inmobiliaria igual ya te giró.
        </p>
      ) : null}
    </div>
  );
}

/** Vigentes, luego los que van a empezar, luego terminados y cancelados (sort estable). */
function ordenDelEstado(c: EstadoDeCuenta['contratos'][number]): number {
  const estado = estadoDe(c);
  return estado === 'VIGENTE' ? 0 : estado === 'POR_EMPEZAR' ? 1 : 2;
}

export function ContratosConLaInmobiliaria({ doc }: { doc: EstadoDeCuenta }) {
  // QA-PROP-95 (PO-01): un firmado que todavía no empieza no es «vigente».
  const vigentes = doc.contratos.filter((c) => estadoDe(c) === 'VIGENTE').length;
  // El nombre comercial, el mismo de «¿Recomendarías a…?» (QA 11-10); la razón
  // social es para el documento del estado de cuenta.
  const quien = doc.inmobiliaria.nombre || doc.inmobiliaria.razonSocial || 'Tu inmobiliaria';
  const { fichas, giros } = useComoVaCadaContrato(
    doc.contratos.filter((c) => estadoDe(c) === 'VIGENTE').map((c) => c.id),
  );
  return (
    <section
      data-testid="contratos-con-la-inmobiliaria"
      className="rounded-lg border border-border bg-surface"
    >
      {/* GLOW UP (21-10): sin el ícono en caja; el título dice cuántos y la pista va en una línea. */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-border-faint px-5 py-3.5">
        <div className="min-w-0">
          <h2 className="text-body font-medium text-fg">Tus contratos con {quien}</h2>
          <p className="text-body-sm text-fg-muted">
            {doc.contratos.length === 1 ? '1 contrato' : `${doc.contratos.length} contratos`}
            {' · '}
            {vigentes === 1 ? '1 vigente' : `${vigentes} vigentes`}. Toca uno para ver su inmueble y el mes en curso.
          </p>
        </div>
        <Link
          href="/panel/estado-de-cuenta"
          className="inline-flex items-center gap-1 text-body-sm font-medium text-fg-muted hover:text-fg"
        >
          Estado de cuenta por contrato
          <CaretRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>
      <ul className="divide-y divide-border-faint">
        {/* QA 21-10: los vigentes primero (con su «cómo va»); los terminados después,
            en el orden de siempre. Antes iban por número y los vivos quedaban en la mitad. */}
        {[...doc.contratos]
          .sort((a, b) => ordenDelEstado(a) - ordenDelEstado(b))
          .map((c) => (
          <li key={c.id}>
            {/* QA 11-10: cada contrato abre la ficha de su inmueble. */}
            <Link
              href={`/panel/inmuebles/${c.id}`}
              className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 transition-colors hover:bg-surface-muted"
              data-testid={`abrir-inmueble-${c.id}`}
            >
            <div className="min-w-0">
              <p className="text-body-sm font-medium text-fg">
                Contrato <span className="font-mono">{numeroDelContratoDelEstado(c).principal}</span>
              </p>
              <p className="truncate text-body-sm text-fg-muted" title={c.inmueble.direccion}>
                {c.inmueble.direccion}
              </p>
            </div>
            {/* El estado con su punto y su palabra (StatusBadge de Cadence). */}
            <StatusBadge tone={selloDelContrato(c).vivo ? 'success' : 'neutral'}>
              {selloDelContrato(c).texto}
            </StatusBadge>
            {fichas[c.id] && fichas[c.id] !== 'fallo' ? <ComoVa ficha={fichas[c.id] as FichaDelInmueble} giros={giros} /> : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
