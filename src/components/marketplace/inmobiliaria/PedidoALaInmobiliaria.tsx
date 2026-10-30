'use client';

import { useState } from 'react';
import { MagnifyingGlass } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/use-auth';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';

/**
 * «¿No encuentras lo que buscas? Déjale un pedido» (Juan, 27-10-2026: «un pedido es un cliente que dice quiero una
 * casa de 3 habitaciones… dentro del perfil de cada uno… le llega a la inmobiliaria o al agente»). Le llega a ESTA
 * inmobiliaria como interesado en Prospección. Sin cuenta (Juan y Nico, 28-10-2026: «yo no pondría al cliente a crear
 * en ese momento la cuenta, sino que deje datos personales, como un lead»): nombre completo, celular y correo
 * (`POST …/pedidos/sin-cuenta`); con cuenta, como siempre (`POST /marketplace/inmobiliarias/:id/pedidos`).
 */
export function PedidoALaInmobiliaria({ id, nombre }: { id: string; nombre: string }) {
  const { isAuthenticated } = useAuth();
  const [texto, setTexto] = useState('');
  const [quien, setQuien] = useState({ nombre: '', celular: '', correo: '' });
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
      if (quien.nombre.trim().length < 3) return setError('Escribe tu nombre completo.');
      if (!/^\+?[0-9 ()-]{7,20}$/.test(quien.celular.trim())) return setError('Escribe tu celular con números (por ejemplo 300 123 4567).');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(quien.correo.trim())) return setError('Escribe un correo válido.');
    }
    setEnviando(true);
    try {
      if (isAuthenticated) await apiClient.post(`/marketplace/inmobiliarias/${id}/pedidos`, { texto: texto.trim() });
      else
        await apiClient.post(`/marketplace/inmobiliarias/${id}/pedidos/sin-cuenta`, {
          texto: texto.trim(),
          nombre: quien.nombre.trim(),
          celular: quien.celular.trim(),
          correo: quien.correo.trim(),
        });
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
          {!isAuthenticated ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <Input
                value={quien.nombre}
                onChange={(e) => setQuien((q) => ({ ...q, nombre: e.target.value }))}
                placeholder="Nombre completo"
                aria-label="Tu nombre completo"
                autoComplete="name"
                maxLength={120}
                data-testid="pedido-nombre"
              />
              <Input
                value={quien.celular}
                onChange={(e) => setQuien((q) => ({ ...q, celular: e.target.value }))}
                placeholder="Celular"
                aria-label="Tu celular"
                inputMode="tel"
                autoComplete="tel"
                maxLength={20}
                data-testid="pedido-celular"
              />
              <Input
                value={quien.correo}
                onChange={(e) => setQuien((q) => ({ ...q, correo: e.target.value }))}
                placeholder="Correo"
                aria-label="Tu correo"
                type="email"
                autoComplete="email"
                maxLength={200}
                data-testid="pedido-correo"
              />
            </div>
          ) : null}
          <ErrorDelCampo id="pedido-error" mensaje={error} />
          <Button className="mt-3" hideArrow onClick={() => void enviar()} isLoading={enviando} data-testid="pedido-enviar">
            Dejar mi pedido
          </Button>
        </>
      )}
    </section>
  );
}
