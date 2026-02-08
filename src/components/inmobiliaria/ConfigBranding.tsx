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
import { toast } from 'sonner';
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
    name: 'Indigo',
    primary: '#4F46E5',
    secondary: '#10B981',
    accent: '#F59E0B',
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
    toast.success(`Paleta "${preset.name}" aplicada`);
  }, []);

  const resetToDefaults = useCallback(() => {
    const defaults = getDefaultBranding();
    setFormData((prev) => ({
      ...prev,
      primaryColor: defaults.primaryColor,
      secondaryColor: defaults.secondaryColor,
      accentColor: defaults.accentColor,
    }));
    toast.info('Colores restaurados a valores por defecto');
  }, []);

  const handleFileSelect = useCallback(
    (file: File) => {
      setPreviewError(null);

      if (!ACCEPTED_FORMATS.includes(file.type)) {
        setPreviewError('Formato no soportado. Usa PNG, JPG o SVG.');
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setPreviewError('El archivo es muy grande. Máximo 2MB.');
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
        setPreviewError('Error al leer el archivo');
      };
      reader.readAsDataURL(file);
    },
    []
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
    toast.info('Logo eliminado');
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Save to localStorage for demo
      localStorage.setItem('inmobiliaria-branding', JSON.stringify(formData));

      onSave?.(formData);
      toast.success('Branding guardado correctamente');
    } catch (err) {
      toast.error('Error al guardar el branding');
    } finally {
      setIsSaving(false);
    }
  };

  const currentLogo = formData.logoFile || formData.logoUrl;

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-muted rounded-lg w-1/3" />
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
            <Image className="w-5 h-5 text-indigo-500" />
            <h3 className="font-semibold">Logo de la agencia</h3>
          </div>
          {currentLogo && (
            <button
              type="button"
              onClick={removeLogo}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <Trash className="w-4 h-4" />
              Eliminar
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Current Logo Preview */}
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Logo actual</p>
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
                  <p className="text-sm">Sin logo</p>
                </div>
              )}
            </div>
          </div>

          {/* Upload Zone */}
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Subir nuevo logo</p>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'h-32 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all',
                isDragging
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                  : 'border-border hover:border-indigo-400 hover:bg-muted/50'
              )}
            >
              <Upload
                className={cn(
                  'w-8 h-8 mb-2',
                  isDragging ? 'text-indigo-500' : 'text-muted-foreground'
                )}
              />
              <p className="text-sm text-muted-foreground text-center">
                Arrastra tu logo aquí o{' '}
                <span className="text-indigo-500 font-medium">haz clic</span>
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
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
            <Warning className="w-4 h-4" />
            {previewError}
          </div>
        )}
      </div>

      {/* Color Palette Section */}
      <div className="space-y-4 p-5 rounded-xl bg-card border border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-foreground">
            <Palette className="w-5 h-5 text-purple-500" />
            <h3 className="font-semibold">Colores de marca</h3>
          </div>
          <button
            type="button"
            onClick={resetToDefaults}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors"
          >
            <ArrowCounterClockwise className="w-4 h-4" />
            Restaurar
          </button>
        </div>

        {/* Color Pickers */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <ColorPickerField
            label="Color primario"
            value={formData.primaryColor}
            onChange={(value) => updateColor('primaryColor', value)}
            description="Botones, enlaces y elementos principales"
          />
          <ColorPickerField
            label="Color secundario"
            value={formData.secondaryColor}
            onChange={(value) => updateColor('secondaryColor', value)}
            description="Badges, íconos y acentos"
          />
          <ColorPickerField
            label="Color de acento"
            value={formData.accentColor}
            onChange={(value) => updateColor('accentColor', value)}
            description="Alertas, notificaciones y destacados"
          />
        </div>

        {/* Preset Palettes */}
        <div className="pt-4 border-t border-border">
          <p className="text-sm font-medium text-foreground mb-3">
            Paletas predefinidas
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {COLOR_PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => applyPreset(preset)}
                className="group p-3 rounded-lg border border-border hover:border-indigo-400 transition-all"
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
          <Eye className="w-5 h-5 text-emerald-500" />
          <h3 className="font-semibold">Vista previa</h3>
        </div>

        <div className="p-6 rounded-xl bg-muted/30 border border-border space-y-6">
          {/* Header Preview */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-background border border-border">
            <div className="flex items-center gap-3">
              {currentLogo ? (
                <img
                  src={currentLogo}
                  alt="Logo"
                  className="h-8 w-auto object-contain"
                />
              ) : (
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                  style={{ backgroundColor: formData.primaryColor }}
                >
                  A
                </div>
              )}
              <span className="font-semibold text-foreground">Mi Agencia</span>
            </div>
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <User className="w-5 h-5 text-muted-foreground" />
            </div>
          </div>

          {/* Buttons Preview */}
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground font-medium">Botones</p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="px-4 py-2 rounded-lg text-white text-sm font-medium transition-opacity hover:opacity-90"
                style={{ backgroundColor: formData.primaryColor }}
              >
                Botón primario
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-lg text-white text-sm font-medium transition-opacity hover:opacity-90"
                style={{ backgroundColor: formData.secondaryColor }}
              >
                Botón secundario
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-lg border text-sm font-medium transition-colors"
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
                Activo
              </span>
              <span
                className="px-2.5 py-1 rounded-full text-xs font-medium text-white"
                style={{ backgroundColor: formData.secondaryColor }}
              >
                Completado
              </span>
              <span
                className="px-2.5 py-1 rounded-full text-xs font-medium text-white"
                style={{ backgroundColor: formData.accentColor }}
              >
                Pendiente
              </span>
            </div>
          </div>

          {/* Links Preview */}
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground font-medium">Enlaces</p>
            <div className="flex flex-wrap gap-4">
              <a
                href="#"
                className="text-sm font-medium flex items-center gap-1 hover:underline"
                style={{ color: formData.primaryColor }}
                onClick={(e) => e.preventDefault()}
              >
                <Link className="w-4 h-4" />
                Ver propiedad
              </a>
              <a
                href="#"
                className="text-sm font-medium hover:underline"
                style={{ color: formData.secondaryColor }}
                onClick={(e) => e.preventDefault()}
              >
                Ver detalles
              </a>
            </div>
          </div>

          {/* Alert Preview */}
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground font-medium">Alerta</p>
            <div
              className="p-3 rounded-lg text-sm"
              style={{
                backgroundColor: `${formData.accentColor}15`,
                borderLeft: `3px solid ${formData.accentColor}`,
              }}
            >
              <span style={{ color: formData.accentColor }}>
                3 cobros pendientes de pago
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
            className="flex items-center justify-end gap-3 pt-4 border-t border-border"
          >
            <button
              type="button"
              onClick={() => setFormData({ ...branding })}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl border border-border text-foreground font-medium hover:bg-muted transition-colors disabled:opacity-50"
            >
              Descartar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-medium transition-colors disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <SpinnerGap className="w-4 h-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Guardar branding
                </>
              )}
            </button>
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
            className="w-10 h-10 rounded-lg cursor-pointer border border-border overflow-hidden"
            style={{ padding: 0 }}
          />
        </div>
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder="#000000"
          maxLength={7}
          className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all uppercase"
        />
      </div>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

export default ConfigBranding;
