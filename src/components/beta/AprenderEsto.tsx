'use client';

import { useId, useState } from 'react';
import { Check, Lightbulb, X } from '@phosphor-icons/react';
import { IconButton } from '@leasefy/cadence';
import { toast } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import {
  decidirAprendizaje,
  leerAprendizaje,
  propuestaDeshecha,
  type Aprendizaje,
  type LecturaDelAprendizaje,
} from '@/lib/chat/aprender';
import type { ChatMessage } from '@/lib/types/beta-chat';

/**
 * «¿Aprendo esto?» — debajo de una respuesta, SÓLO para el administrador.
 *
 * Nico (23-09): el cerebro de cada inmobiliaria «debe aprender de TODO lo que
 * sucede dentro del chat». De lo que pasó en esta respuesta (una acción que se
 * deshizo, la tarjeta que se eligió entre varias con el mismo nombre, cómo le
 * dicen aquí a algo) el micro arma un candidato; nada entra solo. El
 * administrador lo lee TAL CUAL entraría y decide ahí mismo: «Sí, apréndelo» o
 * «No». Todo dentro del chat: ningún enlace a otra pantalla.
 *
 * Quién lo ve lo decide `MessageActions` (`isAdmin` del ERP, el mismo permiso
 * del panel); el micro lo vuelve a exigir.
 */
export function AprenderEsto({ message }: { message: ChatMessage }) {
  const { t } = useI18n();
  const { agency } = useAuth();
  const agencyId = agency?.id ?? null;
  const panelId = useId();
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [lectura, setLectura] = useState<LecturaDelAprendizaje | null>(null);
  const [fallo, setFallo] = useState(false);
  const [decidiendo, setDecidiendo] = useState<string | null>(null);
  const propuestaId = propuestaDeshecha(message);

  const cargar = async () => {
    setCargando(true);
    setFallo(false);
    const r = await leerAprendizaje(agencyId, message.turnoId, propuestaId);
    setCargando(false);
    if (!r) {
      setFallo(true);
      return;
    }
    setLectura(r);
  };

  const alternar = () => {
    if (abierto) {
      setAbierto(false);
      return;
    }
    setAbierto(true);
    if (!lectura) void cargar();
  };

  const decidir = async (a: Aprendizaje, decision: 'aprender' | 'descartar') => {
    setDecidiendo(a.id);
    const r = await decidirAprendizaje(agencyId, message.turnoId, { id: a.id, decision, propuestaId });
    setDecidiendo(null);
    if (!r || !r.aplicado || !r.estado) {
      toast.error(r?.motivo || t('beta.cerebro.errorGuardar'));
      return;
    }
    setLectura((l) =>
      l
        ? {
            ...l,
            leccionesEnUso: r.leccionesEnUso,
            aprendizajes: l.aprendizajes.map((x) => (x.id === a.id ? { ...x, estado: r.estado! } : x)),
          }
        : l
    );
    toast.success(decision === 'aprender' ? t('beta.cerebro.aprendidoToast') : t('beta.cerebro.descartadoToast'));
  };

  const aprendioLeccionSinUso =
    lectura?.leccionesEnUso === false &&
    lectura.aprendizajes.some((a) => a.clase === 'leccion' && a.estado === 'aprendido');

  return (
    <div className="mt-1" data-testid="aprender-esto">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        hideArrow
        onClick={alternar}
        aria-expanded={abierto}
        aria-controls={panelId}
        title={t('beta.cerebro.ayuda')}
        className="h-7 px-2 text-[13px] text-fg-muted hover:text-foreground"
      >
        <Lightbulb className="w-4 h-4" weight={abierto ? 'fill' : 'regular'} aria-hidden="true" />
        {t('beta.cerebro.boton')}
      </Button>

      {abierto && (
        <div
          id={panelId}
          role="region"
          aria-label={t('beta.cerebro.titulo')}
          className="mt-2 rounded-lg border border-border bg-surface-muted/40 p-3"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-[13px] font-medium text-foreground">{t('beta.cerebro.titulo')}</p>
            <IconButton
              type="button"
              icon={<X className="w-3.5 h-3.5" />}
              variant="ghost"
              onClick={() => setAbierto(false)}
              className="p-1 rounded-sm text-fg-subtle hover:text-fg-muted"
              aria-label={t('beta.cerebro.cerrar')}
            />
          </div>

          {cargando && (
            <p role="status" className="mt-2 text-[13px] text-fg-muted">
              {t('beta.cerebro.cargando')}
            </p>
          )}

          {fallo && !cargando && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <p role="alert" className="text-[13px] text-danger">
                {t('beta.cerebro.error')}
              </p>
              <Button type="button" size="sm" variant="outline" hideArrow onClick={() => void cargar()}>
                {t('beta.cerebro.reintentar')}
              </Button>
            </div>
          )}

          {lectura && !cargando && (
            <>
              {lectura.aprendizajes.length === 0 && (
                <p className="mt-2 text-[13px] text-fg-muted" data-testid="aprender-nada">
                  {lectura.motivo || t('beta.cerebro.nada')}
                </p>
              )}
              <ul className="mt-2 space-y-2">
                {lectura.aprendizajes.map((a) => (
                  <li key={a.id} className="rounded-md border border-border bg-surface p-3" data-testid="aprendizaje">
                    <p className="text-[13px] text-fg-muted">{t(`beta.cerebro.origen.${a.origen}`)}</p>
                    <p className="mt-1 text-sm text-foreground">{a.texto}</p>
                    {a.estado === 'nuevo' ? (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          hideArrow
                          isLoading={decidiendo === a.id}
                          disabled={decidiendo !== null}
                          onClick={() => void decidir(a, 'aprender')}
                        >
                          {t('beta.cerebro.aprender')}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          hideArrow
                          disabled={decidiendo !== null}
                          onClick={() => void decidir(a, 'descartar')}
                        >
                          {t('beta.cerebro.descartar')}
                        </Button>
                      </div>
                    ) : (
                      <p role="status" className="mt-2 flex items-center gap-1 text-[13px] text-fg-muted">
                        {a.estado === 'aprendido' && <Check className="w-4 h-4 text-primary" aria-hidden="true" />}
                        {a.estado === 'aprendido' ? t('beta.cerebro.aprendido') : t('beta.cerebro.descartado')}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
              {aprendioLeccionSinUso && (
                <p className="mt-2 text-[13px] text-fg-muted" data-testid="aprender-sin-uso">
                  {t('beta.cerebro.sinUso')}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
