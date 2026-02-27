'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// ============================================================================
// Kbd Variants
// ============================================================================

const kbdVariants = cva(
  cn(
    'inline-flex items-center justify-center font-mono',
    'border shadow-sm',
    'select-none'
  ),
  {
    variants: {
      variant: {
        default: 'bg-muted border-border text-muted-foreground',
        outline: 'bg-background border-input text-foreground',
        ghost: 'bg-transparent border-transparent text-muted-foreground shadow-none',
        dark: 'bg-neutral-800 border-neutral-700 text-neutral-200',
      },
      size: {
        xs: 'h-4 min-w-4 px-1 text-[10px] rounded-[1px]',
        sm: 'h-5 min-w-5 px-1.5 text-[11px] rounded-[1px]',
        default: 'h-6 min-w-6 px-2 text-xs rounded-[2px]',
        lg: 'h-7 min-w-7 px-2.5 text-sm rounded-[2px]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

// ============================================================================
// Kbd Component
// ============================================================================

export interface KbdProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof kbdVariants> {}

const Kbd = React.forwardRef<HTMLElement, KbdProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <kbd
        ref={ref}
        className={cn(kbdVariants({ variant, size, className }))}
        {...props}
      />
    );
  }
);
Kbd.displayName = 'Kbd';

// ============================================================================
// Keyboard Shortcut (multiple keys)
// ============================================================================

export interface KeyboardShortcutProps extends React.HTMLAttributes<HTMLDivElement> {
  keys: string[];
  separator?: React.ReactNode;
  variant?: VariantProps<typeof kbdVariants>['variant'];
  size?: VariantProps<typeof kbdVariants>['size'];
}

function KeyboardShortcut({
  keys,
  separator = '+',
  variant,
  size,
  className,
  ...props
}: KeyboardShortcutProps) {
  return (
    <div className={cn('inline-flex items-center gap-1', className)} {...props}>
      {keys.map((key, index) => (
        <React.Fragment key={`${key}-${index}`}>
          <Kbd variant={variant} size={size}>
            {formatKey(key)}
          </Kbd>
          {index < keys.length - 1 && (
            <span className="text-muted-foreground text-xs">{separator}</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ============================================================================
// Key formatting helpers
// ============================================================================

const KEY_SYMBOLS: Record<string, string> = {
  cmd: '⌘',
  command: '⌘',
  ctrl: '⌃',
  control: '⌃',
  alt: '⌥',
  option: '⌥',
  shift: '⇧',
  enter: '↵',
  return: '↵',
  backspace: '⌫',
  delete: '⌦',
  escape: 'esc',
  esc: 'esc',
  tab: '⇥',
  space: '␣',
  up: '↑',
  down: '↓',
  left: '←',
  right: '→',
  pageup: 'PgUp',
  pagedown: 'PgDn',
  home: 'House',
  end: 'End',
};

function formatKey(key: string): string {
  const lowercaseKey = key.toLowerCase();
  return KEY_SYMBOLS[lowercaseKey] || key.toUpperCase();
}

// ============================================================================
// Platform-aware keyboard shortcut
// ============================================================================

export interface PlatformShortcutProps extends Omit<KeyboardShortcutProps, 'keys'> {
  macKeys: string[];
  windowsKeys: string[];
}

function PlatformShortcut({
  macKeys,
  windowsKeys,
  ...props
}: PlatformShortcutProps) {
  const [isMac, setIsMac] = React.useState(false);

  React.useEffect(() => {
    setIsMac(navigator.platform.toLowerCase().includes('mac'));
  }, []);

  return <KeyboardShortcut keys={isMac ? macKeys : windowsKeys} {...props} />;
}

// ============================================================================
// Common shortcut presets
// ============================================================================

export const shortcuts = {
  save: { mac: ['⌘', 'S'], windows: ['Ctrl', 'S'] },
  copy: { mac: ['⌘', 'C'], windows: ['Ctrl', 'C'] },
  paste: { mac: ['⌘', 'V'], windows: ['Ctrl', 'V'] },
  cut: { mac: ['⌘', 'X'], windows: ['Ctrl', 'X'] },
  undo: { mac: ['⌘', 'Z'], windows: ['Ctrl', 'Z'] },
  redo: { mac: ['⌘', '⇧', 'Z'], windows: ['Ctrl', 'Y'] },
  selectAll: { mac: ['⌘', 'A'], windows: ['Ctrl', 'A'] },
  find: { mac: ['⌘', 'F'], windows: ['Ctrl', 'F'] },
  close: { mac: ['⌘', 'W'], windows: ['Ctrl', 'W'] },
  new: { mac: ['⌘', 'N'], windows: ['Ctrl', 'N'] },
  open: { mac: ['⌘', 'O'], windows: ['Ctrl', 'O'] },
  escape: { mac: ['esc'], windows: ['Esc'] },
  enter: { mac: ['↵'], windows: ['Enter'] },
};

export { Kbd, KeyboardShortcut, PlatformShortcut, formatKey };
