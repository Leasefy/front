'use client';

/**
 * Inquilinos — la sección que no existía.
 *
 * «Yo ni siquiera tengo sección de inquilinos» (reunión del 2026-08-31). Había
 * propietarios; el inquilino sólo se veía como un campo adentro de un
 * candidato o de un contrato, así que no había dónde buscarlo ni cómo saber
 * cuántos inmuebles tiene.
 *
 * ── Tres decisiones que la pantalla toma a propósito ────────────────────────
 *
 * 1. **La fila es una PERSONA, no un arriendo.** El back agrupa por `tenantId`
 *    y acá se respeta: alguien con dos inmuebles aparece una vez, con los dos
 *    adentro. Dos filas con el mismo nombre y sin decir por qué es cómo se
 *    termina llamando dos veces al mismo inquilino.
 * 2. **No hay «Agregar inquilino».** Un inquilino nace de un contrato (con
 *    postulación o armado a mano, donde se lo carga por documento y correo)
 *    o de la migración; el back no expone un POST suelto. Un botón que abre
 *    un formulario acá crearía gente sin arriendo y la lista dejaría de
 *    significar «a quién le administro un inmueble». Lo que sí hay es el
 *    atajo al contrato manual — ver la decisión 7.
 * 3. **La búsqueda viaja al back.** Ver `use-inquilinos.ts`.
 *
 * ── Y una cuarta, del 2026-09-02 ────────────────────────────────────────────
 * 4. **Es una TABLA, no tarjetas** (Nico: «mejor en una tabla como las otras
 *    que tenemos, con toda la información que tienes igual, y con
 *    paginación»). La fila sigue siendo una persona; lo que la tarjeta
 *    mostraba anidado —cada arriendo con su estado, canon y vigencia— vive en
 *    las columnas cuando hay uno solo, y se despliega cuando hay varios. Ver
 *    `InquilinosTable`.
 *
 * ── Y una quinta, del 2026-09-03 ────────────────────────────────────────────
 * 5. **Una sola tarjeta: barra, tabla, vacío y paginador.** Nico: «nuestras
 *    tablas tienen el buscador y las tabs también asociadas a la tabla, no
 *    fuera de ella». El buscador y las pestañas estaban flotando encima.
 *
 *    Consecuencia que NO es cosmética: la tarjeta se pinta aunque la lista
 *    venga vacía, y el vacío va adentro. Antes, buscar algo que no existe
 *    reemplazaba toda la tarjeta por el vacío; con el buscador adentro eso
 *    habría borrado el campo con el texto que la persona acababa de escribir.
 *
 * 6. **El detalle es un CAJÓN, no un diálogo** («que al dar clic se abra un
 *    drawer y muestre todo el detalle»). Ver `InquilinoDrawer`.
 *
 * ── Y una séptima, del 2026-09-04 ───────────────────────────────────────────
 * 7. **Sí hay por dónde cargar UNO.** Nico: «¿y si no quiero migrar un montón
 *    de inquilinos sino que quiero crear uno solo, qué?» → «pues aquí también
 *    se debería poder». La decisión 2 sigue en pie en lo que importa —el back
 *    no expone un POST de inquilino suelto y esta lista se arma con
 *    `lease.findMany`— pero el camino existe desde el 2026-09-03: el contrato
 *    manual (`/contratos/nuevo?modo=manual`) elige el inmueble consignado y
 *    escribe al inquilino ahí mismo, sin postulación previa. Migrar era el
 *    único botón, y para una inmobiliaria con un solo arriendo eso es un
 *    callejón.
 *
 *    Por eso el botón dice «Crear un contrato» y no «Nuevo inquilino»: lo que
 *    se abre es el contrato entero (inmueble, fechas, canon, PDF), y el
 *    inquilino es un bloque adentro. No hay forma de guardar una persona sin
 *    su arriendo, así que prometerlo sería mentir en el clic.
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Buildings,
  CurrencyDollar,
  Plus,
  UploadSimple,
  UserCircle,
  Users,
} from '@phosphor-icons/react';
import { KpiCard, Eyebrow } from '@leasefy/cadence';

import { PageGuard } from '@/components/auth/PageGuard';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { SinDatos } from '@/components/estado/SinDatos';
import { Button } from '@/components/ui/button';
import { TablePagination } from '@/components/ui/pagination';
import { useTablePagination } from '@/lib/hooks/use-table-pagination';
import { BarraDeInquilinos, InquilinosTable } from '@/components/inmobiliaria/InquilinosTable';
import { InquilinoDrawer } from '@/components/inmobiliaria/InquilinoDrawer';
import {
  RUTA_DE_LA_MIGRACION,
  useCopyDeMigracionEnLista,
} from '@/components/migracion/VeredictoDeMigracion';
import { vacioPorMigracion } from '@/components/migracion/muro-reglas';
import { useI18n } from '@/lib/i18n';
import { useMigracionConDeuda } from '@/lib/hooks/use-migracion-con-deuda';
import { useInquilinos } from '@/lib/hooks/use-inquilinos';
import {
  arriendosVigentes,
  type FiltroDeEstado,
  type Inquilino,
} from '@/lib/api/inquilinos.service';

/*
 * La única variante de `/contratos/nuevo` que carga sin postulación: a secas
 * esa ruta responde «Falta el parámetro applicationId». Con `?modo=manual` se
 * elige el inmueble consignado y se escribe el inquilino ahí mismo.
 */
const RUTA_DEL_CONTRATO_MANUAL = '/panel/inmobiliaria/contratos/nuevo?modo=manual';

/**
 * El camino para cargar uno solo.
 *
 * 🔴 Va detrás de `contratos`/`create` porque el destino está protegido con
 * `PageGuard module="contratos" action="create"`: sin ese permiso el clic no
 * abre nada, redirige. Un botón que rebota no es un botón. Con `fallback={null}`
 * simplemente no se pinta (el default de `PermissionGate` es un cartel de
 * «acceso restringido», que adentro de un encabezado no tiene sentido).
 */
function CrearContratoBoton({ secundario = false }: { secundario?: boolean }) {
  const { t } = useI18n();
  return (
    <PermissionGate module="contratos" action="create" fallback={null}>
      <Button
        asChild
        hideArrow
        variant={secundario ? 'outline' : 'default'}
        className="shrink-0 gap-2"
        data-testid="crear-contrato-manual"
      >
        <Link href={RUTA_DEL_CONTRATO_MANUAL}>
          <Plus className="h-4 w-4" weight="bold" aria-hidden="true" />
          {t('inquilinos.crearContrato')}
        </Link>
      </Button>
    </PermissionGate>
  );
}

export default function InquilinosPage() {
  /*
   * `contratos`, que es el permiso con el que el back protege estos dos GET
   * (`@RequirePermission('contratos', 'view')`). Y por `view`, nunca por una
   * acción de escritura: `canAccess()` en false también es lo que devuelve
   * mientras el servicio de permisos no contesta, y el guard REDIRIGE — con
   * una acción más estricta la pantalla desaparecería para todos cada vez que
   * ese servicio esté caído.
   */
  return (
    <PageGuard module="contratos">
      <ContenidoDeInquilinos />
    </PageGuard>
  );
}

function ContenidoDeInquilinos() {
  const { t, formatCurrency } = useI18n();

  const [buscar, setBuscar] = useState('');
  const [estado, setEstado] = useState<FiltroDeEstado>('activos');
  const [abierto, setAbierto] = useState<Inquilino | null>(null);

  const { inquilinos, cargando, error, refrescar } = useInquilinos({ buscar, estado });

  /*
   * Paginación en el cliente: la lista viene entera del back (una fila por
   * persona, sin `page`), igual que propietarios y el portafolio. `resetKey`
   * la manda a la página 1 cuando cambia el filtro — si no, filtrar desde la
   * página 3 deja la tabla en blanco.
   */
  const { pageItems, total, page, pageSize, setPage, setPageSize, shouldPaginate } =
    useTablePagination(inquilinos, {
      initialPageSize: 10,
      resetKey: `${buscar}|${estado}`,
    });

  const totales = useMemo(() => {
    const vigentes = inquilinos.flatMap(arriendosVigentes);
    return {
      personas: inquilinos.length,
      vigentes: vigentes.length,
      canon: vigentes.reduce((suma, a) => suma + a.canonCop, 0),
    };
  }, [inquilinos]);

  const hayFiltros = buscar.trim().length > 0 || estado !== 'activos';

  /*
   * 🔴 El vacío tiene que decir la verdad.
   *
   * Esta lista sale de `lease.findMany` agrupado por `tenantId`, y un
   * contrato migrado sin inmueble no produce arriendo: la lista queda vacía
   * y hasta hoy decía «Todavía no hay ningún arriendo… traé los que ya tenés
   * en otro sistema» — o sea, le pedía migrar a alguien que acababa de
   * migrar 91 contratos. Nico: «va y ve y sólo existen los contratos pero
   * sin nada asociado».
   *
   * Con deuda de migración se dice el número real y el botón lleva a
   * completarla. Sin deuda —o sin poder saberlo— queda el vacío de siempre.
   */
  const deuda = useMigracionConDeuda();
  const copyDeMigracion = useCopyDeMigracionEnLista();
  const vacioPorLaMigracion = !hayFiltros && vacioPorMigracion(deuda);
  const copy = deuda && vacioPorLaMigracion ? copyDeMigracion(deuda) : null;

  return (
    <div className="space-y-6 p-6 lg:p-8">
      {/* El botón vive en el encabezado y no en el vacío: con la lista llena
          también hace falta —una inmobiliaria que ya tiene 40 inquilinos y
          firma el 41 no pasa por un estado vacío nunca más—. */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <Eyebrow>{t('inquilinos.eyebrow')}</Eyebrow>
          <h1 className="text-h2 text-fg">
            {t('inquilinos.titulo')}
          </h1>
          <p className="max-w-2xl text-body text-fg-muted line-clamp-2">{t('inquilinos.subtitulo')}</p>
        </div>
        <CrearContratoBoton />
      </header>

      {/* Los tres números miden lo VIGENTE, no lo histórico: un canon que suma
          contratos terminados no es plata que entra este mes. */}
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          label={t('inquilinos.kpi.personas')}
          value={String(totales.personas)}
          icon={<Users />}
        />
        <KpiCard
          label={t('inquilinos.kpi.arriendosVigentes')}
          value={String(totales.vigentes)}
          icon={<Buildings />}
        />
        <KpiCard
          label={t('inquilinos.kpi.canonVigente')}
          value={formatCurrency(totales.canon)}
          icon={<CurrencyDollar />}
        />
      </div>

      <EstadoDeDatos
        cargando={cargando}
        error={error}
        queEs={t('inquilinos.queEs')}
        onReintentar={refrescar}
      >
        {/* UNA tarjeta: barra, tabla (o vacío) y paginador. `rounded-lg` son
            los 22px de la tarjeta del panel — `rounded-xl` en cadence son 32
            y no es el radio de una tabla. */}
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          {/*
            La barra se pinta aunque no haya filas, PERO no cuando la
            inmobiliaria todavía no tiene un solo inquilino: un buscador sobre
            la nada es un campo que no puede encontrar nada. Con filtros
            puestos es al revés — es la única forma de volver.
          */}
          {(inquilinos.length > 0 || hayFiltros) && (
            <BarraDeInquilinos
              buscar={buscar}
              onBuscar={setBuscar}
              estado={estado}
              onEstado={setEstado}
            />
          )}

          {inquilinos.length === 0 ? (
            <SinDatos
              hayFiltros={hayFiltros}
              queSon={t('inquilinos.queSon')}
              icono={UserCircle}
              titulo={copy?.titulo}
              descripcion={copy?.detalle ?? t('inquilinos.vacioDescripcion')}
              onLimpiarFiltros={
                hayFiltros
                  ? () => {
                      setBuscar('');
                      setEstado('activos');
                    }
                  : undefined
              }
              /*
               * DOS caminos, porque son dos situaciones distintas y las dos
               * llegan a este mismo vacío:
               *
               *  · muchos arriendos ya andando en otro sistema → migrarlos, y
               *    los inquilinos salen solos. Sigue siendo el PRIMARIO (Nico,
               *    2026-09-03: «¿por qué tengo migrar contrato como CTA
               *    secundario?»). Con deuda de migración el botón no dice
               *    «migrar» —ya migró— sino completar la que quedó a medias.
               *  · un solo arriendo, o el 41 → cargarlo a mano. Ofrecer nada
               *    más que migrar a quien tiene UN inmueble es un callejón
               *    (Nico, 2026-09-04).
               *
               * Los dos llenan ESTA lista, que el back arma con
               * `lease.findMany` agrupado por `tenantId`. El que sigue sin
               * botón es el paso «Terceros» de la migración: carga la persona
               * y la invita al portal, pero sin contrato no aparece acá.
               *
               * 🔴 Y el segundo botón lleva a `?modo=manual`, nunca a
               * `/contratos/nuevo` a secas: esa ruta sin `?applicationId=`
               * responde «Falta el parámetro applicationId».
               */
              accion={
                hayFiltros ? undefined : (
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <Button asChild hideArrow>
                      <Link href={RUTA_DE_LA_MIGRACION}>
                        <UploadSimple className="mr-1.5 h-4 w-4" />
                        {copy?.accion ?? t('inquilinos.vacioContrato')}
                      </Link>
                    </Button>
                    <CrearContratoBoton secundario />
                  </div>
                )
              }
            />
          ) : (
            <>
              <InquilinosTable inquilinos={pageItems} onAbrir={setAbierto} />
              {/* El pie se monta SIEMPRE que haya filas, aunque sean menos
                  que una página: con una sola dice «Mostrando 1–3 de 3» y deja
                  elegir cuántas ver, que es lo que hace que una tabla se lea
                  como tabla (Nico, 2026-09-02). Esconderlo era lo que él marcó. */}
              {shouldPaginate && (
                <div className="border-t border-border bg-muted/10 px-4 py-3">
                  <TablePagination
                    total={total}
                    page={page}
                    pageSize={pageSize}
                    pageSizeOptions={[10, 20, 50]}
                    onPageChange={setPage}
                    onPageSizeChange={setPageSize}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </EstadoDeDatos>

      <InquilinoDrawer persona={abierto} onCerrar={() => setAbierto(null)} />
    </div>
  );
}
