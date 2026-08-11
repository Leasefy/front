'use client';

/**
 * Traer inmuebles pegando los enlaces para compartir.
 *
 * Casi todos los CRM del rubro —SIMI, Daytona, Nuby, Wasi— y los tres portales
 * generan, por inmueble, una página pública para mandar por WhatsApp. Esa
 * página existe para que WhatsApp le arme la vista previa, así que trae el dato
 * rotulado (Open Graph, y muchas veces JSON-LD). De ahí se lee.
 *
 * Es el camino que no depende de que el otro sistema tenga API ni de que la
 * inmobiliaria sepa exportar: si puede mandar el inmueble por WhatsApp, puede
 * traerlo acá.
 *
 * ⚠️ Lo que se lee sale con su procedencia a la vista. Un canon sacado de una
 * frase no vale lo mismo que uno que el sitio declara como precio, y la
 * pantalla tiene que decir cuál es cuál. La lección es de esta misma semana: un
 * campo lleno con confianza alta y el dato equivocado no se nota nunca.
 */

import { useState } from 'react';
import {
  LinkSimple,
  MagnifyingGlass,
  WarningCircle,
  CheckCircle,
  ImageSquare,
  VideoCamera,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { MonoLabel } from '@leasefy/cadence';
import {
  separarEnlaces,
  leerEnlaces,
  aImportProperty,
  MAX_FOTOS_POR_INMUEBLE,
  type ResultadoDeEnlace,
} from '@/lib/inmuebles/enlaces.service';
import { analyzeProperties } from '../lib/gapFiller';
import type { ImportStepProps } from '../ImportWizard';
import type { ImportProperty } from '../lib/importTypes';

/**
 * Lo que le falta a un inmueble ya leído, recalculado en vivo: si la persona
 * escribe la dirección, el aviso tiene que desaparecer solo.
 */
function faltaDe(p: ImportProperty): string[] {
  const faltan: string[] = [];
  if (!p.propertyAddress?.trim()) faltan.push('dirección');
  if (!p.propertyCity?.trim()) faltan.push('ciudad');
  if (!p.monthlyRent || p.monthlyRent < 100_000) faltan.push('canon');
  if (!p.propertyArea || p.propertyArea < 10) faltan.push('área');
  if (!p.bathrooms || p.bathrooms < 1) faltan.push('baños');
  return faltan;
}

export function StepPasteLinks({ state, updateState }: ImportStepProps) {
  const [pegado, setPegado] = useState(state.enlacesPegados);
  const [leyendo, setLeyendo] = useState(false);
  const [avance, setAvance] = useState({ listos: 0, total: 0 });
  const [resultados, setResultados] = useState<ResultadoDeEnlace[]>([]);

  const enlaces = separarEnlaces(pegado);
  const leidos = resultados.filter((r): r is Extract<ResultadoDeEnlace, { ok: true }> => r.ok);
  const fallidos = resultados.filter((r): r is Extract<ResultadoDeEnlace, { ok: false }> => !r.ok);

  const handleLeer = async () => {
    if (enlaces.length === 0) return;

    setLeyendo(true);
    setResultados([]);
    setAvance({ listos: 0, total: enlaces.length });

    const salida = await leerEnlaces(enlaces, (listos, total) => setAvance({ listos, total }));

    setResultados(salida);
    setLeyendo(false);

    // Los que se pudieron leer pasan al asistente. `analyzeProperties` es el
    // mismo relleno de huecos que usa la importación por archivo: estima el
    // canon por ciudad y tipo, marca lo que falta. Se reutiliza tal cual para
    // que un inmueble traído por enlace y uno traído por Excel lleguen a la
    // revisión en igualdad de condiciones.
    const propiedades = salida
      .filter((r): r is Extract<ResultadoDeEnlace, { ok: true }> => r.ok)
      .map((r, i) => aImportProperty(r.inmueble, i));

    updateState({
      enlacesPegados: pegado,
      properties: analyzeProperties(propiedades),
      // El análisis ya corrió acá: el paso de revisión no debe volver a
      // construir las propiedades desde filas de un archivo que no existen.
      aiAnalyzed: true,
      fileName: `${propiedades.length} ${propiedades.length === 1 ? 'enlace' : 'enlaces'}`,
    });
  };

  const totalFotos = leidos.reduce((n, r) => n + r.inmueble.imagenes.length, 0);
  const totalVideos = leidos.reduce((n, r) => n + r.inmueble.videos.length, 0);
  // Lo que realmente se va a subir: el back acepta 10 por inmueble.
  const totalASubir = state.properties.reduce((n, p) => n + (p.imagenes?.length ?? 0), 0);

  /**
   * Escribir un campo que la ficha no traía.
   *
   * Los portales colombianos reservan la dirección: medido sobre cinco fichas
   * reales de Ciencuadras, **sólo una** la publicaba (dentro de la descripción).
   * Sin poder escribirla, cuatro de cada cinco inmuebles quedan marcados
   * «Dirección requerida» y el recorrido no termina en ninguna parte.
   *
   * Se vuelve a correr `analyzeProperties` porque recalcula errores y
   * selección desde cero: al completar el dato, el inmueble se re-habilita solo.
   */
  const escribirCampo = (rowIndex: number, campo: keyof ImportProperty, valor: string) => {
    updateState({
      properties: analyzeProperties(
        state.properties.map((p) => (p._rowIndex === rowIndex ? { ...p, [campo]: valor } : p)),
      ),
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-fg dark:text-white mb-1">
          Pegá los enlaces de tus inmuebles
        </h2>
        <p className="text-sm text-fg-muted dark:text-fg-subtle">
          Uno por línea. Leemos cada ficha y armamos el inmueble con sus fotos.
        </p>
      </div>

      <div className="rounded-md bg-surface-muted border border-border p-3 flex items-start gap-2">
        <LinkSimple className="w-5 h-5 text-fg-muted flex-shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-body-sm text-fg-muted dark:text-fg-subtle">
          Sirve el mismo enlace que mandás por WhatsApp: el de SIMI, Daytona, Nuby,
          Wasi, FincaRaíz, Metrocuadrado o Ciencuadras. Si la ficha se ve en el
          navegador sin entrar con usuario, se puede leer.
        </p>
      </div>

      <div className="space-y-2">
        <Textarea
          value={pegado}
          onChange={(e) => setPegado(e.target.value)}
          disabled={leyendo}
          rows={7}
          className="font-mono text-xs"
          aria-label="Enlaces de los inmuebles"
          data-testid="enlaces-textarea"
          placeholder={'https://www.fincaraiz.com.co/inmueble/...\nhttps://mi-inmobiliaria.wasi.co/propiedad/...\nhttps://app.simi.net.co/ficha/...'}
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-fg-subtle dark:text-fg-muted" data-testid="enlaces-contados">
            {enlaces.length === 0
              ? 'Ningún enlace todavía'
              : `${enlaces.length} ${enlaces.length === 1 ? 'enlace' : 'enlaces'} para leer`}
          </p>
          <Button
            type="button"
            hideArrow
            onClick={handleLeer}
            disabled={enlaces.length === 0 || leyendo}
            className="gap-2"
            data-testid="enlaces-leer"
          >
            <MagnifyingGlass className="w-4 h-4" aria-hidden="true" />
            {leyendo ? 'Leyendo…' : 'Leer los enlaces'}
          </Button>
        </div>
      </div>

      {/* Cada ficha es una página completa: con veinte enlaces esto tarda.
          Se cuenta, como en la geocodificación — un texto fijo parece colgado. */}
      {leyendo && (
        <div className="space-y-2">
          <p className="text-sm text-fg-muted dark:text-fg-subtle">
            Leyendo las fichas — {avance.listos} de {avance.total}
          </p>
          <Progress
            value={avance.total ? Math.round((avance.listos / avance.total) * 100) : 0}
            size="xs"
          />
        </div>
      )}

      {/* Resumen de lo leído */}
      {resultados.length > 0 && !leyendo && (
        <div className="space-y-3" data-testid="enlaces-resultado">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Recuadro tono="success" etiqueta="Inmuebles leídos" valor={leidos.length} />
            <Recuadro
              tono={fallidos.length > 0 ? 'danger' : 'neutro'}
              etiqueta="No se pudieron leer"
              valor={fallidos.length}
            />
            <Recuadro tono="neutro" etiqueta="Fotos encontradas" valor={totalFotos} icono={ImageSquare} />
            <Recuadro tono="neutro" etiqueta="Videos encontrados" valor={totalVideos} icono={VideoCamera} />
          </div>

          {/* Encontrar 53 fotos y subir 30 hay que decirlo. El recuadro cuenta
              lo que trae la ficha; el inmueble guarda hasta 10. Sin esta línea
              los dos números se contradicen en la misma pantalla. */}
          {totalFotos > totalASubir && (
            <p className="text-body-sm text-fg-muted">
              Un inmueble guarda hasta {MAX_FOTOS_POR_INMUEBLE} fotos, así que de{' '}
              {totalFotos} encontradas se van a subir {totalASubir}: las primeras de cada uno.
            </p>
          )}

          {/* Los videos se encuentran pero el inmueble todavía no los guarda.
              Decirlo es la diferencia entre una limitación y una promesa rota. */}
          {totalVideos > 0 && (
            <div className="rounded-md bg-warning-soft border border-border p-3 flex items-start gap-2">
              <WarningCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-body-sm text-fg-muted">
                Encontramos {totalVideos} {totalVideos === 1 ? 'video' : 'videos'}, pero hoy el
                inmueble sólo guarda fotos. Los videos no se van a importar.
              </p>
            </div>
          )}

          {/* Lo leído, uno por uno, con lo que le falta a cada uno. */}
          <ul className="divide-y divide-border rounded-xl border border-border overflow-hidden">
            {/* Se dibuja desde el ESTADO, no desde lo que devolvió la lectura:
                si no, escribir la dirección no se vería reflejado acá. */}
            {state.properties.map((p) => {
              const falta = faltaDe(p);
              const leFaltaDireccion = falta.includes('dirección');
              const otrosFaltantes = falta.filter((f) => f !== 'dirección');

              return (
                <li key={p._rowIndex} className="p-3 flex items-start gap-3 bg-surface">
                  <CheckCircle
                    className={cn(
                      'w-5 h-5 flex-shrink-0 mt-0.5',
                      falta.length === 0 ? 'text-success' : 'text-warning',
                    )}
                    weight="fill"
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-fg dark:text-white truncate">
                      {p.propertyTitle ?? 'Inmueble sin título'}
                    </p>
                    <p className="text-xs font-mono text-fg-subtle truncate">{p.enlaceOrigen}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                      <span className="text-xs text-fg-muted">
                        {p.imagenes?.length ?? 0}{' '}
                        {(p.imagenes?.length ?? 0) === 1 ? 'foto' : 'fotos'}
                      </span>
                      {p.propertyZone && (
                        <span className="text-xs text-fg-muted">{p.propertyZone}</span>
                      )}
                      {p.propertyArea && (
                        <span className="text-xs text-fg-muted">{p.propertyArea} m²</span>
                      )}
                      {otrosFaltantes.length > 0 && (
                        <span className="text-xs text-warning">
                          falta {otrosFaltantes.join(', ')}
                        </span>
                      )}
                    </div>

                    {/* Los portales reservan la dirección. Es el único dato que
                        casi nunca viene, y sin él el inmueble no se importa —
                        así que se escribe acá y no en un callejón sin salida. */}
                    {leFaltaDireccion && (
                      <div className="mt-2">
                        <label
                          className="block text-xs text-warning mb-1"
                          htmlFor={`direccion-${p._rowIndex}`}
                        >
                          El portal no publica la dirección. Escribila para poder importarlo:
                        </label>
                        <Input
                          id={`direccion-${p._rowIndex}`}
                          value={p.propertyAddress ?? ''}
                          onChange={(e) =>
                            escribirCampo(p._rowIndex, 'propertyAddress', e.target.value)
                          }
                          placeholder="Calle 39A # 25-14"
                          className="h-8 text-sm"
                          data-testid={`direccion-${p._rowIndex}`}
                        />
                      </div>
                    )}
                  </div>
                </li>
              );
            })}

            {fallidos.map((r) => (
              <li key={r.url} className="p-3 flex items-start gap-3 bg-surface">
                <WarningCircle
                  className="w-5 h-5 text-danger flex-shrink-0 mt-0.5"
                  weight="fill"
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-mono text-fg-subtle truncate">{r.url}</p>
                  <p className="text-sm text-danger mt-0.5">{r.mensaje}</p>
                </div>
              </li>
            ))}
          </ul>

          {leidos.length > 0 && (
            <p className="text-body-sm text-fg-muted">
              Seguí a la revisión para mirar los datos antes de crear los inmuebles.
              Lo que falte lo podés completar ahí.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Recuadro({
  tono,
  etiqueta,
  valor,
  icono: Icono,
}: {
  tono: 'success' | 'danger' | 'neutro';
  etiqueta: string;
  valor: number;
  icono?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div
      className={cn(
        'rounded-md p-3',
        tono === 'success' ? 'bg-success-soft' : tono === 'danger' ? 'bg-danger-soft' : 'bg-surface-muted',
      )}
    >
      <MonoLabel
        className={cn(
          'flex items-center gap-1 text-xs mb-1',
          tono === 'success' ? 'text-success' : tono === 'danger' ? 'text-danger' : 'text-fg-muted',
        )}
      >
        {Icono && <Icono className="w-3.5 h-3.5" />}
        {etiqueta}
      </MonoLabel>
      <p
        className={cn(
          'text-2xl font-bold',
          tono === 'success' ? 'text-success' : tono === 'danger' ? 'text-danger' : 'text-fg',
        )}
      >
        {valor}
      </p>
    </div>
  );
}
