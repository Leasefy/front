'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Envelope, Phone, MapPin, DotsThree } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useLenis } from '@/components/providers/SmoothScroll';
import { PlanStatusBadge, PlanStatusType } from './PlanStatusBadge';
import { PlanProgressBar } from './PlanProgressBar';
import { PlanActivityTimeline, TimelineItem } from './PlanActivityTimeline';

export interface QuickAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'primary' | 'danger';
}

export interface DetailSection {
  id: string;
  title: string;
  content: React.ReactNode;
}

export interface SecondaryPanel {
  open: boolean;
  title: string;
  content: React.ReactNode;
  onClose: () => void;
}

export interface PlanDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile?: {
    name: string;
    avatar?: string;
    subtitle?: string;
    status?: PlanStatusType;
    statusLabel?: string;
  };
  contact?: {
    email?: string;
    phone?: string;
    location?: string;
  };
  progress?: {
    value: number;
    label?: string;
  };
  quickActions?: QuickAction[];
  activity?: TimelineItem[];
  notes?: string;
  onNotesChange?: (notes: string) => void;
  sections?: DetailSection[];
  footerActions?: React.ReactNode;
  className?: string;
  width?: 'sm' | 'md' | 'lg';
  secondaryPanel?: SecondaryPanel;
}

const widthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

export function PlanDetailSheet({
  open,
  onOpenChange,
  profile,
  contact,
  progress,
  quickActions,
  activity,
  notes,
  onNotesChange,
  sections,
  footerActions,
  className,
  width = 'md',
  secondaryPanel,
}: PlanDetailSheetProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const lenis = useLenis();

  // Stop Lenis smooth scroll when drawer opens to allow native scrolling inside
  useEffect(() => {
    if (open) {
      lenis.stop();
    } else {
      lenis.start();
    }
    return () => {
      lenis.start();
    };
  }, [open, lenis]);

  // Handle escape key
  useEffect(() => {
    if (!open) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onOpenChange]);

  if (!open) return null;

  const content = (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 bg-[#14130F]/40"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={cn(
          'fixed inset-y-0 right-0 z-50 w-full bg-surface shadow-xl',
          'flex flex-col',
          'animate-in slide-in-from-right duration-300',
          widthClasses[width],
          className
        )}
        role="dialog"
        aria-modal="true"
      >
        {/* Header - Fixed */}
        <div className="flex-none flex items-center justify-between px-6 py-4 border-b border-plan-border">
          <h2 className="text-lg font-semibold text-plan-primary">
            Detalles
          </h2>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-xl hover:bg-muted text-plan-secondary transition-colors">
              <DotsThree className="w-5 h-5" />
            </button>
            <button
              onClick={() => onOpenChange(false)}
              className="p-2 rounded-sm hover:bg-muted text-plan-secondary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto"
          data-lenis-prevent
          style={{
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {/* Profile Section */}
          {profile && (
            <div className="px-6 py-5 border-b border-plan-border">
              <div className="flex items-start gap-4">
                {profile.avatar ? (
                  <img
                    src={profile.avatar}
                    alt={profile.name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-2xl font-bold text-plan-secondary">
                      {profile.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-plan-primary truncate">
                    {profile.name}
                  </h3>
                  {profile.subtitle && (
                    <p className="text-sm text-plan-secondary mt-0.5">{profile.subtitle}</p>
                  )}
                  {profile.status && (
                    <div className="mt-2">
                      <PlanStatusBadge
                        status={profile.status}
                        label={profile.statusLabel}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Contact Info */}
          {contact && (contact.email || contact.phone || contact.location) && (
            <div className="px-6 py-4 border-b border-plan-border space-y-3">
              {contact.email && (
                <a
                  href={`mailto:${contact.email}`}
                  className="flex items-center gap-3 text-sm text-plan-secondary hover:text-plan-primary transition-colors"
                >
                  <Envelope className="w-4 h-4" />
                  <span>{contact.email}</span>
                </a>
              )}
              {contact.phone && (
                <a
                  href={`tel:${contact.phone}`}
                  className="flex items-center gap-3 text-sm text-plan-secondary hover:text-plan-primary transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  <span>{contact.phone}</span>
                </a>
              )}
              {contact.location && (
                <div className="flex items-center gap-3 text-sm text-plan-secondary">
                  <MapPin className="w-4 h-4" />
                  <span>{contact.location}</span>
                </div>
              )}
            </div>
          )}

          {/* Progress Section */}
          {progress && (
            <div className="px-6 py-4 border-b border-plan-border">
              <p className="text-xs font-medium text-plan-secondary mb-2">
                {progress.label || 'Progreso'}
              </p>
              <PlanProgressBar value={progress.value} showValue size="md" />
            </div>
          )}

          {/* Quick Actions */}
          {quickActions && quickActions.length > 0 && (
            <div className="px-6 py-4 border-b border-plan-border">
              <p className="text-xs font-normal text-plan-secondary font-mono uppercase tracking-wide mb-3">
                Acciones Rapidas
              </p>
              <div className="grid grid-cols-2 gap-2">
                {quickActions.map(action => (
                  <button
                    key={action.id}
                    onClick={action.onClick}
                    className={cn(
                      'flex items-center justify-center gap-2 px-3 py-2 rounded-sm text-sm font-medium transition-colors',
                      action.variant === 'primary'
                        ? 'bg-primary text-primary-fg hover:bg-primary/90'
                        : action.variant === 'danger'
                          ? 'bg-danger-soft text-danger hover:bg-danger-soft/80'
                          : 'bg-muted text-plan-primary hover:bg-muted'
                    )}
                  >
                    {action.icon}
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Custom Sections */}
          {sections?.map(section => (
            <div key={section.id} className="px-6 py-4 border-b border-plan-border">
              <p className="text-xs font-normal text-plan-secondary font-mono uppercase tracking-wide mb-3">
                {section.title}
              </p>
              {section.content}
            </div>
          ))}

          {/* Activity Timeline */}
          {activity && activity.length > 0 && (
            <div className="px-6 py-4 border-b border-plan-border">
              <p className="text-xs font-normal text-plan-secondary font-mono uppercase tracking-wide mb-3">
                Actividad
              </p>
              <PlanActivityTimeline items={activity} maxItems={5} compact />
            </div>
          )}

          {/* Notes Section */}
          {(notes !== undefined || onNotesChange) && (
            <div className="px-6 py-4">
              <p className="text-xs font-normal text-plan-secondary font-mono uppercase tracking-wide mb-3">
                Notas
              </p>
              {onNotesChange ? (
                <textarea
                  value={notes || ''}
                  onChange={e => onNotesChange(e.target.value)}
                  placeholder="Agregar notas..."
                  className={cn(
                    'w-full min-h-[100px] p-3 rounded-sm resize-none',
                    'bg-muted border border-plan-border',
                    'text-sm text-plan-primary placeholder:text-plan-muted',
                    'focus:outline-none focus:ring-2 focus:ring-plan-accent/50 focus:border-plan-accent',
                    'transition-colors'
                  )}
                />
              ) : (
                <p className="text-sm text-plan-secondary">
                  {notes || 'Sin notas'}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions - Fixed */}
        {footerActions && (
          <div className="flex-none px-6 py-4 border-t border-plan-border bg-muted">
            {footerActions}
          </div>
        )}
      </div>

      {/* Secondary Panel */}
      {secondaryPanel?.open && (
        <div
          className={cn(
            'fixed inset-y-0 z-50 w-full bg-surface shadow-xl',
            'flex flex-col',
            'animate-in slide-in-from-right duration-300',
            widthClasses[width],
            // Desktop: position to the left of main panel
            'right-0 lg:right-[448px]'
          )}
        >
          {/* Secondary Header */}
          <div className="flex-none flex items-center justify-between px-6 py-4 border-b border-plan-border">
            <h2 className="text-lg font-semibold text-plan-primary">
              {secondaryPanel.title}
            </h2>
            <button
              onClick={secondaryPanel.onClose}
              className="p-2 rounded-sm hover:bg-muted text-plan-secondary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Secondary Scrollable Content */}
          <div
            className="flex-1 overflow-y-auto px-6 py-4"
            data-lenis-prevent
            style={{
              overscrollBehavior: 'contain',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {secondaryPanel.content}
          </div>
        </div>
      )}
    </>
  );

  // Use portal to render at document body level
  if (typeof window === 'undefined') return null;

  return createPortal(content, document.body);
}
