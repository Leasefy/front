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
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CheckCircle, UploadSimple, WarningOctagon } from '@phosphor-icons/react';

import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { Avisos, SinLaMigracion, TituloDeBloque } from '@/components/finanzas/piezas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/toast';
import { tesoreriaApi } from '@/lib/api/tesoreria.service';
import type {
  Convenio,
  ListaDeConvenios,
  PreviaDelRecaudo,
  ResultadoDeImportar,
} from '@/lib/api/tesoreria.types';
import { formatCurrency } from '@/lib/types/inmobiliaria';

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
      <EstadoDeDatos
        cargando={cargando}
        error={fallo}
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
  return (
    <div className="space-y-8">
      {!datos.disponible ? (
        <SinLaMigracion
          motivo={datos.motivo}
          queSeEspera="guardar el convenio de recaudo ni importar el archivo del banco"
          testId="recaudo-sin-migracion"
        />
      ) : null}

      <ConveniosGuardados convenios={datos.convenios} />

      {activos.length > 0 && datos.disponible ? (
        <ImportarArchivo convenios={activos} onImportado={onCambio} />
      ) : datos.disponible ? (
        <p
          className="rounded-lg border border-border bg-surface p-5 text-sm text-fg-muted"
          data-testid="sin-convenio"
        >
          Todavía no tienes ningún convenio de recaudo activo. Configúralo con el diseño de
          registro que te entregó tu banco y después podrás importar su archivo acá. Mientras
          tanto el camino sigue siendo cargar el extracto en{' '}
          <Link
            href="/panel/inmobiliaria/pagos/recaudo"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Conciliación
          </Link>
          .
        </p>
      ) : null}
    </div>
  );
}

function ConveniosGuardados({ convenios }: { convenios: Convenio[] }) {
  return (
    <section className="space-y-4">
      <TituloDeBloque
        titulo="Tus convenios de recaudo"
        explicacion="Con qué bancos recaudas y cómo se lee el archivo de cada uno. El formato es un dato y no código: ningún banco manda el mismo archivo, y el tuyo viene en el diseño de registro que firmaste con ellos."
      />
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
              </dl>
              {/* 🔴 El ejemplo es lo que permite comparar contra el volante que
                  entregó el banco SIN importar un archivo. */}
              <p className="rounded border border-border bg-bg p-3 text-xs text-fg-muted">
                El contrato <span className="font-mono">1850</span> pagaría con la referencia{' '}
                <span className="font-mono text-fg">{c.ejemploDeReferencia}</span>. Compárala con
                el volante que te dio el banco antes de imprimirla en los recibos.
              </p>
              <Avisos avisos={c.avisos} testId={`avisos-convenio-${c.id}`} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ImportarArchivo({
  convenios,
  onImportado,
}: {
  convenios: Convenio[];
  onImportado: () => void;
}) {
  const [convenioId, setConvenioId] = useState(convenios[0]?.id ?? '');
  const [nombre, setNombre] = useState('');
  const [contenido, setContenido] = useState('');
  const [previa, setPrevia] = useState<PreviaDelRecaudo | null>(null);
  const [resultado, setResultado] = useState<ResultadoDeImportar | null>(null);
  const [leyendo, setLeyendo] = useState(false);
  const [importando, setImportando] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const elegir = async (archivo: File) => {
    if (archivo.size > TOPE_BYTES) {
      toast.error(
        `El archivo pesa ${(archivo.size / 1_000_000).toFixed(1)} MB y el tope son 4 MB. Pídele a tu banco el archivo del período, no el del año.`,
      );
      return;
    }
    setLeyendo(true);
    setResultado(null);
    setPrevia(null);
    try {
      const texto = await archivo.text();
      setNombre(archivo.name);
      setContenido(texto);
      setPrevia(await tesoreriaApi.previa(texto, archivo.name, convenioId || undefined));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'No se pudo leer el archivo con el formato de este convenio.',
      );
    } finally {
      setLeyendo(false);
    }
  };

  const importar = async () => {
    setImportando(true);
    try {
      const r = await tesoreriaApi.importar(contenido, nombre, convenioId || undefined);
      setResultado(r);
      onImportado();
      if (r.yaImportado) {
        toast.info('Este archivo ya se había importado: no se aplicó nada.');
      } else {
        toast.success(
          `${r.archivo.nuevas} movimiento(s) nuevos. ${r.lote ? `Hay un lote de ${r.lote.cantidad} pago(s) esperando aprobación.` : 'Ninguno calzó exacto: quedaron en la cola manual.'}`,
        );
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'No se pudo importar el archivo.',
      );
    } finally {
      setImportando(false);
    }
  };

  return (
    <section className="space-y-4">
      <TituloDeBloque
        titulo="Importar el archivo del banco"
        explicacion="Cada línea se vuelve un movimiento bancario y entra al MISMO lote de lo que calza exacto que ya apruebas en Conciliación. Esta pantalla no emite ningún recibo: los emite quien aprueba el lote."
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
          <Label htmlFor="archivo-de-recaudo">El archivo, tal como lo bajaste del banco</Label>
          <Input
            ref={input}
            id="archivo-de-recaudo"
            type="file"
            accept=".txt,.csv,.dat,text/plain,text/csv"
            data-testid="archivo-de-recaudo"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void elegir(f);
            }}
          />
          <p className="text-xs text-fg-muted">
            No se convierte ni se abre en Excel: se sube tal cual. El formato lo pone el
            convenio.
          </p>
        </div>

        {leyendo ? (
          <p className="text-sm text-fg-muted" role="status">
            Leyendo el archivo con el formato del convenio…
          </p>
        ) : null}

        {previa ? <Previa previa={previa} /> : null}

        {previa && previa.validas > 0 ? (
          <Button
            onClick={() => void importar()}
            disabled={importando}
            data-testid="importar-recaudo"
          >
            <UploadSimple className="h-4 w-4" aria-hidden="true" />
            {importando
              ? 'Importando…'
              : `Importar ${previa.validas} pago(s) por ${formatCurrency(previa.totalCop)}`}
          </Button>
        ) : null}

        {resultado ? <Resultado resultado={resultado} /> : null}
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
            Este archivo ya se importó el {previa.yaImportado.createdAt.slice(0, 10)} como «
            {previa.yaImportado.nombre}» ({previa.yaImportado.nuevas} movimiento(s) nuevos).
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
                  <td className="p-2">{f.fecha ?? '—'}</td>
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
        {rechazadas.length} línea(s) no se pudieron leer. Las demás entran igual.
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

function Resultado({ resultado }: { resultado: ResultadoDeImportar }) {
  const { archivo, lote } = resultado;
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
        <li>{archivo.nuevas} pago(s) nuevos.</li>
        <li>
          {archivo.repetidas} ya estaban registrados (el banco manda el mes corrido: el archivo
          de fin de mes se pisa con el de la quincena).
        </li>
        <li>{archivo.filasRechazadas} línea(s) rechazadas.</li>
      </ul>
      {lote ? (
        <p className="text-fg">
          Se armó un lote de {lote.cantidad} pago(s) por {formatCurrency(lote.totalCop)} que{' '}
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
          Ninguno calzó exacto (referencia + valor): quedaron en la cola manual de Conciliación
          para asignarlos uno por uno.
        </p>
      )}
      <Avisos avisos={resultado.avisos} testId="avisos-del-resultado" />
    </div>
  );
}
