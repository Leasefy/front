'use client';

/**
 * Preferencias de la cuenta del inquilino y del propietario: tema e idioma, con
 * las mismas filas que la configuración de la inmobiliaria. Las dos son del
 * navegador (next-themes / i18n), no del servidor.
 *
 * La de la inmobiliaria suma las novedades y el recorrido del panel, que viven
 * en `PanelPrefsContext` y sólo existen allá.
 */

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Globe, Moon } from '@phosphor-icons/react';

import { toast } from '@/components/ui/toast';
import { Switch } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useI18n } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n/types';
import { FilaDeAjuste, TarjetaDeAjustes } from './piezas';

const NS = 'inmobiliaria.config.preferences';

export function SeccionPreferenciasDeCuenta() {
  const { t, locale, setLocale } = useI18n();
  const { resolvedTheme, setTheme } = useTheme();
  // El tema real sólo se conoce en el cliente: hasta montar, el interruptor no
  // puede afirmar nada.
  const [montado, setMontado] = useState(false);
  useEffect(() => {
    setMontado(true);
  }, []);

  return (
    <TarjetaDeAjustes>
      <FilaDeAjuste icono={Moon} titulo={t(`${NS}.darkMode`)} descripcion={t(`${NS}.darkModeDesc`)}>
        <Switch
          checked={montado && resolvedTheme === 'dark'}
          aria-label={t(`${NS}.darkMode`)}
          onCheckedChange={() => {
            setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
            toast.success(resolvedTheme === 'dark' ? t(`${NS}.lightThemeEnabled`) : t(`${NS}.darkThemeEnabled`));
          }}
        />
      </FilaDeAjuste>

      <FilaDeAjuste icono={Globe} titulo={t(`${NS}.language`)} descripcion={t(`${NS}.languageDesc`)}>
        <Select
          value={locale}
          onValueChange={(v) => {
            setLocale(v as Locale);
            toast.success(v === 'en' ? t(`${NS}.langChangedEn`) : t(`${NS}.langChangedEs`));
          }}
        >
          <SelectTrigger className="w-36" aria-label={t(`${NS}.language`)}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="es">Español</SelectItem>
            <SelectItem value="en">English</SelectItem>
          </SelectContent>
        </Select>
      </FilaDeAjuste>
    </TarjetaDeAjustes>
  );
}
