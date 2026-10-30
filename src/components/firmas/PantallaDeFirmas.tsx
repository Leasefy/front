'use client';

/**
 * 🔴 FIRMAS (Nico, 28-10-2026): «un módulo de firmas… cualquier documento… que lo suban y lo firmen por Leasefy».
 * La misma pantalla para la inmobiliaria (y el agente) y para el propietario sin inmobiliaria.
 *
 * Arriba, cuántas firmas quedan (3 gratis al crear la cuenta + los paquetes) y «Enviar a firmar». Debajo, los
 * documentos con buscador, filtro por estado y paginación; cada uno abre su cajón (quién firmó, WhatsApp, descargar).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, ShoppingBagOpen } from '@phosphor-icons/react';
import { Alert, Cifra, FranjaDeCifras, Ilustracion, Pagination, SearchInput, StatusBadge } from '@leasefy/cadence';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';
import { EncabezadoOrdenable } from '@/components/ui/encabezado-ordenable';
import { SelectorDeOrden } from '@/components/ui/selector-de-orden';
import { useOrdenDeLaTabla } from '@/lib/hooks/use-orden-de-la-tabla';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { PestanasDeEstado } from '@/components/pantalla/PestanasDeEstado';
import { usePermissionsContextSafe } from '@/lib/context/PermissionsContext';
import { firmasApi, type DocumentoParaFirmar, type DondeFirma, type VistaDeFirmas } from '@/lib/api/firmas.service';
import { pesos } from '@/lib/firmas/reglas-de-firmas';
import { ComprarFirmas } from './ComprarFirmas';
import { DetalleDeFirma } from './DetalleDeFirma';
import { EnviarAFirmar } from './EnviarAFirmar';
import { ESTADO_DEL_DOCUMENTO, fechaCortaDeFirma } from './textos-de-firmas';

type Filtro = 'todos' | 'por-firmar' | 'firmados' | 'sin-enviar' | 'cancelados';
const POR_PAGINA = 10;

function pasaElFiltro(d: DocumentoParaFirmar, f: Filtro): boolean {
  if (f === 'todos') return true;
  if (f === 'por-firmar') return d.estado === 'ENVIADO' || d.estado === 'POR_PAGAR';
  if (f === 'firmados') return d.estado === 'FIRMADO';
  if (f === 'sin-enviar') return d.estado === 'BORRADOR';
  return d.estado === 'CANCELADO';
}

const sinTildes = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function PantallaDeFirmas({ donde }: { donde: DondeFirma }) {
  const router = useRouter();
  const parametros = useSearchParams();
  const permisos = usePermissionsContextSafe();
  const puede = (modulo: string, accion: string) => donde === 'propietario' || Boolean(permisos?.canAccess(modulo as never, accion as never));
  const puedeEnviar = puede('documentos', 'create');
  const puedeComprar = puede('subscription', 'edit');

  const [vista, setVista] = useState<VistaDeFirmas | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [enviar, setEnviar] = useState(false);
  const [comprar, setComprar] = useState(false);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [buscar, setBuscar] = useState('');
  const [pagina, setPagina] = useState(1);

  const leer = useCallback(async () => {
    try {
      setVista(await firmasApi(donde).vista());
      setError(null);
    } catch (e) {
      setError(e);
    }
  }, [donde]);

  useEffect(() => {
    void leer();
  }, [leer]);

  // De vuelta de Wompi: abre el documento pagado o avisa del paquete, y limpia la dirección.
  useEffect(() => {
    const documento = parametros?.get('documento');
    const paquete = parametros?.get('paquete');
    if (!documento && !paquete) return;
    if (documento) setAbierto(documento);
    if (paquete) toast.success('Estamos confirmando tu pago. En un momento las firmas aparecen en tu bolsa.');
    if (parametros?.get('pago') === '1') toast.success('Estamos confirmando el pago. Apenas se apruebe, el documento sale a firmar.');
    const t = setTimeout(() => void leer(), 4000);
    router.replace(window.location.pathname);
    return () => clearTimeout(t);
    // Sólo al llegar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtrados = useMemo(() => {
    const q = sinTildes(buscar.trim());
    return (vista?.documentos ?? []).filter(
      (d) =>
        pasaElFiltro(d, filtro) &&
        (!q || sinTildes(d.titulo).includes(q) || d.firmantes.some((f) => sinTildes(`${f.nombre} ${f.email ?? ''} ${f.telefono ?? ''}`).includes(q))),
    );
  }, [vista, filtro, buscar]);
  // Nico 28-10: «que todas las tablas tengan lo de ordenamiento general y por columnas». Por defecto, lo más reciente.
  const { ordenadas, orden, ordenarPor, setOrden } = useOrdenDeLaTabla(
    filtrados,
    {
      documento: (d) => d.titulo,
      firmas: (d) => (d.total > 0 ? d.firmaron / d.total : 0),
      estado: (d) => ESTADO_DEL_DOCUMENTO[d.estado].texto,
      enviado: (d) => d.enviadoAt ?? d.creadoAt,
      envio: (d) => d.creadoPor.nombre,
    },
    { inicial: { campo: 'enviado', sentido: 'desc' }, primero: { enviado: 'desc', firmas: 'desc' } },
  );
  const visibles = ordenadas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);
  useEffect(() => setPagina(1), [filtro, buscar, orden]);

  const conteo = (f: Filtro) => (vista?.documentos ?? []).filter((d) => pasaElFiltro(d, f)).length;
  const bolsa = vista?.bolsa;

  return (
    <div className="space-y-6 p-6 lg:p-8" data-testid="pantalla-de-firmas">
      <EncabezadoDePantalla
        seccion={donde === 'inmobiliaria' ? 'Captación' : 'Contratos y plata'}
        titulo="Firmas"
        descripcion="Cualquier documento firmado con código desde el celular, por todos a la vez. Sin crear cuenta."
        junto={
          bolsa && vista?.disponible ? (
            <StatusBadge tone={bolsa.total > 0 ? 'info' : 'warning'} data-testid="firmas-disponibles">
              {bolsa.total === 1 ? 'Te queda 1 firma' : `Te quedan ${bolsa.total} firmas`}
            </StatusBadge>
          ) : undefined
        }
        acciones={
          vista?.disponible && puedeComprar ? (
            <Button size="sm" variant="secondary" hideArrow onClick={() => setComprar(true)} data-testid="comprar-firmas-boton">
              <ShoppingBagOpen className="h-4 w-4" /> Comprar firmas
            </Button>
          ) : undefined
        }
        accionPrincipal={
          vista?.disponible && puedeEnviar ? (
            <Button size="sm" hideArrow onClick={() => setEnviar(true)} data-testid="enviar-a-firmar-boton">
              <Plus className="h-4 w-4" /> Enviar a firmar
            </Button>
          ) : undefined
        }
      />

      {error ? <FalloDeCarga error={error} onReintentar={leer} queEs="tus firmas" /> : null}
      {vista && !vista.disponible ? (
        <div className="flex flex-col items-center rounded-2xl border border-border bg-surface px-6 py-12 text-center" data-testid="firmas-pronto">
          <Ilustracion nombre="firma" tamano={120} tono="auto" alt="" />
          <p className="mt-4 text-body font-medium text-fg">Firmas se está activando</p>
          <p className="mt-1 max-w-md text-body-sm text-fg-muted">
            Muy pronto vas a poder mandar a firmar cualquier documento desde aquí: {pesos(vista.precioPorDocumento.precio)} por documento, con 3 gratis para empezar.
          </p>
        </div>
      ) : null}

      {vista?.disponible ? (
        <>
          <FranjaDeCifras aria-label="Resumen de tus firmas" fila="lg">
            <Cifra
              etiqueta="Firmas disponibles"
              valor={bolsa?.total ?? 0}
              tono={(bolsa?.total ?? 0) > 0 ? 'voltaje' : 'aviso'}
              detalle={
                bolsa && bolsa.gratis > 0
                  ? `${bolsa.gratis} gratis${bolsa.enPaquetes ? ` · ${bolsa.enPaquetes} en paquetes` : ''}`
                  : bolsa?.proximoVencimiento
                    ? `Vencen desde el ${fechaCortaDeFirma(bolsa.proximoVencimiento)}`
                    : `O paga cada documento: ${pesos(vista.precioPorDocumento.precio)} + IVA`
              }
            />
            {conteo('por-firmar') > 0 ? <Cifra etiqueta="Esperando firmas" valor={conteo('por-firmar')} detalle="Enviados que faltan por firmar" /> : null}
            {conteo('firmados') > 0 ? <Cifra etiqueta="Firmados" valor={conteo('firmados')} tono="exito" detalle="Con la hoja de firmas, sellados" /> : null}
            {vista.puedeCargarALaFactura && vista.enLaFacturaEsteMes.total > 0 ? (
              <Cifra
                etiqueta="En tu factura este mes"
                valor={pesos(vista.enLaFacturaEsteMes.total)}
                detalle={`${vista.enLaFacturaEsteMes.documentos} ${vista.enLaFacturaEsteMes.documentos === 1 ? 'documento' : 'documentos'} + IVA`}
              />
            ) : null}
          </FranjaDeCifras>

          {vista.documentos.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border border-border bg-surface px-6 py-12 text-center" data-testid="firmas-vacio">
              <Ilustracion nombre="firma" tamano={120} tono="auto" alt="" />
              <p className="mt-4 text-body font-medium text-fg">Todavía no has mandado nada a firmar</p>
              <p className="mt-1 max-w-md text-body-sm text-fg-muted">
                Sube un PDF —un contrato, una promesa, un acta— y dinos quién firma. A cada persona le llega su enlace por correo o WhatsApp y firma con un código. Tienes {bolsa?.gratis ?? 0} gratis.
              </p>
              {puedeEnviar ? (
                <Button className="mt-5" hideArrow onClick={() => setEnviar(true)}>
                  Enviar el primero
                </Button>
              ) : null}
            </div>
          ) : (
            <section className="space-y-3">
              <div className="overflow-hidden rounded-2xl border border-border bg-surface">
                <div className="flex flex-col gap-3 border-b border-border px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
                  <PestanasDeEstado<Filtro>
                    etiqueta="Estado de los documentos"
                    valor={filtro}
                    onCambio={setFiltro}
                    pestanas={[
                      { valor: 'todos', etiqueta: 'Todos', cuantos: vista.documentos.length, fija: true },
                      { valor: 'por-firmar', etiqueta: 'Por firmar', cuantos: conteo('por-firmar'), fija: true },
                      { valor: 'firmados', etiqueta: 'Firmados', cuantos: conteo('firmados') },
                      { valor: 'sin-enviar', etiqueta: 'Sin enviar', cuantos: conteo('sin-enviar'), tono: 'aviso' },
                      { valor: 'cancelados', etiqueta: 'Cancelados', cuantos: conteo('cancelados') },
                    ]}
                  />
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <SelectorDeOrden
                      orden={orden}
                      onCambiar={setOrden}
                      formas={[
                        { campo: 'enviado', sentido: 'desc', etiqueta: 'Más recientes' },
                        { campo: 'enviado', sentido: 'asc', etiqueta: 'Más antiguos' },
                        { campo: 'documento', sentido: 'asc', etiqueta: 'Documento (A–Z)' },
                        { campo: 'firmas', sentido: 'asc', etiqueta: 'Les faltan más firmas' },
                      ]}
                    />
                    <SearchInput value={buscar} onChange={(e) => setBuscar(e.target.value)} onClear={() => setBuscar('')} placeholder="Buscar por documento o persona" aria-label="Buscar documentos" className="lg:w-72" />
                  </div>
                </div>
                {/* Bajo 768: tarjetas. */}
                <ul className="divide-y divide-border md:hidden">
                  {visibles.map((d) => (
                    <li key={d.id}>
                      <button type="button" onClick={() => setAbierto(d.id)} className="w-full space-y-2 px-4 py-3.5 text-left" data-testid={`tarjeta-${d.id}`}>
                        <div className="flex items-start justify-between gap-3">
                          <p className="min-w-0 flex-1 font-medium text-fg">{d.titulo}</p>
                          <StatusBadge tone={ESTADO_DEL_DOCUMENTO[d.estado].tono}>{ESTADO_DEL_DOCUMENTO[d.estado].texto}</StatusBadge>
                        </div>
                        <p className="truncate text-[13px] text-fg-muted">{d.firmantes.map((f) => f.nombre).join(', ')}</p>
                        <div className="flex items-center gap-3">
                          <BarraDeFirmas firmaron={d.firmaron} total={d.total} />
                          <span className="font-mono text-[12.5px] tabular-nums text-fg-subtle">{fechaCortaDeFirma(d.enviadoAt ?? d.creadoAt)}</span>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <EncabezadoOrdenable campo="documento" orden={orden} onOrdenar={ordenarPor}>Documento</EncabezadoOrdenable>
                      <EncabezadoOrdenable campo="firmas" orden={orden} onOrdenar={ordenarPor}>Firmas</EncabezadoOrdenable>
                      <EncabezadoOrdenable campo="estado" orden={orden} onOrdenar={ordenarPor}>Estado</EncabezadoOrdenable>
                      <EncabezadoOrdenable campo="enviado" orden={orden} onOrdenar={ordenarPor} className="hidden md:table-cell">Enviado</EncabezadoOrdenable>
                      {donde === 'inmobiliaria' ? <EncabezadoOrdenable campo="envio" orden={orden} onOrdenar={ordenarPor} className="hidden lg:table-cell">Lo envió</EncabezadoOrdenable> : null}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibles.map((d) => {
                      const e = ESTADO_DEL_DOCUMENTO[d.estado];
                      return (
                        <TableRow key={d.id} className="cursor-pointer" onClick={() => setAbierto(d.id)} data-testid={`documento-${d.id}`}>
                          <TableCell>
                            <button type="button" className="text-left font-medium text-fg hover:text-primary" onClick={() => setAbierto(d.id)}>
                              {d.titulo}
                            </button>
                            <p className="truncate text-[13px] text-fg-muted">{d.firmantes.map((f) => f.nombre).join(', ')}</p>
                          </TableCell>
                          <TableCell>
                            <BarraDeFirmas firmaron={d.firmaron} total={d.total} />
                          </TableCell>
                          <TableCell>
                            <StatusBadge tone={e.tono}>{e.texto}</StatusBadge>
                          </TableCell>
                          <TableCell className="hidden font-mono text-[13px] tabular-nums text-fg-muted md:table-cell">{fechaCortaDeFirma(d.enviadoAt ?? d.creadoAt)}</TableCell>
                          {donde === 'inmobiliaria' ? <TableCell className="hidden text-[13px] text-fg-muted lg:table-cell">{d.creadoPor.nombre ?? '—'}</TableCell> : null}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                </div>
                {filtrados.length === 0 ? (
                  <div className="flex flex-col items-center px-6 py-10 text-center">
                    <Ilustracion nombre="lupa" tamano={88} tono="auto" alt="" />
                    <p className="mt-3 text-body-sm text-fg-muted">Nada con ese filtro o esa búsqueda.</p>
                  </div>
                ) : null}
              </div>
              {filtrados.length > POR_PAGINA ? <Pagination total={filtrados.length} page={pagina} pageSize={POR_PAGINA} onPageChange={setPagina} /> : null}
            </section>
          )}

          {vista.compras.some((c) => c.estado === 'PENDIENTE') ? (
            <Alert variant="info">Tienes un pago de paquete esperando aprobación. Cuando Wompi lo confirme, las firmas aparecen aquí.</Alert>
          ) : null}

          <EnviarAFirmar
            abierta={enviar}
            alCerrar={() => setEnviar(false)}
            donde={donde}
            vista={vista}
            alEnviar={(doc) => {
              void leer();
              setAbierto(doc.id);
            }}
            alComprar={() => setComprar(true)}
          />
          <ComprarFirmas abierta={comprar} alCerrar={() => setComprar(false)} donde={donde} aLaVenta={vista.aLaVenta} porDocumento={vista.precioPorDocumento.precio} />
        </>
      ) : null}

      <DetalleDeFirma id={abierto} donde={donde} alCerrar={() => setAbierto(null)} alCambiar={leer} pago={vista ? { bolsa: vista.bolsa.total, factura: vista.puedeCargarALaFactura } : undefined} />
    </div>
  );
}

function BarraDeFirmas({ firmaron, total }: { firmaron: number; total: number }) {
  const pct = total > 0 ? Math.round((firmaron / total) * 100) : 0;
  return (
    <div className="flex min-w-[110px] items-center gap-2" aria-label={`${firmaron} de ${total} firmas`}>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-muted">
        <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-[12.5px] tabular-nums text-fg-muted">
        {firmaron}/{total}
      </span>
    </div>
  );
}
