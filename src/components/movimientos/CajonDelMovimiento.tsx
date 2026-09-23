'use client';

/**
 * El cajón de UN movimiento: quién, con qué rol, qué, sobre qué, con qué
 * resultado y qué mandó (redactado).
 *
 * No le pide nada al back: todo viene en la fila de la tabla. Es de sólo
 * lectura porque la bitácora no se edita.
 */

import { Badge } from '@/components/ui/badge';
import { Cajon, CajonCabecera, CajonCuerpo } from '@/components/ui/cajon';
import type { Movimiento } from '@/lib/api/movimientos.service';
import {
  RESULTADO_EN_PALABRAS,
  cuandoEnBogota,
  loEnviadoEnFilas,
  moduloEnPalabras,
  quienFue,
  resultadoDe,
  rolEnPalabras,
} from '@/lib/movimientos/en-palabras';
import { cn } from '@/lib/utils';

const TONO = { exito: 'success', negado: 'warning', error: 'destructive' } as const;

const QUE_QUIERE_DECIR = {
  exito: 'Se hizo.',
  negado:
    'Lo intentó y el sistema no lo dejó: no tenía el permiso, o lo que pidió no se podía hacer en ese momento. Nada cambió.',
  error: 'Falló de nuestro lado. Nada cambió; si se repite, avísanos con la fecha y la hora.',
} as const;

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-caption text-fg-muted">{etiqueta}</dt>
      <dd className="text-sm text-fg">{children}</dd>
    </div>
  );
}

export function CajonDelMovimiento({
  movimiento,
  onCerrar,
}: {
  movimiento: Movimiento | null;
  onCerrar: () => void;
}) {
  const m = movimiento;
  const r = m ? resultadoDe(m.resultado) : 'exito';
  const enviado = m ? loEnviadoEnFilas(m.resumen) : [];

  return (
    <Cajon
      abierto={m !== null}
      onOpenChange={(a) => {
        if (!a) onCerrar();
      }}
      data-testid="cajon-del-movimiento"
    >
      {m ? (
        <>
          <CajonCabecera
            titulo={m.accion}
            descripcion={`${moduloEnPalabras(m.modulo)} · ${cuandoEnBogota(m.fecha)}`}
          >
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant={TONO[r]}>{RESULTADO_EN_PALABRAS[r]}</Badge>
              <span className="font-mono text-caption text-fg-muted">HTTP {m.resultado}</span>
            </div>
          </CajonCabecera>

          <CajonCuerpo className="space-y-6">
            <p className="text-sm text-fg-muted" data-testid="que-quiere-decir">
              {QUE_QUIERE_DECIR[r]}
            </p>

            <section className="space-y-2" aria-labelledby="mov-quien">
              <h3 id="mov-quien" className="text-sm font-medium text-fg">
                Quién
              </h3>
              <dl className="grid gap-3 sm:grid-cols-2">
                <Dato etiqueta="Persona">
                  {quienFue(m)}
                  {m.actor.email && m.actor.nombre ? (
                    <span className="block text-caption text-fg-muted">{m.actor.email}</span>
                  ) : null}
                </Dato>
                <Dato etiqueta="Rol ese día">
                  <span data-testid="rol-del-movimiento">{rolEnPalabras(m.actor.rol)}</span>
                </Dato>
              </dl>
            </section>

            <section className="space-y-2" aria-labelledby="mov-sobre-que">
              <h3 id="mov-sobre-que" className="text-sm font-medium text-fg">
                Sobre qué
              </h3>
              <dl className="grid gap-3 sm:grid-cols-2">
                <Dato etiqueta="Módulo">{moduloEnPalabras(m.modulo)}</Dato>
                <Dato etiqueta="Registro">
                  {m.recurso ? (
                    <>
                      {m.recurso.tipo}
                      {m.recurso.id ? (
                        <span className="block break-all font-mono text-caption text-fg-muted">
                          {m.recurso.id}
                        </span>
                      ) : null}
                    </>
                  ) : (
                    '—'
                  )}
                </Dato>
                <div className="sm:col-span-2">
                  <dt className="text-caption text-fg-muted">Dónde</dt>
                  <dd className="break-all font-mono text-caption text-fg">
                    {m.metodo} {m.ruta}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="space-y-2" aria-labelledby="mov-enviado">
              <h3 id="mov-enviado" className="text-sm font-medium text-fg">
                Lo que envió
              </h3>
              {enviado.length === 0 ? (
                <p className="text-sm text-fg-muted">
                  {m.metodo === 'GET' ? 'Fue una descarga: no envió datos.' : 'No envió datos.'}
                </p>
              ) : (
                <>
                  <dl className="space-y-1" data-testid="lo-enviado">
                    {enviado.map((f) => (
                      <div key={f.campo} className="flex flex-wrap gap-x-2 text-sm">
                        <dt className="font-mono text-caption text-fg-muted">{f.campo}</dt>
                        <dd className={cn('break-all', f.redactado ? 'italic text-fg-muted' : 'text-fg')}>
                          {f.valor}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <p className="text-caption text-fg-muted">
                    Lo que puede ser sensible —cuentas, documentos, códigos, contraseñas, correos— se
                    guarda redactado: se sabe que se envió, no su valor.
                  </p>
                </>
              )}
            </section>

            <section className="space-y-2" aria-labelledby="mov-desde">
              <h3 id="mov-desde" className="text-sm font-medium text-fg">
                Desde dónde
              </h3>
              <dl className="grid gap-3 sm:grid-cols-2">
                <Dato etiqueta="IP">
                  <span className="font-mono">{m.ip ?? '—'}</span>
                </Dato>
                <Dato etiqueta="Tardó">
                  <span className="font-mono">
                    {m.duracionMs !== null ? `${m.duracionMs.toLocaleString('es-CO')} ms` : '—'}
                  </span>
                </Dato>
                <div className="sm:col-span-2">
                  <dt className="text-caption text-fg-muted">Navegador</dt>
                  <dd className="break-all text-caption text-fg">{m.agente ?? '—'}</dd>
                </div>
              </dl>
            </section>
          </CajonCuerpo>
        </>
      ) : null}
    </Cajon>
  );
}
