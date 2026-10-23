"use client";

/**
 * Paso 5 de la migración: los registros contables.
 *
 * 🔴 8.ª tanda (14-10-2026, Nico: «saldos al cierre + movimientos del año»).
 * Tres archivos, cada uno con su puerta, y NINGUNO obligatorio por sí solo
 * (T-0168, decisión del dueño: los saldos iniciales son opcionales; el paso
 * queda listo en cuanto hay registros contables cargados, sean los saldos
 * iniciales o el libro diario):
 *
 *   A. Saldos iniciales — el balance de prueba POR TERCERO al cierre del año
 *      anterior, que entra como UN asiento de apertura. Recomendado.
 *   B. El libro diario — los movimientos de ESTE año, después de la apertura
 *      (el back rechaza lo que ya está dentro de los saldos).
 *   C. Los comprobantes — historia de todos los años en la ficha de cada
 *      contrato; no entran al libro.
 *
 * Arriba, «Sube tu archivo contable»: Leasefy reconoce cuál de los tres es
 * (`queArchivoContableSubieron`) y lo abre en su puerta. Las tres pestañas
 * quedan para elegir a mano.
 *
 * Arriba de los dos, lo que ya está cargado: nadie debería cargar la
 * apertura dos veces porque no vio que ya existía.
 *
 * Sin plan de cuentas no hay dónde imputar: en ese caso no se ofrece ningún
 * camino, se manda al paso 4.
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useDropzone } from "react-dropzone";
import { ArrowRight, BookOpen, Info, Receipt, Scales, Warning } from "@phosphor-icons/react";
import { SegmentedControl } from "@leasefy/cadence";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";
import { MasDetalles } from "@/components/pantalla/MasDetalles";

import { ZonaDeArchivo } from "@/components/migracion/ZonaDeArchivo";
import type { FormaDeArchivoContable } from "@/lib/migracion/que-archivo-contable-es";

import { Button } from "@/components/ui/button";
import {
  contabilidadApi,
  MAX_LIMITE_DE_ASIENTOS,
  type CargaAbierta,
  type CuentaPuc,
} from "@/lib/api/contabilidad.service";
import { formatDate } from "@/lib/format";

import { AsientoDeApertura } from "./AsientoDeApertura";
import { CargasDeAsientosAbiertas } from "./CargasDeAsientosAbiertas";
import { DocumentosContables } from "./DocumentosContables";
import { CarteraDelSistemaAnterior } from "./CarteraDelSistemaAnterior";
import { MigrarAsientos } from "./MigrarAsientos";
import { mensajeDeContabilidad } from "./contabilidad-errores";
import { queArchivoContableSubieron } from "./que-archivo-contable-subieron";

const RUTA_DEL_PASO_4 = "/panel/inmobiliaria/migracion/puc";

type Camino = "apertura" | "historico" | "documentos";

/** A qué puerta va cada archivo que se reconoce. */
const CAMINO_DEL_ARCHIVO: Record<FormaDeArchivoContable, Camino> = {
  balance: "apertura",
  "libro-diario": "historico",
  comprobantes: "documentos",
};

const QUE_ES: Record<FormaDeArchivoContable, string> = {
  balance: "Es un balance: lo abrimos en «Saldos iniciales».",
  "libro-diario": "Es un libro diario: lo abrimos en «Subir el libro diario».",
  comprobantes: "Son comprobantes: los abrimos en «Subir los comprobantes».",
};

interface ResumenDeCargado {
  total: number;
  desde: string | null;
  hasta: string | null;
  /** El rango se midió sobre una página: con más de 200, es parcial. */
  parcial: boolean;
}

/**
 * `onIrAlPuc`: adentro del muro el paso 4 se abre en el mismo muro, no en
 * otra ruta. Sin el callback queda el enlace de siempre.
 */
export function RegistrosContables({
  onIrAlPuc,
  onOcupado,
}: {
  onIrAlPuc?: () => void;
  /** Aviso al muro mientras se aplican los asientos: el pie espera. */
  onOcupado?: (ocupado: boolean, cancelar?: () => void) => void;
} = {}) {
  const [camino, setCamino] = useState<Camino>("apertura");
  const enElCelular = useIsMobile();
  /*
   * 8.ª tanda (14-10): el archivo de «Sube tu archivo contable», con la puerta
   * a la que va. Cada camino lo recibe como `archivoInicial` y lo lee una vez.
   */
  const [archivoDelCamino, setArchivoDelCamino] = useState<{ archivo: File; camino: Camino } | null>(null);
  const [reconociendo, setReconociendo] = useState(false);
  const [reconocido, setReconocido] = useState<{
    archivo: File;
    forma: FormaDeArchivoContable | null;
  } | null>(null);
  const llevarA = useCallback((archivo: File, destino: Camino) => {
    setCamino(destino);
    setArchivoDelCamino({ archivo, camino: destino });
  }, []);
  const onDropContable = useCallback(
    async (aceptados: File[]) => {
      const archivo = aceptados[0];
      if (!archivo) return;
      setReconociendo(true);
      try {
        const forma = await queArchivoContableSubieron(archivo);
        setReconocido({ archivo, forma });
        if (forma) llevarA(archivo, CAMINO_DEL_ARCHIVO[forma]);
      } finally {
        setReconociendo(false);
      }
    },
    [llevarA],
  );
  const zonaContable = useDropzone({ onDrop: onDropContable, maxFiles: 1, multiple: false });
  const archivoPara = (c: Camino) =>
    archivoDelCamino?.camino === c ? archivoDelCamino.archivo : null;
  /*
   * T-0125 · la carga de asientos que se está CONTINUANDO (viene de la franja
   * de cargas a medias) y el contador que la franja usa para volver a leer.
   * `ocupado` espeja lo que los caminos le avisan al muro: mientras algo
   * corre, la franja no deja continuar ni descartar.
   */
  const [continuar, setContinuar] = useState<CargaAbierta | null>(null);
  const [versionDeCargas, setVersionDeCargas] = useState(0);
  const [ocupado, setOcupado] = useState(false);
  const estabaOcupado = useRef(false);
  const marcarOcupado = useCallback(
    (hayTrabajo: boolean, cancelar?: () => void) => {
      setOcupado(hayTrabajo);
      // Al soltarse —terminó o se cortó— las cargas pudieron cambiar: se relee.
      // Sólo en la transición ocupado → libre, no en cada aviso de «libre».
      if (!hayTrabajo && estabaOcupado.current) setVersionDeCargas((v) => v + 1);
      estabaOcupado.current = hayTrabajo;
      onOcupado?.(hayTrabajo, cancelar);
    },
    [onOcupado],
  );
  const [cuentas, setCuentas] = useState<CuentaPuc[] | null>(null);
  const [resumen, setResumen] = useState<ResumenDeCargado | null>(null);
  const [error, setError] = useState<string | null>(null);
  /*
   * 🔴 «No pude leer el plan» NO es «no hay plan»: sin la distinción, una
   * caída de red mandaba al paso 4 a «cargar el PUC» a quien ya lo tiene.
   */
  const [falloDeCuentas, setFalloDeCuentas] = useState(false);
  /*
   * Y «no pude leer lo cargado» NO puede ser silencio: la franja de «ya
   * cargados» es el guard contra registrar la apertura DOS veces. Si la
   * lectura falla, se dice y se ofrece reintentar antes de registrar nada.
   */
  const [falloDeAsientos, setFalloDeAsientos] = useState(false);

  const cargar = useCallback(async () => {
    const [c, a] = await Promise.allSettled([
      contabilidadApi.puc.listar({ soloActivas: true, soloImputables: true }),
      contabilidadApi.asientos.listar({ limite: MAX_LIMITE_DE_ASIENTOS }),
    ]);
    if (c.status === "fulfilled") {
      setCuentas(c.value);
      setFalloDeCuentas(false);
      setError(null);
    } else {
      // Se conservan las cuentas del último éxito: un refresco caído no puede
      // vaciarle el selector de cuentas a un formulario a medio llenar.
      setCuentas((previo) => previo ?? []);
      setFalloDeCuentas(true);
      setError(
        mensajeDeContabilidad(c.reason, "No pudimos leer el plan de cuentas."),
      );
    }
    if (a.status === "fulfilled") {
      const fechas = a.value.asientos.map((x) => x.fecha.slice(0, 10)).sort();
      setResumen({
        total: a.value.total,
        desde: fechas[0] ?? null,
        hasta: fechas[fechas.length - 1] ?? null,
        parcial: a.value.total > a.value.asientos.length,
      });
      setFalloDeAsientos(false);
    } else {
      setFalloDeAsientos(true);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  if (cuentas === null) {
    return (
      <p className="text-sm text-fg-muted" role="status">
        Leyendo lo que ya tienes cargado…
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div
          className="flex flex-wrap items-start gap-2 rounded-md bg-danger-soft p-3"
          role="alert"
        >
          <Warning className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
          <p className="min-w-0 flex-1 text-sm text-fg">{error}</p>
          {falloDeCuentas ? (
            <Button
              size="sm"
              variant="outline"
              hideArrow
              onClick={() => void cargar()}
              data-testid="contables-reintentar"
            >
              Reintentar
            </Button>
          ) : null}
        </div>
      ) : null}

      {falloDeAsientos ? (
        <section
          className="rounded-lg bg-warning-soft p-4"
          data-testid="contables-cargado-fallo"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-start gap-2">
              <Warning className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <p className="text-sm text-fg">
                No pudimos leer lo que ya está cargado. Reintenta antes de
                registrar nada: sin esa lista podrías cargar dos veces la misma
                apertura.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              hideArrow
              onClick={() => void cargar()}
            >
              Reintentar
            </Button>
          </div>
        </section>
      ) : null}

      {/* El resumen de lo ya cargado baja a la tarjeta del camino (abajo):
          era una isla de una sola línea flotando arriba de todo. */}

      {cuentas.length === 0 && !falloDeCuentas ? (
        <section
          className="rounded-lg bg-warning-soft p-5"
          data-testid="contables-sin-puc"
        >
          <div className="flex items-start gap-2">
            <Warning className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <div>
              <h2 className="text-sm font-medium text-fg">
                Primero el plan de cuentas
              </h2>
              <p className="mt-0.5 text-sm text-fg-muted">
                Un asiento se imputa a cuentas, y todavía no hay ninguna que
                reciba movimientos. Carga el plan de cuentas y vuelve.
              </p>
            </div>
          </div>
          {onIrAlPuc ? (
            <Button
              size="sm"
              className="mt-4"
              hideArrow
              onClick={onIrAlPuc}
              data-testid="contables-ir-al-puc"
            >
              Ir al plan de cuentas
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button asChild size="sm" className="mt-4" hideArrow>
              <Link href={RUTA_DEL_PASO_4} data-testid="contables-ir-al-puc">
                Ir al plan de cuentas
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
        </section>
      ) : cuentas.length === 0 ? null : (
        // La tercera pata del if: lectura caída y sin cuentas del último
        // éxito. No sabemos si hay plan — ni «ve al paso 4» ni un selector
        // de cuentas vacío; queda el cartel de arriba con su Reintentar.
        <>
          {/*
           * 🔴 8.ª tanda (14-10): qué traer y para qué. Nico vio a Juan subir
           * todo por «libro diario»: la pantalla no decía cuál archivo va
           * dónde. Ahora lo dice, y un solo botón lo reconoce.
           */}
          <section
            className="space-y-4 rounded-lg border border-border-faint bg-surface p-6"
            data-testid="contables-guia"
          >
            <div>
              <h2 className="text-sm font-medium text-fg">
                Qué traer de tu sistema anterior
              </h2>
              {/* Ronda 30 (revisora r27): una línea por bloque; el detalle, en «¿Qué archivo traigo?». */}
              <p className="mt-1 max-w-2xl text-sm text-fg-muted">
                Tres archivos, cada uno a su lugar. Los saldos iniciales no son obligatorios: el paso queda listo con ellos o con el libro diario.
              </p>
            </div>
            <ZonaDeArchivo
              rootProps={zonaContable.getRootProps()}
              inputProps={zonaContable.getInputProps()}
              activo={zonaContable.isDragActive}
              testid="dropzone-archivo-contable"
              inputTestid="input-archivo-contable"
              titulo="Sube tu archivo contable"
              detalle="Reconocemos cuál de los tres es y lo llevamos a su lugar."
            />
            {/* Revisora r25: la zona primero; qué archivo traer, plegado (se consulta una vez). */}
            <MasDetalles etiqueta="¿Qué archivo traigo?" montadoSiempre classNameDelContenido="mt-3" data-testid="contables-que-archivo">
              <ol className="grid gap-3 md:grid-cols-3">
                <PasoDeLaGuia
                  numero={1}
                  icono={<Scales className="h-4 w-4" />}
                  titulo="El balance de prueba por tercero"
                  cuando="Al cierre del año anterior (por ejemplo, al 31 de diciembre)."
                  para="Son los saldos iniciales: lo que había en bancos, lo que debía cada inquilino y lo que se le debía a cada propietario."
                  etiqueta="Recomendado"
                  testid="guia-balance"
                />
                <PasoDeLaGuia
                  numero={2}
                  icono={<BookOpen className="h-4 w-4" />}
                  titulo="Los movimientos de este año"
                  cuando="El libro diario o auxiliar, del día siguiente a esos saldos hasta tu fecha de corte."
                  para="Completan el año: retenciones, exógena y resultados. Lo de antes de los saldos iniciales no entra (ya está en ellos)."
                  etiqueta="Si tu sistema lo exporta"
                  testid="guia-libro"
                />
                <PasoDeLaGuia
                  numero={3}
                  icono={<Receipt className="h-4 w-4" />}
                  titulo="Los comprobantes"
                  cuando="De todos los años: facturas, recibos de caja, egresos."
                  para="Quedan como historia en la ficha de cada contrato. No cambian la contabilidad."
                  etiqueta="Opcional"
                  testid="guia-comprobantes"
                />
              </ol>
            </MasDetalles>
            {reconociendo ? (
              <p className="text-sm text-fg-muted" role="status">
                Revisando qué archivo es…
              </p>
            ) : reconocido ? (
              <div
                className="flex flex-wrap items-start gap-2 rounded-md bg-surface-muted p-3"
                data-testid="contables-reconocido"
                data-forma={reconocido.forma ?? "ninguna"}
                aria-live="polite"
              >
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-fg-muted" />
                {reconocido.forma ? (
                  <p className="min-w-0 flex-1 text-sm text-fg">
                    «{reconocido.archivo.name}»: {QUE_ES[reconocido.forma]}
                  </p>
                ) : (
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="text-sm text-fg">
                      No reconocimos qué es «{reconocido.archivo.name}». Dinos dónde va:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" hideArrow onClick={() => llevarA(reconocido.archivo, "apertura")}>
                        Es el balance
                      </Button>
                      <Button size="sm" variant="outline" hideArrow onClick={() => llevarA(reconocido.archivo, "historico")}>
                        Es el libro diario
                      </Button>
                      <Button size="sm" variant="outline" hideArrow onClick={() => llevarA(reconocido.archivo, "documentos")}>
                        Son comprobantes
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </section>

          {/* La salida de una carga a medias va ANTES de los caminos: la pestaña
              de por defecto es la de saldos iniciales, no la del libro diario. */}
          <CargasDeAsientosAbiertas
            version={versionDeCargas}
            ocupado={ocupado}
            onContinuar={(carga) => {
              setContinuar(carga);
              setCamino("historico");
            }}
          />

          {/*
           * El camino elegido ES un filtro de esta pantalla, así que el
           * selector, su explicación y lo ya cargado van en UNA tarjeta
           * (glow-up 30-09) — antes el segmentado y su texto flotaban entre
           * dos islas.
           */}
          <section className="space-y-4 rounded-lg border border-border-faint bg-surface p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 className="text-sm font-medium text-fg">
                O elige a mano dónde va
              </h2>
              {/* Con la lectura caída, el resumen que quedó es de ANTES:
                  mostrarlo diría «0 asientos» a quien acaba de registrar la
                  apertura. */}
              {resumen && !falloDeAsientos ? (
                <p
                  className="text-caption text-fg-muted"
                  data-testid="contables-resumen"
                  aria-live="polite"
                >
                  {resumen.total === 0 ? (
                    "Todavía no hay registros contables."
                  ) : (
                    <>
                      Ya cargados:{" "}
                      <span className="font-mono tabular-nums text-fg">
                        {resumen.total}
                      </span>{" "}
                      {resumen.total === 1 ? "asiento" : "asientos"}
                      {resumen.desde && resumen.hasta ? (
                        <>
                          {" "}
                          · del {formatDate(resumen.desde)} al{" "}
                          {formatDate(resumen.hasta)}
                          {resumen.parcial
                            ? ` (fechas de los ${MAX_LIMITE_DE_ASIENTOS} más recientes)`
                            : ""}
                        </>
                      ) : null}
                    </>
                  )}
                </p>
              ) : null}
            </div>
            {/* Revisora r25: a 390 el segmentado se partía en tres renglones («Subir / el libro / diario»); en el
                celular es un Select con las mismas tres opciones. */}
            {enElCelular ? (
              <Select value={camino} onValueChange={(v) => setCamino(v as Camino)}>
                <SelectTrigger aria-label="Cómo cargar los registros" data-testid="camino-en-el-celular">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="apertura">Saldos iniciales</SelectItem>
                  <SelectItem value="historico">Subir el libro diario</SelectItem>
                  <SelectItem value="documentos">Subir los comprobantes</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <SegmentedControl<Camino>
                value={camino}
                onChange={setCamino}
                aria-label="Cómo cargar los registros"
                options={[
                  {
                    value: "apertura",
                    label: (
                      <span className="flex items-center gap-2">
                        <Scales className="h-4 w-4" />
                        Saldos iniciales
                      </span>
                    ),
                  },
                  {
                    value: "historico",
                    // «Subir» y no «migrar»: Nico pasó por acá y no vio que
                    // el archivo se podía subir. El sustantivo del botón tiene
                    // que ser el objeto que la persona tiene en la mano.
                    label: (
                      <span className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        Subir el libro diario
                      </span>
                    ),
                  },
                  {
                    // El tercer camino, y el que el archivo real de la
                    // inmobiliaria necesita: comprobantes SIN líneas por cuenta.
                    // Va aparte del libro diario a propósito — meterlos ahí
                    // serían 116 mil asientos descuadrados.
                    value: "documentos",
                    label: (
                      <span className="flex items-center gap-2">
                        <Receipt className="h-4 w-4" />
                        Subir los comprobantes
                      </span>
                    ),
                  },
                ]}
              />
            )}
            <p className="max-w-2xl text-sm text-fg-muted">
              {camino === "apertura"
                ? "Los saldos de cada cuenta al cierre del año anterior: súbelos o escríbelos."
                : camino === "historico"
                  ? "Los movimientos de este año posteriores a los saldos iniciales, en Excel o CSV."
                  : "Facturas y comprobantes de ingreso y de egreso: van a la ficha de cada contrato, no al libro diario."}
            </p>
          </section>

          {camino === "apertura" ? (
            <AsientoDeApertura
              cuentas={cuentas}
              archivoInicial={archivoPara("apertura")}
              onCreado={() => void cargar()}
              onRevisarCargado={() => void cargar()}
              enElMuro={Boolean(onIrAlPuc)}
              onOcupado={marcarOcupado}
            />
          ) : camino === "historico" ? (
            <MigrarAsientos
              onAplicado={() => {
                void cargar();
                setVersionDeCargas((v) => v + 1);
              }}
              continuar={continuar}
              onDejarDeContinuar={() => setContinuar(null)}
              onIrAlPuc={onIrAlPuc}
              /* El archivo de comprobantes metido en el libro diario tiene su
                 puerta aquí al lado: el aviso la abre en vez de nombrarla. */
              onIrAComprobantes={() => setCamino("documentos")}
              onIrASaldosIniciales={(archivo) => llevarA(archivo, "apertura")}
              archivoInicial={archivoPara("historico")}
              enElMuro={Boolean(onIrAlPuc)}
              onOcupado={marcarOcupado}
            />
          ) : (
            <DocumentosContables
              onOcupado={marcarOcupado}
              archivoInicial={archivoPara("documentos")}
            />
          )}

          {/* 🔴 Juan (15-10-2026): «que traiga la cartera antigua». Aparte de
              los tres caminos: no es un asiento, es la deuda de cada contrato. */}
          <CarteraDelSistemaAnterior bloqueada={ocupado} />
        </>
      )}
    </div>
  );
}

/** Uno de los tres archivos de la guía. */
function PasoDeLaGuia({
  numero,
  icono,
  titulo,
  cuando,
  para,
  etiqueta,
  testid,
}: {
  numero: number;
  icono: ReactNode;
  titulo: string;
  cuando: string;
  para: string;
  etiqueta: string;
  testid: string;
}) {
  return (
    <li className="space-y-1.5 rounded-md bg-surface-muted/60 p-4" data-testid={testid}>
      <div className="flex items-center gap-2 text-fg">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface text-caption font-medium">
          {numero}
        </span>
        {icono}
        <span className="text-caption text-fg-muted">{etiqueta}</span>
      </div>
      <p className="text-sm font-medium text-fg">{titulo}</p>
      <p className="text-caption text-fg-muted">{cuando}</p>
      <p className="text-caption text-fg-muted">{para}</p>
    </li>
  );
}
