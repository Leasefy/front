'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { agencyApi } from '@/lib/api/inmobiliaria.service';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { cn } from '@/lib/utils';

/**
 * «¿Cómo te activas?» (Nico, 27-10-2026: el agente inmobiliario se activa con su RUT de persona natural; eligió
 * «que él los diga»). Antes de ir al asistente que pide el NIT, la persona dice si es una empresa o una persona
 * natural. Como persona natural responde tres preguntas de sí/no —por defecto NO, lo común en un agente— y se
 * guardan en el perfil tributario de la cuenta (`responsableIva`, `agenteRetenedor*`, los mismos campos de
 * Configuración, que el contador revisa después). En el asistente, su NIT es su cédula con el dígito de
 * verificación y la razón social, su nombre.
 *
 * La facturación electrónica no se guarda aquí: está apagada hasta que se configura en Facturación; si dice que sí
 * factura, se le dice dónde hacerlo.
 */
type Como = 'empresa' | 'persona';
type Pregunta = 'iva' | 'retencion' | 'factura';

const PREGUNTAS: { clave: Pregunta; texto: string; ayuda: string }[] = [
  { clave: 'iva', texto: '¿Eres responsable de IVA?', ayuda: 'Lo dice tu RUT (responsabilidad 48).' },
  { clave: 'retencion', texto: '¿Eres agente de retención?', ayuda: 'Si la DIAN te nombró agente de retención.' },
  { clave: 'factura', texto: '¿Facturas electrónicamente?', ayuda: 'Si ya emites facturas electrónicas a tus clientes.' },
];

export function ComoTeActivas({ destino }: { destino: string }) {
  const router = useRouter();
  const [como, setComo] = useState<Como>('empresa');
  const [respuestas, setRespuestas] = useState<Record<Pregunta, boolean>>({ iva: false, retencion: false, factura: false });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const seguir = async () => {
    setError(null);
    if (como === 'persona') {
      setGuardando(true);
      try {
        await agencyApi.updateAgency({
          responsableIva: respuestas.iva,
          agenteRetenedorRenta: respuestas.retencion,
          agenteRetenedorIva: respuestas.retencion && respuestas.iva,
          agenteRetenedorIca: respuestas.retencion,
        });
      } catch (err) {
        setGuardando(false);
        setError(mensajeParaLaPersona(err, { porDefecto: 'No pudimos guardar tus datos. Intenta de nuevo.', accion: 'guardar tus datos' }));
        return;
      }
    }
    router.push(destino);
  };

  return (
    <div className="mt-6 space-y-4" data-testid="como-te-activas">
      <fieldset>
        <legend className="text-[14px] font-medium text-fg">¿Cómo te activas?</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2" role="radiogroup">
          {(
            [
              ['empresa', 'Como empresa', 'Una inmobiliaria con NIT de empresa.'],
              ['persona', 'Como persona natural', 'Un agente inmobiliario con tu RUT.'],
            ] as const
          ).map(([valor, titulo, detalle]) => (
            <button
              key={valor}
              type="button"
              role="radio"
              aria-checked={como === valor}
              onClick={() => setComo(valor)}
              className={cn(
                'rounded-md border p-3 text-left transition-colors duration-fast',
                como === valor ? 'border-primary bg-primary-soft/40' : 'border-border hover:border-fg-subtle',
              )}
              data-testid={`activar-como-${valor}`}
            >
              <span className="block text-[14px] font-medium text-fg">{titulo}</span>
              <span className="block text-[13px] text-fg-muted">{detalle}</span>
            </button>
          ))}
        </div>
      </fieldset>

      {como === 'persona' && (
        <div className="space-y-3 rounded-md bg-surface-muted p-4" data-testid="preguntas-de-persona-natural">
          <p className="text-[13px] text-fg-muted">
            En el siguiente paso tu NIT es tu cédula con el dígito de verificación, y la razón social, tu nombre.
          </p>
          {PREGUNTAS.map((p) => (
            <div key={p.clave} className="flex items-center justify-between gap-3">
              <span>
                <span className="block text-[14px] text-fg">{p.texto}</span>
                <span className="block text-[12.5px] text-fg-subtle">{p.ayuda}</span>
              </span>
              <span className="flex shrink-0 gap-1" role="radiogroup" aria-label={p.texto}>
                {([false, true] as const).map((v) => (
                  <button
                    key={String(v)}
                    type="button"
                    role="radio"
                    aria-checked={respuestas[p.clave] === v}
                    onClick={() => setRespuestas((r) => ({ ...r, [p.clave]: v }))}
                    className={cn(
                      'h-8 min-w-12 rounded-md px-3 text-[13px] font-medium transition-colors duration-fast',
                      respuestas[p.clave] === v ? 'bg-surface text-fg shadow-sm' : 'text-fg-muted hover:text-fg',
                    )}
                    data-testid={`${p.clave}-${v ? 'si' : 'no'}`}
                  >
                    {v ? 'Sí' : 'No'}
                  </button>
                ))}
              </span>
            </div>
          ))}
          {respuestas.factura && (
            <p className="text-[13px] text-fg-muted">Al terminar, conecta tu facturación electrónica en Facturación.</p>
          )}
        </div>
      )}

      <ErrorDelCampo id="como-te-activas-error" mensaje={error} />
      <Button className="h-11 rounded-full px-6" onClick={() => void seguir()} isLoading={guardando} data-testid="activar-mi-cuenta">
        Activar mi cuenta
      </Button>
    </div>
  );
}
