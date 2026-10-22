'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, EnvelopeSimple, Phone, WhatsappLogo } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { embudoApi } from '@/lib/api/embudo.service';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';

/**
 * 🔴 PL-21 (QA del 04-10-2026): un aviso SIN horario de visitas decía «Sin
 * disponibilidad en los próximos días. Vuelve a revisar pronto» y el
 * interesado se iba. Ahora deja su nombre y su teléfono, sin cuenta, y la
 * inmobiliaria lo llama para cuadrar la visita (entra a su embudo con aviso al
 * asesor). No sale ningún mensaje automático hacia la persona.
 */
type Canal = 'whatsapp' | 'llamada' | 'correo';

/**
 * 21-10-2026 (reunión con Portofino: «sólo le pone llámame; sería bueno
 * escríbeme al WhatsApp o cómo quieres que te contactemos»): la persona elige.
 * WhatsApp primero: es como más se contesta en Colombia.
 */
const CANALES: { valor: Canal; nombre: string; icono: typeof Phone; boton: string; listo: string }[] = [
  { valor: 'whatsapp', nombre: 'WhatsApp', icono: WhatsappLogo, boton: 'Que me escriban por WhatsApp', listo: 'Listo: te escriben por WhatsApp para cuadrar la visita.' },
  { valor: 'llamada', nombre: 'Llamada', icono: Phone, boton: 'Que me llamen', listo: 'Listo: te llamamos para cuadrar la visita.' },
  { valor: 'correo', nombre: 'Correo', icono: EnvelopeSimple, boton: 'Que me escriban al correo', listo: 'Listo: te escriben al correo para cuadrar la visita.' },
];

const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function TeLlamamosParaLaVisita({
  propertyId,
  nombreInicial = '',
  correoInicial = '',
}: {
  propertyId: string;
  nombreInicial?: string;
  correoInicial?: string;
}) {
  const [canal, setCanal] = useState<Canal>('whatsapp');
  const [nombre, setNombre] = useState(nombreInicial);
  const [telefono, setTelefono] = useState('');
  const [correo, setCorreo] = useState(correoInicial);
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const digitos = telefono.replace(/\D/g, '');
  const telefonoBien = digitos.length >= 7 && digitos.length <= 12;
  const elegido = CANALES.find((c) => c.valor === canal) ?? CANALES[0];
  const puede =
    nombre.trim().length >= 2 &&
    (canal === 'correo' ? CORREO_VALIDO.test(correo.trim()) : telefonoBien) &&
    !enviando;

  const enviar = async () => {
    if (!puede) return;
    setEnviando(true);
    setError(null);
    try {
      await embudoApi.teLlamamos(propertyId, {
        nombre: nombre.trim(),
        canal,
        ...(canal === 'correo' ? { correo: correo.trim() } : { telefono: telefono.trim() }),
      });
      setListo(true);
    } catch (err) {
      setError(
        mensajeParaLaPersona(err, {
          porDefecto: 'No pudimos guardar tus datos. Prueba de nuevo en un momento.',
          accion: 'pedir que te contacten',
        }),
      );
    } finally {
      setEnviando(false);
    }
  };

  return (
    <AnimatePresence mode="wait" initial={false}>
      {listo ? (
        <motion.div
          key="listo"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="py-4 text-center"
          data-testid="te-llamamos-listo"
        >
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[hsl(var(--success-500))]">
            <Check className="h-6 w-6 text-white" weight="bold" />
          </div>
          <p className="text-sm font-medium text-foreground">{elegido.listo}</p>
          <p className="mt-1 text-[12px] text-muted-foreground">La inmobiliaria ya tiene tus datos.</p>
        </motion.div>
      ) : (
        <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3" data-testid="te-llamamos">
          <div className="text-center">
            <p className="text-[13px] font-medium text-foreground">Este inmueble todavía no tiene horarios en línea.</p>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Déjanos tus datos y dinos cómo quieres que te contactemos para cuadrar la visita.
            </p>
          </div>
          <div role="radiogroup" aria-label="Cómo quieres que te contactemos" className="grid grid-cols-3 gap-1.5" data-testid="te-llamamos-canal">
            {CANALES.map((c) => {
              const Icono = c.icono;
              const activo = c.valor === canal;
              return (
                <button
                  key={c.valor}
                  type="button"
                  role="radio"
                  aria-checked={activo}
                  onClick={() => setCanal(c.valor)}
                  className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-[12px] font-medium transition-colors ${
                    activo ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:bg-muted/40'
                  }`}
                  data-testid={`te-llamamos-canal-${c.valor}`}
                >
                  <Icono className="h-4 w-4" weight={activo ? 'fill' : 'regular'} aria-hidden="true" />
                  {c.nombre}
                </button>
              );
            })}
          </div>
          <Input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Tu nombre"
            autoComplete="name"
            maxLength={200}
            aria-label="Tu nombre"
            data-testid="te-llamamos-nombre"
          />
          {canal === 'correo' ? (
            <Input
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="Tu correo"
              autoComplete="email"
              maxLength={255}
              aria-label="Tu correo"
              data-testid="te-llamamos-correo"
            />
          ) : (
            <Input
              type="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder={canal === 'whatsapp' ? 'Tu WhatsApp (300 123 4567)' : 'Tu celular (300 123 4567)'}
              autoComplete="tel"
              maxLength={20}
              aria-label={canal === 'whatsapp' ? 'Tu WhatsApp' : 'Tu celular'}
              data-testid="te-llamamos-telefono"
            />
          )}
          <ErrorDelCampo id="te-llamamos-error" mensaje={error} className="text-[12px] text-center" />
          <Button
            hideArrow
            disabled={!puede}
            isLoading={enviando}
            onClick={() => void enviar()}
            className="h-auto w-full gap-2 rounded-xl py-4 text-[14px]"
            data-testid="te-llamamos-enviar"
          >
            <elegido.icono className="h-4 w-4" aria-hidden="true" />
            {elegido.boton}
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
