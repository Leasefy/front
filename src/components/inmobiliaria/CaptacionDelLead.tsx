'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { ApiError } from '@/lib/api/client';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { usePermissionsContextSafe } from '@/lib/context/PermissionsContext';
import { fechaLarga, diaEnColombia } from '@/lib/fechas/fecha-de-la-casa';
import { horaDeLaCasa } from '@/lib/agenda/hora-de-la-casa';
import {
  captacionDelLeadApi,
  estaMarcado,
  type CaptacionConvertida,
  type CaptacionDelLead as Captacion,
  type CaptacionDelLeadRespuesta,
} from '@/lib/api/captacion-del-lead.service';

/**
 * 🔴 #2 LA CAPTACIÓN EN LA TARJETA DEL LEAD (FALTANTES, 05-10-2026).
 *
 * Regla de main (la A, bajo `prospectos`): la casilla «Es propietario: quiere
 * arrendar su inmueble» la marca una persona (o Imana) y el Piloto prepara el
 * BORRADOR del propietario y del inmueble y la tarea al asesor. El borrador
 * vive sólo aquí («Borrador de captación»): no cuenta en propietarios,
 * inmuebles, KPIs ni facturación hasta que el asesor lo convierte con su clic.
 * Nunca solos: el mandato, la firma, el canon, la comisión, publicar, las
 * listas restrictivas ni convertir el borrador.
 */

/** «el 5 de octubre de 2026 a las 7:00 a. m.» de un instante, en la hora de Colombia. Puro. */
export function instanteEnPalabras(iso: string | null | undefined): string {
  if (!iso) return '';
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  const hhmm = new Date(t - 5 * 3600_000).toISOString().slice(11, 16);
  return `el ${fechaLarga(diaEnColombia(iso))} a las ${horaDeLaCasa(hhmm)}`;
}

const aparecer = {
  initial: { opacity: 0, y: -6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: 0.18 },
};

export function CaptacionDelLead({ pipelineItemId, puedeEditar }: { pipelineItemId: string; puedeEditar: boolean }) {
  const permisos = usePermissionsContextSafe();
  const puedeConvertir = permisos ? permisos.canAccess('propietarios', 'create') : false;
  const [lectura, setLectura] = useState<CaptacionDelLeadRespuesta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<null | 'marcar' | 'convertir' | 'descartar'>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [convertida, setConvertida] = useState<CaptacionConvertida | null>(null);

  const cargar = useCallback(() => {
    captacionDelLeadApi
      .delLead(pipelineItemId)
      .then((r) => setLectura(r))
      .catch(() => setLectura({ disponible: false, motivo: 'No pudimos leer la captación de este lead.', captacion: null }));
  }, [pipelineItemId]);

  useEffect(() => {
    setLectura(null);
    setError(null);
    setConfirmando(false);
    setConvertida(null);
    cargar();
  }, [cargar]);

  const conError = (err: unknown, porDefecto: string, accion: string) => {
    if (err instanceof ApiError && err.status === 401) return;
    setError(mensajeParaLaPersona(err, { porDefecto, accion }));
  };

  const marcar = async (marcado: boolean) => {
    if (ocupado) return;
    setOcupado('marcar');
    setError(null);
    try {
      setLectura(await captacionDelLeadApi.marcar(pipelineItemId, marcado));
    } catch (err) {
      conError(err, 'No se pudo guardar la casilla.', 'marcar el lead como propietario');
    } finally {
      setOcupado(null);
    }
  };

  const descartar = async (c: Captacion) => {
    if (ocupado) return;
    setOcupado('descartar');
    setError(null);
    try {
      setLectura(await captacionDelLeadApi.descartar(c.id));
    } catch (err) {
      conError(err, 'No se pudo descartar el borrador.', 'descartar el borrador');
    } finally {
      setOcupado(null);
    }
  };

  const convertir = async (c: Captacion) => {
    if (ocupado) return;
    setOcupado('convertir');
    setError(null);
    try {
      setConvertida(await captacionDelLeadApi.convertir(c.id));
      setConfirmando(false);
      cargar();
    } catch (err) {
      conError(err, 'No se pudo convertir el borrador.', 'convertir el borrador');
    } finally {
      setOcupado(null);
    }
  };

  if (!lectura) return null;
  if (!lectura.disponible) {
    return (
      <p className="text-caption text-muted-foreground" data-testid="captacion-no-disponible">
        {lectura.motivo}
      </p>
    );
  }
  const c = lectura.captacion;
  const marcado = estaMarcado(c);

  return (
    <div className="space-y-3" data-testid="captacion-del-lead">
      <label className="flex items-start gap-3">
        <Checkbox
          checked={marcado}
          disabled={!puedeEditar || ocupado !== null || c?.estado === 'CONVERTIDA'}
          onCheckedChange={(v: boolean) => void marcar(v === true)}
          data-testid="captacion-casilla"
          aria-describedby="captacion-casilla-ayuda"
        />
        <span className="space-y-0.5">
          <span className="block text-sm font-medium text-foreground">Es propietario: quiere arrendar su inmueble</span>
          <span id="captacion-casilla-ayuda" className="block text-caption text-muted-foreground">
            El Piloto le prepara el borrador del propietario y del inmueble y la tarea al asesor. El mandato, el canon y la
            comisión los acuerdas tú.
          </span>
        </span>
      </label>

      <AnimatePresence initial={false} mode="popLayout">
        {c && c.estado === 'DETECTADA' && (
          <motion.p key="detectada" {...aparecer} className="rounded-md bg-muted p-3 text-sm text-foreground" data-testid="captacion-preparando">
            El Piloto está preparando el borrador y la tarea al asesor. Si tu inmobiliaria no lo deja ir solo, te espera en la
            Bandeja del Piloto con un clic.
          </motion.p>
        )}

        {c && (c.estado === 'BORRADOR' || c.estado === 'CONVERTIDA') && (
          <motion.div key="borrador" {...aparecer} className="space-y-3 rounded-md border border-border p-4" data-testid="captacion-borrador">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-label uppercase tracking-wide text-fg-subtle">
                {c.estado === 'CONVERTIDA' ? 'Captación convertida' : 'Borrador de captación'}
              </p>
              <span className="text-caption text-muted-foreground">
                {c.origen === 'IMANA' ? 'Lo marcó Imana' : c.origen === 'FRASE' ? 'Confirmado desde su mensaje' : 'Marcado en el Pipeline'}
              </span>
            </div>
            <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-caption text-muted-foreground">Propietario</dt>
                <dd className="text-foreground" data-testid="captacion-propietario">
                  {c.propietario.nombre ?? 'Sin nombre'}
                  {c.propietario.telefono ? ` · ${c.propietario.telefono}` : ''}
                  {c.propietario.correo ? ` · ${c.propietario.correo}` : ''}
                </dd>
              </div>
              <div>
                <dt className="text-caption text-muted-foreground">Inmueble</dt>
                <dd className="text-foreground" data-testid="captacion-inmueble">
                  {c.inmueble.tipo ?? 'Sin tipo todavía'}
                  {c.inmueble.loQueDijo ? <span className="block text-caption text-muted-foreground">Lo que escribió: «{c.inmueble.loQueDijo}»</span> : null}
                </dd>
              </div>
              <div>
                <dt className="text-caption text-muted-foreground">Tarea al asesor</dt>
                <dd className="text-foreground">
                  {c.tareaId ? (
                    <Link href="/panel/inmobiliaria/agenda" className="underline-offset-2 hover:underline">
                      Llamarlo y agendar la visita de captación
                    </Link>
                  ) : (
                    'Sin tarea'
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-caption text-muted-foreground">Respuesta al propietario</dt>
                <dd className="text-foreground" data-testid="captacion-respuesta">
                  {c.respuesta.estado === 'enviada'
                    ? `Enviada ${instanteEnPalabras(c.respuesta.cuando)}`
                    : c.respuesta.estado === 'programada'
                      ? `Sale ${instanteEnPalabras(c.respuesta.cuando)}, cuando abre el horario de contacto`
                      : c.propietario.correo
                        ? 'Lista en la Bandeja del Piloto: sale con tu clic'
                        : 'Sin correo: lo llama el asesor'}
                  {c.respuesta.resultado && c.respuesta.estado !== 'enviada' && c.respuesta.resultado.startsWith('No salió') ? (
                    <span className="block text-caption text-danger">{c.respuesta.resultado}</span>
                  ) : null}
                  {/* Enviada pero retenida por el interruptor de correos del ambiente: se dice tal cual (nada miente). */}
                  {c.respuesta.estado === 'enviada' && c.respuesta.resultado && c.respuesta.resultado !== 'Enviada.' ? (
                    <span className="block text-caption text-muted-foreground" data-testid="captacion-respuesta-detalle">
                      {c.respuesta.resultado}
                    </span>
                  ) : null}
                </dd>
              </div>
            </dl>
            <p className="text-caption text-muted-foreground" data-testid="captacion-nota">
              {c.estado === 'CONVERTIDA'
                ? 'Ya es una ficha de Propietarios. El inmueble, el mandato, la firma, el canon y la comisión los haces tú; nada de eso sale solo.'
                : 'Es un borrador: no cuenta en Propietarios, Inmuebles ni en los indicadores hasta que lo conviertas. Nunca se hacen solos el mandato, la firma, el canon, la comisión, la publicación ni las listas restrictivas.'}
            </p>

            {c.estado === 'CONVERTIDA' && c.propietarioId ? (
              <div className="flex flex-wrap gap-2" data-testid="captacion-convertida">
                <Button size="sm" variant="outline" hideArrow asChild>
                  <Link href={`/panel/inmobiliaria/propietarios/${c.propietarioId}`}>Ver su ficha</Link>
                </Button>
                <Button size="sm" hideArrow asChild>
                  <Link
                    href={
                      convertida?.crearInmueble ??
                      `/panel/inmobiliaria/inmuebles/nuevo?propietarioId=${c.propietarioId}&volver=/panel/inmobiliaria/pipeline`
                    }
                    data-testid="captacion-crear-inmueble"
                  >
                    Crear su inmueble
                  </Link>
                </Button>
                {convertida?.yaExistia ? (
                  <p className="w-full text-caption text-muted-foreground">Ya era propietario de la inmobiliaria con ese correo: se enlazó con su ficha.</p>
                ) : null}
              </div>
            ) : (
              <AnimatePresence initial={false} mode="wait">
                {confirmando ? (
                  <motion.div key="confirmar" {...aparecer} className="space-y-2 rounded-md bg-muted p-3" data-testid="captacion-confirmar">
                    <p className="text-sm text-foreground">
                      Se crea la ficha del propietario con su nombre, correo y teléfono, sin documento (lo completas antes del
                      mandato). El inmueble lo creas tú en «Nuevo inmueble», con este propietario ya escogido.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" hideArrow isLoading={ocupado === 'convertir'} disabled={ocupado !== null} onClick={() => void convertir(c)} data-testid="captacion-convertir-si">
                        Sí, convertir
                      </Button>
                      <Button size="sm" variant="outline" hideArrow disabled={ocupado !== null} onClick={() => setConfirmando(false)}>
                        Cancelar
                      </Button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="acciones" {...aparecer} className="flex flex-wrap gap-2">
                    {puedeConvertir ? (
                      <Button size="sm" hideArrow disabled={ocupado !== null} onClick={() => setConfirmando(true)} data-testid="captacion-convertir">
                        Convertir en ficha del propietario
                      </Button>
                    ) : (
                      <p className="text-caption text-muted-foreground">Lo convierte quien puede crear propietarios.</p>
                    )}
                    {puedeEditar ? (
                      <Button size="sm" variant="outline" hideArrow isLoading={ocupado === 'descartar'} disabled={ocupado !== null} onClick={() => void descartar(c)} data-testid="captacion-descartar">
                        Descartar borrador
                      </Button>
                    ) : null}
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <ErrorDelCampo id="captacion-error" mensaje={error} />
    </div>
  );
}
