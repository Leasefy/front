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
import { ArrowCounterClockwise, Check, Download, FileText } from '@phosphor-icons/react';

import { toast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { useI18n } from '@/lib/i18n';
import { settingsApi } from '@/lib/api/settings.service';
import { aFechaIso } from '@/lib/fechas-locales';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { FilaQueAbre, FilaQueEnlaza, TarjetaDeAjustes } from './piezas';

interface Props {
  /** El borrador local del recorrido inicial de ese panel y a dónde volver. */
  onboarding: { clave: string; ruta: string };
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
    } catch (err) {
      toast.error(
        es
          ? mensajeParaLaPersona(err, {
              porDefecto: 'No pudimos preparar tus datos. Intenta de nuevo.',
              accion: 'preparar tus datos',
            })
          : 'We could not prepare your data. Try again.',
      );
    } finally {
      setDescargando(false);
    }
  };

  const reiniciar = () => {
    // Sólo el borrador local del recorrido: el perfil del back queda intacto.
    localStorage.removeItem(onboarding.clave);
    window.dispatchEvent(new Event('onboarding-updated'));
    toast.success(es ? 'Listo: vuelves a los primeros pasos' : 'Back to the first steps');
    router.push(onboarding.ruta);
  };

  const politicas = [
    { href: '/privacidad', titulo: es ? 'Política de privacidad' : 'Privacy policy', desc: es ? 'Cómo cuidamos tus datos' : 'How we protect your data' },
    { href: '/terminos', titulo: es ? 'Términos y condiciones' : 'Terms and conditions', desc: es ? 'Las reglas de uso de Leasefy' : 'The rules for using Leasefy' },
  ];

  return (
    <>
      {/* Glow up r26: las filas comunes de Configuración (el ícono suelto, sin
          la caja gris) y cada una dice qué pasa al tocarla. */}
      <TarjetaDeAjustes>
        <FilaQueAbre
          testId="abrir-descargar-datos"
          icono={Download}
          titulo={es ? 'Descargar mis datos' : 'Download my data'}
          descripcion={es ? 'Un archivo con todo lo que Leasefy guarda de ti' : 'A file with everything Leasefy stores about you'}
          onClick={() => setAbierto(true)}
        />
        <FilaQueAbre
          testId="reiniciar-onboarding"
          icono={ArrowCounterClockwise}
          titulo={es ? 'Volver a los primeros pasos' : 'Go through the first steps again'}
          descripcion={
            es
              ? 'Te llevamos al recorrido del comienzo; tus datos no cambian'
              : 'We take you back to the first steps; your data stays as it is'
          }
          onClick={reiniciar}
        />
        {politicas.map((p) => (
          <FilaQueEnlaza
            key={p.href}
            href={p.href}
            icono={FileText}
            titulo={p.titulo}
            descripcion={p.desc}
            etiquetaNuevaPestana={es ? '(se abre en otra pestaña)' : '(opens in a new tab)'}
          />
        ))}
      </TarjetaDeAjustes>

      <SettingsModal
        open={abierto}
        onClose={() => setAbierto(false)}
        title={es ? 'Descargar mis datos' : 'Download my data'}
        icon={<Download weight="bold" />}
        description={
          es
            ? 'Te bajamos ahora mismo un archivo JSON con lo que Leasefy guarda de ti:'
            : 'We will download a JSON file right now with what Leasefy stores about you:'
        }
        footer={
          <>
            <Button variant="outline" hideArrow onClick={() => setAbierto(false)} disabled={descargando}>
              {es ? 'Cancelar' : 'Cancel'}
            </Button>
            <Button hideArrow isLoading={descargando} disabled={descargando} onClick={descargar} data-testid="descargar-datos">
              {!descargando && <Download className="h-4 w-4" />}
              {es ? 'Descargar' : 'Download'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <ul className="space-y-2 rounded-lg border border-border p-4">
            {(es
              ? ['Tu perfil y tus preferencias', 'Postulaciones y guardados', 'Contratos y arriendos', 'Pagos', 'Inmuebles publicados']
              : ['Your profile and preferences', 'Applications and saved properties', 'Contracts and leases', 'Payments', 'Listed properties']
            ).map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-fg">
                {/* El chulo suelto (antes en un círculo verde). */}
                <Check className="h-4 w-4 shrink-0 text-fg-muted" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </SettingsModal>
    </>
  );
}
