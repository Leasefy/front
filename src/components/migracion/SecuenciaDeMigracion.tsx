'use client';

/**
 * La secuencia de arranque de una inmobiliaria.
 *
 * ── Por qué esta pantalla existe ────────────────────────────────────────────
 *
 * Migrar no es una utilidad: es la barrera de adopción. Portofino lo intentó
 * dos meses contra el ERP anterior y lo abandonó. Las piezas 2 y 3 ya existían
 * en el producto —importar inmuebles, migrar contratos— pero vivían cada una
 * en su sección, sin nada que dijera en qué orden van ni cuánto falta. Alguien
 * que empieza no descubre un orden leyendo tres menús.
 *
 * ── Por qué el orden no se puede alterar ───────────────────────────────────
 *
 * No es una preferencia, es una dependencia de datos:
 *
 *   terceros → propiedades → contratos → cuentas del PUC → registros contables
 *
 * El contrato se pega a la dirección del inmueble, así que sin inmuebles
 * cargados los contratos entran sin a qué apuntar. Y el inmueble necesita
 * dueño. Por eso los terceros van primero.
 *
 * ── Lo que esta pantalla NO hace ───────────────────────────────────────────
 *
 * **No bloquea pasos.** Una inmobiliaria puede llegar con los inmuebles ya
 * cargados a mano; deshabilitarle el paso 3 sería inventarle un requisito.
 * El orden se explica, no se impone.
 *
 * **No dice «completado» sin evidencia.** Un paso se marca hecho sólo cuando
 * hay filas realmente aplicadas: para el PUC, cuentas en el plan; para los
 * registros, asientos escritos. Lo que no se puede medir no dice nada.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Buildings,
  CheckCircle,
  ClockCounterClockwise,
  FileText,
  Lock,
  Users,
  Warning,
  Wallet,
  ListChecks,
} from '@phosphor-icons/react';
import { Eyebrow } from '@leasefy/cadence';

import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import { migracionTercerosApi } from '@/lib/api/migracion-terceros.service';
import { inmueblesImportacionApi } from '@/lib/api/inmuebles-importacion.service';
import { contractsApi } from '@/lib/api/contracts.service';
import { contabilidadApi } from '@/lib/api/contabilidad.service';

/** Sólo lo que la tarjeta necesita saber de un paso, venga de donde venga. */
interface AvanceDePaso {
  /** Filas ya convertidas en registros reales. `null` = no se pudo medir. */
  hechas: number | null;
  /** Filas de una carga a medio revisar. */
  porRevisar: number;
  /** El nombre del lote sin terminar, para poder retomarlo. */
  loteAbierto: string | null;
}

const SIN_MEDIR: AvanceDePaso = { hechas: null, porRevisar: 0, loteAbierto: null };

type IdDePaso = 'terceros' | 'propiedades' | 'contratos' | 'puc' | 'contables';

export function SecuenciaDeMigracion() {
  const { t } = useI18n();
  const [avance, setAvance] = useState<Record<IdDePaso, AvanceDePaso>>({
    terceros: SIN_MEDIR,
    propiedades: SIN_MEDIR,
    contratos: SIN_MEDIR,
    puc: SIN_MEDIR,
    contables: SIN_MEDIR,
  });
  const [midiendo, setMidiendo] = useState(true);

  useEffect(() => {
    let vigente = true;

    /*
     * `allSettled` y no `all`: cada paso vive detrás de un permiso distinto
     * (`configuracion`, `portafolio`, `contratos`). Un CONTADOR que no puede
     * leer el portafolio recibe un 403 en UNA de las cuatro llamadas, y con
     * `all` eso dejaría la pantalla entera sin medir. Lo que no se puede leer
     * queda sin medir, y la tarjeta lo dice así en vez de inventar un cero.
     */
    Promise.allSettled([
      migracionTercerosApi.lotesAbiertos(),
      migracionTercerosApi.filas({ estado: 'APLICADO', porPagina: 1 }),
      inmueblesImportacionApi.lotesAbiertos(),
      contractsApi.migracion.lotesAbiertos(),
      contabilidadApi.puc.listar(),
      contabilidadApi.asientos.listar({ limite: 1 }),
    ]).then(([lotesTerceros, aplicadosTerceros, lotesInmuebles, lotesContratos, cuentas, asientos]) => {
      if (!vigente) return;

      const terceros: AvanceDePaso = { ...SIN_MEDIR };
      if (aplicadosTerceros.status === 'fulfilled') {
        // El `total` del back, no el largo de `filas`: se pidió una sola.
        terceros.hechas = aplicadosTerceros.value.total;
      }
      if (lotesTerceros.status === 'fulfilled') {
        const abierto = lotesTerceros.value[0];
        terceros.loteAbierto = abierto?.lote ?? null;
        terceros.porRevisar = lotesTerceros.value.reduce(
          (n, l) => n + l.requierenAtencion + l.listos + l.borradores,
          0,
        );
      }

      const propiedades: AvanceDePaso = { ...SIN_MEDIR };
      if (lotesInmuebles.status === 'fulfilled') {
        const abiertos = lotesInmuebles.value;
        propiedades.hechas = abiertos.reduce((n, l) => n + l.activados, 0);
        propiedades.porRevisar = abiertos.reduce((n, l) => n + l.pendientes + l.listos, 0);
        propiedades.loteAbierto =
          abiertos.find((l) => l.pendientes + l.listos > 0)?.lote ?? null;
      }

      const contratos: AvanceDePaso = { ...SIN_MEDIR };
      if (lotesContratos.status === 'fulfilled') {
        const abiertos = lotesContratos.value;
        /*
         * `lotesAbiertos` de contratos lista sólo lo que sigue abierto: NO
         * sabe cuántos contratos ya se activaron históricamente. Dejarlo en
         * `null` es lo honesto — poner 0 diría «no migraste ninguno» a quien
         * migró 1.200 la semana pasada.
         */
        contratos.porRevisar = abiertos.reduce((n, l) => n + l.pendientes + l.listos, 0);
        contratos.loteAbierto = abiertos[0]?.lote ?? null;
      }

      const puc: AvanceDePaso = { ...SIN_MEDIR };
      if (cuentas.status === 'fulfilled') puc.hechas = cuentas.value.length;

      const contables: AvanceDePaso = { ...SIN_MEDIR };
      if (asientos.status === 'fulfilled') {
        // El `total` del back, no el largo de `asientos`: se pidió uno solo.
        contables.hechas = asientos.value.total;
      }

      setAvance({ terceros, propiedades, contratos, puc, contables });
      setMidiendo(false);
    });

    return () => {
      vigente = false;
    };
  }, []);

  const pasos = [
    {
      id: 'terceros' as const,
      icono: Users,
      href: '/panel/inmobiliaria/migracion/terceros',
      disponible: true,
    },
    {
      id: 'propiedades' as const,
      icono: Buildings,
      href: '/panel/inmobiliaria/inmuebles/importar',
      disponible: true,
    },
    {
      id: 'contratos' as const,
      icono: FileText,
      href: '/panel/inmobiliaria/contratos/migrar',
      disponible: true,
    },
    {
      id: 'puc' as const,
      icono: Wallet,
      href: '/panel/inmobiliaria/migracion/puc',
      disponible: true,
    },
    {
      id: 'contables' as const,
      icono: ListChecks,
      href: '/panel/inmobiliaria/migracion/contables',
      disponible: true,
    },
  ];

  const hayAlgoSinTerminar = pasos.some((p) => avance[p.id].porRevisar > 0);

  return (
    <div className="space-y-6">
      {/*
       * El aviso va ARRIBA de los pasos, no adentro del paso 3: cuando alguien
       * ya está mirando «Contratos» y le decimos que faltaban los inmuebles,
       * llega tarde.
       */}
      <div className="flex items-start gap-2 rounded-md border border-border bg-info-soft p-3">
        <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-info" />
        <div>
          <p className="text-sm font-medium text-info">{t('migracion.orden.titulo')}</p>
          <p className="mt-0.5 text-sm text-fg-muted">{t('migracion.orden.detalle')}</p>
        </div>
      </div>

      {hayAlgoSinTerminar ? (
        <div
          className="flex items-start gap-2 rounded-md border border-border bg-warning-soft p-3"
          data-testid="migracion-sin-terminar"
        >
          <ClockCounterClockwise className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <p className="text-sm text-fg">{t('migracion.retomarAviso')}</p>
        </div>
      ) : null}

      <ol className="space-y-3">
        {pasos.map((paso, i) => (
          <li key={paso.id}>
            <TarjetaDePaso
              numero={i + 1}
              icono={paso.icono}
              titulo={t(`migracion.pasos.${paso.id}.titulo`)}
              descripcion={t(`migracion.pasos.${paso.id}.descripcion`)}
              href={paso.href}
              disponible={paso.disponible}
              avance={avance[paso.id]}
              midiendo={midiendo}
            />
          </li>
        ))}
      </ol>
    </div>
  );
}

function TarjetaDePaso({
  numero,
  icono: Icono,
  titulo,
  descripcion,
  href,
  disponible,
  avance,
  midiendo,
}: {
  numero: number;
  icono: React.ComponentType<{ className?: string }>;
  titulo: string;
  descripcion: string;
  href: string | null;
  disponible: boolean;
  avance: AvanceDePaso;
  midiendo: boolean;
}) {
  const { t } = useI18n();

  const hecho = (avance.hechas ?? 0) > 0;
  const enCurso = avance.porRevisar > 0;

  return (
    <div
      className={`rounded-lg border bg-surface p-5 shadow-sm ${
        disponible ? 'border-border' : 'border-border-faint'
      }`}
      data-testid={`paso-${numero}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${
              disponible ? 'bg-primary-soft text-primary' : 'bg-surface-muted text-fg-subtle'
            }`}
          >
            <Icono className="h-5 w-5" />
          </span>
          <div className="min-w-0 space-y-1">
            {/* `div`, no `p`: el `Eyebrow` de cadence renderiza un `<div>` y
                un bloque dentro de un `<p>` es HTML inválido — el navegador
                cierra el párrafo antes de tiempo y la fila se parte en dos. */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs tabular-nums text-fg-subtle">
                {String(numero).padStart(2, '0')}
              </span>
              <span className={disponible ? 'font-medium text-fg' : 'font-medium text-fg-muted'}>
                {titulo}
              </span>
              <EtiquetaDeEstado
                disponible={disponible}
                hecho={hecho}
                enCurso={enCurso}
                midiendo={midiendo}
              />
            </div>
            <p className="max-w-2xl text-sm text-fg-muted">{descripcion}</p>

            {/* Los conteos, cuando existen. Nunca un cero inventado: un paso
                que no se pudo medir simplemente no dice nada. */}
            {avance.hechas !== null && avance.hechas > 0 ? (
              <p className="text-sm text-success">
                {t('migracion.avance.hechas', { n: avance.hechas })}
              </p>
            ) : null}
            {enCurso ? (
              <p className="text-sm text-warning">
                {t('migracion.avance.porRevisar', {
                  n: avance.porRevisar,
                  lote: avance.loteAbierto ?? '',
                })}
              </p>
            ) : null}
          </div>
        </div>

        <div className="shrink-0">
          {disponible && href ? (
            <Button asChild variant={enCurso ? 'default' : 'outline'} size="sm" hideArrow>
              <Link href={href}>
                {enCurso ? t('migracion.retomar') : t('migracion.empezar')}
              </Link>
            </Button>
          ) : (
            /*
             * Sin botón, a propósito. Un `<Button disabled>` invita a
             * clickearlo y no explica nada; el candado más la frase dicen qué
             * pasa y qué NO hay que esperar.
             */
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1.5 text-xs text-fg-muted">
              <Lock className="h-3.5 w-3.5" />
              {t('migracion.noDisponible')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function EtiquetaDeEstado({
  disponible,
  hecho,
  enCurso,
  midiendo,
}: {
  disponible: boolean;
  hecho: boolean;
  enCurso: boolean;
  midiendo: boolean;
}) {
  const { t } = useI18n();

  if (!disponible) {
    return <Eyebrow className="text-fg-subtle">{t('migracion.estados.enConstruccion')}</Eyebrow>;
  }
  // Mientras se mide no se afirma nada: un «sin empezar» que en un segundo
  // pasa a «847 migrados» es la clase de parpadeo que hace desconfiar.
  if (midiendo) return null;
  if (enCurso) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-warning">
        <Warning className="h-3.5 w-3.5" />
        {t('migracion.estados.enCurso')}
      </span>
    );
  }
  if (hecho) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-success">
        <CheckCircle className="h-3.5 w-3.5" weight="fill" />
        {t('migracion.estados.conDatos')}
      </span>
    );
  }
  return null;
}
