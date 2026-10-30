'use client';

/**
 * El aviso de lo programado (D4, pregunta 19 — Nico 30-10: «aviso al abrir el chat + correo/notificación»).
 *
 * Arriba del chat del panel, al abrirlo: lo que quedó LISTO esperando el clic (cuántas, la primera con su
 * texto) con «Hacerlo ahora», que manda «haz lo programado» en el hilo (el chat muestra qué va a hacer y
 * pide su «Sí, hazlo»), y lo que SALIÓ SOLO en Automático, dicho como hecho. Una caja de Cadence del chat;
 * nada navega fuera del chat. Se lee una vez por inmobiliaria mientras el panel esté abierto, y «Ahora no»
 * lo guarda hasta la próxima vez que se abra el panel.
 */
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { useAparecer } from '@/components/cobros/extracto-bancario/cuentas-del-extracto';
import { useAuth } from '@/lib/auth/use-auth';
import { useBetaChatContext } from '@/lib/context/BetaChatContext';
import { useTr } from '@/lib/i18n/use-tr';
import { formatNumber } from '@/lib/format';
import { leerLoProgramadoListo, MENSAJE_DE_HACERLO_AHORA, type LoProgramadoListo } from '@/lib/chat/programado-listo';
import { CajaDelChat } from './CajaDelChat';

interface Leido {
  datos: LoProgramadoListo | null;
  cerrado: boolean;
}

const LEIDOS = new Map<string, Leido>();
const SOLAS_VISIBLES = 3;

/** Sólo pruebas. */
export function __olvidarLoProgramadoListo(): void {
  LEIDOS.clear();
}

export function AvisoDeLoProgramado({ className }: { className?: string }) {
  const tr = useTr();
  const { agency } = useAuth();
  const agencyId = agency?.id ?? null;
  const { sendMessage, isThinking, isStreaming, isAgentsRunning } = useBetaChatContext();
  const ocupado = isThinking || isStreaming || isAgentsRunning;
  const aparecer = useAparecer();
  const [leido, setLeido] = useState<Leido | undefined>(() => (agencyId ? LEIDOS.get(agencyId) : undefined));

  useEffect(() => {
    if (!agencyId) return;
    const ya = LEIDOS.get(agencyId);
    if (ya) {
      setLeido(ya);
      return;
    }
    const controller = new AbortController();
    void leerLoProgramadoListo(agencyId, controller.signal).then((datos) => {
      if (controller.signal.aborted) return;
      const nuevo = { datos, cerrado: false };
      LEIDOS.set(agencyId, nuevo);
      setLeido(nuevo);
    });
    return () => controller.abort();
  }, [agencyId]);

  if (!agencyId || !leido?.datos || leido.cerrado) return null;

  const cerrar = () => {
    const cerrado = { ...leido, cerrado: true };
    LEIDOS.set(agencyId, cerrado);
    setLeido(cerrado);
  };
  const { listas, salieronSolas } = leido.datos;
  const primera = listas[0];
  const solas = salieronSolas.slice(0, SOLAS_VISIBLES);

  const pie = primera ? (
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        variant="outline"
        hideArrow
        disabled={ocupado}
        data-testid="hacer-lo-programado"
        onClick={() => {
          if (ocupado) return;
          cerrar();
          sendMessage(MENSAJE_DE_HACERLO_AHORA);
        }}
      >
        {tr('Hacerlo ahora')}
      </Button>
      <Button size="sm" variant="ghost" hideArrow onClick={cerrar} data-testid="lo-programado-ahora-no">
        {tr('Ahora no')}
      </Button>
    </div>
  ) : (
    <Button size="sm" variant="ghost" hideArrow onClick={cerrar} data-testid="lo-programado-entendido">
      {tr('Entendido')}
    </Button>
  );

  return (
    <motion.div {...aparecer} className={className}>
      <CajaDelChat
        role="region"
        aria-label={tr('Lo que programaste')}
        data-testid="aviso-de-lo-programado"
        titulo={primera ? tr('Quedó listo lo que programaste') : tr('Ya se hizo lo que programaste')}
        conteo={
          primera ? (
            <span className="font-mono text-label uppercase text-fg-muted" data-testid="listas-de-lo-programado">
              {formatNumber(listas.length)}
            </span>
          ) : undefined
        }
        pie={pie}
      >
        {primera && (
          <>
            <p className="break-words font-body text-body text-fg" data-testid="primera-lista">
              {primera.texto}
            </p>
            <p className="mt-1 font-body text-body-sm text-fg-muted">
              {listas.length > 1 ? `${tr('Y {n} más esperando tu clic.', { n: formatNumber(listas.length - 1) })} ` : ''}
              {tr('Antes de hacer nada te muestro qué voy a hacer.')}
            </p>
          </>
        )}
        {solas.length > 0 && (
          <div className={primera ? 'mt-3 border-t border-border-faint pt-3' : undefined}>
            {primera && <p className="font-mono text-label uppercase text-fg-subtle">{tr('Ya se hizo')}</p>}
            <ul aria-label={tr('Se hizo solo en Automático')} className={primera ? 'mt-1.5 space-y-1.5' : 'space-y-1.5'}>
              {solas.map((s) => (
                <li key={s.id} className="flex items-start gap-1.5" data-testid="salio-sola">
                  <CheckCircle weight="fill" className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                  <span className="min-w-0 break-words font-body text-body-sm text-fg">{s.texto}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CajaDelChat>
    </motion.div>
  );
}
