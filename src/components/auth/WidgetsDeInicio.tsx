'use client';

/**
 * LOS WIDGETS DEL INICIO DE SESIÓN (Nico, 29-10-2026: «eso de inmobiliarias que operan con Leasefy, no sé la verdad,
 * hay que hacer otra cosa ahí y que mejor quede debajo del logo, algo pequeño, como si fuera un home con widgets»).
 *
 * Reemplazan los testimonios de abajo a la izquierda. Debajo del logo, sobre el video, como la pantalla de inicio de
 * un teléfono: la hora de Colombia (de verdad) y las NOVEDADES de Leasefy.
 *
 * 🔴 Nico (29-10, al verlos): «aquí deben de ser widgets de cosas que no muestren información que está dentro de la
 * inmobiliaria […] mejor quizás novedades». Esta pantalla es pública: nada de recaudo, inquilinos, contratos ni
 * visitas, ni siquiera «de ejemplo». Sólo lo que Leasefy estrenó, y que existe de verdad.
 *
 * Nico (29-10, después): «creo que puedes hacer mejor UI para esos widgets, más preciosas». Ahora son widgets de
 * teléfono: vidrio claro con su brillo arriba y un filo de luz, la hora grande y liviana con «p. m.» chico, un widget
 * ancho y dos cuadrados, cada uno con su objeto 3D de la casa (los de `Ilustracion`). Entran escalonados con la curva
 * de entrada de Cadence y se levantan un poco al pasar el cursor; con movimiento reducido, quietos.
 */

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Ilustracion, motionDuration, motionEase, type NombreIlustracion } from '@leasefy/cadence';

/**
 * El vidrio de los widgets: brillo arriba (el material del vidrio) y filo de luz. Oscurece un poco lo de atrás para
 * que el texto se lea igual cuando la cortina clara del video pasa por detrás.
 */
const VIDRIO =
  'relative isolate overflow-hidden rounded-[22px] bg-black/35 text-white ring-1 ring-inset ring-white/15 ' +
  'shadow-[0_22px_50px_-26px_rgba(0,0,0,0.65)] backdrop-blur-2xl backdrop-brightness-[0.8] backdrop-saturate-150 ' +
  "before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:bg-gradient-to-b before:from-white/[0.16] before:to-transparent before:content-['']";

const ROTULO = 'font-mono text-label uppercase text-white/60';

function horaDeColombia(ahora: Date): { hora: string; periodo: string; dia: string } {
  const partes = new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', hour: 'numeric', minute: '2-digit' }).formatToParts(ahora);
  const periodo = partes.find((p) => p.type === 'dayPeriod')?.value ?? '';
  const hora = partes
    .filter((p) => p.type !== 'dayPeriod')
    .map((p) => p.value)
    .join('')
    .trim();
  const dia = new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', weekday: 'long', day: 'numeric', month: 'long' }).format(ahora);
  return { hora, periodo, dia: dia.charAt(0).toUpperCase() + dia.slice(1) };
}

export function WidgetsDeInicio() {
  const quieto = useReducedMotion();
  // La hora se pinta en el navegador (en el servidor sería otra y la hidratación no coincide).
  const [ahora, setAhora] = useState<Date | null>(null);
  useEffect(() => {
    setAhora(new Date());
    const reloj = setInterval(() => setAhora(new Date()), 30_000);
    return () => clearInterval(reloj);
  }, []);

  const entrada = (i: number) =>
    quieto
      ? {}
      : {
          initial: { opacity: 0, y: 10 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: motionDuration.slow, ease: motionEase.enter, delay: 0.25 + i * 0.08 },
          whileHover: { y: -2 },
        };
  const { hora, periodo, dia } = ahora ? horaDeColombia(ahora) : { hora: '', periodo: '', dia: '' };
  const [ancha, ...cuadradas] = NOVEDADES;

  return (
    <div className="absolute left-8 top-[88px] w-[296px]" data-testid="widgets-de-inicio">
      <motion.div {...entrada(0)} className={`${VIDRIO} px-5 pb-4 pt-5`}>
        <p className="flex items-baseline gap-1.5 font-heading tabular-nums" aria-live="off">
          <span className="text-[44px] font-[360] leading-[0.95] tracking-[-0.045em]">{hora || ' '}</span>
          <span className="text-[17px] font-[380] tracking-[-0.01em] text-white/75">{periodo}</span>
        </p>
        <p className="mt-2 text-[13px] text-white/70">{dia ? `${dia} · Colombia` : ' '}</p>
      </motion.div>

      {/* Nico (29-10, captura): mientras carga, el rótulo salía SOLO y sin las tarjetas debajo. Entra con ellas. */}
      <motion.p
        {...entrada(1)}
        id="novedades-de-leasefy"
        className="mb-2.5 mt-5 inline-flex items-center gap-2 rounded-full bg-black/30 px-3 py-1.5 font-mono text-label uppercase text-white ring-1 ring-inset ring-white/15 backdrop-blur-md"
      >
        <span className="size-1.5 rounded-full bg-primary shadow-[0_0_8px_1px] shadow-primary/70" aria-hidden="true" />
        Nuevo en Leasefy · octubre
      </motion.p>

      <ul className="grid grid-cols-2 gap-2.5" aria-labelledby="novedades-de-leasefy">
        <motion.li {...entrada(2)} className={`${VIDRIO} col-span-2 min-h-[136px] py-4 pl-4 pr-[108px]`}>
          <p className={ROTULO}>{ancha.rotulo}</p>
          <p className="mt-1.5 text-[15px] leading-snug text-white">{ancha.titulo}</p>
          {ancha.detalle ? <p className="mt-1 text-[13px] leading-snug text-white/65">{ancha.detalle}</p> : null}
          <Ilustracion
            nombre={ancha.ilustracion}
            tamano={104}
            loading="eager"
            className="pointer-events-none absolute -bottom-2 -right-1 drop-shadow-[0_12px_18px_rgba(0,0,0,0.35)]"
          />
        </motion.li>
        {cuadradas.map((n, i) => (
          <motion.li key={n.titulo} {...entrada(3 + i)} className={`${VIDRIO} flex min-h-[150px] flex-col gap-3 p-4`}>
            <Ilustracion
              nombre={n.ilustracion}
              tamano={52}
              loading="eager"
              className="pointer-events-none -ml-1.5 -mt-1.5 drop-shadow-[0_8px_12px_rgba(0,0,0,0.3)]"
            />
            <div>
              <p className={ROTULO}>{n.rotulo}</p>
              <p className="mt-1 text-[14px] leading-snug text-white">{n.titulo}</p>
            </div>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Lo que Leasefy estrenó en octubre de 2026. Cada una es una función que existe (no se anuncia nada que no esté):
 * crear el inmueble desde el enlace del aviso (27-10), Servi, que revisa las facturas de servicios públicos (29-10),
 * y renovar la vivienda con el IPC y sus avisos (29-10). La primera va ancha; las otras dos, cuadradas.
 */
const NOVEDADES: { rotulo: string; titulo: string; detalle?: string; ilustracion: NombreIlustracion }[] = [
  {
    rotulo: 'Crear inmueble',
    titulo: 'Pega el enlace del aviso y lo creamos',
    detalle: 'Con sus datos y fotos de Fincaraíz, Metrocuadrado o Ciencuadras.',
    ilustracion: 'casa',
  },
  { rotulo: 'Servi', titulo: 'Revisa tus facturas de servicios', ilustracion: 'factura' },
  { rotulo: 'Renovaciones', titulo: 'Vivienda con el IPC y sus avisos', ilustracion: 'ipc' },
];
