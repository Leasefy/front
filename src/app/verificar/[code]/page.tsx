'use client';

/**
 * «¿ESTE ESTUDIO ES DE VERDAD?» — la página pública de verificación.
 *
 * ── 🔴 Lo que había acá (20-09-2026) ───────────────────────────────────────
 *
 * El back manda este enlace en el correo y en el PDF que recibe el propietario:
 *
 *     https://leasify.com.co/verificar/{verificationCode}
 *
 * Y la página no preguntaba nada. Leía `localStorage.getItem('leasefy_
 * evaluation')` —EL DEL VISITANTE— y, si el código coincidía, mostraba «Este
 * documento es auténtico y fue generado por Leasefy». El nombre del inquilino
 * estaba escrito a mano: `maskName('Nicolas Garcia')`. Dos `TODO (Backend)`
 * lo reconocían.
 *
 * Las dos consecuencias, las dos malas:
 *
 *   · el propietario que recibió el documento SIEMPRE veía «código no
 *     encontrado» —no tiene el `localStorage` del inquilino—, que es justo lo
 *     contrario de lo que el correo le prometió;
 *   · cualquiera podía escribir esa clave en su propio navegador y la página
 *     le certificaba el documento. Una verificación que se fabrica desde la
 *     consola no verifica nada, y esta página existe SÓLO para verificar.
 *
 * ── Qué hace ahora ─────────────────────────────────────────────────────────
 *
 * Le pregunta al back, que es el único que sabe. Y el back contesta poco a
 * propósito: nombre ENMASCARADO y NIVEL, nunca el puntaje —antes se mostraba
 * «84 / 100» en una página sin sesión— ni el documento ni el inmueble. El
 * código viaja dentro de un PDF que se reenvía; lo que devuelva tiene que ser
 * inofensivo si termina en otras manos.
 */

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle, Clock, WarningCircle, XCircle } from '@phosphor-icons/react';

import {
  verificarEstudio,
  type EstudioVerificado,
} from '@/lib/api/verificacion.service';
import { cn } from '@/lib/utils';

/** es-CO, no es-CL: esto es un producto colombiano y antes decía Chile. */
const FECHA = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

function comoFecha(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : FECHA.format(d);
}

const NIVELES: Record<string, { texto: string; color: string; fondo: string }> = {
  A: { texto: 'Riesgo bajo', color: 'text-success', fondo: 'bg-success-soft' },
  B: {
    texto: 'Riesgo medio-bajo',
    color: 'text-[#1A40FF] dark:text-[#5570FF]',
    fondo: 'bg-[#EEF1FF] dark:bg-[#1A40FF]/15',
  },
  C: { texto: 'Riesgo medio', color: 'text-warning', fondo: 'bg-warning-soft' },
  D: { texto: 'Riesgo alto', color: 'text-danger', fondo: 'bg-danger-soft' },
};

type Estado = 'preguntando' | 'listo' | 'no-se-pudo';

export default function VerificarPage() {
  const params = useParams();
  const code = String(params.code ?? '');
  const [estado, setEstado] = useState<Estado>('preguntando');
  const [r, setR] = useState<EstudioVerificado | null>(null);
  /* Un contador y no sólo `setEstado('preguntando')`: el efecto depende del
     código, así que volver al estado de espera sin cambiar nada dejaba la
     rueda girando para siempre. Un botón que no hace nada es peor que no
     tenerlo. */
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let vivo = true;
    setEstado('preguntando');
    void (async () => {
      try {
        const respuesta = await verificarEstudio(code);
        if (!vivo) return;
        setR(respuesta);
        setEstado('listo');
      } catch {
        if (!vivo) return;
        setEstado('no-se-pudo');
      }
    })();
    return () => {
      vivo = false;
    };
  }, [code, intento]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-foreground">Leasefy</h1>
          <p className="mt-1 text-sm text-muted-foreground">Verificación de estudio</p>
        </div>

        <div className="overflow-hidden rounded-[22px] border border-border bg-surface">
          {estado === 'preguntando' ? (
            <div className="flex flex-col items-center gap-4 p-10">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#1A40FF]/30 border-t-transparent" />
              <p className="text-sm text-muted-foreground">Verificando el código…</p>
            </div>
          ) : estado === 'no-se-pudo' ? (
            /* 🔴 «No se pudo preguntar» NO es «no es auténtico». Decir que un
               documento verdadero es falso porque se cayó la red es el peor
               error posible en esta pantalla: alguien no arrienda por eso. */
            <div className="flex flex-col items-center gap-4 p-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-warning-soft">
                <WarningCircle className="h-7 w-7 text-warning" />
              </div>
              <div>
                <p className="mb-1 text-base font-semibold text-foreground">
                  No pudimos comprobarlo ahora
                </p>
                <p className="max-w-xs text-sm text-muted-foreground">
                  Esto no quiere decir que el documento sea falso: quiere decir que no pudimos
                  preguntar. Vuelve a intentarlo en un momento.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIntento((n) => n + 1)}
                className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-surface-muted"
              >
                Intentar de nuevo
              </button>
            </div>
          ) : r?.autentico ? (
            <Autentico r={r} codigo={code} />
          ) : (
            <NoAutentico r={r} codigo={code} />
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Leasefy — Plataforma de gestión de arriendos
        </p>
      </div>
    </div>
  );
}

function Autentico({ r, codigo }: { r: EstudioVerificado; codigo: string }) {
  const nivel = r.nivel ? NIVELES[r.nivel] : undefined;
  return (
    <>
      <div className="flex items-center gap-3 border-b border-success/30 bg-success-soft px-6 py-4">
        <CheckCircle className="h-6 w-6 text-success" weight="fill" />
        <div>
          <p className="text-sm font-semibold text-success">Estudio verificado</p>
          <p className="text-xs text-success">
            Este documento lo generó Leasefy y sigue vigente.
          </p>
        </div>
      </div>

      <div className="space-y-5 p-6">
        <div>
          <p className="mb-1 text-xs text-muted-foreground">Inquilino</p>
          <p className="text-lg font-semibold text-foreground">{r.nombreEnmascarado}</p>
          {/* Por qué está a medias: si no se dijera, se leería como un error. */}
          <p className="mt-1 text-xs text-muted-foreground">
            El nombre va incompleto a propósito: alcanza para reconocer al de tu carta y no para
            identificar a nadie más.
          </p>
        </div>

        {nivel ? (
          <div className="flex items-center gap-4">
            <div
              className={cn('flex h-16 w-16 items-center justify-center rounded-xl', nivel.fondo)}
            >
              <span className={cn('text-3xl font-bold', nivel.color)}>{r.nivel}</span>
            </div>
            <div>
              <p className="text-base font-semibold text-foreground">{nivel.texto}</p>
              {/* 🔴 El puntaje exacto NO se muestra acá: esta página la abre
                  cualquiera con el código, y el número lo pagó el propietario. */}
              <p className="mt-0.5 text-xs text-muted-foreground">
                El puntaje exacto sólo lo ve quien pidió el estudio.
              </p>
            </div>
          </div>
        ) : null}

        <div className="space-y-2.5 border-t border-border pt-4">
          <Dato etiqueta="Código" valor={codigo} mono />
          <Dato etiqueta="Fecha del estudio" valor={comoFecha(r.emitidoEl)} />
          <Dato etiqueta="Válido hasta" valor={comoFecha(r.venceEl)} />
        </div>
      </div>
    </>
  );
}

function NoAutentico({ r, codigo }: { r: EstudioVerificado | null; codigo: string }) {
  const vencido = r?.motivo === 'VENCIDO';
  const sinTerminar = r?.motivo === 'SIN_TERMINAR';
  return (
    <div className="flex flex-col items-center gap-4 p-10 text-center">
      <div
        className={cn(
          'flex h-14 w-14 items-center justify-center rounded-xl',
          vencido || sinTerminar ? 'bg-warning-soft' : 'bg-danger-soft',
        )}
      >
        {vencido ? (
          <Clock className="h-7 w-7 text-warning" />
        ) : sinTerminar ? (
          <WarningCircle className="h-7 w-7 text-warning" />
        ) : (
          <XCircle className="h-7 w-7 text-danger" />
        )}
      </div>
      <div>
        <p className="mb-1 text-base font-semibold text-foreground">
          {vencido
            ? 'Este estudio ya venció'
            : sinTerminar
              ? 'Este estudio todavía no está terminado'
              : 'Código no encontrado'}
        </p>
        <p className="max-w-xs text-sm text-muted-foreground">
          {vencido ? (
            <>
              Lo generó Leasefy, pero un estudio vale un año y el suyo se emitió el{' '}
              {comoFecha(r?.emitidoEl ?? null)}. Pídele uno nuevo a la inmobiliaria.
            </>
          ) : sinTerminar ? (
            <>
              El código existe, pero el estudio todavía no tiene resultado. Vuelve a consultarlo más
              tarde.
            </>
          ) : (
            <>
              El código <span className="font-mono font-medium">{codigo}</span> no corresponde a
              ningún estudio de Leasefy.
            </>
          )}
        </p>
      </div>
    </div>
  );
}

function Dato({
  etiqueta,
  valor,
  mono = false,
}: {
  etiqueta: string;
  valor: string | null;
  mono?: boolean;
}) {
  if (!valor) return null;
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{etiqueta}</span>
      <span className={cn('text-foreground', mono && 'font-mono font-medium')}>{valor}</span>
    </div>
  );
}
