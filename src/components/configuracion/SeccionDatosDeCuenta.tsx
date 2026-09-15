'use client';

/**
 * Tus datos: descargar la copia (derecho de acceso, Ley 1581), volver a los
 * pasos iniciales y las políticas.
 *
 * 🔴 La descarga es una DESCARGA: `POST /users/me/data-export` devuelve el JSON
 * en la respuesta y no manda ningún correo. La configuración del inquilino decía
 * «te enviaremos tus datos por correo en 24 horas» — una promesa legal que nadie
 * cumplía (2026-09-15). Ahora los dos paneles bajan el archivo, que es lo que el
 * back sí hace.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowCounterClockwise, ArrowSquareOut, CaretRight, Check, Download, FileText } from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';

import { toast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { useI18n } from '@/lib/i18n';
import { settingsApi } from '@/lib/api/settings.service';
import { aFechaIso } from '@/lib/fechas-locales';
import { TarjetaDeAjustes } from './piezas';

interface Props {
  /** El borrador local del recorrido inicial de ese panel y a dónde volver. */
  onboarding: { clave: string; ruta: string };
}

const CLASE_FILA =
  'flex h-auto w-full items-center justify-between gap-4 rounded-none px-4 py-4 text-left hover:bg-surface-muted/60 sm:px-5';

function Contenido({ icono: Icono, titulo, descripcion }: { icono: Icon; titulo: string; descripcion: string }) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-muted">
        <Icono className="h-[18px] w-[18px] text-fg-muted" />
      </span>
      <span className="min-w-0 text-left">
        <span className="block text-sm font-medium text-fg">{titulo}</span>
        <span className="block text-sm text-fg-muted">{descripcion}</span>
      </span>
    </span>
  );
}

export function SeccionDatosDeCuenta({ onboarding }: Props) {
  const router = useRouter();
  const { locale } = useI18n();
  const es = locale !== 'en';
  const [abierto, setAbierto] = useState(false);
  const [descargando, setDescargando] = useState(false);

  const descargar = async () => {
    setDescargando(true);
    try {
      const datos = await settingsApi.requestDataExport();
      const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leasefy-mis-datos-${aFechaIso(new Date())}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setAbierto(false);
      toast.success(es ? 'Descargamos tus datos' : 'Your data was downloaded');
    } catch {
      toast.error(es ? 'No pudimos preparar tus datos. Intenta de nuevo.' : 'We could not prepare your data. Try again.');
    } finally {
      setDescargando(false);
    }
  };

  const reiniciar = () => {
    // Sólo el borrador local del recorrido: el perfil del back queda intacto.
    localStorage.removeItem(onboarding.clave);
    window.dispatchEvent(new Event('onboarding-updated'));
    toast.success(es ? 'Listo: vuelves a los pasos iniciales' : 'Onboarding reset');
    router.push(onboarding.ruta);
  };

  const politicas = [
    { href: '/privacidad', titulo: es ? 'Política de privacidad' : 'Privacy policy', desc: es ? 'Cómo cuidamos tus datos' : 'How we protect your data' },
    { href: '/terminos', titulo: es ? 'Términos y condiciones' : 'Terms and conditions', desc: es ? 'Las reglas de uso de Leasefy' : 'The rules for using Leasefy' },
  ];

  return (
    <>
      <TarjetaDeAjustes>
        <Button variant="ghost" hideArrow onClick={() => setAbierto(true)} data-testid="abrir-descargar-datos" className={CLASE_FILA}>
          <Contenido
            icono={Download}
            titulo={es ? 'Descargar mis datos' : 'Download my data'}
            descripcion={es ? 'Un archivo con toda tu información en Leasefy' : 'A file with all your information on Leasefy'}
          />
          <CaretRight className="h-4 w-4 shrink-0 text-fg-muted" />
        </Button>
        <Button variant="ghost" hideArrow onClick={reiniciar} data-testid="reiniciar-onboarding" className={CLASE_FILA}>
          <Contenido
            icono={ArrowCounterClockwise}
            titulo={es ? 'Reiniciar los pasos iniciales' : 'Reset onboarding'}
            descripcion={es ? 'Vuelve a ver el recorrido del comienzo' : 'Go through the first steps again'}
          />
          <CaretRight className="h-4 w-4 shrink-0 text-fg-muted" />
        </Button>
        {politicas.map((p) => (
          <a key={p.href} href={p.href} target="_blank" rel="noreferrer" className={CLASE_FILA}>
            <Contenido icono={FileText} titulo={p.titulo} descripcion={p.desc} />
            <ArrowSquareOut className="h-4 w-4 shrink-0 text-fg-muted" />
          </a>
        ))}
      </TarjetaDeAjustes>

      <SettingsModal open={abierto} onClose={() => setAbierto(false)} title={es ? 'Descargar mis datos' : 'Download my data'}>
        <div className="space-y-4">
          <p className="text-sm text-fg-muted">
            {es
              ? 'Te bajamos ahora mismo un archivo JSON con lo que Leasefy guarda de ti:'
              : 'We will download a JSON file right now with what Leasefy stores about you:'}
          </p>
          <ul className="space-y-2 rounded-lg bg-surface-muted p-4">
            {(es
              ? ['Tu perfil y tus preferencias', 'Postulaciones y guardados', 'Contratos y arriendos', 'Pagos', 'Inmuebles publicados']
              : ['Your profile and preferences', 'Applications and saved properties', 'Contracts and leases', 'Payments', 'Listed properties']
            ).map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-fg">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success-soft">
                  <Check className="h-3 w-3 text-success" />
                </span>
                {item}
              </li>
            ))}
          </ul>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" hideArrow onClick={() => setAbierto(false)} className="flex-1">
              {es ? 'Cancelar' : 'Cancel'}
            </Button>
            <Button hideArrow isLoading={descargando} disabled={descargando} onClick={descargar} className="flex-1" data-testid="descargar-datos">
              {!descargando && <Download className="h-4 w-4" />}
              {es ? 'Descargar' : 'Download'}
            </Button>
          </div>
        </div>
      </SettingsModal>
    </>
  );
}
