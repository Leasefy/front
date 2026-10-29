'use client';

/**
 * LOS WIDGETS DEL INICIO DE SESIÓN (Nico, 29-10-2026: «eso de inmobiliarias que operan con Leasefy, no sé la verdad,
 * hay que hacer otra cosa ahí y que mejor quede debajo del logo, algo pequeño, como si fuera un home con widgets»).
 *
 * Reemplazan los testimonios de abajo a la izquierda. Debajo del logo, sobre el video, como la pantalla de inicio de
 * un teléfono: la hora de Colombia (de verdad) y tres widgets chicos de cómo se ve un día en Leasefy. Los tres llevan
 * datos de EJEMPLO y lo dicen arriba: nada se presenta como una cifra real.
 *
 * Mismo vidrio que tenían los testimonios (es lo que se lee sobre el video). Entran escalonados con la curva de
 * entrada de Cadence; con movimiento reducido aparecen quietos. Decorativos para el lector de pantalla salvo la hora.
 */

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { CalendarCheck, ChatCircleText, Signature } from '@phosphor-icons/react';
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

      <p className="mb-2 mt-4 pl-1 font-mono text-[10.5px] uppercase tracking-[0.14em] text-white/85 [text-shadow:0_1px_10px_rgba(0,0,0,0.55)]" aria-hidden="true">
        Tu día en Leasefy · ejemplo
      </p>
      <div className="grid grid-cols-2 gap-2.5" aria-hidden="true">
        <motion.div {...entrada(1)} className={`${VIDRIO} col-span-2 flex items-center gap-4 px-4 py-3.5`}>
          <Anillo porcentaje={78} />
          <div className="min-w-0">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-white/55">Recaudo del mes</p>
            <p className="mt-0.5 text-[13.5px] leading-snug text-white">
              <span className="font-mono tabular-nums">41 de 52</span> arriendos pagos
            </p>
          </div>
        </motion.div>
        <motion.div {...entrada(2)} className={`${VIDRIO} px-4 py-3.5`}>
          <ChatCircleText size={18} className="text-white/80" />
          <p className="mt-2 text-[13px] leading-snug text-white">Mori le recordó a 6 inquilinos</p>
        </motion.div>
        <motion.div {...entrada(3)} className={`${VIDRIO} px-4 py-3.5`}>
          <Signature size={18} className="text-white/80" />
          <p className="mt-2 text-[13px] leading-snug text-white">3 contratos firmados hoy</p>
        </motion.div>
        <motion.div {...entrada(4)} className={`${VIDRIO} col-span-2 flex items-center gap-3 px-4 py-3`}>
          <CalendarCheck size={18} className="shrink-0 text-white/80" />
          <p className="text-[13px] leading-snug text-white">
            Visita a las <span className="font-mono tabular-nums">3:00 p. m.</span> · Cl 10 # 34-21, Sabaneta
          </p>
        </motion.div>
      </div>
    </div>
  );
}

/** Un anillo de avance en voltaje (el del tablero), sin texto adentro. */
function Anillo({ porcentaje }: { porcentaje: number }) {
  const r = 17;
  const largo = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 44 44" className="h-11 w-11 shrink-0 -rotate-90" aria-hidden="true">
      <circle cx="22" cy="22" r={r} fill="none" stroke="currentColor" strokeWidth="5" className="text-white/15" />
      <circle
        cx="22"
        cy="22"
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={`${(largo * porcentaje) / 100} ${largo}`}
        className="text-primary"
      />
    </svg>
  );
}
