'use client';

import { useCallback, useEffect, useState } from 'react';
import { Copy, IdentificationBadge, Trash } from '@phosphor-icons/react';

import { Button } from '@/components/ui';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { toast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api/client';
import { propertiesApi, type AgenteDelInmueble as Agente } from '@/lib/api/properties.service';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { DESTINO_DEL_AGENTE } from '@/lib/auth/perfil-de-onboarding';

/**
 * «Tu agente inmobiliario» en el inmueble del propietario (Nico, 27-10-2026: «como propietario tiene su
 * plataforma, inmobiliaria tiene su plataforma… nosotros dejamos construida la plataforma para agentes
 * inmobiliarios también»). El back ya lo tenía (fase 2.1, febrero): el propietario asigna un agente por su correo
 * (`POST /properties/:id/agents`) y el agente trabaja el inmueble —candidatos, visitas, contrato y chat— desde su
 * cuenta. Aquí se asigna, se ve y se quita.
 *
 * El back responde lo mismo para «no existe», «no es agente» o «no se puede» (para no revelar quién tiene cuenta):
 * se dice eso y se ofrece el enlace para que el agente cree su cuenta gratis.
 */
export function AgenteDelInmueble({ propertyId }: { propertyId: string }) {
  const [agentes, setAgentes] = useState<Agente[] | null>(null);
  const [falloAlLeer, setFalloAlLeer] = useState<unknown>(null);
  const [correo, setCorreo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sinCuenta, setSinCuenta] = useState(false);
  const [asignando, setAsignando] = useState(false);

  const leer = useCallback(async () => {
    setFalloAlLeer(null);
    try {
      setAgentes(await propertiesApi.getAgents(propertyId));
    } catch (e) {
      setFalloAlLeer(e);
    }
  }, [propertyId]);

  useEffect(() => {
    void leer();
  }, [leer]);

  const asignar = async (e: React.FormEvent) => {
    e.preventDefault();
    const escrito = correo.trim();
    setSinCuenta(false);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(escrito)) {
      setError('Escribe el correo con el que tu agente entra a Leasefy.');
      return;
    }
    setError(null);
    setAsignando(true);
    try {
      await propertiesApi.assignAgent(propertyId, escrito);
      setCorreo('');
      toast.success('Tu agente ya puede trabajar este inmueble', { description: escrito });
      await leer();
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setSinCuenta(true);
        setError('Ese correo no tiene una cuenta de agente inmobiliario en Leasefy.');
      } else {
        setError(mensajeParaLaPersona(err, { porDefecto: 'No pudimos asignar a tu agente. Intenta de nuevo.', accion: 'asignar a tu agente' }));
      }
    } finally {
      setAsignando(false);
    }
  };

  const quitar = async (agente: Agente) => {
    try {
      await propertiesApi.removeAgent(propertyId, agente.id);
      toast.success('Le quitaste el acceso a este inmueble', {
        description: nombreDe(agente),
        action: {
          label: 'Deshacer',
          onClick: () => {
            void propertiesApi.assignAgent(propertyId, agente.email).then(leer).catch(() => undefined);
          },
        },
      });
      await leer();
    } catch (err) {
      toast.error(mensajeParaLaPersona(err, { porDefecto: 'No pudimos quitarle el acceso. Intenta de nuevo.', accion: 'quitarle el acceso' }));
    }
  };

  const enlace = typeof window !== 'undefined' ? `${window.location.origin}${DESTINO_DEL_AGENTE}` : DESTINO_DEL_AGENTE;
  const copiarEnlace = async () => {
    try {
      await navigator.clipboard.writeText(enlace);
      toast.success('Enlace copiado', { description: 'Mándaselo a tu agente para que cree su cuenta gratis.' });
    } catch {
      toast.warning('No se pudo copiar', { description: enlace });
    }
  };

  return (
    <div className="space-y-6" data-testid="agente-del-inmueble">
      <div className="rounded-lg border border-border bg-surface p-5 sm:p-6">
        <h3 className="flex items-center gap-2 text-[17px] font-medium text-fg">
          <IdentificationBadge className="h-5 w-5 text-primary" aria-hidden />
          Tu agente inmobiliario
        </h3>
        <p className="mt-1.5 max-w-[60ch] text-[14px] leading-relaxed text-fg-muted">
          Asígnale este inmueble a tu agente: verá los candidatos, agendará las visitas y te escribirá por aquí. Tú
          sigues decidiendo a quién se lo arriendas.
        </p>

        <form onSubmit={asignar} className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-start" noValidate>
          <div className="min-w-0 flex-1">
            <Input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="correo@de-tu-agente.com"
              aria-label="Correo de tu agente"
              aria-invalid={Boolean(error) || undefined}
              aria-describedby={error ? 'agente-correo-error' : undefined}
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              data-testid="agente-correo"
            />
            <ErrorDelCampo id="agente-correo-error" mensaje={error} />
            {sinCuenta && (
              <div className="mt-3 rounded-md bg-surface-muted p-3 text-[13.5px] text-fg-muted" data-testid="agente-sin-cuenta">
                Pídele que cree su cuenta de agente (es gratis) y vuelve a asignarlo con ese mismo correo.
                <button
                  type="button"
                  onClick={copiarEnlace}
                  className="mt-2 flex items-center gap-1.5 font-medium text-primary hover:underline"
                >
                  <Copy className="h-4 w-4" aria-hidden />
                  Copiar el enlace para crear su cuenta
                </button>
              </div>
            )}
          </div>
          <Button type="submit" isLoading={asignando} data-testid="agente-asignar">
            Asignar
          </Button>
        </form>
      </div>

      {falloAlLeer ? (
        <FalloDeCarga error={falloAlLeer} queEs="tus agentes" onReintentar={leer} />
      ) : agentes === null ? null : agentes.length === 0 ? (
        <EmptyState
          icon={IdentificationBadge}
          ilustracion="equipo"
          title="Todavía no tiene agente"
          description="Cuando asignes a tu agente, aparece aquí y puede empezar a mostrar el inmueble."
        />
      ) : (
        <ul className="divide-y divide-border-faint rounded-lg border border-border bg-surface" data-testid="agentes-del-inmueble">
          {agentes.map((a) => (
            <li key={a.id} className="flex items-center gap-3 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[13px] font-medium text-primary">
                {iniciales(a)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-medium text-fg">{nombreDe(a)}</span>
                <span className="block truncate text-[13px] text-fg-muted">
                  {[a.email, a.phone].filter(Boolean).join(' · ')}
                </span>
              </span>
              <Button variant="ghost" size="sm" onClick={() => void quitar(a)} aria-label={`Quitarle el acceso a ${nombreDe(a)}`}>
                <Trash className="h-4 w-4" aria-hidden />
                Quitar
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function nombreDe(a: Agente): string {
  return [a.firstName, a.lastName].filter(Boolean).join(' ').trim() || a.email;
}

function iniciales(a: Agente): string {
  const nombre = nombreDe(a);
  return nombre
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}
