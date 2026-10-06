'use client';

/**
 * 🔴 QA-FACT-CONTA-95 r2 · CB-C-13: «Descargar en Excel» e «Imprimir o guardar
 * en PDF», la MISMA pieza en los seis informes que el contador firma.
 *
 * - El Excel sale de las tablas que arma cada informe (`tablas()`), con TODAS
 *   sus filas aunque la pantalla las pagine, la plata como número y el período
 *   en el nombre del archivo (`lib/contabilidad/informe-descargable.ts`).
 * - El PDF es la hoja de impresión del navegador: mientras se imprime se pinta
 *   una versión del informe hecha para el papel (encabezado de la inmobiliaria,
 *   el informe y su período, y las tablas completas) y todo lo demás de la
 *   pantalla se esconde. Como la cuenta de cobro y el acta: `window.print()`.
 */
import { useCallback, useContext, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { FileXls, Printer } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { AuthContext } from '@/lib/auth/auth-context';
import { plata } from '@/lib/contabilidad/plata';
import {
  descargarEnExcel,
  periodoEnPalabras,
  type PeriodoDelInforme,
  type TablaDelInforme,
} from '@/lib/contabilidad/informe-descargable';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';

interface Props {
  /** El nombre del informe, como el título de su pestaña: «Balance de prueba». */
  informe: string;
  periodo: PeriodoDelInforme;
  /**
   * Las tablas del informe con TODO lo que hay (no sólo la página que se ve).
   * Puede pedir lo que falta al back (el auxiliar por tercero pagina allá).
   */
  tablas: () => TablaDelInforme[] | Promise<TablaDelInforme[]>;
  /** Apagado mientras carga o si no hay nada. */
  disabled?: boolean;
}

export function DescargarElInforme({ informe, periodo, tablas, disabled }: Props) {
  // Sin la sesión (una prueba suelta), el papel sale sin el nombre: nunca se cae por eso.
  const agency = useContext(AuthContext)?.agency ?? null;
  const [imprimiendo, setImprimiendo] = useState<TablaDelInforme[] | null>(null);
  const [bajando, setBajando] = useState(false);
  const inmobiliaria = (agency as { name?: string } | null)?.name ?? null;

  const excel = useCallback(async () => {
    setBajando(true);
    try {
      const nombre = await descargarEnExcel({ inmobiliaria, informe, periodo }, await tablas());
      toast.success(`Se bajó «${nombre}».`);
    } catch (e) {
      toast.error(mensajeParaLaPersona(e, { porDefecto: 'No se pudo armar el Excel.', accion: 'bajar el Excel' }));
    } finally {
      setBajando(false);
    }
  }, [inmobiliaria, informe, periodo, tablas]);

  const imprimir = useCallback(async () => {
    try {
      setImprimiendo(await tablas());
    } catch (e) {
      toast.error(mensajeParaLaPersona(e, { porDefecto: 'No se pudo armar la hoja para imprimir.', accion: 'imprimir el informe' }));
    }
  }, [tablas]);

  // Dos cuadros: React pinta la hoja de papel y el navegador la mide antes del diálogo.
  useEffect(() => {
    if (!imprimiendo) return;
    let vivo = true;
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        if (!vivo) return;
        const titulo = document.title;
        document.title = `${informe} · ${periodoEnPalabras(periodo)}`;
        window.print();
        document.title = titulo;
        setImprimiendo(null);
      }),
    );
    return () => {
      vivo = false;
    };
  }, [imprimiendo, informe, periodo]);

  const celda = (c: TablaDelInforme['filas'][number][number]) =>
    typeof c === 'number' ? plata(c) : (c ?? '');

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 print:hidden" data-testid="informe-descargas">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          hideArrow
          className="gap-2"
          disabled={disabled || bajando}
          onClick={() => void excel()}
          data-testid="informe-excel"
        >
          <FileXls className="h-4 w-4" aria-hidden />
          {bajando ? 'Armando el Excel…' : 'Descargar en Excel'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          hideArrow
          className="gap-2"
          disabled={disabled || imprimiendo !== null}
          onClick={() => void imprimir()}
          data-testid="informe-imprimir"
        >
          <Printer className="h-4 w-4" aria-hidden />
          Imprimir o guardar en PDF
        </Button>
      </div>

      {imprimiendo ? (
        <>
          <style>{`
            @media print {
              body * { visibility: hidden !important; }
              [data-informe-impreso], [data-informe-impreso] * { visibility: visible !important; }
              [data-informe-impreso] { position: absolute; inset: 0 auto auto 0; width: 100%; background: white; color: black; }
              @page { margin: 14mm; }
            }
          `}</style>
          <div data-informe-impreso className="hidden print:block" data-testid="informe-impreso">
            <header className="mb-4">
              {inmobiliaria ? <p className="text-sm font-semibold">{inmobiliaria}</p> : null}
              <h1 className="text-lg font-semibold">{informe}</h1>
              <p className="text-sm">{periodoEnPalabras(periodo)}</p>
            </header>
            {imprimiendo.map((t, i) => (
              <section key={i} className="mb-4 break-inside-avoid-page">
                {t.titulo ? <h2 className="mb-1 text-sm font-semibold">{t.titulo}</h2> : null}
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr>
                      {t.columnas.map((c) => (
                        <th key={c} className="border-b border-black py-1 pr-2 text-left font-semibold">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {t.filas.map((f, j) => (
                      <tr key={j}>
                        {f.map((c, k) => (
                          <td key={k} className={`py-0.5 pr-2 ${typeof c === 'number' ? 'text-right font-mono' : ''}`}>
                            {celda(c)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                  {t.pie?.length ? (
                    <tfoot>
                      {t.pie.map((f, j) => (
                        <tr key={j} className="border-t border-black font-semibold">
                          {f.map((c, k) => (
                            <td key={k} className={`py-1 pr-2 ${typeof c === 'number' ? 'text-right font-mono' : ''}`}>
                              {celda(c)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tfoot>
                  ) : null}
                </table>
              </section>
            ))}
          </div>
        </>
      ) : null}
    </>
  );
}
