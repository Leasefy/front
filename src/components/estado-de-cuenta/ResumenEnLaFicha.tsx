'use client';

/**
 * El estado de cuenta, resumido, donde se necesita: la ficha del contrato, la
 * del inquilino y la del propietario.
 *
 * CEO (vía Nico, 2026-09-13): el estado de cuenta tiene que estar «presente
 * donde se necesita». Nadie va a abrir otra pantalla para saber si el inquilino
 * que tiene delante está al día: o lo ve en la ficha, o no lo ve.
 *
 * Tres datos y una salida: cuánto resta por pagar, cuándo es lo próximo, si
 * está en mora, y el enlace al documento completo. Nada más — una ficha con
 * media tabla de amortización adentro deja de ser una ficha.
 *
 * ── De dónde salen los números ──────────────────────────────────────────────
 * Del endpoint BARATO (`/estado-de-cuenta/resumen/:tipo/:id`), que suma cuotas
 * sin armar filas. Dos excepciones, las dos explícitas:
 *   · La ficha del CONTRATO (`soloContrato`) necesita los números de UN
 *     contrato y el resumen barato no se recorta: ahí se pide el documento
 *     entero y se filtra.
 *   · Si el resumen barato no responde —todavía no está desplegado—, se cae al
 *     documento entero. Es más caro, pero la ficha muestra el dato en vez de
 *     un hueco.
 */

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight } from '@phosphor-icons/react';
import { AnimatedNumber, Appear } from '@leasefy/cadence';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/format';
import {
  estadoDeCuentaApi,
  rutaDelEstadoDeCuenta,
} from '@/lib/api/estado-de-cuenta.service';
import type { EstadoDeCuenta, PorGirarDelPropietario } from '@/lib/types/estado-de-cuenta';
import { fechaLegible, hoyLocal, sumarTotales } from './filas';
import { resumirElCliente } from './resumen';
import { claveDelLado, useTextoDelEstado } from './textos';
import { rotuloDePorGirar, rotuloDeProximosGiros } from '@/lib/propietarios/por-girar';
import { sumarMeses } from '@/lib/recaudo/meses';
import { interesesDelContrato, interesesDelEstado } from './intereses';

/** Lo que pinta la tarjeta, venga del resumen barato o del documento entero. */
export interface NumerosDeLaFicha {
  restaPorPagar: number;
  proxima: { fecha: string; monto: number } | null;
  enMora: boolean;
  diasDeMora: number;
  /** Vencido, pero dentro del plazo del contrato: todavía no es mora. */
  enPlazo?: boolean;
  /** 🔴 CR-31: ese vencido no está «en plazo»: la inmobiliaria no fijó su plazo («Vencida»). */
  sinPlazoFijado?: boolean;
  /** 🔴 CR-31: la inmobiliaria no fijó su plazo: no corre interés (no se dice «+ intereses»). */
  plazoSinFijar?: boolean;
  /**
   * El interés de mora que falta, APARTE de `restaPorPagar` (que es capital).
   * Ausente = el back no lo mandó; no se inventa un cero.
   */
  interesDeMora?: number;
  /** `false` cuando el cliente no tiene nada que mostrar acá. */
  hayAlgo: boolean;
  /**
   * 🔴 Sólo del propietario: «Por girar» hasta el mes en curso, neto de sus
   * deducciones, y los próximos giros aparte (Nico, 04-10-2026). Ausente con
   * un back anterior o recortado a un contrato: entonces `restaPorPagar`.
   */
  porGirar?: PorGirarDelPropietario;
}

/** El documento entero, recortado a un contrato si hace falta, en tres números. */
export function numerosDelDocumento(
  doc: EstadoDeCuenta,
  hoy: string,
  soloContrato?: string | null,
): NumerosDeLaFicha {
  const contratos = soloContrato
    ? doc.contratos.filter((c) => c.numero === soloContrato)
    : doc.contratos;
  const recortado: EstadoDeCuenta = {
    ...doc,
    // La próxima del propietario (P-16) es de TODOS sus contratos: recortado a
    // uno, se calcula de sus filas.
    ...(soloContrato ? { proximaCuota: undefined } : {}),
    contratos,
    totales: soloContrato ? sumarTotales(contratos.map((c) => c.totales)) : doc.totales,
  };
  const r = resumirElCliente(recortado, hoy);
  const interesDeMora = soloContrato
    ? contratos.reduce((s, c) => s + (interesesDelContrato(c)?.pendiente ?? 0), 0)
    : interesesDelEstado(doc)?.pendiente;
  return {
    restaPorPagar: r.restaPorPagar,
    proxima: r.proxima ? { fecha: r.proxima.fecha, monto: r.proxima.valor } : null,
    enMora: r.enMora,
    diasDeMora: r.diasDeMora,
    enPlazo: r.enPlazo,
    sinPlazoFijado: r.sinPlazoFijado,
    interesDeMora,
    hayAlgo: contratos.length > 0,
    ...(!soloContrato && doc.porGirar ? { porGirar: doc.porGirar } : {}),
  };
}

export interface ResumenEnLaFichaProps {
  tipo: 'inquilino' | 'propietario';
  /** `tenantRef` o `propietarioId`, según `tipo`. */
  id: string;
  /**
   * El número de UN contrato. Con esto puesto —la ficha del contrato— el
   * resumen habla sólo de ese contrato, no de todo lo que la persona debe.
   */
  soloContrato?: string | null;
  /** A dónde vuelve el botón. Viaja como `?volver=`. */
  volverA?: string;
  className?: string;
  /**
   * Sólo del propietario: tiene algo arrendado (propio o en copropiedad). Con
   * eso, un resumen sin nada por girar ni próximo giro no es «Al día»: es
   * «Sin día de giro» (COLA-FRONT, 04-10, la recomendada).
   */
  tieneArrendados?: boolean;
  /** Avisa a la ficha si quedó «Sin día de giro» (para «Datos por completar»). */
  onSinDiaDeGiro?: (sinDiaDeGiro: boolean) => void;
}

/**
 * ¿El propietario con algo arrendado no tiene ningún giro programado? Nada por
 * girar, nada vencido ni próximo giro: su contrato no generó cuotas de su lado.
 */
export function propietarioSinDiaDeGiro(
  numeros: Pick<NumerosDeLaFicha, 'restaPorPagar' | 'proxima' | 'enMora' | 'enPlazo'> | null,
  tieneArrendados: boolean | undefined,
): boolean {
  return Boolean(
    tieneArrendados &&
      numeros &&
      !numeros.enMora &&
      !numeros.enPlazo &&
      !numeros.proxima &&
      numeros.restaPorPagar <= 0,
  );
}

export function ResumenEnLaFicha({
  tipo,
  id,
  soloContrato,
  volverA,
  className,
  tieneArrendados,
  onSinDiaDeGiro,
}: ResumenEnLaFichaProps) {
  const texto = useTextoDelEstado();
  /*
   * 🔴 P-16 (QA-PROP, 03-10): la ficha del PROPIETARIO decía «Resta por pagar ·
   * Próxima cuota · En mora · 64 días» —las palabras del inquilino— mientras su
   * estado de cuenta decía «Por girar · Giro atrasado». Para el propietario el
   * número es lo que la inmobiliaria le tiene que GIRAR: se usan los rótulos de
   * su lado (`claveDelLado`), los mismos del documento completo.
   */
  const esPropietario = tipo === 'propietario';
  const t: typeof texto = (clave, params) =>
    texto(claveDelLado(clave, esPropietario ? 'PROPIETARIO' : 'INQUILINO'), params);
  const hoy = hoyLocal();
  const [numeros, setNumeros] = React.useState<NumerosDeLaFicha | null>(null);
  const [cargando, setCargando] = React.useState(true);

  React.useEffect(() => {
    let vivo = true;
    setCargando(true);
    setNumeros(null);

    const documentoEntero = () =>
      (tipo === 'inquilino'
        ? estadoDeCuentaApi.inquilino(id)
        : estadoDeCuentaApi.propietario(id)
      ).then((d) => numerosDelDocumento(d, hoy, soloContrato));

    const pedir = soloContrato
      ? documentoEntero()
      : estadoDeCuentaApi
          .resumen(tipo, id)
          .then<NumerosDeLaFicha>((r) => ({
            restaPorPagar: r.restaPorPagar,
            proxima: r.proximaCuota,
            enMora: r.enMora !== null,
            diasDeMora: r.enMora?.dias ?? 0,
            // `pendiente` es lo vencido, en plazo o no; `enMora`, sólo lo que pasó el plazo.
            enPlazo: r.enMora === null && r.pendiente > 0,
            sinPlazoFijado: r.plazoSinFijar === true && r.enMora === null && r.pendiente > 0,
            plazoSinFijar: r.plazoSinFijar === true,
            interesDeMora: (r as { interesDeMora?: number }).interesDeMora,
            hayAlgo: r.contratos > 0,
            ...(r.porGirar ? { porGirar: r.porGirar } : {}),
          }))
          .catch(documentoEntero);

    void pedir
      .then((n) => {
        if (vivo) setNumeros(n);
      })
      .catch(() => {
        /* Sin datos no se pinta nada: ver abajo. */
      })
      .finally(() => {
        if (vivo) setCargando(false);
      });

    return () => {
      vivo = false;
    };
  }, [tipo, id, soloContrato, hoy]);

  const sinDiaDeGiro = esPropietario && propietarioSinDiaDeGiro(numeros, tieneArrendados);
  React.useEffect(() => {
    onSinDiaDeGiro?.(sinDiaDeGiro);
  }, [onSinDiaDeGiro, sinDiaDeGiro]);

  if (cargando) {
    return (
      <section
        className={cn('rounded-lg border border-border bg-surface p-5', className)}
        data-testid="resumen-en-la-ficha-cargando"
      >
        <Skeleton className="h-3 w-32" />
        <Skeleton className="mt-3 h-8 w-48" />
      </section>
    );
  }

  /*
   * Si las dos llamadas fallaron, o el cliente no tiene nada en este contrato,
   * no se pinta NADA. Una tarjeta que dice «$0» sobre datos que no llegaron se
   * lee «está al día», que es el error más caro que puede cometer esta pantalla.
   */
  if (!numeros || !numeros.hayAlgo) return null;

  const enlace = `${rutaDelEstadoDeCuenta(tipo, id)}${
    volverA ? `?volver=${encodeURIComponent(volverA)}` : ''
  }`;

  // Movimiento (ola 2, 03-10-2026): al llegar reemplaza al esqueleto con un
  // fundido y 4 px, y lo que resta por pagar cuenta desde 0 (como `KpiValor`).
  return (
    <Appear
      as="section"
      distance="xs"
      data-testid="resumen-en-la-ficha"
      className={cn(
        'rounded-lg border border-border bg-surface p-5 shadow-sm',
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-wrap items-start gap-x-8 gap-y-4">
          <div>
            <p className="text-label uppercase tracking-wide text-fg-subtle">
              {esPropietario && numeros.porGirar
                ? rotuloDePorGirar(numeros.porGirar.hastaMes)
                : t('estadoDeCuenta.restaPorPagar')}
            </p>
            <p
              data-testid="ficha-resta-por-pagar"
              className="mt-1 font-mono text-2xl font-medium tabular-nums text-fg"
            >
              <AnimatedNumber
                value={
                  esPropietario && numeros.porGirar
                    ? numeros.porGirar.porGirarCop
                    : numeros.restaPorPagar
                }
                from={0}
                format={formatCurrency}
              />
            </p>
            {/* 🔴 Lo de los meses siguientes, aparte (Nico, 04-10-2026). */}
            {esPropietario && numeros.porGirar && (
              <p className="mt-1 text-caption text-fg-muted" data-testid="ficha-proximos-giros">
                {rotuloDeProximosGiros(
                  sumarMeses(numeros.porGirar.hastaMes, 1),
                  numeros.porGirar.proximosGirosHastaMes,
                )}
                :{' '}
                <span className="font-mono tabular-nums">
                  {formatCurrency(numeros.porGirar.proximosGirosCop)}
                </span>
              </p>
            )}
            {/* Capital arriba; el interés de mora, aparte y debajo. Nunca del
                lado del propietario: el interés de mora es de la inmobiliaria. */}
            {/* CR-31: sin plazo fijado no corre interés: aunque llegue un
                número, no se dice «+ $X de intereses». */}
            {!esPropietario && !numeros.plazoSinFijar && (numeros.interesDeMora ?? 0) > 0 && (
              <p
                data-testid="ficha-intereses"
                className="mt-1 font-mono text-caption tabular-nums text-danger"
              >
                {t('estadoDeCuenta.masIntereses', {
                  monto: formatCurrency(numeros.interesDeMora ?? 0),
                })}
              </p>
            )}
          </div>

          <div>
            <p className="text-label uppercase tracking-wide text-fg-subtle">
              {t('estadoDeCuenta.proximaCuota')}
            </p>
            {numeros.proxima ? (
              <p className="mt-1 font-mono text-body tabular-nums text-fg">
                {fechaLegible(numeros.proxima.fecha)}
                <span className="text-fg-muted">
                  {' · '}
                  {formatCurrency(numeros.proxima.monto)}
                </span>
              </p>
            ) : (
              <p className="mt-1 text-body-sm text-fg-muted">
                {t('estadoDeCuenta.sinProxima')}
              </p>
            )}
          </div>

          <div>
            <p className="text-label uppercase tracking-wide text-fg-subtle">
              {t('estadoDeCuenta.estado')}
            </p>
            <p className="mt-1">
              <span
                data-testid="ficha-estado"
                className={cn(
                  'inline-block rounded-full px-2.5 py-0.5 text-body-sm',
                  sinDiaDeGiro
                    ? 'bg-surface-muted text-fg-muted'
                    : numeros.enMora
                    ? /* Rojo es «debes»: al propietario se le avisa en ámbar. */
                      esPropietario
                      ? 'bg-warning-soft text-warning'
                      : 'bg-danger-soft text-danger'
                    : numeros.enPlazo
                      ? 'bg-warning-soft text-warning'
                      : 'bg-success-soft text-success',
                )}
              >
                {sinDiaDeGiro
                  ? t('estadoDeCuenta.sinDiaDeGiro')
                  : numeros.enMora
                  ? t('estadoDeCuenta.enMoraDias', { dias: numeros.diasDeMora })
                  : numeros.enPlazo
                    ? numeros.sinPlazoFijado
                      ? t('estadoDeCuenta.vencidaSinPlazo')
                      : t('estadoDeCuenta.vencidoEnPlazo')
                    : t('estadoDeCuenta.alDia')}
              </span>
            </p>
          </div>
        </div>

        <Button asChild variant="secondary" hideArrow className="shrink-0">
          <Link href={enlace} data-testid="ver-estado-de-cuenta">
            {t('estadoDeCuenta.verEstadoDeCuenta')}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </Appear>
  );
}
