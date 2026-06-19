'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Image,
  Upload,
  Trash,
  Palette,
  ArrowCounterClockwise,
  Check,
  SpinnerGap,
  Warning,
  Eye,
  Link,
  Bell,
  User,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n';
import type { AgencyBranding } from '@/lib/types/inmobiliaria';
import { getDefaultBranding } from '@/lib/types/inmobiliaria';

interface ConfigBrandingProps {
  branding: AgencyBranding;
  onSave?: (branding: AgencyBranding) => void;
  isLoading?: boolean;
}

// Preset color palettes for quick selection
const COLOR_PRESETS = [
  {
    name: 'Electric Blue',
    primary: '#1A40FF',
    secondary: '#6B6B6B',
    accent: '#9B9B9B',
  },
  {
    name: 'Blue',
    primary: '#2563EB',
    secondary: '#0891B2',
    accent: '#F97316',
  },
  {
    name: 'Purple',
    primary: '#7C3AED',
    secondary: '#14B8A6',
    accent: '#EF4444',
  },
  {
    name: 'Green',
    primary: '#059669',
    secondary: '#0284C7',
    accent: '#F59E0B',
  },
  {
    name: 'Slate',
    primary: '#475569',
    secondary: '#0284C7',
    accent: '#10B981',
  },
  {
    name: 'Rose',
    primary: '#E11D48',
    secondary: '#7C3AED',
    accent: '#FBBF24',
  },
];

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ACCEPTED_FORMATS = ['image/png', 'image/jpeg', 'image/svg+xml'];

/**
 * ConfigBranding - Color picker and logo upload for agency branding
 * Allows customization of primary, secondary, and accent colors
 * Logo can be uploaded and stored as base64 for demo purposes
 */
export function ConfigBranding({
  branding,
  onSave,
  isLoading = false,
}: ConfigBrandingProps) {
  const { t } = useI18n();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<AgencyBranding>({ ...branding });
  const [isDragging, setIsDragging] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasChanges =
    formData.primaryColor !== branding.primaryColor ||
    formData.secondaryColor !== branding.secondaryColor ||
    formData.accentColor !== branding.accentColor ||
    formData.logoFile !== branding.logoFile;

  const updateColor = useCallback(
    (field: 'primaryColor' | 'secondaryColor' | 'accentColor', value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const applyPreset = useCallback((preset: (typeof COLOR_PRESETS)[number]) => {
    setFormData((prev) => ({
      ...prev,
      primaryColor: preset.primary,
      secondaryColor: preset.secondary,
      accentColor: preset.accent,
    }));
    toast.success(t('inmobiliaria.config.brandingSection.paletteApplied', { name: preset.name }));
  }, [t]);

  const resetToDefaults = useCallback(() => {
    const defaults = getDefaultBranding();
    setFormData((prev) => ({
      ...prev,
      primaryColor: defaults.primaryColor,
      secondaryColor: defaults.secondaryColor,
      accentColor: defaults.accentColor,
    }));
    toast.info(t('inmobiliaria.config.brandingSection.colorsReset'));
  }, [t]);

  const handleFileSelect = useCallback(
    (file: File) => {
      setPreviewError(null);

      if (!ACCEPTED_FORMATS.includes(file.type)) {
        setPreviewError(t('inmobiliaria.config.brandingSection.unsupportedFormat'));
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setPreviewError(t('inmobiliaria.config.brandingSection.fileTooLarge'));
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setFormData((prev) => ({
          ...prev,
          logoFile: base64,
          logoUrl: undefined,
        }));
      };
      reader.onerror = () => {
        setPreviewError(t('inmobiliaria.config.brandingSection.readError'));
      };
      reader.readAsDataURL(file);
    },
    [t]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const removeLogo = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      logoFile: undefined,
      logoUrl: undefined,
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    toast.info(t('inmobiliaria.config.brandingSection.logoRemoved'));
  }, [t]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Save to localStorage for demo
      localStorage.setItem('inmobiliaria-branding', JSON.stringify(formData));

      onSave?.(formData);
      toast.success(t('inmobiliaria.config.toasts.brandingSaved'));
    } catch (err) {
      toast.error(t('inmobiliaria.config.brandingSection.saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  const currentLogo = formData.logoFile || formData.logoUrl;

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-muted rounded-md w-1/3" />
        <div className="h-48 bg-muted rounded-xl" />
        <div className="h-32 bg-muted rounded-xl" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* Logo Section */}
      <div className="space-y-4 p-5 rounded-xl bg-card border border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-foreground">
            <Image className="w-5 h-5 text-fg-muted" weight="duotone" />
            <h3 className="text-base font-semibold">{t('inmobiliaria.config.brandingSection.agencyLogo')}</h3>
          </div>
          {currentLogo && (
            <button
              type="button"
              onClick={removeLogo}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-danger hover:bg-danger-soft transition-colors"
            >
              <Trash className="w-4 h-4" />
              {t('inmobiliaria.common.delete')}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Current Logo Preview */}
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t('inmobiliaria.config.brandingSection.currentLogo')}</p>
            <div className="h-32 rounded-xl border-2 border-dashed border-border bg-muted/30 flex items-center justify-center">
              {currentLogo ? (
                <img
                  src={currentLogo}
                  alt="Logo"
                  className="max-h-24 max-w-full object-contain"
                />
              ) : (
                <div className="text-center text-muted-foreground">
                  <Image className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">{t('inmobiliaria.config.brandingSection.noLogo')}</p>
                </div>
              )}
            </div>
          </div>

          {/* Upload Zone */}
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t('inmobiliaria.config.brandingSection.uploadNewLogo')}</p>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'h-32 rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all',
                isDragging
                  ? 'border-primary/40 bg-primary-soft'
                  : 'border-border hover:border-primary/40 hover:bg-muted/50'
              )}
            >
              <Upload
                className={cn(
                  'w-8 h-8 mb-2',
                  isDragging ? 'text-primary' : 'text-muted-foreground'
                )}
              />
              <p className="text-sm text-muted-foreground text-center">
                {t('inmobiliaria.config.brandingSection.dragOrClick')}{' '}
                <span className="text-primary font-medium">{t('inmobiliaria.config.brandingSection.clickHere')}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PNG, JPG, SVG (max 2MB)
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".png,.jpg,.jpeg,.svg"
              onChange={handleInputChange}
              className="hidden"
            />
          </div>
        </div>

        {previewError && (
          <div className="flex items-center gap-2 p-3 rounded-md bg-danger-soft text-danger text-sm">
            <Warning className="w-4 h-4" />
            {previewError}
          </div>
        )}
      </div>

      {/* Color Palette Section */}
      <div className="space-y-4 p-5 rounded-xl bg-card border border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-foreground">
            <Palette className="w-5 h-5 text-fg-muted" weight="duotone" />
            <h3 className="text-base font-semibold">{t('inmobiliaria.config.brandingSection.brandColors')}</h3>
          </div>
          <button
            type="button"
            onClick={resetToDefaults}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-muted transition-colors"
          >
            <ArrowCounterClockwise className="w-4 h-4" />
            {t('inmobiliaria.config.brandingSection.restore')}
          </button>
        </div>

        {/* Color Pickers */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <ColorPickerField
            label={t('inmobiliaria.config.brandingSection.primaryColor')}
            value={formData.primaryColor}
            onChange={(value) => updateColor('primaryColor', value)}
            description={t('inmobiliaria.config.brandingSection.primaryColorDesc')}
          />
          <ColorPickerField
            label={t('inmobiliaria.config.brandingSection.secondaryColor')}
            value={formData.secondaryColor}
            onChange={(value) => updateColor('secondaryColor', value)}
            description={t('inmobiliaria.config.brandingSection.secondaryColorDesc')}
          />
          <ColorPickerField
            label={t('inmobiliaria.config.brandingSection.accentColor')}
            value={formData.accentColor}
            onChange={(value) => updateColor('accentColor', value)}
            description={t('inmobiliaria.config.brandingSection.accentColorDesc')}
          />
        </div>

        {/* Preset Palettes */}
        <div className="pt-4 border-t border-border">
          <p className="text-sm font-medium text-foreground mb-3">
            {t('inmobiliaria.config.brandingSection.presetPalettes')}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {COLOR_PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => applyPreset(preset)}
                className="group p-3 rounded-md border border-border hover:border-primary/30 transition-all"
              >
                <div className="flex gap-1 mb-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: preset.primary }}
                  />
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: preset.secondary }}
                  />
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: preset.accent }}
                  />
                </div>
                <p className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                  {preset.name}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Preview Section */}
      <div className="space-y-4 p-5 rounded-xl bg-card border border-border">
        <div className="flex items-center gap-2 text-foreground">
          <Eye className="w-5 h-5 text-fg-muted" weight="duotone" />
          <h3 className="text-base font-semibold">{t('inmobiliaria.config.brandingSection.preview')}</h3>
        </div>

        <div className="p-6 rounded-xl bg-muted/30 border border-border space-y-6">
          {/* Header Preview */}
          <div className="flex items-center justify-between p-4 rounded-md bg-background border border-border">
            <div className="flex items-center gap-3">
              {currentLogo ? (
                <img
                  src={currentLogo}
                  alt="Logo"
                  className="h-8 w-auto object-contain"
                />
              ) : (
                <div
                  className="w-8 h-8 rounded-md flex items-center justify-center text-white font-bold text-sm"
                  style={{ backgroundColor: formData.primaryColor }}
                >
                  A
                </div>
              )}
              <span className="font-semibold text-foreground">{t('inmobiliaria.config.brandingSection.myAgency')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <User className="w-5 h-5 text-muted-foreground" />
            </div>
          </div>

          {/* Buttons Preview */}
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground font-medium">{t('inmobiliaria.config.brandingSection.buttons')}</p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="px-4 py-2 rounded-md text-white text-sm font-medium transition-opacity hover:opacity-90"
                style={{ backgroundColor: formData.primaryColor }}
              >
                {t('inmobiliaria.config.brandingSection.primaryButton')}
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-md text-white text-sm font-medium transition-opacity hover:opacity-90"
                style={{ backgroundColor: formData.secondaryColor }}
              >
                {t('inmobiliaria.config.brandingSection.secondaryButton')}
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-md border text-sm font-medium transition-colors"
                style={{
                  borderColor: formData.primaryColor,
                  color: formData.primaryColor,
                }}
              >
                Outline
              </button>
            </div>
          </div>

          {/* Badges Preview */}
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground font-medium">Badges</p>
            <div className="flex flex-wrap gap-2">
              <span
                className="px-2.5 py-1 rounded-full text-xs font-medium text-white"
                style={{ backgroundColor: formData.primaryColor }}
              >
                {t('inmobiliaria.common.active')}
              </span>
              <span
                className="px-2.5 py-1 rounded-full text-xs font-medium text-white"
                style={{ backgroundColor: formData.secondaryColor }}
              >
                {t('inmobiliaria.common.completed')}
              </span>
              <span
                className="px-2.5 py-1 rounded-full text-xs font-medium text-white"
                style={{ backgroundColor: formData.accentColor }}
              >
                {t('inmobiliaria.common.pending')}
              </span>
            </div>
          </div>

          {/* Links Preview */}
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground font-medium">{t('inmobiliaria.config.brandingSection.links')}</p>
            <div className="flex flex-wrap gap-4">
              <a
                href="#"
                className="text-sm font-medium flex items-center gap-1 hover:underline"
                style={{ color: formData.primaryColor }}
                onClick={(e) => e.preventDefault()}
              >
                <Link className="w-4 h-4" />
                {t('inmobiliaria.config.brandingSection.viewProperty')}
              </a>
              <a
                href="#"
                className="text-sm font-medium hover:underline"
                style={{ color: formData.secondaryColor }}
                onClick={(e) => e.preventDefault()}
              >
                {t('inmobiliaria.config.brandingSection.viewDetails')}
              </a>
            </div>
          </div>

          {/* Alert Preview */}
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground font-medium">{t('inmobiliaria.config.brandingSection.alert')}</p>
            <div
              className="p-3 rounded-md text-sm"
              style={{
                backgroundColor: `${formData.accentColor}15`,
                borderLeft: `3px solid ${formData.accentColor}`,
              }}
            >
              <span style={{ color: formData.accentColor }}>
                {t('inmobiliaria.config.brandingSection.alertExample')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <AnimatePresence>
        {hasChanges && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex items-center justify-end gap-2 pt-4 border-t border-border"
          >
            <Button
              type="button"
              variant="secondary"
              hideArrow
              onClick={() => setFormData({ ...branding })}
              disabled={isSaving}
            >
              {t('inmobiliaria.config.brandingSection.discard')}
            </Button>
            <Button
              type="button"
              hideArrow
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <SpinnerGap className="w-4 h-4 animate-spin" />
                  {t('inmobiliaria.common.saving')}
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  {t('inmobiliaria.config.brandingSection.saveBranding')}
                </>
              )}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Color Picker Field Component
interface ColorPickerFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  description?: string;
}

function ColorPickerField({
  label,
  value,
  onChange,
  description,
}: ColorPickerFieldProps) {
  const [inputValue, setInputValue] = useState(value);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    // Validate hex color
    if (/^#[0-9A-Fa-f]{6}$/.test(newValue)) {
      onChange(newValue);
    }
  };

  const handleColorPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.toUpperCase();
    setInputValue(newValue);
    onChange(newValue);
  };

  // Sync inputValue with prop value
  if (value !== inputValue && /^#[0-9A-Fa-f]{6}$/.test(value)) {
    setInputValue(value);
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground">{label}</label>
      <div className="flex items-center gap-2">
        <div className="relative">
          <input
            type="color"
            value={value}
            onChange={handleColorPickerChange}
            className="w-10 h-10 rounded-md cursor-pointer border border-border overflow-hidden"
            style={{ padding: 0 }}
          />
        </div>
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder="#000000"
          maxLength={7}
          className="flex-1 px-3 py-2 rounded-md border border-border bg-background text-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-all uppercase"
        />
      </div>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

export default ConfigBranding;
