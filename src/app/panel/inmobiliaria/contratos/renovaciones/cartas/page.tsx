'use client';

/**
 * 🔴 La cola de cartas del incremento — su propia pantalla (Nico, 19-09-2026).
 *
 * «Es una lista enorme… quizás un tablero que contenga diferente información y
 * de ahí amplío la información si es que son urgentes, críticas etc… y poder ir
 * abriendo esos caminos en la navegación, porque es larguísima esa lista y ni
 * se ve la tabla que hay en la parte de abajo.»
 *
 * En la agencia migrada son **57 cartas** (17 sin constancia + 40 por enviar),
 * de cuatro renglones cada una: unos 5.700 px de lista ENCIMA de la tabla de
 * Renovaciones, que es la pantalla a la que uno venía. Una cola de trabajo de
 * 57 ítems no es un aviso arriba de otra cosa: es una pantalla.
 *
 * En Renovaciones quedó el TABLERO (tres losetas con su conteo, la roja
 * primero) y cada loseta abre esta cola ya filtrada por `?estado=`.
 *
 * ── Por qué sigue siendo una lista y no una tabla ───────────────────────────
 *
 * Cada carta trae su TEXTO, y el trabajo es leerlo y corregirlo antes de
 * enviar («ver o corregir la carta» abre el cuerpo completo). Eso no entra en
 * una fila de tabla. Lo que sí se adopta es el resto del patrón de la casa: una
 * tarjeta, la franja de filtros pegada arriba con el estado y el buscador, el
 * alcance («12 de 57») y la paginación abajo.
 *
 * ── Sin «Volver» ────────────────────────────────────────────────────────────
 *
 * El riel de secciones deja «Renovaciones» marcada mientras se está acá
 * (`pestanaActiva` coincide por prefijo), así que el camino de vuelta ya está
 * en la navegación. Un botón que repita lo que el riel hace es una decisión de
 * más (Nico, 18-09: «¿para qué el devolverse?»).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { EnvelopeSimple, MagnifyingGlass } from '@phosphor-icons/react';

import { PageGuard } from '@/components/auth/PageGuard';
import { CrossFade, Presence } from '@leasefy/cadence';
import { Input } from '@/components/ui/input';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { SinDatos } from '@/components/estado/SinDatos';
import { EsqueletoTabla } from '@/components/estado/EsqueletoTabla';
import { TablePagination } from '@/components/ui/pagination';
import { useTablePagination, PAGE_SIZE_OPTIONS } from '@/lib/hooks/use-table-pagination';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { cn } from '@/lib/utils';
import { Fila, tipoDeLaCarta } from '@/components/contratos/BandejaDeCartasDelIncremento';
import { PestanasDeEstado } from '@/components/pantalla/PestanasDeEstado';
import { plataPareja } from '@/lib/format';
import {
  CartaDelIncrementoCajon,
  type CartaQueSeAbre,
} from '@/components/contratos/CartaDelIncrementoCajon';
import {
  cicloDeVidaApi,
  type BandejaDeCartas,
  type CartaEnLaBandeja,
} from '@/lib/api/ciclo-de-vida.service';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla'
import { ParaEntenderMas } from '@/components/ui/para-entender-mas';

/** Los tres estados, con el nombre que viaja en la URL. */
const ESTADOS = [
  { clave: 'sin-constancia', rotulo: 'Sin constancia', backend: 'VENCIDA_SIN_CONSTANCIA' },
  { clave: 'por-enviar', rotulo: 'Por enviar', backend: 'POR_ENVIAR' },
  { clave: 'enviadas', rotulo: 'Enviadas', backend: 'ENVIADA' },
] as const;

type ClaveDeEstado = (typeof ESTADOS)[number]['clave'] | 'todas';

function normalizar(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/** Lo que el buscador mira: el contrato, el inquilino y la dirección. */
function textoBuscableDe(c: CartaEnLaBandeja): string {
  return [c.externalId, c.code === null ? null : String(c.code), c.inquilino, c.inmueble]
    .filter(Boolean)
    .join(' ');
}

function ColaDeCartas() {
  const { canAccess } = usePermissions();
  const puedeEditar = canAccess('contratos', 'edit');
  const params = useSearchParams();

  const [datos, setDatos] = useState<BandejaDeCartas | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [busqueda, setBusqueda] = useState('');
  // 🔴 19-10-2026: la carta se ve (y se envía) en su cajón, nunca a ciegas.
  const [cartaAbierta, setCartaAbierta] = useState<CartaQueSeAbre | null>(null);

  /* El estado llega en la URL: es el camino que abrió la loseta del tablero. */
  const deLaUrl = params?.get('estado') ?? '';
  const [estado, setEstado] = useState<ClaveDeEstado>(
    ESTADOS.some((e) => e.clave === deLaUrl) ? (deLaUrl as ClaveDeEstado) : 'todas',
  );

  const cargar = useCallback(async () => {
    setError(null);
    try {
      setDatos(await cicloDeVidaApi.bandejaDeCartas());
    } catch (e) {
      setError(e);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const todas = useMemo(() => datos?.cartas ?? [], [datos]);

  /*
   * Los conteos se cuentan sobre LAS FILAS que hay, no sobre los totales del
   * back: así la píldora y la lista no pueden contradecirse nunca.
   */
  const conteos = useMemo(() => {
    const n: Record<string, number> = { todas: todas.length };
    for (const e of ESTADOS) n[e.clave] = todas.filter((c) => c.estado === e.backend).length;
    return n;
  }, [todas]);

  /* Revisora r25: la misma plata con y sin centavos en la columna, y el mismo
     «Carta de incremento por IPC del 5,1 %…» repetido en cada fila. */
  const plata = useMemo(() => {
    const f = plataPareja(todas.flatMap((c) => [c.canonAnteriorCop, c.canonNuevoCop]));
    return (n: number) => f(n);
  }, [todas]);
  const tipoUnico = useMemo(() => {
    if (todas.length < 2) return null;
    const t = tipoDeLaCarta(todas[0]);
    return todas.every((c) => tipoDeLaCarta(c) === t) ? t : null;
  }, [todas]);

  const visibles = useMemo(() => {
    const q = normalizar(busqueda);
    return todas.filter((c) => {
      if (estado !== 'todas') {
        const def = ESTADOS.find((e) => e.clave === estado);
        if (def && c.estado !== def.backend) return false;
      }
      if (q === '') return true;
      return normalizar(textoBuscableDe(c)).includes(q);
    });
  }, [todas, estado, busqueda]);

  const hayFiltros = estado !== 'todas' || busqueda.trim() !== '';
  const limpiar = () => {
    setEstado('todas');
    setBusqueda('');
  };

  const { pageItems, total, page, pageSize, setPage, setPageSize, shouldPaginate } =
    useTablePagination(visibles, { resetKey: `${estado}|${busqueda}` });

  return (
    <div className="space-y-6 p-6 lg:p-8">
      {/* Glow up 22-10: el encabezado común; una línea de para qué sirve y el porqué en la ayuda. */}
      <EncabezadoDePantalla
        seccion="Operación"
        titulo="Cartas del incremento"
        descripcion={`Cada carta sale sola ${datos?.diasAntes ?? 30} días antes del aniversario del contrato.`}
        ayuda={
          <ParaEntenderMas etiqueta="¿Cómo funciona?" titulo="Cartas del incremento">
            <p className="text-sm leading-relaxed text-fg-muted">
              Cada carta aparece sola {datos?.diasAntes ?? 30} días antes del aniversario del contrato. El canon sube
              igual en la fecha: la carta es transparencia, y su constancia es lo que queda como prueba de que se avisó.
            </p>
          </ParaEntenderMas>
        }
      />

      {error ? (
        <FalloDeCarga
          error={error}
          queEs="las cartas del incremento"
          onReintentar={cargar}
        />
      ) : (
        <section className="overflow-hidden rounded-lg border border-border bg-card">
          {datos && !datos.disponible && (
            <p className="border-b border-border bg-warning-soft px-5 py-3 text-caption text-fg">
              Falta una actualización de la base: se ven las cartas, pero todavía no se
              pueden enviar.
            </p>
          )}

          {/* La franja de filtros de la casa: estado, buscador, y debajo el
              alcance. Igual que Renovaciones y que la deuda del mes. */}
          <div className="flex flex-col gap-3 border-b border-border px-5 py-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {/* Revisora r25 (T2): las pestañas de estado de la casa, sin ceros
                  (antes chips grises con «Sin constancia 0», «Enviadas 0»). */}
              <PestanasDeEstado<ClaveDeEstado>
                pestanas={[
                  { valor: 'todas', etiqueta: 'Todas', cuantos: conteos.todas, fija: true },
                  ...ESTADOS.map((e) => ({
                    valor: e.clave as ClaveDeEstado,
                    etiqueta: e.rotulo,
                    cuantos: conteos[e.clave] ?? 0,
                    ...(e.clave === 'sin-constancia' ? { tono: 'aviso' as const } : {}),
                    testid: `pestana-cartas-${e.clave}`,
                  })),
                ]}
                valor={estado}
                onCambio={setEstado}
                etiqueta="Estado de las cartas"
                data-testid="pestanas-de-cartas"
              />
            </div>

            <div className="relative w-full lg:max-w-xs">
              <MagnifyingGlass
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted"
                aria-hidden="true"
              />
              <Input
                className="pl-9"
                placeholder="Contrato, inquilino o inmueble"
                aria-label="Buscar cartas"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                data-testid="buscar-cartas"
              />
            </div>
          </div>

          <Presence
            show={hayFiltros}
            initial={false}
            distance="xs"
            as="p"
            className="border-b border-border px-5 py-2 text-caption text-fg-muted"
            data-testid="alcance-de-cartas"
          >
            {visibles.length} de {todas.length}{' '}
            {todas.length === 1 ? 'carta' : 'cartas'}.{' '}
            <button
              type="button"
              onClick={limpiar}
              className="font-medium text-primary underline-offset-4 hover:underline"
              data-testid="limpiar-filtros-cartas"
            >
              Quitar los filtros
            </button>
          </Presence>

          {/* Cargando → la cola (o el vacío): se cruzan. `popLayout`: lo nuevo
              entra YA y lo viejo se va por encima. */}
          <CrossFade
            swapKey={!datos ? 'cargando' : visibles.length === 0 ? 'vacio' : 'lista'}
            mode="popLayout"
            direction="none"
          >
            {!datos ? (
              <div className="p-5">
                <EsqueletoTabla columnas={3} filas={5} />
              </div>
            ) : visibles.length === 0 ? (
              <SinDatos
                hayFiltros={hayFiltros}
                queSon="cartas del incremento"
                icono={EnvelopeSimple}
                titulo="No hay ninguna carta pendiente"
                descripcion={`Cada carta aparece sola ${datos.diasAntes} días antes del aniversario de su contrato.`}
                onLimpiarFiltros={hayFiltros ? limpiar : undefined}
              />
            ) : (
              <>
              {tipoUnico ? (
                <p className="flex items-center gap-1.5 border-b border-border px-5 py-2.5 text-caption text-fg-muted" data-testid="tipo-de-las-cartas">
                  <EnvelopeSimple className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  Todas son la {tipoUnico.charAt(0).toLowerCase() + tipoUnico.slice(1)}.
                </p>
              ) : null}
              <ul className="divide-y divide-border px-5" data-testid="cola-de-cartas">
                {pageItems.map((c) => (
                  <Fila
                    key={`${c.contractId}-${c.desde}`}
                    carta={c}
                    plata={plata}
                    sinTipo={tipoUnico !== null}
                    editable={puedeEditar && datos.disponible}
                    onAbrir={(carta) =>
                      setCartaAbierta({
                        contractId: carta.contractId,
                        desde: carta.desde,
                        titulo: `#${carta.externalId ?? carta.code} · ${carta.inquilino ?? 'Sin inquilino'}`,
                      })
                    }
                  />
                ))}
              </ul>
              </>
            )}
          </CrossFade>

          {shouldPaginate && (
            <div className="border-t border-border px-5 py-3">
              <TablePagination
                total={total}
                page={page}
                pageSize={pageSize}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          )}
        </section>
      )}

      <CartaDelIncrementoCajon
        carta={cartaAbierta}
        onCerrar={() => setCartaAbierta(null)}
        puedeEnviar={puedeEditar}
        onEnviada={cargar}
      />
    </div>
  );
}

export default function CartasDelIncrementoPage() {
  return (
    <PageGuard module="operaciones">
      <ColaDeCartas />
    </PageGuard>
  );
}
