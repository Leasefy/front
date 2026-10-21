'use client';

/**
 * 🔴 EL CONVENIO, ASISTIDO (Nico, 20-10-2026): «la gente no está entendiendo
 * qué agregar ahí; deberíamos hacer un glow up y ayudar a la gente a que lo deje
 * configurado bien». Eligió «Las dos»: el banco con su formato hecho y, si no
 * cuadra, un archivo de ejemplo que se lee solo.
 *
 * Tres piezas para `ConvenioDeRecaudoCajon`:
 *   - `ElegirElBanco`: el banco con un toque (el formato estándar queda puesto);
 *   - `ArchivoDeEjemplo`: sube un archivo que mandó el banco; el BACK prueba los
 *     formatos y arma uno con las columnas si es delimitado (el back es quien lee
 *     los archivos del banco: aquí no se parsea nada);
 *   - `ReglaDelFormato`: dónde quedó cada dato en las primeras líneas, a la vista.
 */

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { CheckCircle, FileText, UploadSimple } from '@phosphor-icons/react';
import { Appear } from '@leasefy/cadence';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import { tesoreriaApi } from '@/lib/api/tesoreria.service';
import type {
  CandidatoDeFormato,
  DeteccionDelFormato,
  MapaDeColumnas,
  PresetDeConvenio,
  UbicacionDelCampo,
} from '@/lib/api/tesoreria.types';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { contar } from '@/lib/texto/plural';
import { cn } from '@/lib/utils';

/** Los bancos con convenio de recaudo empresarial más comunes en Colombia. */
export const BANCOS = [
  'Bancolombia',
  'Davivienda',
  'Banco de Bogotá',
  'BBVA',
  'Banco de Occidente',
  'Banco Popular',
  'AV Villas',
  'Scotiabank Colpatria',
  'Banco Caja Social',
  'Itaú',
  'Banco Agrario',
] as const;

export function ElegirElBanco({
  banco,
  onElegir,
}: {
  banco: string;
  onElegir: (banco: string | null) => void;
}) {
  const conocido = (BANCOS as readonly string[]).includes(banco);
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Tu banco" data-testid="elegir-el-banco">
      {BANCOS.map((b) => (
        <button
          key={b}
          type="button"
          onClick={() => onElegir(b)}
          aria-pressed={banco === b}
          data-testid={`banco-${b}`}
          className={cn(
            'rounded-full border px-3 py-1.5 text-body-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
            banco === b ? 'border-primary bg-primary/10 text-fg' : 'border-border text-fg-muted hover:text-fg',
          )}
        >
          {b}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onElegir(null)}
        aria-pressed={!conocido && banco !== ''}
        className={cn(
          'rounded-full border px-3 py-1.5 text-body-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
          !conocido && banco !== '' ? 'border-primary bg-primary/10 text-fg' : 'border-border text-fg-muted hover:text-fg',
        )}
      >
        Otro
      </button>
    </div>
  );
}

const ETIQUETA_DE_LA_CONFIANZA: Record<CandidatoDeFormato['confianza'], string> = {
  alta: 'Lo leímos completo',
  media: 'Lo leímos casi todo',
  baja: 'Lo leímos a medias',
};

export function ArchivoDeEjemplo({
  elegido,
  onDetectado,
  onElegir,
}: {
  /** La clave del candidato puesto en el formulario. */
  elegido: string | null;
  onDetectado: (d: DeteccionDelFormato, texto: string) => void;
  onElegir: (c: CandidatoDeFormato) => void;
}) {
  const [leyendo, setLeyendo] = useState(false);
  const [deteccion, setDeteccion] = useState<DeteccionDelFormato | null>(null);
  const [nombre, setNombre] = useState<string | null>(null);
  const [fallo, setFallo] = useState<string | null>(null);

  const leer = useCallback(
    async (archivos: File[]) => {
      const archivo = archivos[0];
      if (!archivo) return;
      setLeyendo(true);
      setFallo(null);
      try {
        const texto = await archivo.text();
        const d = await tesoreriaApi.detectarFormato(texto);
        setNombre(archivo.name);
        setDeteccion(d);
        onDetectado(d, texto);
        if (d.candidatos[0]) onElegir(d.candidatos[0]);
      } catch (error) {
        setFallo(mensajeParaLaPersona(error, { porDefecto: 'No se pudo leer el archivo.', accion: 'leer el archivo de ejemplo' }));
      } finally {
        setLeyendo(false);
      }
    },
    [onDetectado, onElegir],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (f) => void leer(f),
    multiple: false,
    maxSize: 4_000_000,
    accept: { 'text/plain': ['.txt', '.dat', '.asc', '.csv', '.prn'] },
  });

  return (
    <div className="space-y-3" data-testid="archivo-de-ejemplo">
      <div
        {...getRootProps()}
        className={cn(
          'flex cursor-pointer items-center gap-3 rounded-lg border border-dashed p-4 transition-colors',
          isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-border-strong',
        )}
      >
        <input {...getInputProps()} data-testid="archivo-de-ejemplo-input" />
        <UploadSimple className="h-5 w-5 shrink-0 text-fg-muted" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-body-sm font-medium text-fg">
            {leyendo ? 'Leyendo el archivo…' : nombre ? `«${nombre}»: sube otro si quieres` : 'Sube un archivo que te haya mandado el banco'}
          </p>
          <p className="text-caption text-fg-muted">
            Lo leemos solos y te mostramos los pagos que encontramos. No se importa nada.
          </p>
        </div>
      </div>
      {fallo ? <p className="text-body-sm text-danger">{fallo}</p> : null}
      {deteccion ? (
        <Appear key={nombre ?? ''} distance="xs">
          {deteccion.candidatos.length === 0 ? (
            <p className="rounded-md border border-warning/40 bg-warning-soft p-3 text-body-sm text-fg" data-testid="sin-formato">
              No pudimos leerlo solos. Elige el formato en «Ajustes avanzados» guiándote por la regla de abajo, o pídele al
              banco el diseño de registro del convenio.
            </p>
          ) : (
            <ul className="space-y-2" data-testid="candidatos-de-formato">
              {deteccion.candidatos.slice(0, 3).map((c) => (
                <li key={c.clave}>
                  <button
                    type="button"
                    onClick={() => onElegir(c)}
                    aria-pressed={elegido === c.clave}
                    data-testid={`candidato-${c.clave}`}
                    className={cn(
                      'w-full rounded-lg border p-3 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                      elegido === c.clave ? 'border-primary bg-primary/5' : 'border-border hover:border-border-strong',
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="flex items-center gap-1.5 text-body-sm font-medium text-fg">
                        {elegido === c.clave ? (
                          <CheckCircle className="h-4 w-4 text-success" weight="fill" aria-hidden="true" />
                        ) : (
                          <FileText className="h-4 w-4 text-fg-muted" aria-hidden="true" />
                        )}
                        {c.nombre}
                      </p>
                      <Badge variant={c.confianza === 'alta' ? 'success' : c.confianza === 'media' ? 'warning' : 'secondary'}>
                        {ETIQUETA_DE_LA_CONFIANZA[c.confianza]}
                      </Badge>
                    </div>
                    <p className="mt-1 text-caption text-fg-muted">
                      {contar(c.leidas, 'pago')} por {formatCurrency(c.totalCop)}
                      {c.rechazadas > 0 ? ` · ${contar(c.rechazadas, 'línea')} sin leer` : ''}. {c.porQue}
                    </p>
                    {elegido === c.clave && c.muestra.length > 0 ? (
                      <table className="mt-2 w-full text-caption" data-testid="muestra-del-candidato">
                        <thead className="text-fg-muted">
                          <tr>
                            <th className="py-1 pr-2 text-left font-medium">Referencia o cédula</th>
                            <th className="py-1 pr-2 text-right font-medium">Valor</th>
                            <th className="py-1 text-left font-medium">Fecha</th>
                          </tr>
                        </thead>
                        <tbody>
                          {c.muestra.map((f) => (
                            <tr key={f.linea} className="border-t border-border">
                              <td className="py-1 pr-2 font-mono text-fg">{f.nucleo}</td>
                              <td className="py-1 pr-2 text-right font-mono tabular-nums text-fg">{formatCurrency(f.valorCop)}</td>
                              <td className="py-1 text-fg">{f.fecha ?? 'sin fecha'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Appear>
      ) : null}
    </div>
  );
}

const COLOR: Record<string, string> = {
  referencia: 'bg-primary/20',
  valor: 'bg-success/25',
  fecha: 'bg-warning/30',
  secuencia: 'bg-fg-muted/20',
  oficina: 'bg-fg-muted/10',
};
const NOMBRE: Record<string, string> = {
  referencia: 'Referencia',
  valor: 'Valor',
  fecha: 'Fecha',
  secuencia: 'Secuencia',
  oficina: 'Oficina',
};

function esTramo(u: UbicacionDelCampo | undefined): u is { desde: number; largo: number } {
  return Boolean(u && 'desde' in u);
}

/**
 * La regla visual: las primeras líneas del archivo con cada dato pintado donde
 * el formato dice que está. Si la referencia quedó corrida un carácter, se ve
 * acá y no después de importar 400 líneas.
 */
export function ReglaDelFormato({
  lineas,
  formato,
}: {
  lineas: string[];
  formato: Pick<PresetDeConvenio['formato'], 'tipo' | 'separador' | 'columnas' | 'marcaDeDetalle' | 'marcaEn' | 'lineasDeEncabezado'>;
}) {
  const columnas = formato.columnas as MapaDeColumnas;
  const campos = Object.keys(columnas).filter((c) => columnas[c as keyof MapaDeColumnas]);
  const detalle = lineas.filter((l, i) => {
    if (i < (formato.lineasDeEncabezado ?? 0)) return false;
    if (formato.marcaDeDetalle && formato.marcaEn) {
      const desde = formato.marcaEn - 1;
      return l.slice(desde, desde + formato.marcaDeDetalle.length) === formato.marcaDeDetalle;
    }
    return true;
  }).slice(0, 4);
  if (detalle.length === 0 || campos.length === 0) return null;

  return (
    <div className="space-y-2" data-testid="regla-del-formato">
      <div className="flex flex-wrap gap-2">
        {campos.map((c) => (
          <span key={c} className={cn('rounded px-2 py-0.5 text-caption text-fg', COLOR[c])}>
            {NOMBRE[c] ?? c}
          </span>
        ))}
      </div>
      {formato.tipo === 'ANCHO_FIJO' ? (
        <div className="overflow-x-auto rounded-md border border-border bg-bg p-2">
          <pre className="font-mono text-caption leading-6 text-fg">
            <span className="text-fg-muted">
              {Array.from({ length: Math.max(...detalle.map((l) => l.length)) }, (_, i) => ((i + 1) % 10 === 0 ? String(((i + 1) / 10) % 10) : '·')).join('')}
            </span>
            {'\n'}
            {detalle.map((l, n) => (
              <span key={n}>
                {[...l].map((ch, i) => {
                  const campo = campos.find((c) => {
                    const u = columnas[c as keyof MapaDeColumnas];
                    return esTramo(u) && i + 1 >= u.desde && i + 1 < u.desde + u.largo;
                  });
                  return (
                    <span key={i} className={campo ? COLOR[campo] : undefined}>
                      {ch}
                    </span>
                  );
                })}
                {'\n'}
              </span>
            ))}
          </pre>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-caption">
            <tbody>
              {detalle.map((l, n) => (
                <tr key={n} className="border-t border-border first:border-t-0">
                  {l.split(formato.separador === '\\t' ? '\t' : (formato.separador ?? ';')).map((celda, j) => {
                    const campo = campos.find((c) => {
                      const u = columnas[c as keyof MapaDeColumnas];
                      return u && 'indice' in u && u.indice === j;
                    });
                    return (
                      <td key={j} className={cn('whitespace-nowrap px-2 py-1 font-mono text-fg', campo && COLOR[campo])}>
                        {celda}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function BotonDeAvanzados({ abierto, onCambiar }: { abierto: boolean; onCambiar: () => void }) {
  return (
    <Button variant="ghost" size="sm" hideArrow onClick={onCambiar} aria-expanded={abierto} data-testid="ajustes-avanzados">
      {abierto ? 'Ocultar los ajustes avanzados' : 'Ajustes avanzados del formato'}
    </Button>
  );
}
