'use client';

/**
 * Preferencias del panel: tema, idioma y el recorrido del panel.
 *
 * El tema y el idioma son del navegador (next-themes / i18n).
 *
 * 🔴 El recorrido NO es una preferencia de nadie (Nico, 23-09): «el
 * onboarding solo debe aparecer una sola vez por inmobiliaria». Aquí había un
 * interruptor que lo volvía a «prender», y eso ya no se puede cumplir —el
 * «visto» es de la AGENCIA y la primera persona que lo cierra gana—, así que
 * sería un cable muerto. Queda lo que sí vale: decir si la inmobiliaria ya lo
 * vio (quién y cuándo) y «Ver el recorrido ahora», que dura sólo esta sesión
 * y no cambia el «visto» de la agencia (`PanelPrefsContext`).
 */

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { toast } from '@/components/ui/toast';
import { Compass, Globe, Moon } from '@phosphor-icons/react';

import { Button, Switch } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useI18n } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n/types';
import { formatDate } from '@/lib/format';
import { usePanelPrefs } from '@/lib/context/PanelPrefsContext';
import { FilaDeAjuste, TarjetaDeAjustes } from './piezas';

export function SeccionPreferencias() {
  const { t, locale, setLocale } = useI18n();
  const { resolvedTheme, setTheme } = useTheme();
  const { tourDismissed, vistaDelRecorrido, relaunchTour } = usePanelPrefs();
  // El tema real sólo se conoce en el cliente: hasta montar, el interruptor
  // no puede afirmar nada.
  const [montado, setMontado] = useState(false);
  useEffect(() => {
    setMontado(true);
  }, []);

  // Lo que se sabe del recorrido, en una frase. Sin respuesta del servidor
  // no se afirma nada: se dice la regla.
  const estadoDelRecorrido = vistaDelRecorrido
    ? vistaDelRecorrido.quien
      ? t(
          vistaDelRecorrido.estado === 'completo'
            ? 'inmobiliaria.config.preferences.panelTourVistoCompleto'
            : 'inmobiliaria.config.preferences.panelTourVistoOmitido',
          {
            quien: vistaDelRecorrido.quien,
            fecha: formatDate(vistaDelRecorrido.fecha, locale),
          },
        )
      : t('inmobiliaria.config.preferences.panelTourVistoSinQuien', {
          fecha: formatDate(vistaDelRecorrido.fecha, locale),
        })
    : tourDismissed === false
      ? t('inmobiliaria.config.preferences.panelTourPendiente')
      : t('inmobiliaria.config.preferences.panelTourDesc');

  return (
    <TarjetaDeAjustes>
      <FilaDeAjuste
        icono={Moon}
        titulo={t('inmobiliaria.config.preferences.darkMode')}
        descripcion={t('inmobiliaria.config.preferences.darkModeDesc')}
      >
        <Switch
          checked={montado && resolvedTheme === 'dark'}
          aria-label={t('inmobiliaria.config.preferences.darkMode')}
          onCheckedChange={() => {
            setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
            toast.success(
              resolvedTheme === 'dark'
                ? t('inmobiliaria.config.preferences.lightThemeEnabled')
                : t('inmobiliaria.config.preferences.darkThemeEnabled'),
            );
          }}
        />
      </FilaDeAjuste>

      <FilaDeAjuste
        icono={Globe}
        titulo={t('inmobiliaria.config.preferences.language')}
        descripcion={t('inmobiliaria.config.preferences.languageDesc')}
      >
        <Select
          value={locale}
          onValueChange={(v) => {
            setLocale(v as Locale);
            toast.success(
              v === 'en'
                ? t('inmobiliaria.config.preferences.langChangedEn')
                : t('inmobiliaria.config.preferences.langChangedEs'),
            );
          }}
        >
          <SelectTrigger className="w-36" aria-label={t('inmobiliaria.config.preferences.language')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="es">Español</SelectItem>
            <SelectItem value="en">English</SelectItem>
          </SelectContent>
        </Select>
      </FilaDeAjuste>

      <FilaDeAjuste
        icono={Compass}
        titulo={t('inmobiliaria.config.preferences.panelTour')}
        descripcion={estadoDelRecorrido}
      >
        <Button
          variant="secondary"
          size="sm"
          hideArrow
          onClick={() => {
            // Sólo esta sesión: también vuelve a presentar a los agentes de IA
            // una vez, sin tocar lo que la inmobiliaria ya tiene visto.
            relaunchTour();
            toast.success(t('inmobiliaria.config.preferences.relaunchTourStarted'));
          }}
          data-testid="ver-el-recorrido-ahora"
        >
          {t('inmobiliaria.config.preferences.relaunchTour')}
        </Button>
      </FilaDeAjuste>
    </TarjetaDeAjustes>
  );
}
