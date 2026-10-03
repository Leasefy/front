'use client';

/**
 * 🔴 LA RELACIÓN DE PAGOS DE UNA ASEGURADORA (Nico, P6, 03-10-2026).
 *
 * «Importar su relación de pagos (Excel o CSV) y cruzar por siniestro.» No
 * hay un ejemplo real todavía, así que el archivo se lee aquí y la persona
 * dice qué columna es cada cosa (MAPEO GENÉRICO; se recuerda por aseguradora).
 * El back cruza cada línea con los recibos que pagó esa aseguradora (por
 * siniestro, contrato o documento, con la retención configurada) y busca la
 * línea del banco por el total neto. Conciliarla es el muchos a uno de
 * siempre (`conciliar-con-recibos`), que vuelve a verificar todo; con
 * retención se PROPONE, nunca se aplica sola.
 */

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ShieldCheck } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SelectorDeArchivo } from '@/components/ui/selector-de-archivo';
import { toast } from '@/components/ui/toast';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { conciliacionBancariaApi } from '@/lib/api/conciliacion-bancaria.service';
import {
  CAMPOS_DE_LA_RELACION,
  NOMBRE_DEL_CAMPO,
  cierreDeConciliacionApi,
  type AseguradorasDeLaConciliacion,
  type CabezaDeLaRelacion,
  type EstadoDeLaLinea,
  type MapeoDeColumnas,
  type RelacionCruzada,
} from '@/lib/api/cierre-de-conciliacion';
import { parseSpreadsheetFile } from '@/components/inmobiliaria/import/lib/parseFile';
import { useAparecer } from './cuentas-del-extracto';
import { leerLaRelacion, mapeoSugerido, pesos } from './cierre-del-mes';

const ESTADO_DE_LA_LINEA: Record<EstadoDeLaLinea, { texto: string; variante: 'success' | 'warning' | 'secondary' | 'destructive' }> = {
  CRUZADO: { texto: 'Cruzada', variante: 'success' },
  YA_CONCILIADO: { texto: 'Ya conciliada', variante: 'secondary' },
  VARIOS_RECIBOS: { texto: 'Elige el recibo', variante: 'warning' },
  VALOR_DISTINTO: { texto: 'Valor distinto', variante: 'warning' },
  SIN_RECIBO: { texto: 'Sin recibo', variante: 'destructive' },
};

export function RelacionDeAseguradora({ puedeConciliar, onCambio }: { puedeConciliar: boolean; onCambio: () => void }) {
  const aparecer = useAparecer();
  const [datos, setDatos] = useState<AseguradorasDeLaConciliacion | null>(null);
  const [anteriores, setAnteriores] = useState<CabezaDeLaRelacion[]>([]);
  const [abierta, setAbierta] = useState(false);
  const [aseguradoraId, setAseguradoraId] = useState('');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [columnas, setColumnas] = useState<string[]>([]);
  const [filas, setFilas] = useState<Record<string, unknown>[]>([]);
  const [mapeo, setMapeo] = useState<MapeoDeColumnas>({});
  const [malas, setMalas] = useState<{ fila: number; motivo: string }[]>([]);
  const [relacion, setRelacion] = useState<RelacionCruzada | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);

  const leer = useCallback(async () => {
    try {
      const [a, r] = await Promise.all([cierreDeConciliacionApi.aseguradoras(), cierreDeConciliacionApi.relaciones()]);
      setDatos(a);
      setAnteriores(r.relaciones);
    } catch {
      setDatos(null);
    }
  }, []);

  useEffect(() => {
    void leer();
  }, [leer]);

  if (!datos || datos.aseguradoras.length === 0) return null;

  const elegirArchivo = async (f: File | null) => {
    setArchivo(f);
    setMalas([]);
    setRelacion(null);
    if (!f) {
      setColumnas([]);
      setFilas([]);
      return;
    }
    try {
      const r = await parseSpreadsheetFile(f);
      setColumnas(r.headers);
      setFilas(r.rows as Record<string, unknown>[]);
      const guardado = datos.aseguradoras.find((a) => a.id === aseguradoraId)?.mapeo ?? null;
      const sirve = guardado && Object.values(guardado).every((c) => !c || r.headers.includes(c));
      setMapeo(sirve ? guardado : mapeoSugerido(r.headers));
    } catch (e) {
      toast.error(mensajeParaLaPersona(e, { porDefecto: 'No se pudo leer el archivo.', accion: 'leer la relación de pagos' }));
    }
  };

  const cargar = async () => {
    const lectura = leerLaRelacion(filas, mapeo);
    setMalas(lectura.malas);
    if (lectura.malas.length > 0 || lectura.filas.length === 0) return;
    setOcupado('cargar');
    try {
      const r = await cierreDeConciliacionApi.cargarRelacion({
        aseguradoraId,
        nombreArchivo: archivo?.name ?? 'relacion',
        mapeo,
        filas: lectura.filas,
      });
      setRelacion(r);
      toast.success(`Relación cargada: ${r.resumen.cruzadas} de ${r.filas} líneas cruzaron con su recibo.`);
      void leer();
    } catch (e) {
      const filasMalas = (e as { detalle?: { filas?: { fila: number; motivo: string }[] } })?.detalle?.filas;
      if (filasMalas?.length) setMalas(filasMalas);
      toast.error(mensajeParaLaPersona(e, { porDefecto: 'No se pudo cargar la relación.', accion: 'cargar la relación de pagos' }));
    } finally {
      setOcupado(null);
    }
  };

  const ver = async (id: string) => {
    setOcupado(id);
    try {
      setRelacion(await cierreDeConciliacionApi.relacion(id));
      setAbierta(true);
    } catch (e) {
      toast.error(mensajeParaLaPersona(e, { porDefecto: 'No se pudo leer la relación.', accion: 'ver la relación de pagos' }));
    } finally {
      setOcupado(null);
    }
  };

  const conciliar = async (movimientoId: string, reciboIds: string[]) => {
    setOcupado(movimientoId);
    try {
      await conciliacionBancariaApi.conciliarConRecibos(movimientoId, reciboIds);
      toast.success('La línea del banco quedó conciliada con los recibos de la relación.');
      if (relacion) setRelacion(await cierreDeConciliacionApi.relacion(relacion.id));
      onCambio();
    } catch (e) {
      toast.error(mensajeParaLaPersona(e, { porDefecto: 'No se pudo conciliar la línea.', accion: 'conciliar el pago de la aseguradora' }));
    } finally {
      setOcupado(null);
    }
  };

  const listoParaCargar = !!aseguradoraId && filas.length > 0 && !!mapeo.neto && !!(mapeo.siniestro || mapeo.contrato || mapeo.documento);

  return (
    <motion.section {...aparecer} className="space-y-3 rounded-lg border border-border bg-surface p-4" data-testid="relacion-de-aseguradora">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-fg-muted" aria-hidden="true" />
          <h3 className="text-body font-semibold text-fg">Pagos de aseguradoras</h3>
        </div>
        <Button size="sm" variant="outline" hideArrow onClick={() => setAbierta((v) => !v)} data-testid="abrir-relacion">
          {abierta ? 'Cerrar' : 'Cargar una relación de pagos'}
        </Button>
      </div>
      {!datos.disponible && <p className="text-caption text-fg-muted">{datos.motivo}</p>}

      <AnimatePresence initial={false}>
        {abierta && datos.disponible && (
          <motion.div key="cargar" {...aparecer} className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="space-y-1 text-body-sm">
                <span className="font-medium text-fg">Aseguradora</span>
                <select
                  className="h-10 w-full rounded-md border border-border bg-surface px-3 text-body-sm text-fg sm:w-72"
                  value={aseguradoraId}
                  onChange={(e) => setAseguradoraId(e.target.value)}
                  data-testid="elegir-aseguradora"
                >
                  <option value="">— elige la aseguradora —</option>
                  {datos.aseguradoras.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nombre} (NIT {a.nit})
                    </option>
                  ))}
                </select>
              </label>
              <div className="space-y-1">
                <span className="text-body-sm font-medium text-fg">Archivo (Excel o CSV)</span>
                <SelectorDeArchivo
                  id="archivo-de-la-relacion"
                  accept=".xlsx,.xls,.csv,.txt"
                  archivo={archivo}
                  onElegir={(f) => void elegirArchivo(f)}
                  deshabilitado={!aseguradoraId}
                  testid="archivo-de-la-relacion"
                />
              </div>
            </div>

            {columnas.length > 0 && (
              <div className="space-y-2" data-testid="mapeo-de-columnas">
                <p className="text-caption text-fg-muted">
                  Di qué columna es cada dato. Obligatorios: el valor pagado y al menos uno para cruzar (siniestro, contrato o documento).
                </p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {CAMPOS_DE_LA_RELACION.map((campo) => (
                    <label key={campo} className="space-y-1 text-caption">
                      <span className="font-medium text-fg">{NOMBRE_DEL_CAMPO[campo]}</span>
                      <select
                        className="h-9 w-full rounded-md border border-border bg-surface px-2 text-body-sm text-fg"
                        value={mapeo[campo] ?? ''}
                        onChange={(e) => setMapeo((m) => ({ ...m, [campo]: e.target.value || undefined }))}
                        data-testid={`columna-${campo}`}
                      >
                        <option value="">— no viene —</option>
                        {columnas.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
                <Button hideArrow disabled={!listoParaCargar} isLoading={ocupado === 'cargar'} onClick={() => void cargar()} data-testid="cargar-relacion">
                  Cargar {filas.length} {filas.length === 1 ? 'línea' : 'líneas'}
                </Button>
              </div>
            )}

            {malas.length > 0 && (
              <ul className="space-y-1 text-caption text-danger" data-testid="filas-malas">
                {malas.slice(0, 10).map((m) => (
                  <li key={m.fila}>
                    Fila {m.fila}: {m.motivo}
                  </li>
                ))}
                {malas.length > 10 && <li>Y {malas.length - 10} más. No se guardó nada.</li>}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {relacion && (
          <motion.div key={relacion.id} {...aparecer} className="space-y-2 border-t border-border pt-3" data-testid="relacion-cruzada">
            <p className="text-body-sm font-medium text-fg">
              {relacion.aseguradora.nombre} · {relacion.nombreArchivo} · neto {pesos(relacion.totalNetoCop)}
            </p>
            <p className="text-caption text-fg-muted">
              {relacion.resumen.cruzadas} cruzadas · {relacion.resumen.aLaPersona} para revisar · {relacion.resumen.sinRecibo} sin recibo ·{' '}
              {relacion.resumen.yaConciliadas} ya conciliadas
              {relacion.retencionConfiguradaPct !== null ? ` · retención configurada ${relacion.retencionConfiguradaPct} %` : ''}
            </p>
            <ul className="max-h-64 space-y-1 overflow-y-auto text-caption">
              {relacion.lineas.slice(0, 100).map((l) => (
                <li key={l.fila} className="flex flex-wrap items-center gap-2">
                  <span className="tabular-nums text-fg-muted">Fila {l.fila}</span>
                  <span className="text-fg">{l.siniestro ?? l.contrato ?? l.documento}</span>
                  <span className="tabular-nums text-fg">{pesos(l.netoCop)}</span>
                  <Badge variant={ESTADO_DE_LA_LINEA[l.cruce.estado].variante}>{ESTADO_DE_LA_LINEA[l.cruce.estado].texto}</Badge>
                  <span className="text-fg-muted">{l.cruce.detalle}</span>
                </li>
              ))}
            </ul>
            {relacion.banco.motivo && <p className="text-caption text-fg-muted">{relacion.banco.motivo}</p>}
            {relacion.banco.propuestas.map((p) => (
              <div key={p.movimientoId} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-surface-muted px-3 py-2" data-testid={`propuesta-de-la-relacion-${p.movimientoId}`}>
                <div className="text-caption">
                  <span className="font-medium text-fg">
                    {p.fecha} · «{p.descripcion}» · {pesos(p.valorCop)}
                  </span>
                  {p.segura && (
                    <Badge variant="success" className="ml-2">
                      Segura
                    </Badge>
                  )}
                  <p className="text-fg-muted">{p.porQue.join(' ')}</p>
                </div>
                {puedeConciliar && (
                  <Button size="sm" hideArrow isLoading={ocupado === p.movimientoId} disabled={ocupado !== null} onClick={() => void conciliar(p.movimientoId, p.reciboIds)}>
                    Conciliar con {p.reciboIds.length} {p.reciboIds.length === 1 ? 'recibo' : 'recibos'}
                  </Button>
                )}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {anteriores.length > 0 && (
        <details className="text-caption text-fg-muted">
          <summary className="cursor-pointer">Relaciones cargadas ({anteriores.length})</summary>
          <ul className="mt-2 space-y-1">
            {anteriores.slice(0, 10).map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-2">
                <span>
                  {new Date(r.cargadaAt).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' })} · {r.aseguradora.nombre} · {r.filas} líneas ·{' '}
                  {pesos(r.totalNetoCop)}
                </span>
                <button type="button" className="underline" disabled={ocupado === r.id} onClick={() => void ver(r.id)}>
                  Ver el cruce
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </motion.section>
  );
}
