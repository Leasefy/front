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
 * Mismo vidrio que tenían los testimonios (es lo que se lee sobre el video). Entran escalonados con la curva de
 * entrada de Cadence; con movimiento reducido aparecen quietos. Decorativos para el lector de pantalla salvo la hora.
 */

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowsClockwise, LinkSimple, Receipt } from '@phosphor-icons/react';
import { motionDuration, motionEase } from '@leasefy/cadence';

const VIDRIO =
  'rounded-[18px] border border-white/15 bg-black/45 text-white shadow-[0_18px_48px_-20px_rgba(0,0,0,0.6)] backdrop-blur-2xl';

function horaDeColombia(ahora: Date): { hora: string; dia: string } {
  const hora = new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', hour: 'numeric', minute: '2-digit' }).format(ahora);
  const dia = new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', weekday: 'long', day: 'numeric', month: 'long' }).format(ahora);
  return { hora, dia: dia.charAt(0).toUpperCase() + dia.slice(1) };
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
        };
  const { hora, dia } = ahora ? horaDeColombia(ahora) : { hora: '', dia: '' };

  return (
    <div className="absolute left-8 top-[88px] w-[296px]" data-testid="widgets-de-inicio">
      <motion.div {...entrada(0)} className={`${VIDRIO} px-5 py-4`}>
        <p className="font-heading text-[34px] font-[420] leading-none tracking-[-0.03em] tabular-nums" aria-live="off">
          {hora || ' '}
        </p>
        <p className="mt-1.5 text-[13px] text-white/70">{dia ? `${dia} · Colombia` : ' '}</p>
      </motion.div>

      {/* Nico (29-10, captura): mientras carga, el rótulo salía SOLO y sin las tarjetas debajo. Entra con ellas. */}
      <motion.p
        {...entrada(1)}
        id="novedades-de-leasefy"
        className="mb-2 mt-4 inline-block rounded-full bg-black/35 px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.14em] text-white backdrop-blur-md"
      >
        Novedades de octubre
      </motion.p>
      <ul className="grid grid-cols-2 gap-2.5" aria-labelledby="novedades-de-leasefy">
        {NOVEDADES.map((n, i) => (
          <motion.li
            key={n.titulo}
            {...entrada(2 + i)}
            className={`${VIDRIO} ${n.ancha ? 'col-span-2 flex items-start gap-3' : ''} px-4 py-3.5`}
          >
            <n.Icono size={18} className={`shrink-0 text-white/80 ${n.ancha ? 'mt-0.5' : ''}`} aria-hidden="true" />
            <div className={n.ancha ? 'min-w-0' : 'mt-2'}>
              <p className="text-[13.5px] leading-snug text-white">{n.titulo}</p>
              {n.detalle ? <p className="mt-0.5 text-[13px] leading-snug text-white/65">{n.detalle}</p> : null}
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
 * y renovar la vivienda con el IPC y sus avisos (29-10).
 */
const NOVEDADES: { titulo: string; detalle?: string; Icono: typeof LinkSimple; ancha?: boolean }[] = [
  {
    titulo: 'Crea el inmueble con el enlace del aviso',
    detalle: 'Trae los datos y las fotos de Fincaraíz, Metrocuadrado o Ciencuadras.',
    Icono: LinkSimple,
    ancha: true,
  },
  { titulo: 'Servi revisa tus facturas de servicios', Icono: Receipt },
  { titulo: 'Renueva la vivienda con el IPC', Icono: ArrowsClockwise },
];
