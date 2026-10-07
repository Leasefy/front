'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { useAuth } from '@/lib/auth/use-auth';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { VERSION_POLITICA_DE_TRATAMIENTO, VERSION_TERMINOS } from '@/lib/legal/versiones';
import {
  aceptacionesLegalesApi,
  rutaSinVentanaLegal,
  type EstadoDeLasAceptaciones,
} from '@/lib/api/aceptaciones-legales.service';

/**
 * 🔴 RE-ACEPTAR LA POLÍTICA v4.0 Y LOS TÉRMINOS v2.1 AL PRÓXIMO INGRESO
 * (FALTANTES, 05-10-2026; decisión 1 del 05-10: «SÍ, una vez, al próximo
 * ingreso, con una ventana que dice qué cambió. Sin aceptar no se sigue»).
 *
 *   · UNA vez: el back guarda la aceptación con versión y fecha
 *     (`aceptaciones_legales`); aceptada, no vuelve hasta la próxima versión.
 *   · Sin aceptar no se sigue: la ventana no se cierra con la ✕, Esc ni un clic
 *     afuera. La salida es «Salir» (cerrar sesión).
 *   · Sin bucles ni pantallas negadas: no aparece en /privacidad ni /terminos
 *     (hay que poder leerlas: los enlaces abren en otra pestaña), ni en el
 *     inicio de sesión ni en las firmas por enlace; y si el back no puede
 *     guardarla (`disponible: false`) o no responde, NO se muestra.
 *
 * Un solo montaje, en el layout raíz dentro de `AuthProvider`.
 */
export function AceptarLegalesAlEntrar() {
  const { user, signOut } = useAuth();
  const ruta = usePathname();
  const [estado, setEstado] = useState<EstadoDeLasAceptaciones | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const userId = user?.id ?? null;
  const fuera = rutaSinVentanaLegal(ruta);

  useEffect(() => {
    setEstado(null);
    setError(null);
    if (!userId) return;
    let vivo = true;
    aceptacionesLegalesApi
      .estado()
      .then((e) => vivo && setEstado(e))
      .catch(() => vivo && setEstado(null));
    return () => {
      vivo = false;
    };
  }, [userId]);

  const abierta = Boolean(userId && !fuera && estado?.disponible && estado.debeAceptar);

  const aceptar = async () => {
    if (enviando) return;
    setEnviando(true);
    setError(null);
    try {
      setEstado(await aceptacionesLegalesApi.aceptar(VERSION_POLITICA_DE_TRATAMIENTO, VERSION_TERMINOS));
    } catch (err) {
      setError(mensajeParaLaPersona(err, { porDefecto: 'No pudimos guardar tu aceptación. Inténtalo otra vez.', accion: 'aceptar la política y los términos' }));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={abierta} onOpenChange={() => undefined}>
      <DialogContent
        size="md"
        hideClose
        // QA-MIGRACION-95 (06-10): por encima de la puesta en marcha («¿Migramos tu inmobiliaria?» y su
        // velo de espera van en z-[1000]). El diálogo es modal y les quita los clics: debajo de ellas,
        // la persona veía la pregunta de la migración sin poder contestarla y esta ventana quedaba tapada.
        overlayClassName="z-[1100]"
        className="z-[1100]"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        data-testid="aceptar-legales"
      >
        <DialogHeader>
          <DialogTitle>Actualizamos la política de datos y los términos</DialogTitle>
          <DialogDescription>Para seguir usando Leasefy, lee lo que cambió y acéptalo. Lo pedimos una sola vez.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">Qué cambió</p>
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground" data-testid="aceptar-legales-cambios">
            {(estado?.cambios ?? []).map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">
            Puedes leer completas la{' '}
            <a href="/privacidad" target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-2">
              Política de tratamiento de datos
            </a>{' '}
            y los{' '}
            <a href="/terminos" target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-2">
              Términos y condiciones
            </a>
            .
          </p>
          <ErrorDelCampo id="aceptar-legales-error" mensaje={error} />
        </div>
        <DialogFooter>
          <Button variant="outline" hideArrow disabled={enviando} onClick={() => void signOut()} data-testid="aceptar-legales-salir">
            Salir
          </Button>
          <Button hideArrow isLoading={enviando} disabled={enviando} onClick={() => void aceptar()} data-testid="aceptar-legales-acepto">
            Acepto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
