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
 *    significar «a quién le administro un inmueble». El vacío ofrece UNA
 *    salida: migrar los contratos (ver el comentario sobre `accion`).
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
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Buildings,
  CurrencyDollar,
  UploadSimple,
  UserCircle,
  Users,
} from '@phosphor-icons/react';
import { KpiCard, Eyebrow } from '@leasefy/cadence';

import { PageGuard } from '@/components/auth/PageGuard';
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { SinDatos } from '@/components/estado/SinDatos';
import { Button } from '@/components/ui/button';
import { TablePagination } from '@/components/ui/pagination';
import { useTablePagination } from '@/lib/hooks/use-table-pagination';
import { BarraDeInquilinos, InquilinosTable } from '@/components/inmobiliaria/InquilinosTable';
import { InquilinoDrawer } from '@/components/inmobiliaria/InquilinoDrawer';
import { useI18n } from '@/lib/i18n';
import { useInquilinos } from '@/lib/hooks/use-inquilinos';
import {
  arriendosVigentes,
  type FiltroDeEstado,
  type Inquilino,
} from '@/lib/api/inquilinos.service';

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

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <header className="space-y-1">
        <Eyebrow>{t('inquilinos.eyebrow')}</Eyebrow>
        <h1 className="text-h2 text-fg">
          {t('inquilinos.titulo')}
        </h1>
        <p className="max-w-2xl text-body text-fg-muted line-clamp-2">{t('inquilinos.subtitulo')}</p>
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
              descripcion={t('inquilinos.vacioDescripcion')}
              onLimpiarFiltros={
                hayFiltros
                  ? () => {
                      setBuscar('');
                      setEstado('activos');
                    }
                  : undefined
              }
              /*
               * No hay «crear»: un inquilino nace de un contrato o de la
               * migración, y el back ni siquiera expone un POST. Ofrecer un
               * formulario acá crearía gente sin arriendo.
               *
               * UN solo botón, y es «Migrar contratos» (Nico, 2026-09-03: «¿por
               * qué tengo migrar contrato como CTA secundario?»). Es el único
               * camino que llena ESTA lista: el back la arma con
               * `lease.findMany` agrupado por `tenantId`, así que un inquilino
               * cargado en el paso «Terceros» de la migración (usuario +
               * invitación al portal) no aparece acá hasta que exista su
               * contrato — por eso ese camino no merece un botón acá: llevaría
               * a una pantalla que deja esta lista igual de vacía. El texto del
               * vacío ya dice de dónde salen («no hay ningún arriendo… los
               * inquilinos aparecen solos»).
               *
               * 🔴 Y no puede ser `/contratos/nuevo`: esa ruta sin
               * `?applicationId=` responde «Falta el parámetro applicationId»
               * —un contrato nace de una postulación aprobada—. Sería un botón
               * que lleva a un error.
               */
              accion={
                hayFiltros ? undefined : (
                  <Button asChild hideArrow>
                    <Link href="/panel/inmobiliaria/contratos/migrar">
                      <UploadSimple className="mr-1.5 h-4 w-4" />
                      {t('inquilinos.vacioContrato')}
                    </Link>
                  </Button>
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
