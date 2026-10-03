'use client';

/**
 * 🔴 EL CIERRE DEL MES, POR CUENTA (Nico, P9, 03-10-2026).
 *
 * «Por cuenta y mes: saldo según el extracto frente al saldo en libros;
 * partidas conciliatorias por tipo y antigüedad (0–30, 31–60 y más de 60);
 * % conciliado por número y por valor; quién concilió (persona, Piloto o
 * pasarela); firma del contador; una foto inmutable; exportar a Excel y PDF.
 * El mes queda BLOQUEADO; reabrirlo exige un administrador con motivo.»
 *
 * Va debajo de la ficha de la cuenta elegida en «Por cuenta». Lista los meses
 * con su estado; el borrador se ve siempre, firmar es del CONTADOR y reabrir
 * de un ADMINISTRADOR (el back también lo exige). Exportar sale de la foto
 * guardada, con su huella, nunca recalculada.
 */

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FileXls, FilePdf, LockSimple, LockSimpleOpen, Signature } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario';
import { usePermissions } from '@/lib/hooks/usePermissions';
import {
  cierreDeConciliacionApi,
  MOTIVO_DE_REAPERTURA,
  NOMBRE_DEL_ORIGEN,
  NOMBRE_DEL_RANGO,
  NOMBRE_DEL_TIPO_DE_PARTIDA,
  ROLES_QUE_FIRMAN_EL_CIERRE,
  ROLES_QUE_REABREN_EL_CIERRE,
  type CierreConFoto,
  type EventoDeLaBitacora,
  type FotoDelCierre,
  type MesDeLaCuenta,
  type MesesDeLaCuenta,
} from '@/lib/api/cierre-de-conciliacion';
import { useAparecer } from './cuentas-del-extracto';
import { exportarElCierreAExcel, exportarElCierreAPdf, pesos, porcentaje } from './cierre-del-mes';
import { leerValorDelExtracto } from '@/lib/cobros/extracto-bancario';
import { usePlataConCentavos } from '@/lib/plata/use-plata-con-centavos';

const ESTADO: Record<MesDeLaCuenta['estado'], { texto: string; variante: 'success' | 'warning' | 'secondary' }> = {
  CERRADO: { texto: 'Cerrado y firmado', variante: 'success' },
  REABIERTO: { texto: 'Reabierto', variante: 'warning' },
  ABIERTO: { texto: 'Abierto', variante: 'secondary' },
};

/** Lo que muestra la foto (el borrador o lo firmado). */
export function VistaDeLaFoto({ foto }: { foto: FotoDelCierre }) {
  const aparecer = useAparecer();
  const conPartidas = foto.partidas.porTipoYRango.filter((g) => g.n > 0);
  return (
    <motion.div {...aparecer} className="space-y-4" data-testid="foto-del-cierre">
      <dl className="grid gap-3 sm:grid-cols-3">
        <Dato etiqueta="Saldo según el extracto" valor={pesos(foto.saldos.extracto.valorCop)} detalle={foto.saldos.extracto.detalle} />
        <Dato
          etiqueta="Saldo en libros"
          valor={pesos(foto.saldos.libros.compartida ? null : foto.saldos.libros.valorCop)}
          detalle={foto.saldos.libros.detalle}
        />
        <Dato
          etiqueta="Diferencia"
          valor={pesos(foto.saldos.diferenciaCop)}
          detalle={
            foto.saldos.diferenciaSinExplicarCop === null
              ? undefined
              : foto.saldos.diferenciaSinExplicarCop === 0
                ? 'Las partidas conciliatorias la explican toda.'
                : `Sin explicar por las partidas: ${pesos(foto.saldos.diferenciaSinExplicarCop)}.`
          }
        />
        <Dato
          etiqueta="Conciliado"
          valor={`${porcentaje(foto.conciliado.porNumeroPct)} por número · ${porcentaje(foto.conciliado.porValorPct)} por valor`}
          detalle={`${foto.conciliado.conciliadas} de ${foto.conciliado.lineasDelMes} líneas del mes`}
        />
        <Dato
          etiqueta="Partidas conciliatorias"
          valor={`${foto.partidas.total.n} · ${pesos(foto.partidas.total.valorCop)}`}
          detalle="Se quedan pendientes hasta que alguien las asigne."
        />
        <Dato
          etiqueta="Quién concilió"
          valor={foto.quien.length ? foto.quien.map((q) => `${NOMBRE_DEL_ORIGEN[q.origen]}: ${q.n}`).join(' · ') : 'Nadie este mes'}
        />
      </dl>

      {conPartidas.length > 0 && (
        <table className="w-full text-body-sm" data-testid="partidas-por-rango">
          <thead>
            <tr className="text-left text-caption text-fg-muted">
              <th className="py-1 font-medium">Tipo</th>
              <th className="py-1 font-medium">Antigüedad</th>
              <th className="py-1 text-right font-medium">Partidas</th>
              <th className="py-1 text-right font-medium">Valor</th>
            </tr>
          </thead>
          <tbody>
            {conPartidas.map((g) => (
              <tr key={`${g.tipo}-${g.rango}`} className="border-t border-border">
                <td className="py-1">{NOMBRE_DEL_TIPO_DE_PARTIDA[g.tipo]}</td>
                <td className={g.rango === 'mas-de-60' ? 'py-1 font-medium text-warning' : 'py-1'}>{NOMBRE_DEL_RANGO[g.rango]}</td>
                <td className="py-1 text-right tabular-nums">{g.n}</td>
                <td className="py-1 text-right tabular-nums">{pesos(g.valorCop)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {foto.terceros && (
        <p className="text-caption text-fg-muted" data-testid="terceros-del-cierre">
          Plata de terceros de toda la inmobiliaria al {foto.terceros.fecha}: saldo {pesos(foto.terceros.saldoDeLaCuentaCop)} frente a{' '}
          {pesos(foto.terceros.plataDeTercerosCop)} que debería haber
          {foto.terceros.diferenciaCop !== null && foto.terceros.diferenciaCop !== 0
            ? ` (diferencia ${pesos(foto.terceros.diferenciaCop)}${foto.terceros.laDiferenciaEsLaComision ? ', es la comisión por trasladar' : ''})`
            : ''}
          .
        </p>
      )}

      {foto.avisos.length > 0 && (
        <ul className="space-y-1 text-body-sm text-warning" data-testid="avisos-del-cierre">
          {foto.avisos.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}

function Dato({ etiqueta, valor, detalle }: { etiqueta: string; valor: string; detalle?: string }) {
  return (
    <div>
      <dt className="text-caption text-fg-muted">{etiqueta}</dt>
      <dd className="text-body-sm font-medium tabular-nums text-fg">{valor}</dd>
      {detalle && <dd className="text-caption text-fg-muted">{detalle}</dd>}
    </div>
  );
}

type Abierto =
  | { tipo: 'borrador'; mes: MesDeLaCuenta; foto: FotoDelCierre | null }
  | { tipo: 'cierre'; mes: MesDeLaCuenta; cierre: CierreConFoto | null };

export function CierreDelMes({ cuentaId, onCambio }: { cuentaId: string; onCambio?: () => void }) {
  const { agencyRole } = usePermissions();
  const aparecer = useAparecer();
  const [datos, setDatos] = useState<MesesDeLaCuenta | null>(null);
  const [bitacora, setBitacora] = useState<EventoDeLaBitacora[]>([]);
  const [fallo, setFallo] = useState<unknown>(null);
  const [abierto, setAbierto] = useState<Abierto | null>(null);
  const [verTodos, setVerTodos] = useState(false);

  const leer = useCallback(async () => {
    setFallo(null);
    try {
      const [m, b] = await Promise.all([
        cierreDeConciliacionApi.meses(cuentaId),
        cierreDeConciliacionApi.bitacora(cuentaId).catch(() => ({ disponible: false, eventos: [] })),
      ]);
      setDatos(m);
      setBitacora(b.eventos);
    } catch (e) {
      // Un back sin la ruta: la pantalla sigue como antes, sin el cierre.
      const status = (e as { status?: number })?.status;
      if (status === 404) setDatos(null);
      else setFallo(e);
    }
  }, [cuentaId]);

  useEffect(() => {
    void leer();
  }, [leer]);

  const abrirBorrador = async (mes: MesDeLaCuenta) => {
    setAbierto({ tipo: 'borrador', mes, foto: null });
    try {
      const { foto } = await cierreDeConciliacionApi.borrador(cuentaId, mes.mes);
      setAbierto({ tipo: 'borrador', mes, foto });
    } catch (e) {
      setAbierto(null);
      toast.error(mensajeParaLaPersona(e, { porDefecto: 'No se pudo armar el borrador del cierre.', accion: 'ver el borrador del cierre' }));
    }
  };

  const abrirCierre = async (mes: MesDeLaCuenta) => {
    if (!mes.cierre) return;
    setAbierto({ tipo: 'cierre', mes, cierre: null });
    try {
      const cierre = await cierreDeConciliacionApi.cierre(mes.cierre.id);
      setAbierto({ tipo: 'cierre', mes, cierre });
    } catch (e) {
      setAbierto(null);
      toast.error(mensajeParaLaPersona(e, { porDefecto: 'No se pudo leer el cierre.', accion: 'ver el cierre' }));
    }
  };

  if (fallo) {
    return (
      <p className="text-caption text-fg-muted" data-testid="cierre-del-mes-fallo">
        {mensajeParaLaPersona(fallo, { porDefecto: 'No se pudo leer el cierre de los meses de esta cuenta.' })}{' '}
        <button type="button" className="underline" onClick={() => void leer()}>
          Reintentar
        </button>
      </p>
    );
  }
  if (!datos) return null;

  const meses = verTodos ? datos.meses : datos.meses.slice(0, 6);
  const firma = !!agencyRole && ROLES_QUE_FIRMAN_EL_CIERRE.has(agencyRole);
  const reabre = !!agencyRole && ROLES_QUE_REABREN_EL_CIERRE.has(agencyRole);

  return (
    <motion.section
      {...aparecer}
      className="space-y-3 rounded-lg border border-border bg-surface p-4"
      aria-labelledby="titulo-cierre-del-mes"
      data-testid="cierre-del-mes"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="titulo-cierre-del-mes" className="text-body font-semibold text-fg">
          Cierre del mes · {datos.cuenta.nombre}
        </h3>
        <p className="text-caption text-fg-muted">
          Firma el contador; el mes cerrado queda bloqueado. Reabrirlo es de un administrador, con motivo.
        </p>
      </div>
      {!datos.disponible || !datos.sePuedeFirmar ? (
        <p className="text-caption text-fg-muted" data-testid="cierre-no-disponible">
          {datos.motivo}
        </p>
      ) : null}

      {datos.disponible && (
        <ul className="divide-y divide-border" data-testid="meses-de-la-cuenta">
          {meses.map((m) => (
            <li key={m.mes} className="flex flex-wrap items-center justify-between gap-2 py-2" data-testid={`mes-${m.mes}`}>
              <div className="flex items-center gap-2">
                {m.estado === 'CERRADO' ? (
                  <LockSimple className="h-4 w-4 text-success" aria-hidden="true" />
                ) : (
                  <LockSimpleOpen className="h-4 w-4 text-fg-subtle" aria-hidden="true" />
                )}
                <span className="text-body-sm font-medium capitalize text-fg">{m.mesEnPalabras}</span>
                <Badge variant={ESTADO[m.estado].variante}>{ESTADO[m.estado].texto}</Badge>
                {m.pendientes > 0 && (
                  <span className="text-caption text-fg-muted">
                    {m.pendientes} {m.pendientes === 1 ? 'pendiente' : 'pendientes'}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                {m.estado === 'CERRADO' ? (
                  <Button size="sm" variant="outline" hideArrow onClick={() => void abrirCierre(m)} data-testid={`ver-cierre-${m.mes}`}>
                    Ver el cierre
                  </Button>
                ) : m.terminado ? (
                  <Button size="sm" variant="outline" hideArrow onClick={() => void abrirBorrador(m)} data-testid={`ver-borrador-${m.mes}`}>
                    {firma && datos.sePuedeFirmar ? 'Revisar y firmar' : 'Ver el borrador'}
                  </Button>
                ) : (
                  <span className="text-caption text-fg-muted">En curso</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {datos.meses.length > 6 && (
        <button type="button" className="text-caption text-fg-muted underline" onClick={() => setVerTodos((v) => !v)}>
          {verTodos ? 'Ver menos meses' : `Ver los ${datos.meses.length} meses`}
        </button>
      )}

      {bitacora.length > 0 && (
        <details className="text-caption text-fg-muted" data-testid="bitacora-del-cierre">
          <summary className="cursor-pointer">Bitácora de cierres y reaperturas</summary>
          <ul className="mt-2 space-y-1">
            {bitacora.slice(0, 20).map((e) => (
              <li key={e.id}>
                {new Date(e.at).toLocaleString('es-CO', { timeZone: 'America/Bogota' })} · {e.mes} ·{' '}
                {e.evento === 'CERRADO' ? 'Cerrado' : 'Reabierto'} por {e.quien ?? 'alguien sin nombre'}
                {e.motivo ? `: «${e.motivo}»` : ''}
              </li>
            ))}
          </ul>
        </details>
      )}

      <DialogoDelCierre
        abierto={abierto}
        cuentaId={cuentaId}
        firma={firma && datos.sePuedeFirmar}
        reabre={reabre}
        onCerrar={() => setAbierto(null)}
        onCambio={() => {
          setAbierto(null);
          void leer();
          onCambio?.();
        }}
      />
    </motion.section>
  );
}

/**
 * El saldo escrito con centavos («12.345.678,90» → 12345678.9), con la misma
 * lectura del extracto. Con más de dos decimales o ilegible: `NaN` (no viaja).
 */
function valorDelSaldoConCentavos(texto: string): number {
  const leido = leerValorDelExtracto(texto, true);
  return leido && 'valor' in leido ? leido.valor : NaN;
}

function DialogoDelCierre({
  abierto,
  cuentaId,
  firma,
  reabre,
  onCerrar,
  onCambio,
}: {
  abierto: Abierto | null;
  cuentaId: string;
  firma: boolean;
  reabre: boolean;
  onCerrar: () => void;
  onCambio: () => void;
}) {
  const [confirmo, setConfirmo] = useState(false);
  const [tarjeta, setTarjeta] = useState('');
  const [saldo, setSaldo] = useState('');
  const [motivo, setMotivo] = useState('');
  const [errorDelMotivo, setErrorDelMotivo] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [exportando, setExportando] = useState<'xlsx' | 'pdf' | null>(null);
  /*
   * «Centavos en todo» (C3-FRONT): con la llave de la tesorería, el saldo
   * escrito lleva sus centavos (coma decimal) y el Excel y el PDF del cierre
   * escriben siempre los dos decimales (P8 a). Apagada, como siempre.
   */
  const conCentavos = usePlataConCentavos('tesoreria_y_conciliacion');

  useEffect(() => {
    setConfirmo(false);
    setTarjeta('');
    setSaldo('');
    setMotivo('');
    setErrorDelMotivo(null);
  }, [abierto?.mes.mes, abierto?.tipo]);

  if (!abierto) return null;
  const foto = abierto.tipo === 'borrador' ? abierto.foto : abierto.cierre?.foto ?? null;
  const sinSaldo = abierto.tipo === 'borrador' && foto?.saldos.extracto.valorCop === null;
  const saldoEscrito =
    saldo.trim() === ''
      ? undefined
      : conCentavos
        ? valorDelSaldoConCentavos(saldo)
        : Number(saldo.replace(/[^\d-]/g, ''));

  const firmar = async () => {
    setEnviando(true);
    try {
      await cierreDeConciliacionApi.cerrar({
        cuentaId,
        mes: abierto.mes.mes,
        confirmo: true,
        tarjetaProfesional: tarjeta.trim() || undefined,
        saldoExtractoCop: sinSaldo && saldoEscrito !== undefined && Number.isFinite(saldoEscrito) ? saldoEscrito : undefined,
      });
      toast.success(`${abierto.mes.mesEnPalabras} quedó cerrado y firmado. Nada se concilia ni se carga en ese mes de esta cuenta.`);
      onCambio();
    } catch (e) {
      toast.error(mensajeParaLaPersona(e, { porDefecto: 'No se pudo firmar el cierre.', accion: 'firmar el cierre del mes' }));
    } finally {
      setEnviando(false);
    }
  };

  const reabrir = async () => {
    if (abierto.tipo !== 'cierre' || !abierto.cierre) return;
    setEnviando(true);
    setErrorDelMotivo(null);
    try {
      await cierreDeConciliacionApi.reabrir(abierto.cierre.id, motivo);
      toast.success(`${abierto.mes.mesEnPalabras} quedó abierto otra vez. Quedó en la bitácora con tu motivo.`);
      onCambio();
    } catch (e) {
      const { porCampo, sueltos } = repartirErroresDelServidor(e, {
        campos: ['motivo'] as const,
        porDefecto: 'No se pudo reabrir el mes.',
        accion: 'reabrir el mes',
      });
      if (porCampo.motivo) setErrorDelMotivo(porCampo.motivo);
      if (sueltos.length > 0) toast.error(sueltos.join(' · '));
    } finally {
      setEnviando(false);
    }
  };

  const exportar = async (formato: 'xlsx' | 'pdf') => {
    if (abierto.tipo !== 'cierre' || !abierto.cierre) return;
    setExportando(formato);
    try {
      // Con la llave apagada, la llamada de siempre (sin opciones).
      if (formato === 'xlsx') {
        if (conCentavos) await exportarElCierreAExcel(abierto.cierre, { conCentavos });
        else await exportarElCierreAExcel(abierto.cierre);
      } else if (conCentavos) await exportarElCierreAPdf(abierto.cierre, { conCentavos });
      else await exportarElCierreAPdf(abierto.cierre);
    } catch (e) {
      toast.error(mensajeParaLaPersona(e, { porDefecto: 'No se pudo armar el archivo.', accion: 'exportar el cierre' }));
    } finally {
      setExportando(null);
    }
  };

  const largo = motivo.trim().length;
  const motivoValido = largo >= MOTIVO_DE_REAPERTURA.minimo && largo <= MOTIVO_DE_REAPERTURA.maximo;
  const cierre = abierto.tipo === 'cierre' ? abierto.cierre : null;

  return (
    <Dialog open onOpenChange={(v) => !v && !enviando && onCerrar()}>
      <DialogContent className="max-w-3xl" icon={abierto.tipo === 'cierre' ? <LockSimple weight="bold" /> : <Signature weight="bold" />}>
        <DialogHeader>
          <DialogTitle className="capitalize">
            {abierto.tipo === 'cierre' ? `Cierre de ${abierto.mes.mesEnPalabras}` : `Borrador del cierre de ${abierto.mes.mesEnPalabras}`}
          </DialogTitle>
          <DialogDescription>
            {cierre
              ? `Versión ${cierre.version}, firmada por ${cierre.firma.nombre ?? 'el contador'}${cierre.firma.tarjetaProfesional ? ` (T.P. ${cierre.firma.tarjetaProfesional})` : ''} el ${new Date(cierre.firma.firmadoAt).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}.${cierre.integra === false ? ' 🔴 La foto guardada no coincide con su huella.' : ''}`
              : 'Así quedaría si se firmara ahora. Al firmar, la foto queda guardada sin cambios y el mes se bloquea para esta cuenta.'}
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait" initial={false}>
          {foto ? (
            <VistaDeLaFoto key="foto" foto={foto} />
          ) : (
            <motion.p key="leyendo" className="text-body-sm text-fg-muted" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              Leyendo…
            </motion.p>
          )}
        </AnimatePresence>

        {cierre && (
          <p className="break-all text-caption text-fg-muted" data-testid="huella-del-cierre">
            Huella sha256: {cierre.huella}
          </p>
        )}

        {abierto.tipo === 'borrador' && foto && firma && (
          <div className="space-y-3 border-t border-border pt-3" data-testid="firmar-el-cierre">
            {sinSaldo && (
              <div className="space-y-1">
                <Label htmlFor="saldo-del-extracto">Saldo del extracto al último día del mes (opcional)</Label>
                <Input
                  id="saldo-del-extracto"
                  inputMode={conCentavos ? 'decimal' : 'numeric'}
                  value={saldo}
                  onChange={(e) => setSaldo(e.target.value)}
                  placeholder={conCentavos ? '12.345.678,90' : '12.345.678'}
                />
              </div>
            )}
            <div className="space-y-1">
              <Label htmlFor="tarjeta-profesional">Tarjeta profesional (opcional)</Label>
              <Input id="tarjeta-profesional" value={tarjeta} maxLength={30} onChange={(e) => setTarjeta(e.target.value)} />
            </div>
            <label className="flex items-start gap-2 text-body-sm text-fg">
              <Checkbox checked={confirmo} onCheckedChange={(v) => setConfirmo(v === true)} data-testid="confirmo-el-cierre" />
              Revisé la conciliación de este mes y la firmo. Entiendo que el mes queda bloqueado para esta cuenta.
            </label>
          </div>
        )}

        {cierre && cierre.estado === 'CERRADO' && reabre && (
          <div className="space-y-2 border-t border-border pt-3" data-testid="reabrir-el-cierre">
            <Label htmlFor="motivo-reabrir">Para reabrir el mes, escribe el motivo</Label>
            <Textarea
              id="motivo-reabrir"
              value={motivo}
              rows={2}
              maxLength={MOTIVO_DE_REAPERTURA.maximo}
              onChange={(e) => {
                setMotivo(e.target.value);
                setErrorDelMotivo(null);
              }}
              placeholder="El banco corrigió una línea del 14 y hay que volver a conciliarla."
              aria-invalid={errorDelMotivo ? true : undefined}
              aria-describedby="motivo-reabrir-error"
            />
            <ErrorDelCampo
              id="motivo-reabrir-error"
              mensaje={errorDelMotivo}
              pista={`Entre ${MOTIVO_DE_REAPERTURA.minimo} y ${MOTIVO_DE_REAPERTURA.maximo} caracteres. Queda en la bitácora.`}
            />
          </div>
        )}

        <DialogFooter className="flex-wrap gap-2">
          {cierre && (
            <>
              <Button variant="outline" hideArrow isLoading={exportando === 'xlsx'} onClick={() => void exportar('xlsx')} data-testid="exportar-excel">
                <FileXls className="h-4 w-4" aria-hidden="true" />
                Excel
              </Button>
              <Button variant="outline" hideArrow isLoading={exportando === 'pdf'} onClick={() => void exportar('pdf')} data-testid="exportar-pdf">
                <FilePdf className="h-4 w-4" aria-hidden="true" />
                PDF
              </Button>
            </>
          )}
          {cierre && cierre.estado === 'CERRADO' && reabre && (
            <Button variant="outline" hideArrow disabled={!motivoValido} isLoading={enviando} onClick={() => void reabrir()} data-testid="confirmar-reabrir">
              Reabrir el mes
            </Button>
          )}
          {abierto.tipo === 'borrador' && foto && firma && (
            <Button hideArrow disabled={!confirmo} isLoading={enviando} onClick={() => void firmar()} data-testid="confirmar-firma">
              Firmar y cerrar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
