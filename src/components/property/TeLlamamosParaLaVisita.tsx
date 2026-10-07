'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Phone } from '@phosphor-icons/react';
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
export function TeLlamamosParaLaVisita({
  propertyId,
  nombreInicial = '',
}: {
  propertyId: string;
  nombreInicial?: string;
}) {
  const [nombre, setNombre] = useState(nombreInicial);
  const [telefono, setTelefono] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const digitos = telefono.replace(/\D/g, '');
  const puede = nombre.trim().length >= 2 && digitos.length >= 7 && digitos.length <= 12 && !enviando;

  const enviar = async () => {
    if (!puede) return;
    setEnviando(true);
    setError(null);
    try {
      await embudoApi.teLlamamos(propertyId, { nombre: nombre.trim(), telefono: telefono.trim() });
      setListo(true);
    } catch (err) {
      setError(
        mensajeParaLaPersona(err, {
          porDefecto: 'No pudimos guardar tus datos. Prueba de nuevo en un momento.',
          accion: 'pedir que te llamen',
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
          <p className="text-sm font-medium text-foreground">Listo: te llamamos para cuadrar la visita.</p>
          <p className="mt-1 text-[12px] text-muted-foreground">La inmobiliaria ya tiene tu nombre y tu teléfono.</p>
        </motion.div>
      ) : (
        <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3" data-testid="te-llamamos">
          <div className="text-center">
            <p className="text-[13px] font-medium text-foreground">Este inmueble todavía no tiene horarios en línea.</p>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Déjanos tu nombre y tu teléfono y te llamamos para cuadrar la visita.
            </p>
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
          <Input
            type="tel"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="Tu celular (300 123 4567)"
            autoComplete="tel"
            maxLength={20}
            aria-label="Tu celular"
            data-testid="te-llamamos-telefono"
          />
          <ErrorDelCampo id="te-llamamos-error" mensaje={error} className="text-[12px] text-center" />
          <Button
            hideArrow
            disabled={!puede}
            isLoading={enviando}
            onClick={() => void enviar()}
            className="h-auto w-full gap-2 rounded-xl py-4 text-[14px]"
            data-testid="te-llamamos-enviar"
          >
            <Phone className="h-4 w-4" />
            Que me llamen
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
