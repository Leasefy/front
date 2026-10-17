'use client';

/**
 * Nico, 14-10-2026 (39 inmuebles de Portofino sin tipo): «si el archivo trae
 * esa información nosotros debemos respetar tal y como viene la información,
 * debemos ayudarle a que pueda organizar la información […] solicitarle el
 * tipo y hacerle la experiencia lo más fácil posible».
 *
 * Tres ayudas, todas con un clic de la persona (nada se aplica solo):
 *  1. «Usar el tipo que dice la dirección» en las que lo traen («APTO 201»).
 *  2. Ponerle el tipo a un GRUPO, agrupado por la «Clase» del archivo.
 *  3. No traer las filas que no son un inmueble («Queja», «Reclamos»…).
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  inmueblesImportacionApi,
  type FiltroDeFilasInmuebles,
  type MotivosDelLoteInmuebles,
} from '@/lib/api/inmuebles-importacion.service';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { localeDeLasCifras } from '@/lib/i18n/idioma-de-las-cifras';

export const TIPOS_DE_INMUEBLE: { valor: string; etiqueta: string }[] = [
  { valor: 'APARTMENT', etiqueta: 'Apartamento' },
  { valor: 'HOUSE', etiqueta: 'Casa' },
  { valor: 'STUDIO', etiqueta: 'Apartaestudio' },
  { valor: 'ROOM', etiqueta: 'Habitación' },
  { valor: 'COMMERCIAL', etiqueta: 'Local' },
  { valor: 'OFFICE', etiqueta: 'Oficina' },
  { valor: 'WAREHOUSE', etiqueta: 'Bodega' },
  { valor: 'PARKING', etiqueta: 'Parqueadero' },
  { valor: 'LAND', etiqueta: 'Lote' },
];

export function etiquetaDelTipo(valor: string): string {
  return TIPOS_DE_INMUEBLE.find((t) => t.valor === valor)?.etiqueta ?? valor;
}

const filas = (n: number) => (n === 1 ? '1 fila' : `${n.toLocaleString(localeDeLasCifras())} filas`);

type SinTipo = NonNullable<MotivosDelLoteInmuebles['sinTipo']>;

export function TipoDeLasFilasSinTipo({
  lote,
  sinTipo,
  deshabilitado = false,
  onCambio,
}: {
  lote: string;
  sinTipo: SinTipo | null | undefined;
  deshabilitado?: boolean;
  onCambio: () => void;
}) {
  const [tipoDe, setTipoDe] = useState<Record<string, string>>({});
  const [trabajando, setTrabajando] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!sinTipo) return null;
  const totalSinTipo = sinTipo.porClase.reduce((a, g) => a + g.filas, 0);
  if (totalSinTipo === 0 && sinTipo.noSonInmuebles.filas === 0) return null;

  async function correr(
    clave: string,
    filtro: FiltroDeFilasInmuebles,
    cambios: Parameters<typeof inmueblesImportacionApi.resolverPorFiltro>[2],
    hecho: (aplicadas: number) => string,
  ) {
    setTrabajando(clave);
    setError(null);
    setAviso(null);
    try {
      const r = await inmueblesImportacionApi.resolverPorFiltro(
        lote,
        { motivo: 'tipo', ...filtro },
        cambios,
      );
      setAviso(r.interrumpida ? r.interrumpida.motivo : hecho(r.aplicadas));
      onCambio();
    } catch (e) {
      setError(mensajeParaLaPersona(e, { accion: 'poner el tipo' }));
    } finally {
      setTrabajando(null);
    }
  }

  const ocupado = deshabilitado || trabajando !== null;

  return (
    <section
      className="space-y-3 rounded-lg border border-border bg-surface p-4"
      data-testid="tipo-de-las-filas-sin-tipo"
    >
      <div>
        <h3 className="text-sm font-semibold text-fg">
          {totalSinTipo > 0
            ? `${filas(totalSinTipo)} sin tipo de inmueble`
            : 'Filas que no son inmuebles'}
        </h3>
        {totalSinTipo > 0 ? (
          <p className="text-caption text-fg-muted">
            El archivo no dice qué tipo de inmueble es. Ponlo por grupo o fila por fila; nada se
            pone solo.
          </p>
        ) : null}
      </div>

      {sinTipo.conSugerencia > 0 ? (
        <div
          className="flex flex-col gap-2 rounded-md bg-surface-muted p-3 sm:flex-row sm:items-center sm:justify-between"
          data-testid="tipo-por-la-direccion"
        >
          <p className="text-sm text-fg">
            {sinTipo.conSugerencia === 1
              ? '1 fila dice el tipo en la dirección (por ejemplo «APTO 201» o «CASA 51»).'
              : `${sinTipo.conSugerencia.toLocaleString(localeDeLasCifras())} filas dicen el tipo en la dirección (por ejemplo «APTO 201» o «CASA 51»).`}{' '}
            <span className="text-fg-muted">Cada una lo ve en su fila antes de usarlo.</span>
          </p>
          <Button
            size="sm"
            hideArrow
            disabled={ocupado}
            className="shrink-0"
            onClick={() =>
              void correr(
                'direccion',
                { conSugerenciaDeTipo: true },
                { usarSugerenciaDeTipo: true },
                (n) => `Listo: ${filas(n)} con el tipo que dice su dirección.`,
              )
            }
          >
            {trabajando === 'direccion' ? 'Poniendo…' : 'Usar lo que dice la dirección'}
          </Button>
        </div>
      ) : null}

      {sinTipo.porClase.length > 0 ? (
        <ul className="divide-y divide-border rounded-md border border-border" data-testid="tipo-por-clase">
          {sinTipo.porClase.map((g) => {
            const clave = g.clase ?? '';
            const elegido = tipoDe[clave] ?? '';
            const filtro: FiltroDeFilasInmuebles =
              g.clase === null
                ? { sinClase: true, noEsInmueble: false }
                : { clase: g.clase, noEsInmueble: false };
            return (
              <li
                key={clave || '(vacía)'}
                className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <p className="text-sm text-fg">
                  {g.clase === null ? (
                    <span>Sin clase en el archivo</span>
                  ) : (
                    <span>
                      El archivo dice <span className="font-medium">«{g.clase}»</span>
                    </span>
                  )}{' '}
                  <span className="text-fg-muted">· {filas(g.filas)}</span>
                </p>
                <div className="flex items-center gap-2">
                  <select
                    aria-label={`Tipo para ${g.clase === null ? 'las filas sin clase' : `«${g.clase}»`}`}
                    className="h-9 rounded-md border border-border bg-bg px-2 text-sm text-fg"
                    value={elegido}
                    disabled={ocupado}
                    onChange={(e) => setTipoDe((t) => ({ ...t, [clave]: e.target.value }))}
                  >
                    <option value="">Elige el tipo…</option>
                    {TIPOS_DE_INMUEBLE.map((t) => (
                      <option key={t.valor} value={t.valor}>
                        {t.etiqueta}
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    variant="secondary"
                    hideArrow
                    disabled={ocupado || !elegido}
                    onClick={() =>
                      void correr(
                        `clase:${clave}`,
                        filtro,
                        { campos: { type: elegido } },
                        (n) => `Listo: ${filas(n)} como ${etiquetaDelTipo(elegido).toLowerCase()}.`,
                      )
                    }
                  >
                    {trabajando === `clase:${clave}` ? 'Poniendo…' : `Poner a las ${g.filas.toLocaleString(localeDeLasCifras())}`}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      {sinTipo.noSonInmuebles.filas > 0 ? (
        <div
          className="flex flex-col gap-2 rounded-md border border-warning/40 bg-warning-soft p-3 sm:flex-row sm:items-center sm:justify-between"
          data-testid="no-son-inmuebles"
        >
          <p className="text-sm text-fg">
            {filas(sinTipo.noSonInmuebles.filas)} no{' '}
            {sinTipo.noSonInmuebles.filas === 1 ? 'parece un inmueble' : 'parecen inmuebles'}: el
            archivo dice{' '}
            {sinTipo.noSonInmuebles.clases.map((c) => `«${c}»`).join(', ')}, que son registros de
            otra cosa del sistema anterior.
          </p>
          <Button
            size="sm"
            variant="secondary"
            hideArrow
            disabled={ocupado}
            className="shrink-0"
            onClick={() =>
              void correr(
                'no-son',
                { noEsInmueble: true },
                { descartar: true },
                (n) => `Listo: ${filas(n)} fuera de la carga.`,
              )
            }
          >
            {trabajando === 'no-son'
              ? 'Sacando…'
              : `No traer ${sinTipo.noSonInmuebles.filas === 1 ? 'esta fila' : `estas ${sinTipo.noSonInmuebles.filas}`}`}
          </Button>
        </div>
      ) : null}

      {aviso ? (
        <p className="text-sm text-fg-muted" role="status" data-testid="tipo-aviso">
          {aviso}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-danger" role="alert" data-testid="tipo-error">
          {error}
        </p>
      ) : null}
    </section>
  );
}
