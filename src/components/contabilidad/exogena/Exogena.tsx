'use client';

/**
 * La exógena anual de la DIAN: los seis formatos, sus bloqueos, el mapeo de
 * conceptos, el visto bueno del contador y el CSV (contrato del 18-09, §6).
 *
 * ── 🔴 Lo primero que dice esta pantalla: Leasefy NO transmite ──────────────
 *
 * El aviso del Prevalidador va ARRIBA, antes de cualquier botón de descarga, con
 * las palabras del contrato. La DIAN recibe XML que produce su Prevalidador; este
 * CSV es la plantilla que se carga ahí. Una pantalla que deja creer que ya se
 * presentó la exógena produce una sanción, y la sanción por no presentar
 * información exógena se calcula sobre el patrimonio.
 *
 * ── 🔴 Bloqueo y aviso se dibujan distinto ─────────────────────────────────
 *
 * Un BLOQUEO impide presentar —movimientos sin tercero, cuentas sin concepto— y
 * sale en rojo; el back devuelve 409 `EXOGENA_CON_BLOQUEOS` al intentar aprobar
 * así, y esta pantalla **no ofrece forzarlo**: no hay «aprobar igual». Un AVISO
 * es algo que hay que mirar y sale en amarillo. Pintarlos iguales hace que el
 * contador que ve seis renglones amarillos deje de leerlos, y el séptimo era el
 * que impedía presentar.
 *
 * ── 🔴 `paraElContador` es contenido, no un comentario del código ───────────
 *
 * Cada formato trae las preguntas que necesitan visto bueno: si los giros a
 * propietarios van en el 1001 como pago a tercero o sólo en el 1647 como ingreso
 * recibido para terceros, qué parte del gasto es deducible, qué tope de cuantías
 * menores fijó la resolución del año. Se listan enteras, con el tratamiento de
 * `PENDIENTE_DE_CONFIRMAR` — un asterisco al pie de una tabla de 128 filas no lo
 * lee nadie.
 *
 * ── La pestaña «Configuración» (contrato del 19-09, §2) ────────────────────
 *
 * Lo que decide la inmobiliaria vive aparte de lo que se presenta: los dos
 * interruptores (giros al 1001, saldo de 2815 en el 1009) y el tope de
 * cuantías menores. Es una PESTAÑA y no un bloque más al pie porque cambia lo
 * que los seis formatos de la otra pestaña calculan — mezclarlos haría que
 * alguien mueva un interruptor buscando un botón de descarga.
 *
 * ── Sin la migración 52 se calcula y se descarga, pero no se aprueba ───────
 *
 * Los formatos salen igual: lo que no se puede es guardar el mapeo de conceptos
 * ni dejar constancia de quién revisó. La pantalla lo dice en el botón, con su
 * motivo.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DownloadSimple, Prohibit, SealCheck } from '@phosphor-icons/react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Cajon, CajonCabecera, CajonCuerpo, CajonPie } from '@/components/ui/cajon';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { CifraHeroe } from '@/components/pantalla/CifraHeroe';
import { MasDetalles } from '@/components/pantalla/MasDetalles';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { Avisos } from '@/components/finanzas/piezas';
import { mensajeDeContabilidad } from '@/components/migracion/contabilidad-errores';
import {
  AVISO_DEL_PREVALIDADOR,
  DE_DONDE_SALE,
  NOMBRE_DEL_ESTADO_DE_FORMATO,
  PENDIENTES_DEL_CONTADOR,
  exogenaApi,
  type FormatoArmado,
  type FormatoDeExogena,
  type ResumenDeExogena,
} from '@/lib/api/exogena.service';
import {
  ayudaDelFormato,
  estadoParaMostrarDelFormato,
  aniosDeExogena,
  frasesDeCuantiasMenores,
  nombreDelArchivoDeExogena,
  sePuedeAprobar,
  totalesDelAnio,
} from '@/lib/contabilidad/exogena';
import { diaLegible } from '@/lib/contabilidad/fechas';
// CB-17: la plata de Contabilidad con UN formato («$ 1.234.567», «−$ 119.100»).
import { plata as formatCurrency, textoDelBack } from '@/lib/contabilidad/plata';
import { Monto } from '../Monto';
import { AccionConMotivo, Bloqueos, Nota, VistoBuenoDelContador } from '../piezas';
import { usePuedeEscribir, usePuedeExportarContabilidad } from '../use-puede-escribir';
import { ConceptosDeExogena } from './ConceptosDeExogena';
import { ConfiguracionDeExogena } from './ConfiguracionDeExogena';
import { localeDeLasCifras } from '@/lib/i18n/idioma-de-las-cifras';

/** Cuántas filas del formato se dibujan: un 1647 tiene 1.733. */
const FILAS_EN_PANTALLA = 50;

type ParteDeLaExogena = 'formatos' | 'configuracion';

export function Exogena({ anioInicial }: { anioInicial?: number } = {}) {
  const anios = useMemo(() => aniosDeExogena(new Date().getFullYear()), []);
  const [anio, setAnio] = useState(() => anioInicial ?? anios[0]);
  const [parte, setParte] = useState<ParteDeLaExogena>('formatos');

  const [resumen, setResumen] = useState<ResumenDeExogena | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<unknown>(null);

  /** El formato abierto, con sus filas. `null` = sólo la lista. */
  const [abierto, setAbierto] = useState<FormatoArmado | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);

  const [aprobando, setAprobando] = useState<FormatoDeExogena | null>(null);
  const [observaciones, setObservaciones] = useState('');
  const [anulando, setAnulando] = useState<FormatoDeExogena | null>(null);
  const [motivo, setMotivo] = useState('');
  /** Revisora r25 (Exógena #1): el formato cuyo cajón está abierto. */
  const [visto, setVisto] = useState<FormatoDeExogena | null>(null);
  const filasRef = useRef<HTMLElement | null>(null);

  const escritura = usePuedeEscribir();
  // El CSV pide `reportes:export` en el back (23-09, datos personales).
  const exportacion = usePuedeExportarContabilidad();

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    setAbierto(null);
    try {
      setResumen(await exogenaApi.resumen(anio));
    } catch (e) {
      setError(e);
    } finally {
      setCargando(false);
    }
  }, [anio]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const abrir = async (formato: FormatoDeExogena) => {
    setOcupado(formato);
    try {
      setAbierto(await exogenaApi.formato(formato, anio));
      // Las filas se leen en la página, a lo ancho: el cajón se cierra y la vista baja a ellas.
      setVisto(null);
      requestAnimationFrame(() => filasRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }));
    } catch (e) {
      toast.error(mensajeDeContabilidad(e, 'No se pudieron armar las filas del formato.'));
    } finally {
      setOcupado(null);
    }
  };

  const descargar = async (formato: FormatoDeExogena) => {
    setOcupado(formato);
    try {
      const blob = await exogenaApi.archivo(formato, anio);
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = nombreDelArchivoDeExogena(formato, anio);
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      URL.revokeObjectURL(url);
      toast.success(
        'Archivo descargado. Cargalo en el Prevalidador de la DIAN: Leasefy no lo transmite.',
      );
    } catch (e) {
      toast.error(mensajeDeContabilidad(e, 'No se pudo generar el archivo.'));
    } finally {
      setOcupado(null);
    }
  };

  const aprobar = async () => {
    if (!aprobando) return;
    setOcupado(aprobando);
    try {
      await exogenaApi.aprobar(aprobando, anio, observaciones.trim() || undefined);
      toast.success('Visto bueno guardado, con quién lo dio y cuándo.');
      setAprobando(null);
      setObservaciones('');
      await cargar();
    } catch (e) {
      toast.error(mensajeDeContabilidad(e, 'No se pudo guardar el visto bueno.'));
    } finally {
      setOcupado(null);
    }
  };

  const anular = async () => {
    if (!anulando) return;
    setOcupado(anulando);
    try {
      await exogenaApi.anular(anulando, anio, motivo.trim());
      toast.success('El formato volvió a quedar generado, sin visto bueno.');
      setAnulando(null);
      setMotivo('');
      await cargar();
    } catch (e) {
      toast.error(mensajeDeContabilidad(e, 'No se pudo anular el visto bueno.'));
    } finally {
      setOcupado(null);
    }
  };

  if (cargando && !resumen) {
    return (
      <div className="space-y-5" aria-busy="true">
        <span className="sr-only">Armando los formatos de {anio}…</span>
        <div className="space-y-3" aria-hidden="true">
          <Skeleton className="h-3.5 w-40 rounded-sm bg-surface-muted" />
          <Skeleton className="h-9 w-48 rounded-sm bg-surface-muted" />
          <Skeleton className="h-2 w-full rounded-full bg-surface-muted" />
        </div>
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-lg bg-surface-muted" aria-hidden="true" />
        ))}
      </div>
    );
  }
  if (error || !resumen) {
    return <FalloDeCarga error={error} queEs="la exógena" onReintentar={cargar} />;
  }

  const totales = totalesDelAnio(resumen);
  const cuantias = frasesDeCuantiasMenores(resumen.cuantiasMenores, formatCurrency);

  // GLOW UP 3.ª vuelta · LA RESPUESTA: cuántos de los formatos ya tienen el visto bueno, y qué
  // le pasa a los demás. Y un solo azul: el «Visto bueno» del primer formato que lo puede recibir.
  // Revisora r25 (Exógena #1): un aviso que el back repite en varios formatos
  // («No está configurado el tope de cuantías menores del año…») es UNA sola
  // configuración: se dice una vez arriba y sale de cada formato.
  const vecesDelAviso = new Map<string, number>();
  for (const f of resumen.formatos) {
    for (const a of new Set(f.avisos.map(textoDelBack))) vecesDelAviso.set(a, (vecesDelAviso.get(a) ?? 0) + 1);
  }
  const avisosDeTodos = [...vecesDelAviso].filter(([, n]) => n >= 2).map(([a]) => a);
  const conVistoBueno = resumen.formatos.filter((f) => f.estado === 'APROBADA');
  const conBloqueo = resumen.formatos.filter((f) => f.estado !== 'APROBADA' && f.bloqueos.length > 0);
  const sinFilas = resumen.formatos.filter((f) => f.estado !== 'APROBADA' && f.bloqueos.length === 0 && f.filas === 0);
  const porRevisar = resumen.formatos.filter(
    (f) => f.estado !== 'APROBADA' && f.bloqueos.length === 0 && f.filas > 0,
  );
  const siguienteVistoBueno =
    resumen.formatos.find((f) => escritura.puede && sePuedeAprobar(f, resumen.disponible).puede)?.formato ?? null;
  const cifras = localeDeLasCifras();
  // Revisora r25 (Exógena #2): la respuesta es lo que FALTA resolver (bloqueados + sin visto
  // bueno); «0 de 6 con visto bueno» ponía el cero en grande. Un formato sin filas no se
  // resuelve: queda en su tramo. Con todo resuelto, cuántos tienen el visto bueno.
  const porResolver = conBloqueo.length + porRevisar.length;
  const todosBloqueados = resumen.formatos.length > 0 && conBloqueo.length === resumen.formatos.length;
  const cuantosFormatos = resumen.formatos.length.toLocaleString(cifras);
  const formatoVisto = visto ? (resumen.formatos.find((f) => f.formato === visto) ?? null) : null;

  return (
    <div className="space-y-6" data-testid="exogena">
      {/* Ronda 30 (revisora r27, §3): con TODOS bloqueados, «6 de 6» con la barra entera en rojo y «No se pueden
          presentar 6» decían lo mismo tres veces: la respuesta es una frase, sin barra. */}
      <CifraHeroe
        rotulo={
          todosBloqueados
            ? `Formatos de ${anio}`
            : porResolver > 0
              ? `Formatos de ${anio} por resolver`
              : `Formatos de ${anio} con visto bueno`
        }
        cifra={
          todosBloqueados
            ? 'Ninguno se puede presentar todavía'
            : porResolver > 0
              ? `${porResolver.toLocaleString(cifras)} de ${cuantosFormatos}`
              : `${conVistoBueno.length.toLocaleString(cifras)} de ${cuantosFormatos}`
        }
        esCero={porResolver === 0 && conVistoBueno.length === 0}
        cuandoEsCero={`Ningún formato de ${anio} tiene filas: no hay nada que presentar.`}
        contexto={
          <span data-testid="totales-del-anio">
            {totales.filas.toLocaleString(cifras)} filas en los seis formatos ·{' '}
            <Monto valor={totales.totalCop} />
          </span>
        }
        total={resumen.formatos.length}
        tramos={todosBloqueados ? undefined : [
          { clave: 'bloqueados', etiqueta: 'No se pueden presentar', monto: conBloqueo.length, tono: 'critico', cifra: conBloqueo.length.toLocaleString(cifras) },
          { clave: 'por-revisar', etiqueta: 'Falta el visto bueno', monto: porRevisar.length, tono: 'aviso', cifra: porRevisar.length.toLocaleString(cifras) },
          { clave: 'listos', etiqueta: 'Con visto bueno', monto: conVistoBueno.length, tono: 'exito', cifra: conVistoBueno.length.toLocaleString(cifras) },
          { clave: 'sin-filas', etiqueta: 'Sin filas', monto: sinFilas.length, tono: 'neutro', cifra: sinFilas.length.toLocaleString(cifras) },
        ]}
        // 🔴 ARRIBA, antes de cualquier botón de descarga: Leasefy no transmite.
        pie={
          <span role="status" data-testid="aviso-del-prevalidador">
            {AVISO_DEL_PREVALIDADOR}
          </span>
        }
        data-testid="cifra-de-la-exogena"
      />

      {/* 🔴 UNA SOLA COSA (Nico, 21-09): las pestañas y el año van en la misma fila. */}
      <Tabs value={parte} onValueChange={(v) => setParte(v as ParteDeLaExogena)}>
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList variant="segmented" className="justify-start">
            <TabsTrigger value="formatos" data-testid="parte-formatos" className="whitespace-nowrap">
              Los formatos
            </TabsTrigger>
            <TabsTrigger
              value="configuracion"
              data-testid="parte-configuracion"
              className="whitespace-nowrap"
            >
              Configuración
            </TabsTrigger>
          </TabsList>
          {/* Revisora r25 (C4): el Select de la casa, no el <select> del navegador. */}
          <div className="flex items-center gap-2 text-body-sm text-fg-muted">
            <span aria-hidden="true">Año gravable</span>
            <Select value={String(anio)} onValueChange={(v) => setAnio(Number(v))}>
              <SelectTrigger aria-label="Año gravable" className="w-28" data-testid="selector-de-anio">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {anios.map((a) => (
                  <SelectItem key={a} value={String(a)}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value="formatos" className="space-y-6 pt-5">
      {!resumen.disponible ? (
        <Nota testId="exogena-sin-migracion">
          <p>
            Los formatos se calculan y se descargan igual. Lo que todavía no se puede es guardar el
            mapeo de conceptos ni dejar constancia de quién dio el visto bueno: esta función todavía no está
            disponible y nuestro equipo la está habilitando.
          </p>
        </Nota>
      ) : null}

      {cuantias ? (
        <Nota testId="cuantias-menores">
          <p>{cuantias}</p>
        </Nota>
      ) : null}

      {/* ── Los seis formatos ─────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-[17px] font-[460] tracking-[-0.01em] text-fg">Los seis formatos</h2>
          <p className="text-body-sm text-fg-muted">
            Cada uno sale del libro. El 1647 es el propio de una inmobiliaria: lo que se recaudó para los propietarios.
          </p>
        </div>

        {/* 🔴 Lo que decide la resolución y el sistema no puede saber: se consulta, plegado. */}
        <MasDetalles etiqueta="Las cinco decisiones del contador" etiquetaAbierto="Ocultar las decisiones" montadoSiempre>
          <VistoBuenoDelContador
            introduccion="Estas cinco cosas las fija la resolución de la DIAN de cada año, o son decisiones de la inmobiliaria. Leasefy propone una respuesta y el contador la confirma: lo que está abajo se calculó con esas respuestas."
            puntos={PENDIENTES_DEL_CONTADOR}
            testId="pendientes-del-contador"
          />
        </MasDetalles>

        {avisosDeTodos.length > 0 ? (
          <Avisos avisos={avisosDeTodos} testId="avisos-de-todos-los-formatos" titulo="Para mirar antes de presentar, en todos los formatos" />
        ) : null}

        {/* Revisora r25 (Exógena #1): cada formato en UNA fila —código · nombre · filas y
            total · estado · «Ver»—; sus bloqueos, avisos, preguntas y acciones, en su cajón.
            Antes los seis abiertos con su caja roja y su caja ámbar: 4.843 px a 1440. */}
        <ul
          className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface"
          aria-label="Los formatos del año"
        >
          {resumen.formatos.map((f) => {
            const estado = estadoParaMostrarDelFormato(f);
            return (
              <li
                key={f.formato}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3"
                data-testid={`fila-${f.formato}`}
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="text-body-sm text-fg">
                    <span className="font-mono">{f.formato}</span> · {f.nombre}
                  </p>
                  <p className="text-caption text-fg-muted">
                    {f.filas.toLocaleString(cifras)} {f.filas === 1 ? 'fila' : 'filas'} ·{' '}
                    <Monto valor={f.totalCop} className="text-caption" />
                    {f.aprobadoAt ? ` · visto bueno el ${diaLegible(f.aprobadoAt)}` : ''}
                  </p>
                </div>
                {/* 🔴 CB-12: el estado REAL. «Generada» al lado de «Esto impide
                    presentar el formato» se leía como «lista». */}
                <Badge
                  variant={estado.tono === 'peligro' ? 'destructive' : estado.tono === 'listo' ? 'secondary' : 'outline'}
                  title={NOMBRE_DEL_ESTADO_DE_FORMATO[f.estado]}
                  data-testid={`estado-${f.formato}`}
                >
                  {estado.texto}
                </Badge>
                <Button
                  size="sm"
                  variant="secondary"
                  hideArrow
                  onClick={() => setVisto(f.formato)}
                  aria-label={`Ver el formato ${f.formato}`}
                  data-testid={`abrir-formato-${f.formato}`}
                >
                  Ver
                </Button>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ── El cajón del formato ──────────────────────────────────────── */}
      <Cajon abierto={formatoVisto !== null} onOpenChange={(a) => !a && setVisto(null)} tamano="md">
        {formatoVisto
          ? (() => {
              const f = formatoVisto;
              const permiso = sePuedeAprobar(f, resumen.disponible);
              // 🔴 CB-12: las frases del back sin los 🔴 (el cartel ya trae el
              // ícono del DS) y con la plata de la casa.
              const paraElContador = (f.paraElContador ?? []).map(textoDelBack);
              const bloqueos = f.bloqueos.map(textoDelBack);
              const avisosDelFormato = f.avisos.map(textoDelBack).filter((a) => !avisosDeTodos.includes(a));
              const estado = estadoParaMostrarDelFormato(f);
              const ayuda = ayudaDelFormato(f, permiso, escritura);
              const yaTieneVistoBueno = f.estado === 'APROBADA';
              return (
                <div className="contents" data-testid={`formato-${f.formato}`}>
                  <CajonCabecera
                    titulo={
                      <>
                        <span className="font-mono">{f.formato}</span> · {f.nombre}
                      </>
                    }
                    descripcion={DE_DONDE_SALE[f.formato]}
                  />
                  <CajonCuerpo className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-body-sm text-fg-muted">
                        {f.filas.toLocaleString(cifras)} {f.filas === 1 ? 'fila' : 'filas'} ·{' '}
                        <Monto valor={f.totalCop} />
                        {f.aprobadoAt ? ` · visto bueno el ${diaLegible(f.aprobadoAt)}` : ''}
                      </p>
                      <Badge
                        variant={estado.tono === 'peligro' ? 'destructive' : estado.tono === 'listo' ? 'secondary' : 'outline'}
                        title={NOMBRE_DEL_ESTADO_DE_FORMATO[f.estado]}
                      >
                        {estado.texto}
                      </Badge>
                    </div>
                    {f.observaciones ? (
                      <p className="text-caption text-fg-muted">Observaciones: {f.observaciones}</p>
                    ) : null}

                    {/* Rojo: impide. */}
                    <Bloqueos bloqueos={bloqueos} titulo="Esto impide presentar el formato" testId={`bloqueos-${f.formato}`} />

                    {/* Amarillo: hay que mirarlo. */}
                    <Avisos avisos={avisosDelFormato} testId={`avisos-${f.formato}`} titulo="Para mirar antes de presentar" />

                    {/* 🔴 Las preguntas de ESTE formato, listadas enteras. */}
                    {paraElContador.length > 0 ? (
                      <VistoBuenoDelContador
                        titulo={`Lo que el contador tiene que decidir en el ${f.formato}`}
                        puntos={paraElContador}
                        testId={`para-el-contador-${f.formato}`}
                      />
                    ) : null}

                    <div className="flex flex-wrap items-end gap-3">
                      <AccionConMotivo
                        puede={f.filas > 0}
                        motivo="Este formato no tiene filas: no hay nada que mirar."
                        ocupado={ocupado === f.formato}
                        textoOcupado="Armando…"
                        onClick={() => void abrir(f.formato)}
                        testId={`ver-${f.formato}`}
                        motivoVisible={false}
                      >
                        Ver las filas
                      </AccionConMotivo>

                      <AccionConMotivo
                        puede={exportacion.puede && f.filas > 0}
                        motivo={exportacion.motivo ?? 'Este formato no tiene filas: el archivo saldría vacío.'}
                        ocupado={ocupado === f.formato}
                        textoOcupado="Generando…"
                        onClick={() => void descargar(f.formato)}
                        testId={`descargar-${f.formato}`}
                        motivoVisible={false}
                      >
                        <DownloadSimple className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                        Descargar el CSV
                      </AccionConMotivo>
                    </div>
                    {/* CB-12: UNA ayuda corta; cada botón guarda su motivo entero
                        en el `title` y para el lector de pantalla. */}
                    {ayuda ? (
                      <p className="text-caption text-fg-muted" data-testid={`ayuda-${f.formato}`}>
                        {ayuda}
                      </p>
                    ) : null}
                  </CajonCuerpo>
                  <CajonPie>
                    {/* Revisora r25: sólo la acción que aplica —visto bueno O quitarlo—, no
                        las dos con una apagada. 🔴 Con bloqueos NO hay «aprobar igual»: el
                        botón está apagado con el bloqueo textual del back como motivo. */}
                    {yaTieneVistoBueno ? (
                      <AccionConMotivo
                        puede={escritura.puede}
                        motivo={escritura.motivo ?? 'Sólo se anula un formato que ya tiene el visto bueno.'}
                        onClick={() => {
                          setVisto(null);
                          setAnulando(f.formato);
                          setMotivo('');
                        }}
                        testId={`anular-${f.formato}`}
                        motivoVisible={false}
                      >
                        <Prohibit className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                        Quitar el visto bueno
                      </AccionConMotivo>
                    ) : (
                      <AccionConMotivo
                        puede={escritura.puede && permiso.puede}
                        motivo={escritura.motivo ?? (permiso.motivo ? textoDelBack(permiso.motivo) : null)}
                        onClick={() => {
                          setVisto(null);
                          setAprobando(f.formato);
                          setObservaciones('');
                        }}
                        variant={siguienteVistoBueno === f.formato || (escritura.puede && permiso.puede) ? 'default' : 'outline'}
                        testId={`aprobar-${f.formato}`}
                        motivoVisible={false}
                      >
                        <SealCheck className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                        Visto bueno del contador
                      </AccionConMotivo>
                    )}
                  </CajonPie>
                </div>
              );
            })()
          : null}
      </Cajon>

      {/* ── Las filas del formato abierto ─────────────────────────────── */}
      {abierto ? (
        <section
          ref={filasRef}
          className="scroll-mt-24 space-y-3 rounded-lg border border-border bg-surface p-4"
          data-testid="filas-del-formato"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-medium text-fg">
              Formato {abierto.formato} · {abierto.filas.length.toLocaleString(localeDeLasCifras())} filas
            </h3>
            <Button
              variant="link"
              size="sm"
              hideArrow
              className="h-auto p-0 text-caption"
              onClick={() => setAbierto(null)}
              data-testid="cerrar-filas"
            >
              Ocultar
            </Button>
          </div>

          {abierto.filas.length > FILAS_EN_PANTALLA ? (
            <p className="text-caption text-fg-muted" data-testid="tope-de-filas">
              Se muestran las primeras {FILAS_EN_PANTALLA} de{' '}
              {abierto.filas.length.toLocaleString(localeDeLasCifras())}. El CSV lleva todas.
            </p>
          ) : null}

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {/* El orden de columnas es el del CSV, tal como lo manda el
                      back: si aquí fuera otro, el archivo y la pantalla dirían
                      cosas distintas de la misma fila. */}
                  {abierto.columnas.map((c) => (
                    <TableHead key={c} className="whitespace-nowrap">
                      {c}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {abierto.filas.slice(0, FILAS_EN_PANTALLA).map((fila, i) => (
                  <TableRow key={i}>
                    {abierto.columnas.map((_, j) => {
                      const valores = Object.values(fila);
                      const valor = valores[j];
                      return (
                        <TableCell key={j} className="whitespace-nowrap text-caption">
                          {valor === null || valor === undefined || valor === ''
                            ? '—'
                            : String(valor)}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      ) : null}

      {/* ── El mapeo cuenta → concepto ────────────────────────────────── */}
      <ConceptosDeExogena anio={anio} onGuardado={cargar} />
        </TabsContent>

        {/* 🔴 Lo que la inmobiliaria DECIDE, separado de lo que presenta. */}
        <TabsContent value="configuracion" className="pt-5">
          <ConfiguracionDeExogena anio={anio} />
        </TabsContent>
      </Tabs>

      {/* ── Diálogos ─────────────────────────────────────────────────── */}
      <AlertDialog
        open={aprobando !== null}
        onOpenChange={(a) => {
          if (!a && ocupado === null) setAprobando(null);
        }}
      >
        <AlertDialogContent
          variant="confirm"
          icon={<SealCheck weight="bold" />}
          data-testid="dialogo-de-visto-bueno"
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Visto bueno del formato {aprobando}</AlertDialogTitle>
            <AlertDialogDescription>
              Queda guardado quién lo dio, cuándo, y la foto de los totales de este momento. Esto no
              presenta la exógena: el archivo se carga en el Prevalidador de la DIAN.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="observaciones-del-visto-bueno">Observaciones (opcional)</Label>
            <Textarea
              id="observaciones-del-visto-bueno"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Conceptos revisados contra la Resolución 000162 y sus modificaciones."
              rows={3}
              data-testid="observaciones-del-visto-bueno"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={ocupado !== null}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void aprobar();
              }}
              loading={ocupado !== null}
              data-testid="confirmar-visto-bueno"
            >
              {ocupado !== null ? 'Guardando…' : 'Dar el visto bueno'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={anulando !== null}
        onOpenChange={(a) => {
          if (!a && ocupado === null) {
            setAnulando(null);
            setMotivo('');
          }
        }}
      >
        <AlertDialogContent
          variant="destructive"
          icon={<Prohibit weight="bold" />}
          data-testid="dialogo-de-anulacion"
        >
          <AlertDialogHeader>
            <AlertDialogTitle>¿Quitar el visto bueno del {anulando}?</AlertDialogTitle>
            <AlertDialogDescription>
              El formato vuelve a quedar generado y hay que revisarlo de nuevo. El motivo se guarda
              con la anulación.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="motivo-de-la-anulacion">Motivo</Label>
            <Textarea
              id="motivo-de-la-anulacion"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              data-testid="motivo-de-la-anulacion"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={ocupado !== null}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void anular();
              }}
              disabled={motivo.trim().length === 0}
              loading={ocupado !== null}
              data-testid="confirmar-anulacion"
            >
              Quitar el visto bueno
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
