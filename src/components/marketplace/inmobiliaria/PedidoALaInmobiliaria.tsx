'use client';

import { useState } from 'react';
import { MagnifyingGlass } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/use-auth';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { useAqui } from '@/lib/marketplace/use-inmobiliarias';
import { useCuentaParaSeguir } from '../CuentaParaPublicar';

/**
 * «¿No encuentras lo que buscas? Déjale un pedido» (Juan, 27-10-2026: «un pedido es un cliente que dice quiero una
 * casa de 3 habitaciones… dentro del perfil de cada uno… le llega a la inmobiliaria o al agente»). Con cuenta, como
 * «Seguir»: le llega a ESTA inmobiliaria como interesado en Prospección (`POST /marketplace/inmobiliarias/:id/pedidos`).
 */
export function PedidoALaInmobiliaria({ id, nombre }: { id: string; nombre: string }) {
  const { isAuthenticated } = useAuth();
  const { abrir, ventana } = useCuentaParaSeguir(useAqui(), nombre);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);

  const enviar = async () => {
    setError(null);
    if (texto.trim().length < 10) {
      setError('Cuéntale un poco más: qué tipo de inmueble, dónde y para cuándo.');
      return;
    }
    if (!isAuthenticated) {
      abrir();
      return;
    }
    setEnviando(true);
    try {
      await apiClient.post(`/marketplace/inmobiliarias/${id}/pedidos`, { texto: texto.trim() });
      setListo(true);
    } catch (e) {
      setError(mensajeParaLaPersona(e, { porDefecto: 'No pudimos dejar tu pedido. Intenta de nuevo.', accion: 'dejar tu pedido' }));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <section className="rounded-lg border border-border bg-surface p-5" data-testid="pedido-a-la-inmobiliaria">
      <h2 className="flex items-center gap-2 font-heading text-[18px] font-[450] text-fg">
        <MagnifyingGlass className="h-5 w-5 text-primary" aria-hidden="true" />
        ¿No encuentras lo que buscas?
      </h2>
      {listo ? (
        <p className="mt-2 text-[14px] text-fg" role="status" data-testid="pedido-listo">
          Listo: tu pedido le llegó a {nombre}. Te escriben cuando tengan algo para ti.
        </p>
      ) : (
        <>
          <p className="mt-1 text-[13.5px] text-fg-muted">Déjale un pedido a {nombre} y te busca el inmueble.</p>
          <Textarea
            className="mt-3 w-full"
            rows={3}
            maxLength={1000}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Ej.: Busco una casa de 3 habitaciones en El Poblado, con parqueadero, hasta $4.000.000."
            aria-label="Tu pedido"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'pedido-error' : undefined}
            data-testid="pedido-texto"
          />
          <ErrorDelCampo id="pedido-error" mensaje={error} />
          <Button className="mt-3" hideArrow onClick={() => void enviar()} isLoading={enviando} data-testid="pedido-enviar">
            Dejar mi pedido
          </Button>
        </>
      )}
      {ventana}
    </section>
  );
}
