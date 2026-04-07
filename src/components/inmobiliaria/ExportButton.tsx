'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowDown,
  FilePdf,
  FileXls,
  CheckCircle,
  XCircle,
  CalendarBlank,
  CaretDown,
  SpinnerGap,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import {
  DropdownList,
  DropdownListContent,
  DropdownListItem,
  DropdownListSeparator,
  DropdownListTrigger,
} from '@/components/ui/dropdown-menu';

export type ExportFormat = 'pdf' | 'excel';

export interface ExportButtonProps {
  /** Export format option(s) */
  format: 'pdf' | 'excel' | 'both';
  /** Callback when user initiates export */
  onExport: (format: ExportFormat) => void;
  /** Loading state */
  isLoading?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Custom label */
  label?: string;
  /** Show success state after export */
  showSuccess?: boolean;
  /** Show error state */
  error?: string | null;
  /** Class name for custom styling */
  className?: string;
}

// Size configurations
const SIZE_CONFIG = {
  sm: {
    button: 'px-3 py-1.5 text-xs gap-1.5 rounded-lg',
    icon: 'w-3.5 h-3.5',
    dropdown: 'min-w-[160px]',
  },
  md: {
    button: 'px-4 py-2.5 text-sm gap-2 rounded-xl',
    icon: 'w-4 h-4',
    dropdown: 'min-w-[180px]',
  },
  lg: {
    button: 'px-5 py-3 text-base gap-2.5 rounded-xl',
    icon: 'w-5 h-5',
    dropdown: 'min-w-[200px]',
  },
};

// Format icons and labels
const FORMAT_CONFIG = {
  pdf: {
    icon: FilePdf,
    label: 'Descargar PDF',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    buttonBg: 'bg-red-600 hover:bg-red-700',
  },
  excel: {
    icon: FileXls,
    label: 'Descargar Excel',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    buttonBg: 'bg-green-600 hover:bg-green-700',
  },
};

/**
 * ExportButton - Button component for exporting reports to PDF/Excel
 * Supports single format buttons or dropdown menus for multiple formats
 */
export function ExportButton({
  format,
  onExport,
  isLoading = false,
  disabled = false,
  size = 'md',
  label,
  showSuccess = false,
  error = null,
  className,
}: ExportButtonProps) {
  const { t } = useI18n();
  const [internalSuccess, setInternalSuccess] = React.useState(false);
  const sizeConfig = SIZE_CONFIG[size];

  // Handle success animation
  React.useEffect(() => {
    if (showSuccess) {
      setInternalSuccess(true);
      const timer = setTimeout(() => setInternalSuccess(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess]);

  // Single format button (PDF or Excel only)
  if (format !== 'both') {
    const config = FORMAT_CONFIG[format];
    const Icon = config.icon;
    const buttonLabel = label || config.label;

    return (
      <button
        onClick={() => onExport(format)}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-all',
          sizeConfig.button,
          internalSuccess
            ? 'bg-emerald-500 hover:bg-emerald-500 text-white'
            : disabled
              ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-400 dark:text-neutral-500 cursor-not-allowed'
              : `${config.buttonBg} text-white shadow-lg shadow-${format === 'pdf' ? 'red' : 'green'}-500/25`,
          className
        )}
      >
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.span
              key="loading"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <SpinnerGap className={cn(sizeConfig.icon, 'animate-spin')} />
            </motion.span>
          ) : internalSuccess ? (
            <motion.span
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <CheckCircle className={sizeConfig.icon} weight="fill" />
            </motion.span>
          ) : (
            <motion.span
              key="icon"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <Icon className={sizeConfig.icon} weight="fill" />
            </motion.span>
          )}
        </AnimatePresence>
        <span>
          {isLoading ? t('inmobiliaria.finance.export.generating') : internalSuccess ? t('inmobiliaria.finance.export.done') : buttonLabel}
        </span>
      </button>
    );
  }

  // Multiple format dropdown
  return (
    <DropdownList>
      <DropdownListTrigger asChild>
        <button
          disabled={disabled || isLoading}
          className={cn(
            'inline-flex items-center justify-center font-medium transition-all',
            sizeConfig.button,
            disabled
              ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-400 dark:text-neutral-500 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white uppercase tracking-wide font-mono',
            className
          )}
        >
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.span
                key="loading"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <SpinnerGap className={cn(sizeConfig.icon, 'animate-spin')} />
              </motion.span>
            ) : (
              <motion.span
                key="icon"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <ArrowDown className={sizeConfig.icon} weight="bold" />
              </motion.span>
            )}
          </AnimatePresence>
          <span>{isLoading ? t('inmobiliaria.finance.export.exporting') : label || t('inmobiliaria.finance.export.export')}</span>
          {!isLoading && <CaretDown className={cn(sizeConfig.icon, 'ml-1')} />}
        </button>
      </DropdownListTrigger>

      <DropdownListContent
        align="end"
        className={cn(
          'p-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c]',
          sizeConfig.dropdown
        )}
      >
        {/* PDF Option */}
        <DropdownListItem
          onClick={() => onExport('pdf')}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          <div
            className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center',
              FORMAT_CONFIG.pdf.bgColor
            )}
          >
            <FilePdf
              className={cn('w-4 h-4', FORMAT_CONFIG.pdf.color)}
              weight="fill"
            />
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-900 dark:text-white">
              {t('inmobiliaria.finance.export.downloadPDF')}
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {t('inmobiliaria.finance.export.printFormat')}
            </p>
          </div>
        </DropdownListItem>

        {/* Excel Option */}
        <DropdownListItem
          onClick={() => onExport('excel')}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          <div
            className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center',
              FORMAT_CONFIG.excel.bgColor
            )}
          >
            <FileXls
              className={cn('w-4 h-4', FORMAT_CONFIG.excel.color)}
              weight="fill"
            />
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-900 dark:text-white">
              {t('inmobiliaria.finance.export.downloadExcel')}
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {t('inmobiliaria.finance.export.analysisFormat')}
            </p>
          </div>
        </DropdownListItem>

        <DropdownListSeparator className="my-1.5 bg-neutral-200 dark:bg-neutral-700" />

        {/* Scheduled Export - Coming Soon */}
        <DropdownListItem
          disabled
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg opacity-50 cursor-not-allowed"
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-neutral-100 dark:bg-neutral-800">
            <CalendarBlank className="w-4 h-4 text-neutral-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
              {t('inmobiliaria.finance.export.scheduleExport')}
            </p>
            <p className="text-xs text-neutral-400 dark:text-neutral-500">
              {t('inmobiliaria.finance.export.comingSoon')}
            </p>
          </div>
        </DropdownListItem>
      </DropdownListContent>
    </DropdownList>
  );
}

/**
 * ExportButtonCompact - Minimal export button for inline usage
 */
export function ExportButtonCompact({
  format,
  onExport,
  isLoading = false,
  disabled = false,
  className,
}: Pick<ExportButtonProps, 'format' | 'onExport' | 'isLoading' | 'disabled' | 'className'>) {
  if (format === 'both') {
    return (
      <ExportButton
        format="both"
        onExport={onExport}
        isLoading={isLoading}
        disabled={disabled}
        size="sm"
        label=""
        className={className}
      />
    );
  }

  const config = FORMAT_CONFIG[format];
  const Icon = config.icon;

  return (
    <button
      onClick={() => onExport(format)}
      disabled={disabled || isLoading}
      className={cn(
        'p-2 rounded-lg transition-colors',
        disabled
          ? 'text-neutral-400 dark:text-neutral-500 cursor-not-allowed'
          : `${config.color} hover:${config.bgColor}`,
        className
      )}
      title={config.label}
    >
      {isLoading ? (
        <SpinnerGap className="w-4 h-4 animate-spin" />
      ) : (
        <Icon className="w-4 h-4" weight="fill" />
      )}
    </button>
  );
}

export default ExportButton;
