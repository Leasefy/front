'use client';

/**
 * Preferencias del panel: tema, idioma y las novedades de los agentes.
 *
 * El tema y el idioma son del navegador (next-themes / i18n). La preferencia
 * de novedades sí se guarda (localStorage + servidor, `PanelPrefsContext`), y
 * «Volver a verlas» es sólo de esta sesión.
 */

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { Compass, Globe, Moon } from '@phosphor-icons/react';

import { Button, Switch } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useI18n } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n/types';
import { usePanelPrefs } from '@/lib/context/PanelPrefsContext';
import { resetAgentIntros } from '@/components/tour/AgentIntroModal';
import { FilaDeAjuste, TarjetaDeAjustes } from './piezas';

export function SeccionPreferencias() {
  const { t, locale, setLocale } = useI18n();
  const { resolvedTheme, setTheme } = useTheme();
  const { tourDismissed, setTourDismissed, relaunchTour } = usePanelPrefs();
  const [cambiandoTour, setCambiandoTour] = useState(false);
  // El tema real sólo se conoce en el cliente: hasta montar, el interruptor
  // no puede afirmar nada.
  const [montado, setMontado] = useState(false);
  useEffect(() => {
    setMontado(true);
  }, []);

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
        descripcion={t('inmobiliaria.config.preferences.panelTourDesc')}
      >
        <Switch
          checked={tourDismissed === false}
          aria-label={t('inmobiliaria.config.preferences.panelTour')}
          aria-busy={cambiandoTour || tourDismissed === null}
          disabled={cambiandoTour || tourDismissed === null}
          onCheckedChange={async () => {
            if (tourDismissed === null) return;
            setCambiandoTour(true);
            try {
              // El interruptor está en ON cuando las novedades están prendidas
              // (dismissed=false); el aviso habla del estado NUEVO.
              const siguiente = !tourDismissed;
              await setTourDismissed(siguiente);
              toast.success(
                siguiente
                  ? t('inmobiliaria.config.preferences.panelTourDismissed')
                  : t('inmobiliaria.config.preferences.panelTourEnabled'),
              );
            } finally {
              setCambiandoTour(false);
            }
          }}
        />
      </FilaDeAjuste>

      <FilaDeAjuste
        icono={Compass}
        titulo={t('inmobiliaria.config.preferences.relaunchTour')}
        descripcion={t('inmobiliaria.config.preferences.relaunchTourDesc')}
      >
        <Button
          variant="secondary"
          size="sm"
          hideArrow
          onClick={() => {
            // Reponer la preferencia global NO alcanza: cada novedad guarda su
            // propio «ya la vi» en localStorage, así que sin este reset el
            // botón no mostraría nada.
            resetAgentIntros();
            relaunchTour();
            toast.success(t('inmobiliaria.config.preferences.relaunchTourStarted'));
          }}
        >
          {t('inmobiliaria.config.preferences.relaunchTour')}
        </Button>
      </FilaDeAjuste>
    </TarjetaDeAjustes>
  );
}
