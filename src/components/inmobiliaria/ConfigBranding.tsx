'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Image,
  Upload,
  Palette,
  Warning,
  Eye,
  Link,
  Bell,
  User,
  Info,
  Check,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Button, Input } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { agencyApi } from '@/lib/api/inmobiliaria.service';
import type { AgencyProfile } from '@/lib/types/inmobiliaria';
import { getDefaultBranding } from '@/lib/types/inmobiliaria';

interface ConfigBrandingProps {
  /** Real agency row from GET /inmobiliaria/config (`agency` key) */
  agency: AgencyProfile;
  /** Called after a successful upload so the parent can refetch config */
  onLogoUpdated?: (logoUrl: string) => Promise<void> | void;
  /** Called after the brand colors are saved so the parent can refetch config */
  onBrandingUpdated?: () => Promise<void> | void;
  /** Agency ADMINs only — the backend rejects the upload otherwise */
  canEdit?: boolean;
  isLoading?: boolean;
}

// Backend contract for POST /inmobiliaria/agency/logo
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_FORMATS = ['image/jpeg', 'image/png', 'image/webp'];

// Backend contract: branding colors are hex '#rrggbb' only
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

/**
 * ConfigBranding — agency logo + brand colors wired to the real backend contract.
 *
 * Logo: shown from `agency.logoUrl`; uploads go to POST /inmobiliaria/agency/logo
 * (multipart, field `file`, jpeg/png/webp ≤ 5MB) which returns `{ logoUrl }`.
 *
 * Brand colors: read from `agency.branding` and saved via PUT /inmobiliaria/agency
 * with `branding { primaryColor?, secondaryColor? }` — hex '#rrggbb' only,
 * changed colors only.
 */
export function ConfigBranding({
  agency,
  onLogoUpdated,
  onBrandingUpdated,
  canEdit = true,
  isLoading = false,
}: ConfigBrandingProps) {
  const { t } = useI18n();
  const [logoUrl, setLogoUrl] = useState<string | null>(agency.logoUrl ?? null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Keep local preview in sync when the parent refetches the agency
  useEffect(() => {
    setLogoUrl(agency.logoUrl ?? null);
  }, [agency.logoUrl]);

  // Brand colors — saved values (fallback to defaults when the agency has none)
  const defaults = getDefaultBranding();
  const savedPrimary = agency.branding?.primaryColor ?? defaults.primaryColor;
  const savedSecondary = agency.branding?.secondaryColor ?? defaults.secondaryColor;

  const [primaryColor, setPrimaryColor] = useState(savedPrimary);
  const [secondaryColor, setSecondaryColor] = useState(savedSecondary);
  const [colorErrors, setColorErrors] = useState<{ primary?: string; secondary?: string }>({});
  const [isSavingColors, setIsSavingColors] = useState(false);

  // Re-seed local editors when the parent refetches the agency
  useEffect(() => {
    setPrimaryColor(savedPrimary);
    setSecondaryColor(savedSecondary);
    setColorErrors({});
  }, [savedPrimary, savedSecondary]);

  const colorsChanged = primaryColor !== savedPrimary || secondaryColor !== savedSecondary;

  const handleSaveColors = async () => {
    const errors: { primary?: string; secondary?: string } = {};
    if (!HEX_COLOR.test(primaryColor)) {
      errors.primary = t('inmobiliaria.config.brandingSection.invalidHex');
    }
    if (!HEX_COLOR.test(secondaryColor)) {
      errors.secondary = t('inmobiliaria.config.brandingSection.invalidHex');
    }
    setColorErrors(errors);
    if (errors.primary || errors.secondary) return;
    if (!colorsChanged) return;

    // Only the changed colors go in the payload
    const branding: { primaryColor?: string; secondaryColor?: string } = {};
    if (primaryColor !== savedPrimary) branding.primaryColor = primaryColor.toLowerCase();
    if (secondaryColor !== savedSecondary) branding.secondaryColor = secondaryColor.toLowerCase();

    setIsSavingColors(true);
    try {
      await agencyApi.updateAgency({ branding });
      toast.success(t('inmobiliaria.config.brandingSection.colorsSaved'));
      await onBrandingUpdated?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : undefined;
      toast.error(t('inmobiliaria.config.brandingSection.saveError'), {
        description: message,
      });
    } finally {
      setIsSavingColors(false);
    }
  };

  // Live preview uses the values being edited
  const colors = { primaryColor, secondaryColor };

  const handleFileSelect = useCallback(
    async (file: File) => {
      setUploadError(null);

      if (!ACCEPTED_FORMATS.includes(file.type)) {
        setUploadError(t('inmobiliaria.config.brandingSection.unsupportedFormat'));
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setUploadError(t('inmobiliaria.config.brandingSection.fileTooLarge'));
        return;
      }

      setIsUploading(true);
      try {
        const { logoUrl: uploadedUrl } = await agencyApi.uploadAgencyLogo(file);
        setLogoUrl(uploadedUrl);
        toast.success(t('inmobiliaria.config.brandingSection.logoUpdated'), {
          description: t('inmobiliaria.config.brandingSection.logoUpdatedDesc'),
        });
        await onLogoUpdated?.(uploadedUrl);
      } catch (err) {
        // Surface the backend message (400 bad file, 403 non-admin, 404 no
        // membership) — never a silent failure.
        const message = err instanceof Error ? err.message : undefined;
        setUploadError(message ?? t('inmobiliaria.config.brandingSection.logoUploadError'));
        toast.error(t('inmobiliaria.config.brandingSection.logoUploadError'), {
          description: message,
        });
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [t, onLogoUpdated]
  );

  const canUpload = canEdit && !isUploading;

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (canUpload) setIsDragging(true);
    },
    [canUpload]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (!canUpload) return;
      const file = e.dataTransfer.files[0];
      if (file) {
        void handleFileSelect(file);
      }
    },
    [canUpload, handleFileSelect]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        void handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

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
        <div className="flex items-center gap-2 text-foreground">
          <Image className="w-5 h-5 text-fg-muted" weight="duotone" />
          <h3 className="text-base font-semibold">{t('inmobiliaria.config.brandingSection.agencyLogo')}</h3>
        </div>

        {!canEdit && (
          <p className="text-xs text-fg-muted flex items-center gap-1">
            <Info className="w-3.5 h-3.5" />
            {t('inmobiliaria.config.profile.adminOnlyHint')}
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Current Logo Preview */}
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t('inmobiliaria.config.brandingSection.currentLogo')}</p>
            <div className="h-32 rounded-xl border-2 border-dashed border-border bg-muted/30 flex items-center justify-center">
              {logoUrl ? (
                <img
                  src={logoUrl}
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
              onClick={() => {
                if (canUpload) fileInputRef.current?.click();
              }}
              aria-disabled={!canUpload}
              className={cn(
                'h-32 rounded-lg border-2 border-dashed flex flex-col items-center justify-center transition-all',
                canUpload ? 'cursor-pointer' : 'cursor-not-allowed opacity-60',
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
              {isUploading ? (
                <p className="text-sm text-muted-foreground text-center">
                  {t('inmobiliaria.config.brandingSection.uploading')}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground text-center">
                  {t('inmobiliaria.config.brandingSection.dragOrClick')}{' '}
                  <span className="text-primary font-medium">{t('inmobiliaria.config.brandingSection.clickHere')}</span>
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                JPG, PNG, WebP (max 5MB)
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".png,.jpg,.jpeg,.webp"
              onChange={handleInputChange}
              disabled={!canUpload}
              className="hidden"
              data-testid="branding-logo-input"
            />
          </div>
        </div>

        {uploadError && (
          <div
            className="flex items-center gap-2 p-3 rounded-md bg-danger-soft text-danger text-sm"
            data-testid="branding-upload-error"
          >
            <Warning className="w-4 h-4" />
            {uploadError}
          </div>
        )}
      </div>

      {/* Color Palette Section — persisted via PUT /inmobiliaria/agency (branding) */}
      <div className="space-y-4 p-5 rounded-xl bg-card border border-border">
        <div className="flex items-center gap-2 text-foreground">
          <Palette className="w-5 h-5 text-fg-muted" weight="duotone" />
          <h3 className="text-base font-semibold">{t('inmobiliaria.config.brandingSection.brandColors')}</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ColorPickerField
            name="primary"
            label={t('inmobiliaria.config.brandingSection.primaryColor')}
            value={primaryColor}
            description={t('inmobiliaria.config.brandingSection.primaryColorDesc')}
            error={colorErrors.primary}
            disabled={!canEdit || isSavingColors}
            onChange={(v) => {
              setPrimaryColor(v);
              setColorErrors((prev) => ({ ...prev, primary: undefined }));
            }}
          />
          <ColorPickerField
            name="secondary"
            label={t('inmobiliaria.config.brandingSection.secondaryColor')}
            value={secondaryColor}
            description={t('inmobiliaria.config.brandingSection.secondaryColorDesc')}
            error={colorErrors.secondary}
            disabled={!canEdit || isSavingColors}
            onChange={(v) => {
              setSecondaryColor(v);
              setColorErrors((prev) => ({ ...prev, secondary: undefined }));
            }}
          />
        </div>

        <div className="flex items-center justify-end pt-2">
          <Button
            type="button"
            size="sm"
            hideArrow
            onClick={handleSaveColors}
            disabled={!canEdit || isSavingColors || !colorsChanged}
            isLoading={isSavingColors}
          >
            {isSavingColors ? (
              t('inmobiliaria.common.saving')
            ) : (
              <>
                <Check className="w-4 h-4" />
                {t('inmobiliaria.config.brandingSection.saveColors')}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Preview Section */}
      <div className="space-y-4 p-5 rounded-xl bg-card border border-border">
        <div className="flex items-center gap-2 text-foreground">
          <Eye className="w-5 h-5 text-fg-muted" weight="duotone" />
          <h3 className="text-base font-semibold">{t('inmobiliaria.config.brandingSection.preview')}</h3>
        </div>

        {/* allowlist: the Preview block is a live branding MOCKUP rendered with the
            default brand colors via inline `style`. Kept native (sample/preview
            precedent). */}
        <div className="p-6 rounded-xl bg-muted/30 border border-border space-y-6">
          {/* Header Preview */}
          <div className="flex items-center justify-between p-4 rounded-md bg-background border border-border">
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="h-8 w-auto object-contain"
                />
              ) : (
                <div
                  className="w-8 h-8 rounded-md flex items-center justify-center text-white font-bold text-sm"
                  style={{ backgroundColor: colors.primaryColor }}
                >
                  {(agency.name || 'A').charAt(0).toUpperCase()}
                </div>
              )}
              <span className="font-semibold text-foreground">
                {agency.name || t('inmobiliaria.config.brandingSection.myAgency')}
              </span>
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
                style={{ backgroundColor: colors.primaryColor }}
              >
                {t('inmobiliaria.config.brandingSection.primaryButton')}
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-md text-white text-sm font-medium transition-opacity hover:opacity-90"
                style={{ backgroundColor: colors.secondaryColor }}
              >
                {t('inmobiliaria.config.brandingSection.secondaryButton')}
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-md border text-sm font-medium transition-colors"
                style={{
                  borderColor: colors.primaryColor,
                  color: colors.primaryColor,
                }}
              >
                Outline
              </button>
            </div>
          </div>

          {/* Links Preview */}
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground font-medium">{t('inmobiliaria.config.brandingSection.links')}</p>
            <div className="flex flex-wrap gap-4">
              <a
                href="#"
                className="text-sm font-medium flex items-center gap-1 hover:underline"
                style={{ color: colors.primaryColor }}
                onClick={(e) => e.preventDefault()}
              >
                <Link className="w-4 h-4" />
                {t('inmobiliaria.config.brandingSection.viewProperty')}
              </a>
              <a
                href="#"
                className="text-sm font-medium hover:underline"
                style={{ color: colors.secondaryColor }}
                onClick={(e) => e.preventDefault()}
              >
                {t('inmobiliaria.config.brandingSection.viewDetails')}
              </a>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Editable color field: native color picker + hex text input, kept in sync
interface ColorPickerFieldProps {
  name: string;
  label: string;
  value: string;
  description?: string;
  error?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}

function ColorPickerField({
  name,
  label,
  value,
  description,
  error,
  disabled,
  onChange,
}: ColorPickerFieldProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground">{label}</label>
      <div className="flex items-center gap-2">
        {/* allowlist: native color input — no Cadence color-picker primitive */}
        <input
          type="color"
          // The native picker only accepts a valid hex; fall back while typing
          value={HEX_COLOR.test(value) ? value : '#000000'}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          aria-label={label}
          data-testid={`branding-${name}-picker`}
          className={cn(
            'h-10 w-12 shrink-0 cursor-pointer rounded-md border border-border bg-transparent p-1',
            disabled && 'cursor-not-allowed opacity-60'
          )}
        />
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="#1a40ff"
          maxLength={7}
          data-testid={`branding-${name}-hex`}
          className={cn('w-full font-mono', error && 'border-danger/30')}
        />
      </div>
      {error ? (
        <p className="text-xs text-danger flex items-center gap-1">
          <Warning className="w-3 h-3" />
          {error}
        </p>
      ) : description ? (
        <p className="text-xs text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}

export default ConfigBranding;
