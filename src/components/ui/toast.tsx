'use client';

import { Toaster as Sonner, toast as sonnerToast } from 'sonner';
import { CheckCircle, XCircle, Warning, Info, SpinnerGap } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

// ============================================================================
// Toast Component Styles
// ============================================================================

const toastStyles = {
  base: cn(
    'group pointer-events-auto relative flex w-full items-center justify-between',
    'gap-3 overflow-hidden rounded-[2px] border p-4 shadow-lg',
    'transition-all duration-200',
    'data-[swipe=cancel]:translate-x-0',
    'data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]',
    'data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]',
    'data-[swipe=move]:transition-none',
    'data-[state=open]:animate-in',
    'data-[state=closed]:animate-out',
    'data-[swipe=end]:animate-out',
    'data-[state=closed]:fade-out-80',
    'data-[state=closed]:slide-out-to-right-full',
    'data-[state=open]:slide-in-from-top-full',
    'data-[state=open]:sm:slide-in-from-bottom-full'
  ),
  default: 'bg-background border-border text-foreground',
  success: 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100',
  error: 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-100',
  warning: 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100',
  info: 'bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100',
  loading: 'bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100',
};

const iconStyles = {
  success: 'text-emerald-600 dark:text-emerald-400',
  error: 'text-rose-600 dark:text-rose-400',
  warning: 'text-amber-600 dark:text-amber-400',
  info: 'text-blue-600 dark:text-blue-400',
  loading: 'text-neutral-600 dark:text-neutral-400 animate-spin',
};

// ============================================================================
// Toaster Configuration
// ============================================================================

export interface ToasterProps {
  position?: 'top-left' | 'top-right' | 'top-center' | 'bottom-left' | 'bottom-right' | 'bottom-center';
  expand?: boolean;
  richColors?: boolean;
  closeButton?: boolean;
  duration?: number;
  className?: string;
}

export function Toaster({
  position = 'top-right',
  expand = false,
  richColors = false,
  closeButton = true,
  duration = 4000,
  className,
}: ToasterProps) {
  return (
    <Sonner
      position={position}
      expand={expand}
      richColors={richColors}
      closeButton={closeButton}
      duration={duration}
      className={cn('toaster group', className)}
      toastOptions={{
        classNames: {
          toast: cn(
            toastStyles.base,
            toastStyles.default
          ),
          title: 'font-medium text-sm',
          description: 'text-sm text-muted-foreground',
          actionButton: cn(
            'inline-flex h-8 items-center justify-center rounded-[1px] bg-primary px-3',
            'text-xs font-medium text-primary-foreground',
            'hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring'
          ),
          cancelButton: cn(
            'inline-flex h-8 items-center justify-center rounded-[1px] bg-muted px-3',
            'text-xs font-medium text-muted-foreground',
            'hover:bg-muted/90 focus:outline-none focus:ring-2 focus:ring-ring'
          ),
          closeButton: cn(
            'absolute right-2 top-2 rounded-[1px] p-1',
            'text-muted-foreground/50 hover:text-foreground',
            'opacity-0 group-hover:opacity-100 transition-opacity'
          ),
          success: toastStyles.success,
          error: toastStyles.error,
          warning: toastStyles.warning,
          info: toastStyles.info,
          loading: toastStyles.loading,
        },
      }}
    />
  );
}

// ============================================================================
// Toast Functions
// ============================================================================

export type ToastVariant = 'default' | 'success' | 'error' | 'warning' | 'info' | 'loading';

export interface ToastOptions {
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  cancel?: {
    label: string;
    onClick?: () => void;
  };
  duration?: number;
  id?: string | number;
}

/**
 * Toast notification utility functions
 * Integrates with Sonner and provides consistent styling via design tokens
 */
export const toast = {
  /**
   * Show a default toast notification
   */
  default: (options: ToastOptions | string) => {
    const opts = typeof options === 'string' ? { title: options } : options;
    return sonnerToast(opts.title, {
      description: opts.description,
      duration: opts.duration,
      id: opts.id,
      action: opts.action ? {
        label: opts.action.label,
        onClick: opts.action.onClick,
      } : undefined,
      cancel: opts.cancel ? {
        label: opts.cancel.label,
        onClick: opts.cancel.onClick ?? (() => {}),
      } : undefined,
    });
  },

  /**
   * Show a success toast with checkmark icon
   */
  success: (options: ToastOptions | string) => {
    const opts = typeof options === 'string' ? { title: options } : options;
    return sonnerToast.success(opts.title, {
      description: opts.description,
      duration: opts.duration,
      id: opts.id,
      icon: <CheckCircle className={cn('h-5 w-5', iconStyles.success)} />,
      action: opts.action ? {
        label: opts.action.label,
        onClick: opts.action.onClick,
      } : undefined,
    });
  },

  /**
   * Show an error toast with X icon
   */
  error: (options: ToastOptions | string) => {
    const opts = typeof options === 'string' ? { title: options } : options;
    return sonnerToast.error(opts.title, {
      description: opts.description,
      duration: opts.duration ?? 5000, // Longer duration for errors
      id: opts.id,
      icon: <XCircle className={cn('h-5 w-5', iconStyles.error)} />,
      action: opts.action ? {
        label: opts.action.label,
        onClick: opts.action.onClick,
      } : undefined,
    });
  },

  /**
   * Show a warning toast with alert icon
   */
  warning: (options: ToastOptions | string) => {
    const opts = typeof options === 'string' ? { title: options } : options;
    return sonnerToast.warning(opts.title, {
      description: opts.description,
      duration: opts.duration ?? 5000,
      id: opts.id,
      icon: <Warning className={cn('h-5 w-5', iconStyles.warning)} />,
      action: opts.action ? {
        label: opts.action.label,
        onClick: opts.action.onClick,
      } : undefined,
    });
  },

  /**
   * Show an info toast with info icon
   */
  info: (options: ToastOptions | string) => {
    const opts = typeof options === 'string' ? { title: options } : options;
    return sonnerToast.info(opts.title, {
      description: opts.description,
      duration: opts.duration,
      id: opts.id,
      icon: <Info className={cn('h-5 w-5', iconStyles.info)} />,
      action: opts.action ? {
        label: opts.action.label,
        onClick: opts.action.onClick,
      } : undefined,
    });
  },

  /**
   * Show a loading toast with spinner
   */
  loading: (options: ToastOptions | string) => {
    const opts = typeof options === 'string' ? { title: options } : options;
    return sonnerToast.loading(opts.title, {
      description: opts.description,
      duration: opts.duration ?? Infinity, // Loading toasts persist until dismissed
      id: opts.id,
      icon: <SpinnerGap className={cn('h-5 w-5', iconStyles.loading)} />,
    });
  },

  /**
   * Show a promise-based toast that updates based on promise state
   */
  promise: <T,>(
    promise: Promise<T>,
    options: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: unknown) => string);
    }
  ) => {
    return sonnerToast.promise(promise, {
      loading: options.loading,
      success: options.success,
      error: options.error,
    });
  },

  /**
   * Dismiss a specific toast or all toasts
   */
  dismiss: (id?: string | number) => {
    if (id) {
      sonnerToast.dismiss(id);
    } else {
      sonnerToast.dismiss();
    }
  },

  /**
   * Custom toast with full control
   */
  custom: (jsx: React.ReactElement, options?: { id?: string | number; duration?: number }) => {
    return sonnerToast.custom(() => jsx, options);
  },
};

export { sonnerToast };
