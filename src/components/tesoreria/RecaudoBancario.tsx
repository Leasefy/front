'use client';

/**
 * EL RECAUDO POR CONVENIO CON EL BANCO.
 *
 * Nico (17-09): «Recaudo por banco: SÍ, con convenio y archivo de recaudo —
 * cada cuota lleva su referencia única, se importa el archivo del banco y los
 * pagos se aplican en lote que aprueba un funcionario.»
 *
 * ── Las tres cosas que esta pantalla se niega a hacer ───────────────────────
 *
 * 1. **Importar sin vista previa.** Un formato con una posición corrida un
 *    carácter produce 400 líneas en la cola manual y un auxiliar convencido de
 *    que el banco mandó mal el archivo. La previa NO escribe nada y muestra las
 *    primeras cinco líneas leídas para compararlas contra el archivo abierto al
 *    lado.
 * 2. **Decir «importado» cuando no importó.** Si el archivo ya se había subido,
 *    el back responde `yaImportado: true` y no aplica nada; acá se dice con esas
 *    palabras, no con un mensaje de éxito.
 * 3. **Parsear el archivo en el navegador.** El formato vive en la base (cada
 *    banco manda otro) y un parser acá sería una segunda definición del mismo
 *    formato: el día que se separen, la previa mostraría una cosa y se
 *    importaría otra. Acá sólo se lee el texto del archivo.
 *
 * ── 🔴 21-09: LA PANTALLA MANDABA A HACER ALGO QUE NO SE PODÍA HACER ────────
 *
 * Nico: «no se entiende nada qué tiene que hacer el usuario ni qué ver».
 *
 * Sin convenios, la pantalla eran cuatro párrafos de prosa, DOS cajas de texto
 * que decían casi lo mismo —«No hay convenios configurados todavía» y «Todavía
 * no tienes ningún convenio de recaudo activo. Configúralo…»— y **ni un solo
 * botón**. El back tenía `POST /convenios` desde siempre y el cliente del front
 * tenía `crearConvenio` escrito, sin un solo llamador: la pantalla mandaba a
 * configurar algo que no existía en ninguna parte del producto.
 *
 * Ahora el vacío es UNA frase y UNA acción («Configurar el convenio»), que abre
 * `ConvenioDeRecaudoCajon`; con convenios guardados, cada uno se puede editar y
 * hay botón para agregar otro. Y la explicación de cómo funciona el recaudo por
 * convenio se fue detrás de un botón (`ParaEntenderMas`), que es la regla de la
 * casa: puesta sobre la pantalla, empuja lo que la persona vino a hacer.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import Link from 'next/link';
import { Bank, CheckCircle, Plus, UploadSimple, WarningOctagon } from '@phosphor-icons/react';
import { Appear } from '@leasefy/cadence';

import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { TarjetaDeArchivo } from '@/components/migracion/TarjetaDeArchivo';
import { ZonaDeArchivo } from '@/components/migracion/ZonaDeArchivo';
import { Avisos, SinLaMigracion, TituloDeBloque } from '@/components/finanzas/piezas';
import { ConvenioDeRecaudoCajon } from './ConvenioDeRecaudoCajon';
import { ConciliacionDelArchivo } from './ConciliacionDelArchivo';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { diaLegible } from '@/components/cobros/extracto-bancario/formato';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/toast';
import { tesoreriaApi } from '@/lib/api/tesoreria.service';
import { leerPlanilla, type PlanillaLeida } from '@/lib/importar/leer-planilla';
import {
  CAMPOS_DEL_RECAUDO,
  armarFilasDelRecaudo,
  esPlanilla,
  type CampoDelRecaudo,
} from '@/lib/tesoreria/recaudo-desde-planilla';
import type { Mapeo } from '@/lib/importar/reconocer-columnas';
import type {
  FilaDePlanillaDelRecaudo,
  ArchivoDeRecaudo,
  Convenio,
  ListaDeConvenios,
  PreviaDelRecaudo,
  ResultadoDeImportar,
} from '@/lib/api/tesoreria.types';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import { contar } from '@/lib/texto/plural';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';

/** El tope del back (4 MB): se dice antes de subir, no después del 400. */
const TOPE_BYTES = 4_000_000;

export function RecaudoBancarioPanel() {
  const [datos, setDatos] = useState<ListaDeConvenios | null>(null);
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState<unknown>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setFallo(null);
    try {
      setDatos(await tesoreriaApi.listarConvenios());
    } catch (error) {
      setFallo(error);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return (
    <div className="space-y-8">
      {/* 🔴 (20-10-2026) Releer después de importar NO vuelve al esqueleto: eso
          desmontaba la pantalla y se perdían el resultado y la conciliación del
          archivo recién importado (el mismo error que tenía Configuración). */}
      <EstadoDeDatos
        cargando={cargando && !datos}
        error={datos ? null : fallo}
        queEs="los convenios de recaudo"
        onReintentar={cargar}
      >
        {datos ? <Contenido datos={datos} onCambio={cargar} /> : null}
      </EstadoDeDatos>
    </div>
  );
}

function Contenido({ datos, onCambio }: { datos: ListaDeConvenios; onCambio: () => void }) {
  const activos = datos.convenios.filter((c) => c.activo);
  /** `null` = cerrado · `'nuevo'` = crear · un convenio = editarlo. */
  const [enElCajon, setEnElCajon] = useState<null | 'nuevo' | Convenio>(null);
  /** El archivo cuya conciliación se está mirando (el recién importado o uno de la lista). */
  const [archivoAbierto, setArchivoAbierto] = useState<string | null>(null);
  /** Sube cada vez que se importa o concilia algo: la lista de archivos se vuelve a leer. */
  const [version, setVersion] = useState(0);
  const conciliacion = useRef<HTMLDivElement>(null);
  const abrir = (id: string) => {
    setArchivoAbierto(id);
    requestAnimationFrame(() => conciliacion.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  return (
    <div className="space-y-8">
      {!datos.disponible ? (
        <SinLaMigracion
          motivo={datos.motivo}
          queSeEspera="guardar el convenio de recaudo ni importar el archivo del banco"
          testId="recaudo-sin-migracion"
        />
      ) : null}

      {/* 🔴 UN vacío y UNA acción. Eran dos cajas de texto que decían casi lo
          mismo y ningún botón, mandando a configurar algo que no se podía
          configurar. */}
      {datos.convenios.length === 0 ? (
        <section
          className="rounded-lg border border-dashed border-border bg-surface p-10 text-center"
          data-testid="sin-convenio"
        >
          <Bank className="mx-auto mb-4 h-10 w-10 text-fg-muted" aria-hidden="true" />
          <h2 className="text-base font-semibold text-fg">
            Todavía no recaudas por convenio con un banco
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-fg-muted">
            Con un convenio, el archivo de recaudo de tu banco entra acá y cada pago se cruza
            solo con su inquilino (por la referencia o por la cédula). Te ayudamos a
            configurarlo: elige tu banco o sube un archivo de ejemplo.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <Button
              hideArrow
              disabled={!datos.disponible}
              onClick={() => setEnElCajon('nuevo')}
              data-testid="configurar-convenio"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Configurar el convenio
            </Button>
          </div>
          {/* La salida que ya existe hoy, dicha sin competir con la acción. */}
          <p className="mt-4 text-xs text-fg-muted">
            Mientras no lo tengas, la plata se sigue aplicando cargando el extracto en{' '}
            <Link
              href="/panel/inmobiliaria/pagos/recaudo"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Conciliación
            </Link>
            .
          </p>
        </section>
      ) : (
        <ConveniosGuardados
          convenios={datos.convenios}
          onEditar={setEnElCajon}
          onNuevo={() => setEnElCajon('nuevo')}
          sePuedeGuardar={datos.disponible}
        />
      )}

      {activos.length > 0 && datos.disponible ? (
        <ImportarArchivo
          convenios={activos}
          onImportado={(archivoId) => {
            onCambio();
            setVersion((v) => v + 1);
            abrir(archivoId);
          }}
        />
      ) : datos.convenios.length > 0 && datos.disponible ? (
        /* Hay convenios pero ninguno activo: es otro estado y otra frase. */
        <p
          className="rounded-lg border border-border bg-surface p-5 text-sm text-fg-muted"
          data-testid="sin-convenio-activo"
        >
          Ninguno de tus convenios está activo, así que todavía no se puede importar un
          archivo. Actívalo desde su tarjeta.
        </p>
      ) : null}

      {/* 🔴 La conciliación del archivo, como la pidió Vale (20-10-2026). */}
      {archivoAbierto && datos.disponible ? (
        <div ref={conciliacion} className="scroll-mt-24">
          <ConciliacionDelArchivo archivoId={archivoAbierto} onCambio={() => setVersion((v) => v + 1)} />
        </div>
      ) : null}

      {datos.disponible && datos.convenios.length > 0 ? (
        <ArchivosImportados version={version} abierto={archivoAbierto} onAbrir={abrir} />
      ) : null}

      <ConvenioDeRecaudoCajon
        abierto={enElCajon}
        catalogo={datos}
        onCerrar={() => setEnElCajon(null)}
        onGuardado={onCambio}
      />
    </div>
  );
}

function ConveniosGuardados({
  convenios,
  onEditar,
  onNuevo,
  sePuedeGuardar,
}: {
  convenios: Convenio[];
  onEditar: (c: Convenio) => void;
  onNuevo: () => void;
  sePuedeGuardar: boolean;
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-fg">Tus convenios de recaudo</h2>
          <p className="mt-1 max-w-2xl text-sm text-fg-muted">
            Con qué bancos recaudas y cómo se lee el archivo de cada uno.
          </p>
        </div>
        <Button
          variant="outline"
          hideArrow
          disabled={!sePuedeGuardar}
          onClick={onNuevo}
          data-testid="nuevo-convenio"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Otro convenio
        </Button>
      </div>
      {convenios.length === 0 ? (
        <p className="rounded-lg border border-border bg-surface p-5 text-sm text-fg-muted">
          No hay convenios configurados todavía.
        </p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2" data-testid="convenios">
          {convenios.map((c) => (
            <li
              key={c.id}
              className="space-y-3 rounded-lg border border-border bg-surface p-5"
              data-testid={`convenio-${c.id}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-fg">{c.nombre}</p>
                  <p className="text-sm text-fg-muted">
                    {c.banco} · convenio {c.codigo}
                  </p>
                </div>
                <Badge variant={c.activo ? 'success' : 'outline'}>
                  {c.activo ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>
              <dl className="grid grid-cols-2 gap-2 text-xs text-fg-muted">
                <div>
                  <dt className="text-fg">Formato</dt>
                  <dd>
                    {c.tipo === 'ANCHO_FIJO'
                      ? 'Ancho fijo'
                      : `Delimitado por «${c.separador ?? ''}»`}
                  </dd>
                </div>
                <div>
                  <dt className="text-fg">Fecha</dt>
                  <dd>{c.formatoDeFecha}</dd>
                </div>
                <div>
                  <dt className="text-fg">Valor</dt>
                  <dd>{c.decimales === 0 ? 'en pesos' : `con ${c.decimales} decimales`}</dd>
                </div>
                <div>
                  <dt className="text-fg">Dígito de verificación</dt>
                  <dd>{c.referenciaDv === 'NINGUNO' ? 'sin dígito' : c.referenciaDv}</dd>
                </div>
                {/* 🔴 (18-09) Una cuenta tiene UN camino de entrada. Se muestra
                    acá porque marcarla como «por archivo» deja de aceptar su
                    extracto, y eso no puede ser una sorpresa. */}
                <div>
                  <dt className="text-fg">Cuenta que recauda</dt>
                  <dd>{c.cuentaBancaria ?? 'sin declarar'}</dd>
                </div>
                <div>
                  <dt className="text-fg">Entra por</dt>
                  <dd>{c.viaDeEntradaNombre}</dd>
                </div>
              </dl>
              {/* 🔴 El ejemplo es lo que permite comparar contra el volante que
                  entregó el banco SIN importar un archivo. */}
              <p className="rounded border border-border bg-bg p-3 text-xs text-fg-muted">
                El contrato <span className="font-mono">1850</span> pagaría con la referencia{' '}
                <span className="font-mono text-fg">{c.ejemploDeReferencia}</span>. Compárala con
                el volante que te dio el banco antes de imprimirla en los recibos.
              </p>
              <Avisos avisos={c.avisos} testId={`avisos-convenio-${c.id}`} />
              {/* Se puede cambiar: un formato copiado del papel del banco casi
                  nunca queda bien la primera vez, y hasta hoy no había cómo. */}
              <Button
                variant="outline"
                size="sm"
                hideArrow
                disabled={!sePuedeGuardar}
                onClick={() => onEditar(c)}
                data-testid={`editar-convenio-${c.id}`}
              >
                Cambiar el formato
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * Los archivos ya importados, para volver a la conciliación de cualquiera:
 * Vale sube uno por día y al otro día quiere ver qué quedó por conciliar.
 */
function ArchivosImportados({
  version,
  abierto,
  onAbrir,
}: {
  version: number;
  abierto: string | null;
  onAbrir: (id: string) => void;
}) {
  const [archivos, setArchivos] = useState<ArchivoDeRecaudo[] | null>(null);
  const [fallo, setFallo] = useState<unknown>(null);
  const cargar = useCallback(async () => {
    setFallo(null);
    try {
      setArchivos((await tesoreriaApi.listarArchivos(30)).archivos);
    } catch (error) {
      setFallo(error);
    }
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar, version]);

  if (archivos && archivos.length === 0) return null;
  return (
    <section className="space-y-3" data-testid="archivos-importados">
      <div>
        <h2 className="text-base font-semibold text-fg">Archivos importados</h2>
        <p className="mt-1 text-body-sm text-fg-muted">
          Abre uno para ver qué quedó conciliado, qué falta y por qué.
        </p>
      </div>
      <EstadoDeDatos cargando={archivos === null && !fallo} error={archivos ? null : fallo} queEs="los archivos importados" onReintentar={cargar}>
        {archivos ? (
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Importado</TableHead>
                  <TableHead>Archivo</TableHead>
                  <TableHead>Banco</TableHead>
                  <TableHead className="text-right">Pagos</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {archivos.map((a) => (
                  <TableRow key={a.id} data-testid={`archivo-${a.id}`} data-state={abierto === a.id ? 'selected' : undefined}>
                    <TableCell className="whitespace-nowrap">{diaLegible(a.createdAt)}</TableCell>
                    <TableCell className="max-w-[18rem] truncate" title={a.nombre}>
                      {a.nombre}
                    </TableCell>
                    <TableCell>{a.banco ?? '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">{a.filasValidas + a.filasRechazadas}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{formatCurrency(a.totalCop)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant={abierto === a.id ? 'secondary' : 'outline'}
                        hideArrow
                        onClick={() => onAbrir(a.id)}
                        data-testid={`ver-archivo-${a.id}`}
                      >
                        {abierto === a.id ? 'Abierto' : 'Ver conciliación'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : null}
      </EstadoDeDatos>
    </section>
  );
}

function ImportarArchivo({
  convenios,
  onImportado,
}: {
  convenios: Convenio[];
  onImportado: (archivoId: string) => void;
}) {
  const [convenioId, setConvenioId] = useState(convenios[0]?.id ?? '');
  const [nombre, setNombre] = useState('');
  /** Peso del archivo elegido, para la tarjeta (`null` = todavía no hay archivo). */
  const [peso, setPeso] = useState<number | null>(null);
  /** El texto del banco, o las filas de una planilla (Excel o CSV, 20-10-2026). */
  const [contenido, setContenido] = useState<string | FilaDePlanillaDelRecaudo[]>('');
  const [planilla, setPlanilla] = useState<{
    leida: PlanillaLeida<CampoDelRecaudo>;
    mapeo: Mapeo<CampoDelRecaudo>;
    sinArmar: { linea: number; motivo: string }[];
  } | null>(null);
  const [previa, setPrevia] = useState<PreviaDelRecaudo | null>(null);
  const [resultado, setResultado] = useState<ResultadoDeImportar | null>(null);
  const [leyendo, setLeyendo] = useState(false);
  const [importando, setImportando] = useState(false);
  /**
   * 🔴 Suelta el archivo y TODO lo que se derivó de él (Nico, 10-09: la tarjeta
   * con «Subir otro» y «Descartar»). Es el mismo camino al reemplazarlo: así la
   * previa del archivo anterior nunca queda pegada al nombre del nuevo.
   */
  const descartar = () => {
    setNombre('');
    setPeso(null);
    setContenido('');
    setPlanilla(null);
    setPrevia(null);
    setResultado(null);
  };

  const elegir = async (archivo: File) => {
    if (archivo.size > TOPE_BYTES) {
      toast.error(
        `El archivo pesa ${(archivo.size / 1_000_000).toFixed(1)} MB y el tope son 4 MB. Pídele a tu banco el archivo del período, no el del año.`,
      );
      return;
    }
    descartar();
    setLeyendo(true);
    try {
      setNombre(archivo.name);
      setPeso(archivo.size);
      const delimitado = convenios.find((c) => c.id === convenioId)?.tipo === 'DELIMITADO';
      if (esPlanilla(archivo.name, delimitado)) {
        // 🔴 Un Excel o un CSV: se reconocen sus columnas y viajan las filas.
        const leida = await leerPlanilla(archivo, CAMPOS_DEL_RECAUDO);
        await leerConMapeo(leida, leida.mapeo, archivo.name);
      } else {
        const texto = await archivo.text();
        setContenido(texto);
        setPrevia(await tesoreriaApi.previa(texto, archivo.name, convenioId || undefined));
      }
    } catch (error) {
      // El 400 del formato trae su motivo en palabras; un 5xx dice que fue
      // nuestro, con la referencia; sólo sin respuesta se habla de la conexión.
      toast.error(
        mensajeParaLaPersona(error, {
          porDefecto: 'No se pudo leer el archivo con el formato de este convenio.',
          accion: 'leer el archivo con el formato del convenio',
        }),
      );
    } finally {
      setLeyendo(false);
    }
  };

  /** Arma las filas con las columnas elegidas y pide la vista previa al back. */
  const leerConMapeo = async (
    leida: PlanillaLeida<CampoDelRecaudo>,
    mapeo: Mapeo<CampoDelRecaudo>,
    nombreDelArchivo = nombre,
  ) => {
    const armadas = armarFilasDelRecaudo(leida.filas, mapeo, leida.filaDeEncabezado);
    setPlanilla({ leida, mapeo, sinArmar: armadas.sinArmar });
    setContenido(armadas.filas);
    setPrevia(
      armadas.filas.length > 0
        ? await tesoreriaApi.previa(armadas.filas, nombreDelArchivo, convenioId || undefined)
        : null,
    );
  };

  const cambiarColumna = async (campo: CampoDelRecaudo, columna: string) => {
    if (!planilla) return;
    const mapeo = { ...planilla.mapeo, [campo]: columna === '—' ? undefined : columna };
    setLeyendo(true);
    try {
      await leerConMapeo(planilla.leida, mapeo);
    } catch (error) {
      toast.error(mensajeParaLaPersona(error, { porDefecto: 'No se pudo volver a leer la planilla.', accion: 'leer la planilla' }));
    } finally {
      setLeyendo(false);
    }
  };

  const importar = async () => {
    setImportando(true);
    try {
      const r = await tesoreriaApi.importar(contenido, nombre, convenioId || undefined);
      setResultado(r);
      onImportado(r.archivo.id);
      if (r.yaImportado) {
        toast.info('Este archivo ya se había importado: no se aplicó nada.');
      } else {
        const solos = conciliadosAlImportar(r);
        toast.success(
          `${contar(r.archivo.nuevas, 'pago nuevo', 'pagos nuevos')}. ${
            solos > 0
              ? solos === 1
                ? 'Se concilió solo 1 pago y salió su recibo.'
                : `Se conciliaron solos ${contar(solos, 'pago')} y salieron sus recibos.`
              : 'Ninguno se pudo conciliar solo: abajo ves por qué, línea por línea.'
          }`,
        );
      }
    } catch (error) {
      toast.error(
        mensajeParaLaPersona(error, {
          porDefecto: 'No se pudo importar el archivo.',
          accion: 'importar el archivo',
        }),
      );
    } finally {
      setImportando(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop: (aceptados: File[]) => {
      if (aceptados[0]) void elegir(aceptados[0]);
    },
    onDropRejected: () =>
      toast.error('Ese archivo no se puede leer acá: sube el de texto del banco (.txt, .dat, .asc), un Excel o un CSV.'),
    multiple: false,
    maxFiles: 1,
    disabled: leyendo || importando,
    accept: {
      'text/plain': ['.txt', '.dat', '.asc', '.prn'],
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.ms-excel.sheet.macroEnabled.12': ['.xlsm'],
      'application/vnd.oasis.opendocument.spreadsheet': ['.ods'],
    },
  });

  /** La segunda línea de la tarjeta: qué se leyó del archivo. */
  const detalleDelArchivo = leyendo
    ? 'Leyendo…'
    : planilla
      ? `Hoja «${planilla.leida.hoja}» · ${contar(planilla.leida.filas.length, 'fila')}`
      : previa
        ? contar(previa.lineas, 'línea')
        : undefined;

  return (
    <section className="space-y-4">
      <TituloDeBloque
        titulo="Importar el archivo del banco"
        explicacion="Cada línea se vuelve un movimiento bancario. Lo que se identifica sin dudas (la referencia del contrato o la cédula de un inquilino con un solo contrato, y el valor exacto de una cuota) se concilia solo y sale su recibo de caja; lo demás queda por conciliar con su razón. Lo de antes de facturar en Leasefy se omite. Si la cuenta de este convenio entra por EXTRACTO, su archivo no se importa: el mismo pago quedaría dos veces."
      />

      <div className="space-y-4 rounded-lg border border-border bg-surface p-5">
        {convenios.length > 1 ? (
          <div className="space-y-1.5">
            <Label htmlFor="convenio">Con qué convenio se lee</Label>
            <Select value={convenioId} onValueChange={setConvenioId}>
              <SelectTrigger id="convenio" data-testid="elegir-convenio">
                <SelectValue placeholder="Elige el convenio" />
              </SelectTrigger>
              <SelectContent>
                {convenios.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.banco} · {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <div className="space-y-1.5">
          <p className="text-body-sm font-medium text-fg">El archivo, tal como lo bajaste del banco</p>
          {nombre ? (
            <TarjetaDeArchivo
              nombre={nombre}
              peso={peso ?? undefined}
              detalle={detalleDelArchivo}
              inputProps={getInputProps()}
              inputTestid="archivo-de-recaudo"
              onSubirOtro={open}
              onDescartar={descartar}
              ocupado={leyendo || importando}
              testid="archivo-elegido"
            />
          ) : (
            <ZonaDeArchivo
              rootProps={getRootProps()}
              inputProps={getInputProps()}
              activo={isDragActive}
              testid="zona-del-recaudo"
              inputTestid="archivo-de-recaudo"
              titulo="Arrastra el archivo del banco o haz clic para elegirlo"
              detalle="El de texto (ancho fijo o delimitado) se lee con el formato del convenio. Un Excel o un CSV también: reconocemos sus columnas y te mostramos cuál tomamos para cada dato. Nada se importa hasta que lo confirmes."
            />
          )}
        </div>

        {leyendo ? (
          <p className="text-sm text-fg-muted" role="status">
            Leyendo el archivo con el formato del convenio…
          </p>
        ) : null}

        {/* Movimiento (ola 2, 03-10-2026): la vista previa del archivo y el
            resultado de importarlo ENTRAN (fundido y 4 px); otro archivo leído
            es otra vista previa, y vuelve a entrar. */}
        {planilla ? (
          <div className="space-y-2 rounded-md border border-border bg-bg p-3" data-testid="columnas-de-la-planilla">
            <p className="text-body-sm font-medium text-fg">
              Leímos «{planilla.leida.hoja}»: {contar(planilla.leida.filas.length, 'fila')}. Esta es la columna de cada
              dato; cámbiala si no es.
            </p>
            <div className="grid gap-2 sm:grid-cols-3">
              {CAMPOS_DEL_RECAUDO.map((c) => (
                <div key={c.campo} className="space-y-1">
                  <Label className="text-caption">
                    {c.etiqueta}
                    {c.requerido ? null : <span className="text-fg-muted"> (opcional)</span>}
                  </Label>
                  <Select value={planilla.mapeo[c.campo] ?? '—'} onValueChange={(v) => void cambiarColumna(c.campo, v)}>
                    <SelectTrigger data-testid={`columna-${c.campo}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="—">— No está —</SelectItem>
                      {planilla.leida.encabezados.map((e) => (
                        <SelectItem key={e} value={e}>
                          {e}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            {planilla.sinArmar.length > 0 ? (
              <div className="text-caption text-warning" data-testid="filas-sin-armar">
                <p>
                  {contar(planilla.sinArmar.length, 'fila no trae', 'filas no traen')} referencia o valor: no se
                  importan.
                </p>
                <ul className="mt-1 space-y-0.5">
                  {planilla.sinArmar.slice(0, 5).map((f) => (
                    <li key={f.linea}>
                      Fila {f.linea}: {f.motivo}
                    </li>
                  ))}
                  {planilla.sinArmar.length > 5 ? <li>y {contar(planilla.sinArmar.length - 5, 'más', 'más')}.</li> : null}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}

        {previa ? (
          <Appear key={`${previa.lineas}|${previa.validas}|${previa.totalCop}`} distance="xs">
            <Previa previa={previa} />
          </Appear>
        ) : null}

        {previa && previa.validas > 0 && previa.puedeImportarse ? (
          <Button
            onClick={() => void importar()}
            disabled={importando}
            data-testid="importar-recaudo"
          >
            <UploadSimple className="h-4 w-4" aria-hidden="true" />
            {importando
              ? 'Importando…'
              : `Importar ${contar(previa.validas, 'pago')} por ${formatCurrency(previa.totalCop)}`}
          </Button>
        ) : null}

        {resultado ? (
          <Appear distance="xs">
            <Resultado resultado={resultado} />
          </Appear>
        ) : null}
      </div>
    </section>
  );
}

function Previa({ previa }: { previa: PreviaDelRecaudo }) {
  return (
    <div className="space-y-3" data-testid="previa-del-recaudo">
      {previa.yaImportado ? (
        <div
          className="flex gap-2 rounded-lg border border-warning/40 bg-warning-soft p-3 text-sm text-fg"
          role="status"
          data-testid="ya-importado"
        >
          <WarningOctagon className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
          <span>
            Este archivo ya se importó el {diaLegible(previa.yaImportado.createdAt)} como «
            {previa.yaImportado.nombre}» ({contar(previa.yaImportado.nuevas, 'movimiento nuevo', 'movimientos nuevos')}).
            Volver a subirlo no va a aplicar nada.
          </span>
        </div>
      ) : null}

      <Avisos avisos={previa.avisos} testId="avisos-de-la-previa" />

      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        {[
          ['Líneas', String(previa.lineas)],
          ['Se leyeron', String(previa.validas)],
          ['Se saltaron', String(previa.omitidas)],
          ['Total', formatCurrency(previa.totalCop)],
        ].map(([etiqueta, valor]) => (
          <div key={etiqueta} className="rounded border border-border bg-bg p-3">
            <dt className="text-xs text-fg-muted">{etiqueta}</dt>
            <dd className="font-mono tabular-nums text-fg">{valor}</dd>
          </div>
        ))}
      </dl>

      {previa.muestra.length > 0 ? (
        <div className="overflow-x-auto rounded border border-border">
          <table className="w-full text-sm" data-testid="muestra-del-recaudo">
            <caption className="p-2 text-left text-xs text-fg-muted">
              Las primeras líneas, leídas con este formato. Compáralas contra el archivo abierto
              al lado: si una columna está corrida, se ve acá y no después de importar.
            </caption>
            <thead className="bg-bg text-xs text-fg-muted">
              <tr>
                <th className="p-2 text-left">Línea</th>
                <th className="p-2 text-left">Referencia</th>
                <th className="p-2 text-right">Valor</th>
                <th className="p-2 text-left">Fecha</th>
                <th className="p-2 text-left">Secuencia</th>
              </tr>
            </thead>
            <tbody>
              {previa.muestra.map((f) => (
                <tr key={f.linea} className="border-t border-border">
                  <td className="p-2 text-fg-muted">{f.linea}</td>
                  <td className="p-2 font-mono">
                    {f.nucleo}
                    {f.dvValido ? null : (
                      <span className="ml-2 text-warning">dígito no cuadra</span>
                    )}
                  </td>
                  <td className="p-2 text-right font-mono tabular-nums">
                    {formatCurrency(f.valorCop)}
                  </td>
                  <td className="whitespace-nowrap p-2">{f.fecha ? diaLegible(f.fecha) : '—'}</td>
                  <td className="p-2 text-fg-muted">{f.secuencia ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {previa.rechazadas.length > 0 ? (
        <Rechazadas rechazadas={previa.rechazadas} />
      ) : null}
    </div>
  );
}

function Rechazadas({
  rechazadas,
}: {
  rechazadas: PreviaDelRecaudo['rechazadas'];
}) {
  return (
    <div className="space-y-2 rounded-lg border border-warning/40 bg-warning-soft p-3 text-sm">
      <p className="font-medium text-fg">
        {rechazadas.length === 1 ? '1 línea no se pudo leer' : `${contar(rechazadas.length, 'línea')} no se pudieron leer`}. Las demás entran igual.
      </p>
      <ul className="space-y-2" data-testid="lineas-rechazadas">
        {rechazadas.slice(0, 10).map((r) => (
          <li key={r.linea} className="space-y-0.5">
            <p className="text-fg">Línea {r.linea}: {r.motivo}</p>
            <p className="truncate font-mono text-xs text-fg-muted">{r.crudo}</p>
          </li>
        ))}
      </ul>
      {rechazadas.length > 10 ? (
        <p className="text-xs text-fg-muted">
          Y {rechazadas.length - 10} más. Están todas en el detalle del archivo, con su texto
          crudo, para poder reclamárselas al banco.
        </p>
      ) : null}
    </div>
  );
}

/**
 * Cuántos pagos se conciliaron de verdad al importar: los del lote que SÍ se
 * aprobaron (no su `estado`: un lote «APROBADO» puede haber mandado todo a la
 * cola, QA 20-10-2026) y los que se identificaron por la cédula.
 */
export function conciliadosAlImportar(r: ResultadoDeImportar): number {
  const delLote = r.lote?.estado === 'APROBADO' ? (r.lote.conciliados ?? r.lote.cantidad) : 0;
  return delLote + (r.conciliadosSolos ?? 0);
}

function Resultado({ resultado }: { resultado: ResultadoDeImportar }) {
  const { archivo, lote } = resultado;
  const solos = conciliadosAlImportar(resultado);
  return (
    <div
      className="space-y-3 rounded-lg border border-border bg-bg p-4 text-sm"
      data-testid="resultado-de-importar"
      role="status"
    >
      <p className="flex items-center gap-2 font-medium text-fg">
        {resultado.yaImportado ? (
          <>
            <WarningOctagon className="h-4 w-4 text-warning" aria-hidden="true" />
            Este archivo ya se había importado: no se aplicó nada.
          </>
        ) : (
          <>
            <CheckCircle className="h-4 w-4 text-success" aria-hidden="true" />
            «{archivo.nombre}» importado.
          </>
        )}
      </p>
      <ul className="space-y-1 text-fg-muted">
        <li>{contar(archivo.nuevas, 'pago nuevo', 'pagos nuevos')}.</li>
        {archivo.repetidas - (resultado.antesDelCorte ?? 0) > 0 ? (
          <li>
            {archivo.repetidas - (resultado.antesDelCorte ?? 0)} ya estaban registrados (el banco manda el mes
            corrido: el archivo de fin de mes se pisa con el de la quincena).
          </li>
        ) : null}
        {resultado.antesDelCorte ? (
          <li data-testid="antes-del-corte">
            {contar(resultado.antesDelCorte, 'pago es', 'pagos son')} de antes de que facturaras en Leasefy: se
            omitieron.
          </li>
        ) : null}
        <li>{contar(archivo.filasRechazadas, 'línea rechazada', 'líneas rechazadas')}.</li>
      </ul>
      {solos > 0 ? (
        /* 🔴 Nico (20-10-2026): lo que cruza sin error se concilia solo, con el recibo al instante. */
        <p className="text-fg" data-testid="conciliados-al-instante">
          {solos === 1
            ? 'Se concilió solo 1 pago y salió su recibo de caja.'
            : `Se conciliaron solos ${contar(solos, 'pago')} y salieron sus recibos de caja.`}{' '}
          Lo que no (otro valor, una
          cédula con varios contratos, una referencia desconocida, una fecha que no cuadra) quedó en la{' '}
          <Link
            href="/panel/inmobiliaria/pagos/recaudo"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            cola de Conciliación
          </Link>{' '}
          con su razón.
        </p>
      ) : lote && lote.estado !== 'APROBADO' ? (
        <p className="text-fg">
          Se armó un lote de {contar(lote.cantidad, 'pago')} por {formatCurrency(lote.totalCop)} que{' '}
          <Link
            href="/panel/inmobiliaria/pagos/recaudo"
            className="font-medium text-primary underline-offset-4 hover:underline"
            data-testid="ir-al-lote"
          >
            espera tu aprobación en Conciliación
          </Link>
          . Hasta que alguien lo apruebe no se emitió ningún recibo.
        </p>
      ) : (
        <p className="text-fg-muted">
          Ninguno se pudo conciliar solo. Abajo, en la conciliación del archivo, cada línea dice por qué y se puede
          conciliar con un toque.
        </p>
      )}
      <Avisos avisos={resultado.avisos} testId="avisos-del-resultado" />
    </div>
  );
}
